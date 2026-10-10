type Props = {
  busy: boolean;
  onAsk: () => void;
};

/**
 * Primary control for blind users — large, full-width, clear label.
 * Stub mic: one tap runs listenOnce() (canned question after a short delay).
 * Real mic (Lane C): same handler; listenOnce() will use SpeechRecognition.
 */
export function AskButton({ busy, onAsk }: Props) {
  return (
    <button
      type="button"
      onClick={onAsk}
      disabled={busy}
      aria-label="Ask about what is ahead"
      className="min-h-20 w-full rounded-2xl bg-emerald-500 px-6 py-5 text-xl font-semibold text-zinc-950 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
    >
      {busy ? "Working…" : "Ask what’s ahead"}
    </button>
  );
}
