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
    cameraOk === null ? "Camera untested" : cameraOk ? "Camera OK" : "Camera offline";

  return (
    <div
      className="space-y-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-sm font-medium text-emerald-400">
        {PHASE_LABEL[phase]}
        <span className="mx-2 text-zinc-600">·</span>
        <span className={cameraOk ? "text-zinc-300" : "text-amber-400"}>
          {cameraLabel}
        </span>
      </p>
      {message ? (
        <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
      ) : null}
    </div>
  );
}
