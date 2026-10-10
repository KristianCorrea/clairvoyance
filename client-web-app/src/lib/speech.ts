/**
 * Lane C — Speech
 *
 * Contracts:
 *   listenOnce() → Promise<string>   // STT (stubbed by default)
 *   speak(text)  → Promise<void>     // TTS — REAL browser speechSynthesis
 *
 * Mic stub (NEXT_PUBLIC_STUB_MIC=1):
 *   Waits ~800ms ("Listening…") then returns a canned question.
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

/**
 * Capture one spoken question and return its transcript.
 */
export async function listenOnce(): Promise<string> {
  if (STUB_MIC) {
    await sleep(800);
    const q = STUB_QUESTIONS[stubQuestionIndex % STUB_QUESTIONS.length];
    stubQuestionIndex += 1;
    return q;
  }

  // --- REAL PATH (Lane C) ---
  return listenWithWebSpeech();
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

async function listenWithWebSpeech(): Promise<string> {
  type SpeechRec = {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
    onerror: ((ev: { error: string }) => void) | null;
    onend: (() => void) | null;
  };

  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };

  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    throw new Error(
      "SpeechRecognition not supported. Use Chrome/Android or keep NEXT_PUBLIC_STUB_MIC=1.",
    );
  }

  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const timeout = setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      reject(new Error("Listening timed out — try again."));
    }, 8000);

    rec.onresult = (ev) => {
      clearTimeout(timeout);
      const transcript = ev.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        reject(new Error("I didn't catch that."));
        return;
      }
      resolve(transcript);
    };
    rec.onerror = (ev) => {
      clearTimeout(timeout);
      reject(new Error(`Mic/STT error: ${ev.error}`));
    };
    rec.onend = () => {
      /* result or error should have fired */
    };

    rec.start();
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
