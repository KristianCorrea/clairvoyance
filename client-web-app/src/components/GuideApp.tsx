"use client";

/**
 * Lane A — UI orchestration only.
 *
 * This component wires the guide loop. It should NOT contain camera/STT/AI
 * business logic — call into src/lib/* instead so other lanes can ship PRs
 * without fighting over this file.
 *
 * Loop: listenOnce → getSnapshot → analyzeScene → speak
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
import { listenOnce, speak, stopSpeaking } from "@/lib/speech";
import type { GuidePhase } from "@/lib/types";

const STORAGE_KEY = "clairvoyance.cameraUrl";
const DEFAULT_URL = "http://192.168.4.1";

export function GuideApp() {
  const [phase, setPhase] = useState<GuidePhase>("idle");
  const [cameraUrl, setCameraUrl] = useState(DEFAULT_URL);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Stubs enabled — tap Ask to hear a full demo loop.",
  );
  const [question, setQuestion] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

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

  /**
   * Full guide loop. `overrideQuestion` skips STT (typed fallback).
   */
  const runGuideLoop = async (overrideQuestion?: string) => {
    if (busy) return;
    stopSpeaking();
    setAnswer("");

    try {
      let q = overrideQuestion?.trim() ?? "";

      if (!q) {
        setPhase("listening");
        setStatusMessage(
          STUB_MIC
            ? "Stub mic: pretending to listen…"
            : "Listening — speak your question.",
        );
        q = await listenOnce();
        setPhase("transcribing");
      }

      setQuestion(q);
      setStatusMessage(`Question: ${q}`);

      setPhase("capturing");
      setStatusMessage(
        STUB_CAMERA ? "Stub camera: loading demo frame…" : "Capturing frame…",
      );
      const blob = await getSnapshot(cameraUrl);
      setPreview(URL.createObjectURL(blob));
      setCameraOk(true);

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
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
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
        </header>

        <StatusBar phase={phase} cameraOk={cameraOk} message={statusMessage} />

        <CameraConfig
          cameraUrl={cameraUrl}
          busy={busy}
          onUrlChange={persistUrl}
          onTest={() => void handleTest()}
        />

        <Preview previewUrl={previewUrl} />

        <AskButton busy={busy} onAsk={() => void runGuideLoop()} />

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
