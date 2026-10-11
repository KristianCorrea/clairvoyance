import type { FormEvent } from "react";
import { Preview } from "@/components/Preview";

type Props = {
  stubMic: boolean;
  stubCamera: boolean;
  stubAnalyze: boolean;
  previewUrl: string | null;
  typedQuestion: string;
  busy: boolean;
  onTypedChange: (value: string) => void;
  onTypedSubmit: (e: FormEvent) => void;
  onChangeCamera: () => void;
};

/**
 * Collapsed-by-default panel for stubs, preview, typed questions, reconnect.
 */
export function DebugPanel({
  stubMic,
  stubCamera,
  stubAnalyze,
  previewUrl,
  typedQuestion,
  busy,
  onTypedChange,
  onTypedSubmit,
  onChangeCamera,
}: Props) {
  return (
    <details className="rounded-2xl border-2 border-zinc-600 bg-zinc-900 open:pb-2">
      <summary className="cursor-pointer select-none px-4 py-4 text-lg font-semibold text-zinc-100 marker:text-zinc-400">
        Debug
      </summary>

      <div className="space-y-5 border-t border-zinc-700 px-4 py-4">
        <p className="text-base text-zinc-200">
          Stubs: mic {stubMic ? "ON" : "OFF"}, camera {stubCamera ? "ON" : "OFF"},
          AI {stubAnalyze ? "ON" : "OFF"}.
        </p>

        <Preview previewUrl={previewUrl} />

        <form onSubmit={onTypedSubmit} className="space-y-3">
          <label className="block space-y-2 text-base text-zinc-100">
            Type a question
            <input
              type="text"
              value={typedQuestion}
              disabled={busy}
              onChange={(e) => onTypedChange(e.target.value)}
              placeholder="Any obstacles ahead?"
              className="w-full rounded-xl border-2 border-zinc-500 bg-zinc-950 px-4 py-3 text-lg text-zinc-50 outline-none ring-emerald-400 placeholder:text-zinc-500 focus:ring-4 disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !typedQuestion.trim()}
            className="min-h-12 w-full rounded-xl border-2 border-zinc-400 px-4 py-3 text-lg font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
          >
            Send typed question
          </button>
        </form>

        <button
          type="button"
          onClick={onChangeCamera}
          disabled={busy}
          className="min-h-12 w-full rounded-xl border-2 border-amber-500/80 px-4 py-3 text-lg font-medium text-amber-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          Change camera
        </button>
      </div>
    </details>
  );
}
