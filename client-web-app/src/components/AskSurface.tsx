import type { ReactNode, Ref } from "react";

type Props = {
  busy: boolean;
  listening: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  surfaceRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

/**
 * Large hold-to-ask hit target wrapping status + Q&A.
 * Not a <button> so nested content stays valid; keyboard Space/Enter still work.
 */
export function AskSurface({
  busy,
  listening,
  onPressStart,
  onPressEnd,
  surfaceRef,
  children,
}: Props) {
  const disabled = busy && !listening;

  const label = listening
    ? "Listening, release to send"
    : busy
      ? "Working, please wait"
      : "Hold anywhere to ask about what is ahead";

  return (
    <div
      ref={surfaceRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={listening}
      aria-label={label}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPressStart();
      }}
      onPointerUp={() => {
        if (disabled) return;
        onPressEnd();
      }}
      onPointerCancel={() => {
        if (disabled) return;
        onPressEnd();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          onPressStart();
        }
      }}
      onKeyUp={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onPressEnd();
        }
      }}
      onBlur={onPressEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex min-h-[55vh] flex-1 touch-none select-none flex-col gap-5 rounded-3xl border-4 p-5 outline-none transition focus-visible:ring-4 focus-visible:ring-white ${
        disabled
          ? "cursor-not-allowed border-amber-100 bg-amber-300"
          : listening
            ? "cursor-pointer border-red-200 bg-red-500"
            : "cursor-pointer border-emerald-200 bg-emerald-400 hover:bg-emerald-300"
      }`}
    >
      {children}
      <p className="mt-auto text-center text-2xl font-bold text-zinc-950">
        {listening
          ? "Listening… release to send"
          : busy
            ? "Working…"
            : "Hold anywhere to ask"}
      </p>
    </div>
  );
}
