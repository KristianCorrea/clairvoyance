import type { Ref } from "react";

type Props = {
  busy: boolean;
  listening: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

/**
 * Primary control for blind users — large, full-width, clear label.
 * Push-to-talk: hold (pointer, or Space/Enter) to record, release to send.
 */
export function AskButton({
  busy,
  listening,
  onPressStart,
  onPressEnd,
  buttonRef,
}: Props) {
  // Stay enabled while listening — a disabled button never gets pointerup.
  const disabled = busy && !listening;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-pressed={listening}
      aria-label={
        listening
          ? "Listening, release to send"
          : busy
            ? "Working, please wait"
            : "Hold to ask about what is ahead"
      }
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onPressStart();
      }}
      onPointerUp={onPressEnd}
      onPointerCancel={onPressEnd}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          onPressStart();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onPressEnd();
        }
      }}
      onBlur={onPressEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={`min-h-28 w-full touch-none select-none rounded-3xl px-6 py-8 text-2xl font-bold text-zinc-950 shadow-lg shadow-emerald-900/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none ${
        listening ? "bg-red-500" : "bg-emerald-500 hover:bg-emerald-400"
      }`}
    >
      {listening ? "Listening… release to send" : busy ? "Working…" : "Hold to ask"}
    </button>
  );
}
