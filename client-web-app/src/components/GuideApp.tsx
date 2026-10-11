"use client";

/**
 * Lane A — UI orchestration only.
 *
 * This component wires the guide loop. It should NOT contain camera/STT/AI
 * business logic — call into src/lib/* instead so other lanes can ship PRs
 * without fighting over this file.
 *
 * Loop: hold button or screen → startListening → release → getSnapshot → analyzeScene → speak
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnswerCard } from "@/components/AnswerCard";
import { AskButton } from "@/components/AskButton";
import { CameraConfig } from "@/components/CameraConfig";
import { Preview } from "@/components/Preview";
import { StatusBar } from "@/components/StatusBar";
import { analyzeScene } from "@/lib/analyze";
import { getSnapshot, testCamera } from "@/lib/camera";
import { STUB_ANALYZE, STUB_CAMERA, STUB_MIC } from "@/lib/flags";
import { startListening, speak, stopSpeaking } from "@/lib/speech";
import type { ListenSession } from "@/lib/speech";
import type { GuidePhase } from "@/lib/types";

const STORAGE_KEY = "clairvoyance.cameraUrl";
const DEFAULT_URL = "http://192.168.4.1";
const SCREEN_PRESS_DELAY = 500;
const SCREEN_PRESS_MOVE_TOLERANCE = 10;

type ScreenPress = {
  pointerId: number;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
  activated: boolean;
};

type ScreenTouch = {
  identifier: number;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
  activated: boolean;
};

export function GuideApp() {
  const [phase, setPhase] = useState<GuidePhase>("idle");
  const [cameraUrl, setCameraUrl] = useState(DEFAULT_URL);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Stubs enabled — hold Ask or anywhere on screen to hear a full demo loop.",
  );
  const [question, setQuestion] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const listenRef = useRef<ListenSession | null>(null);
  const screenPressRef = useRef<ScreenPress | null>(null);
  const screenTouchRef = useRef<ScreenTouch | null>(null);

  const busy = phase !== "idle" && phase !== "error";

  // Restore saved camera URL
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCameraUrl(saved);
    } catch {
      /* private mode */
    }
  }, []);

  // Revoke object URLs on change/unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const setPreview = useCallback((url: string | null) => {
    if (previewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  const persistUrl = (url: string) => {
    setCameraUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      /* ignore */
    }
  };

  const fail = (msg: string) => {
    setPhase("error");
    setStatusMessage(msg);
    void speak(msg).catch(() => undefined);
  };

  const handleTest = async () => {
    if (busy) return;
    setPhase("capturing");
    setStatusMessage("Testing camera…");
    try {
      const result = await testCamera(cameraUrl);
      setCameraOk(result.ok);
      setStatusMessage(result.detail);
      setPhase("idle");
      if (result.ok) {
        void speak("Camera connected.").catch(() => undefined);
      } else {
        void speak("Camera offline.").catch(() => undefined);
      }
    } catch (err) {
      setCameraOk(false);
      fail(err instanceof Error ? err.message : String(err));
    }
  };

  /** Button pressed: open the mic and record until release. */
  const handlePressStart = () => {
    if (busy || listenRef.current) return;
    stopSpeaking();
    setAnswer("");
    setPhase("listening");
    setStatusMessage(
      STUB_MIC
        ? "Stub mic: pretending to listen — release to send."
        : "Listening — release to send.",
    );
    listenRef.current = startListening();
  };

  /** Button released: stop recording, transcribe, then run the rest of the loop. */
  const handlePressEnd = async () => {
    const session = listenRef.current;
    if (!session) return;
    listenRef.current = null;
    setPhase("transcribing");
    setStatusMessage("Transcribing…");
    let q: string;
    try {
      q = await session.stop();
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
      return;
    }
    await runGuideLoop(q, true);
  };

  const clearScreenPress = () => {
    const screenPress = screenPressRef.current;
    if (!screenPress) return;
    clearTimeout(screenPress.timer);
    screenPressRef.current = null;
  };

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest("button, input, textarea, select, a"));

  const handleScreenPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" || e.pointerType === "touch" || isInteractiveTarget(e.target)) return;

    clearScreenPress();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
    }
    const screenPress: ScreenPress = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      activated: false,
      timer: setTimeout(() => {
        if (screenPressRef.current !== screenPress) return;
        screenPress.activated = true;
        handlePressStart();
      }, SCREEN_PRESS_DELAY),
    };
    screenPressRef.current = screenPress;
  };

  const handleScreenPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const screenPress = screenPressRef.current;
    if (!screenPress || screenPress.pointerId !== e.pointerId) return;

    const movedX = e.clientX - screenPress.startX;
    const movedY = e.clientY - screenPress.startY;
    if (
      !screenPress.activated &&
      Math.hypot(movedX, movedY) > SCREEN_PRESS_MOVE_TOLERANCE
    ) {
      clearScreenPress();
    }
  };

  const handleScreenPointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const screenPress = screenPressRef.current;
    if (!screenPress || screenPress.pointerId !== e.pointerId) return;
    clearScreenPress();
    if (screenPress.activated) void handlePressEnd();
  };

  const clearScreenTouch = () => {
    const screenTouch = screenTouchRef.current;
    if (!screenTouch) return;
    clearTimeout(screenTouch.timer);
    screenTouchRef.current = null;
  };

  const getScreenTouch = (touches: React.TouchList) => {
    const screenTouch = screenTouchRef.current;
    if (!screenTouch) return null;
    for (let index = 0; index < touches.length; index += 1) {
      if (touches[index].identifier === screenTouch.identifier) {
        return touches[index];
      }
    }
    return null;
  };

  const handleScreenTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (isInteractiveTarget(e.target) || screenTouchRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const screenTouch: ScreenTouch = {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      activated: false,
      timer: setTimeout(() => {
        if (screenTouchRef.current !== screenTouch) return;
        screenTouch.activated = true;
        handlePressStart();
      }, SCREEN_PRESS_DELAY),
    };
    screenTouchRef.current = screenTouch;
  };

  const handleScreenTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const screenTouch = screenTouchRef.current;
    const touch = getScreenTouch(e.touches);
    if (!screenTouch || !touch) return;

    const movedX = touch.clientX - screenTouch.startX;
    const movedY = touch.clientY - screenTouch.startY;
    if (!screenTouch.activated) {
      if (Math.hypot(movedX, movedY) > SCREEN_PRESS_MOVE_TOLERANCE) {
        clearScreenTouch();
      }
      return;
    }

    e.preventDefault();
  };

  const handleScreenTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const screenTouch = screenTouchRef.current;
    const touch = getScreenTouch(e.changedTouches);
    if (!screenTouch || !touch) return;
    clearScreenTouch();
    if (screenTouch.activated) void handlePressEnd();
  };

  // Release active input if the component unmounts mid-interaction
  useEffect(
    () => () => {
      listenRef.current?.cancel();
      clearTimeout(screenPressRef.current?.timer);
      screenPressRef.current = null;
      clearTimeout(screenTouchRef.current?.timer);
      screenTouchRef.current = null;
    },
    [],
  );

  /**
   * Guide loop for an already-known question (spoken or typed).
   * `fromVoice` skips the busy guard since the press handlers own the phase.
   */
  const runGuideLoop = async (question: string, fromVoice = false) => {
    if (busy && !fromVoice) return;
    stopSpeaking();
    setAnswer("");

    try {
      const q = question.trim();
      if (!q) throw new Error("I didn't catch that.");

      setQuestion(q);
      setStatusMessage(`Question: ${q}`);

      setPhase("capturing");
      setStatusMessage(
        STUB_CAMERA ? "Stub camera: loading demo frame…" : "Capturing frame…",
      );
      // Image is optional — if the camera fails, still ask without one.
      let blob: Blob | null = null;
      try {
        blob = await getSnapshot(cameraUrl);
        setPreview(URL.createObjectURL(blob));
        setCameraOk(true);
      } catch {
        setPreview(null);
        setCameraOk(false);
      }

      setPhase("analyzing");
      setStatusMessage(
        STUB_ANALYZE ? "Stub vision: writing a canned answer…" : "Asking the AI…",
      );
      const result = await analyzeScene(blob, q);
      setAnswer(result);

      setPhase("speaking");
      setStatusMessage("Speaking answer…");
      await speak(result);

      setPhase("idle");
      setStatusMessage("Ready. Ask again anytime.");
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = typedQuestion.trim();
    if (!q) return;
    void runGuideLoop(q);
  };

  return (
    <div
      className="flex min-h-full flex-1 touch-pan-y flex-col bg-zinc-950 text-zinc-50"
      onPointerDown={handleScreenPointerDown}
      onPointerMove={handleScreenPointerMove}
      onPointerUp={handleScreenPointerEnd}
      onPointerCancel={handleScreenPointerEnd}
      onTouchStart={handleScreenTouchStart}
      onTouchMove={handleScreenTouchMove}
      onTouchEnd={handleScreenTouchEnd}
      onTouchCancel={handleScreenTouchEnd}
    >
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-10">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Clairvoyance
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Guide</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Necklace camera + voice answers. Stubs: mic{" "}
            {STUB_MIC ? "ON" : "OFF"}, camera {STUB_CAMERA ? "ON" : "OFF"}, AI{" "}
            {STUB_ANALYZE ? "ON" : "OFF"}.
          </p>
          <p className="text-sm font-medium text-emerald-300">
            Press and hold anywhere on the screen to activate voice.
          </p>
        </header>

        <StatusBar phase={phase} cameraOk={cameraOk} message={statusMessage} />

        <CameraConfig
          cameraUrl={cameraUrl}
          busy={busy}
          onUrlChange={persistUrl}
          onTest={() => void handleTest()}
        />

        <Preview previewUrl={previewUrl} />

        <AskButton
          busy={busy}
          listening={phase === "listening"}
          onPressStart={handlePressStart}
          onPressEnd={() => void handlePressEnd()}
        />

        <form onSubmit={handleTypedSubmit} className="space-y-2">
          <label className="block space-y-2 text-sm text-zinc-300">
            Or type a question
            <input
              type="text"
              value={typedQuestion}
              disabled={busy}
              onChange={(e) => setTypedQuestion(e.target.value)}
              placeholder="Any obstacles ahead?"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base outline-none ring-emerald-500 placeholder:text-zinc-600 focus:ring-2 disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !typedQuestion.trim()}
            className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-base font-medium hover:bg-zinc-900 disabled:opacity-50"
          >
            Send typed question
          </button>
        </form>

        <AnswerCard
          question={question}
          answer={answer}
          busy={busy}
          onSpeakAgain={() => {
            if (answer) void speak(answer);
          }}
        />

        <p className="pb-6 text-center text-xs text-zinc-600">
          Teammates: see <code className="text-zinc-400">docs/TEAM.md</code>
        </p>
      </main>
    </div>
  );
}
