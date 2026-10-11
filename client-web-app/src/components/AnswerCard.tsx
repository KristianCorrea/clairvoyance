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
        className="rounded-2xl border-2 border-dashed border-zinc-500 p-5 text-lg text-zinc-200"
      >
        Your answer will appear here after you ask.
      </section>
    );
  }

  return (
    <section
      aria-label="Answer"
      className="space-y-4 rounded-2xl border-2 border-zinc-500 bg-zinc-900 p-5"
      aria-live="assertive"
    >
      {question ? (
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wide text-zinc-300">
            You asked
          </h2>
          <p className="mt-2 text-xl leading-relaxed text-zinc-50">{question}</p>
        </div>
      ) : null}
      {answer ? (
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wide text-zinc-300">
            Answer
          </h2>
          <p className="mt-2 text-2xl leading-relaxed text-zinc-50">{answer}</p>
        </div>
      ) : null}
      {answer ? (
        <button
          type="button"
          onClick={onSpeakAgain}
          disabled={busy}
          className="min-h-14 w-full rounded-xl border-2 border-zinc-400 px-4 py-4 text-lg font-semibold text-zinc-50 hover:bg-zinc-800 disabled:opacity-50"
        >
          Speak again
        </button>
      ) : null}
    </section>
  );
}
