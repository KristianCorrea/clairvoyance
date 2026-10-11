/**
 * Lane C — Speech
 *
 * Contracts:
 *   startListening() → { stop(): Promise<string>, cancel() }  // push-to-talk STT
 *   listenOnce() → Promise<string>   // fixed-window STT (stubbed by default)
 *   speak(text)  → Promise<void>     // TTS — REAL browser speechSynthesis
 *
 * Mic stub (NEXT_PUBLIC_STUB_MIC=1):
 *   Returns a canned question when listening stops.
 *   Does NOT open the microphone — no permission prompt.
 *
 * Real STT ideas:
 *   - webkitSpeechRecognition / SpeechRecognition (Chrome/Android)
 *   - MediaRecorder → POST audio to Whisper / other STT API
 *
 * Keep the same function signatures so Lane A UI does not change.
 */

import { STUB_MIC } from "./flags";

const STUB_QUESTIONS = [
  "What's in front of me?",
  "Are there any obstacles?",
  "Which way looks clear?",
];

let stubQuestionIndex = 0;

export type ListenSession = {
  /** Stop listening (button released) and resolve with the transcript. */
  stop: () => Promise<string>;
  /** Abort without producing a transcript. */
  cancel: () => void;
};

/**
 * Push-to-talk: start capturing audio now; call `stop()` on release to get
 * the transcript. The mic stays open only between start and stop.
 */
export function startListening(): ListenSession {
  if (STUB_MIC) {
    return {
      stop: async () => {
        const q = STUB_QUESTIONS[stubQuestionIndex % STUB_QUESTIONS.length];
        stubQuestionIndex += 1;
        return q;
      },
      cancel: () => undefined,
    };
  }

  // --- REAL PATH (Lane C) ---
  return startWebSpeech();
}

/**
 * Capture one spoken question and return its transcript (fixed ~5s window).
 * Prefer startListening() for push-to-talk.
 */
export async function listenOnce(): Promise<string> {
  const session = startListening();
  await sleep(STUB_MIC ? 800 : 5000);
  return session.stop();
}

/**
 * Speak text aloud. Always uses the Web Speech API (not stubbed).
 * Safe no-op if the browser has no voices.
 */
export async function speak(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("speechSynthesis not available");
    return;
  }

  // Cancel anything currently speaking so answers don't overlap
  window.speechSynthesis.cancel();

  await new Promise<void>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.rate = 1.05;
    utter.pitch = 1;
    utter.onend = () => resolve();
    utter.onerror = (e) => {
      // 'interrupted' is normal when we cancel — treat as resolve
      if (e.error === "interrupted" || e.error === "canceled") {
        resolve();
        return;
      }
      reject(new Error(`TTS error: ${e.error}`));
    };
    window.speechSynthesis.speak(utter);
  });
}

/** Stop speech immediately (e.g. user starts a new ask). */
export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((ev: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function startWebSpeech(): ListenSession {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };

  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    const err = new Error(
      "SpeechRecognition not supported. Use Chrome/Android or keep NEXT_PUBLIC_STUB_MIC=1.",
    );
    return { stop: () => Promise.reject(err), cancel: () => undefined };
  }

  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let holding = true; // true until stop()/cancel()
  let committed = ""; // text from earlier recognition runs (after auto-restart)
  let finalText = "";
  let interimText = "";
  let error: string | null = null;
  let resolveEnded: () => void = () => undefined;
  const ended = new Promise<void>((r) => (resolveEnded = r));

  rec.onresult = (ev) => {
    // With continuous=true, `results` holds the whole run — rebuild each time.
    finalText = "";
    interimText = "";
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interimText += r[0].transcript;
    }
  };
  rec.onerror = (ev) => {
    // "no-speech" / "aborted" just mean nothing was captured.
    if (ev.error !== "no-speech" && ev.error !== "aborted") error = ev.error;
  };
  rec.onend = () => {
    // Browsers end recognition on their own after silence — restart while
    // the button is still held so we don't drop the rest of the question.
    if (holding && !error) {
      committed = `${committed} ${finalText}`;
      finalText = "";
      interimText = "";
      try {
        rec.start();
        return;
      } catch {
        /* fall through and finish */
      }
    }
    resolveEnded();
  };

  try {
    rec.start();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    resolveEnded();
  }

  return {
    stop: async () => {
      holding = false;
      try {
        rec.stop(); // flushes pending audio into a final result, then onend
      } catch {
        resolveEnded();
      }
      // Safety net: never hang if the browser fails to fire onend.
      await Promise.race([ended, sleep(3000)]);
      if (error) throw new Error(`Mic/STT error: ${error}`);
      const transcript = `${committed} ${finalText || interimText}`
        .replace(/\s+/g, " ")
        .trim();
      if (!transcript) throw new Error("I didn't catch that.");
      return transcript;
    },
    cancel: () => {
      holding = false;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      resolveEnded();
    },
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
