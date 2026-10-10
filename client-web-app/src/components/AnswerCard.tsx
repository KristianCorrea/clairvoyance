type Props = {
  question: string;
  answer: string;
  busy: boolean;
  onSpeakAgain: () => void;
};

export function AnswerCard({ question, answer, busy, onSpeakAgain }: Props) {
  if (!question && !answer) {
    return (
      <section
        aria-label="Answer"
        className="rounded-2xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-500"
      >
        Your question and the spoken answer will show up here.
      </section>
    );
  }

  return (
    <section
      aria-label="Answer"
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
      aria-live="assertive"
    >
      {question ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            You asked
          </h2>
          <p className="mt-1 text-base text-zinc-200">{question}</p>
        </div>
      ) : null}
      {answer ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Answer
          </h2>
          <p className="mt-1 text-lg leading-relaxed text-zinc-50">{answer}</p>
        </div>
      ) : null}
      {answer ? (
        <button
          type="button"
          onClick={onSpeakAgain}
          disabled={busy}
          className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-base font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          Speak again
        </button>
      ) : null}
    </section>
  );
}
