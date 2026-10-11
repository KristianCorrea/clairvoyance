import type { GuidePhase } from "@/lib/types";

type Props = {
  phase: GuidePhase;
  cameraOk: boolean | null;
  message: string;
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

export function StatusBar({ phase, cameraOk, message }: Props) {
  const cameraLabel =
    cameraOk === null
      ? "Camera untested"
      : cameraOk
        ? "Camera connected"
        : "Camera offline";

  return (
    <div
      className="space-y-2 rounded-2xl border-2 border-zinc-500 bg-zinc-900 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-xl font-semibold text-zinc-50">
        <span className={phase === "error" ? "text-red-400" : "text-emerald-400"}>
          {PHASE_LABEL[phase]}
        </span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className={cameraOk ? "text-zinc-100" : "text-amber-300"}>
          {cameraLabel}
        </span>
      </p>
      {message ? (
        <p className="text-lg leading-relaxed text-zinc-100">{message}</p>
      ) : null}
    </div>
  );
}
