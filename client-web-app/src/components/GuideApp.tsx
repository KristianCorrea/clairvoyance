"use client";

/**
 * Lane A — UI orchestration only.
 *
 * Screens: Connect (always on load) → Guide (status → Ask → Answer → Debug).
 * Loop: hold button → startListening → release → getSnapshot → analyzeScene → speak
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnswerCard } from "@/components/AnswerCard";
import { AskButton } from "@/components/AskButton";
import { ConnectScreen } from "@/components/ConnectScreen";
import { DebugPanel } from "@/components/DebugPanel";
import { StatusBar } from "@/components/StatusBar";
import { analyzeScene } from "@/lib/analyze";
import { getSnapshot, testCamera } from "@/lib/camera";
import { STUB_ANALYZE, STUB_CAMERA, STUB_MIC } from "@/lib/flags";
import { startListening, speak, stopSpeaking } from "@/lib/speech";
import type { ListenSession } from "@/lib/speech";
import type { GuidePhase } from "@/lib/types";

const STORAGE_KEY = "clairvoyance.cameraUrl";
const DEFAULT_URL = "http://192.168.4.1";

type Gate = "connect" | "guide";

export function GuideApp() {
  const [gate, setGate] = useState<Gate>("connect");
  const [phase, setPhase] = useState<GuidePhase>("idle");
  const [cameraUrl, setCameraUrl] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_URL;
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  });
  const [cameraOk, setCameraOk] = useState<boolean | null>(
    STUB_CAMERA ? true : null,
  );
  const [statusMessage, setStatusMessage] = useState(
    STUB_CAMERA
      ? "Stub camera enabled — Activate anytime, or set NEXT_PUBLIC_STUB_CAMERA=0 for hardware."
      : "Enter the camera URL and tap Test connection.",
  );
  const [question, setQuestion] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const listenRef = useRef<ListenSession | null>(null);
  const askButtonRef = useRef<HTMLButtonElement | null>(null);

  const busy = phase !== "idle" && phase !== "error";

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
    // URL changed after a test — require a new Test (unless stub force-pass).
    if (!STUB_CAMERA) {
      setCameraOk(null);
    }
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
    if (STUB_CAMERA) {
      setCameraOk(true);
      setStatusMessage(
        "Stub camera OK — Activate guide whenever you’re ready.",
      );
      void speak("Stub camera ready.").catch(() => undefined);
      return;
    }
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

  const handleActivate = () => {
    if (!STUB_CAMERA && cameraOk !== true) return;
    setGate("guide");
    setPhase("idle");
    setStatusMessage("Guide ready. Hold to ask what’s ahead.");
    void speak("Guide ready.").catch(() => undefined);
  };

  // After Activate, move focus to the primary Hold control.
  useEffect(() => {
    if (gate !== "guide") return;
    askButtonRef.current?.focus();
  }, [gate]);

  const handleChangeCamera = () => {
    if (busy) return;
    listenRef.current?.cancel();
    listenRef.current = null;
    stopSpeaking();
    setGate("connect");
    setPhase("idle");
    setQuestion("");
    setAnswer("");
    setStatusMessage(
      STUB_CAMERA
        ? "Stub camera enabled — Activate anytime."
        : "Camera URL changed or reconnecting — test again before activating.",
    );
  };

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

  useEffect(() => () => listenRef.current?.cancel(), []);

  const runGuideLoop = async (questionText: string, fromVoice = false) => {
    if (busy && !fromVoice) return;
    stopSpeaking();
    setAnswer("");

    try {
      const q = questionText.trim();
      if (!q) throw new Error("I didn't catch that.");

      setQuestion(q);
      setStatusMessage(`Question: ${q}`);

      setPhase("capturing");
      setStatusMessage(
        STUB_CAMERA ? "Stub camera: loading demo frame…" : "Capturing frame…",
      );
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

  if (gate === "connect") {
    return (
      <ConnectScreen
        cameraUrl={cameraUrl}
        busy={busy}
        stubCamera={STUB_CAMERA}
        cameraOk={cameraOk}
        statusMessage={statusMessage}
        onUrlChange={persistUrl}
        onTest={() => void handleTest()}
        onActivate={handleActivate}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 py-8">
        <header className="space-y-1">
          <p className="text-base font-semibold uppercase tracking-widest text-emerald-400">
            Clairvoyance
          </p>
          <h1 className="sr-only">Guide</h1>
        </header>

        <StatusBar phase={phase} cameraOk={cameraOk} message={statusMessage} />

        <AskButton
          buttonRef={askButtonRef}
          busy={busy}
          listening={phase === "listening"}
          onPressStart={handlePressStart}
          onPressEnd={() => void handlePressEnd()}
        />

        <AnswerCard
          question={question}
          answer={answer}
          busy={busy}
          onSpeakAgain={() => {
            if (answer) void speak(answer);
          }}
        />

        <DebugPanel
          stubMic={STUB_MIC}
          stubCamera={STUB_CAMERA}
          stubAnalyze={STUB_ANALYZE}
          previewUrl={previewUrl}
          typedQuestion={typedQuestion}
          busy={busy}
          onTypedChange={setTypedQuestion}
          onTypedSubmit={handleTypedSubmit}
          onChangeCamera={handleChangeCamera}
        />
      </main>
    </div>
  );
}
