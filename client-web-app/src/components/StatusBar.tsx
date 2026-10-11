import type { GuidePhase } from "@/lib/types";

type Props = {
  phase: GuidePhase;
  cameraOk: boolean | null;
  message: string;
  /** Inside AskSurface — lighter chrome so the green/red surface reads clearly */
  embedded?: boolean;
};

const PHASE_LABEL: Record<GuidePhase, string> = {
  idle: "Ready",
  listening: "Listening…",
  transcribing: "Got your question…",
  capturing: "Capturing from necklace…",
  analyzing: "Analyzing scene…",
  speaking: "Speaking answer…",
  error: "Error",
};

export function StatusBar({ phase, cameraOk, message, embedded }: Props) {
  const cameraLabel =
    cameraOk === null
      ? "Camera untested"
      : cameraOk
        ? "Camera connected"
        : "Camera offline";

  return (
    <div
      className={
        embedded
          ? "space-y-2 rounded-2xl border border-zinc-950/15 bg-white/90 px-4 py-4"
          : "space-y-2 rounded-2xl border-2 border-zinc-500 bg-zinc-900 px-4 py-4"
      }
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p
        className={`text-xl font-semibold ${
          embedded ? "text-zinc-950" : "text-zinc-50"
        }`}
      >
        <span
          className={
            embedded
              ? "font-bold text-zinc-950"
              : phase === "error"
                ? "text-red-400"
                : "text-emerald-400"
          }
        >
          {PHASE_LABEL[phase]}
        </span>
        <span className={`mx-2 ${embedded ? "text-zinc-800" : "text-zinc-500"}`}>
          ·
        </span>
        <span
          className={
            embedded
              ? "text-zinc-950"
              : cameraOk
                ? "text-zinc-100"
                : "text-amber-300"
          }
        >
          {cameraLabel}
        </span>
      </p>
      {message ? (
        <p
          className={`text-lg leading-relaxed ${
            embedded ? "text-zinc-950" : "text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
