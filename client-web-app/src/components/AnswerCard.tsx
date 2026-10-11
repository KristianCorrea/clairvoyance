type Props = {
  question: string;
  answer: string;
  /** Inside AskSurface — high-contrast text on green/red */
  embedded?: boolean;
};

/** Question + answer only (Speak again stays outside the hold surface). */
export function AnswerCard({ question, answer, embedded }: Props) {
  const labelClass = embedded
    ? "text-base font-semibold uppercase tracking-wide text-zinc-900"
    : "text-base font-semibold uppercase tracking-wide text-zinc-300";
  const bodyClass = embedded
    ? "mt-2 text-xl leading-relaxed text-zinc-950"
    : "mt-2 text-xl leading-relaxed text-zinc-50";
  const answerClass = embedded
    ? "mt-2 text-2xl leading-relaxed text-zinc-950"
    : "mt-2 text-2xl leading-relaxed text-zinc-50";

  if (!question && !answer) {
    return (
      <div
        aria-label="Answer"
        className={
          embedded
            ? "rounded-2xl border-2 border-dashed border-zinc-950/25 bg-white/90 p-5 text-lg text-zinc-950"
            : "rounded-2xl border-2 border-dashed border-zinc-500 p-5 text-lg text-zinc-200"
        }
      >
        Your answer will appear here after you ask.
      </div>
    );
  }

  return (
    <div
      aria-label="Answer"
      className={
        embedded
          ? "space-y-4 rounded-2xl border border-zinc-950/15 bg-white/90 p-5"
          : "space-y-4 rounded-2xl border-2 border-zinc-500 bg-zinc-900 p-5"
      }
      aria-live="assertive"
    >
      {question ? (
        <div>
          <h2 className={labelClass}>You asked</h2>
          <p className={bodyClass}>{question}</p>
        </div>
      ) : null}
      {answer ? (
        <div>
          <h2 className={labelClass}>Answer</h2>
          <p className={answerClass}>{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
