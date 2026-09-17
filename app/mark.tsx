/**
 * The Hunch mark.
 *
 * Not a brain, eye, crystal ball, or question mark, on purpose, those all
 * read as "guessing" or "thinking", and the product is not about either.
 * It's about a call resolving into an outcome: an open shape with one corner
 * already decided. The diamond is the open question, every experiment's
 * decide/predict stage before reveal. The filled corner is the signal, the
 * moment a hunch becomes a fact. Same shape at every size, one colour so it
 * works as a favicon, a header mark, and a corner of the report and share
 * cards without ever needing a second version.
 *
 * currentColor by default so it inherits ink or a --pick-color context, e.g.
 * inside a coloured report card, without a size prop, just its CSS width.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ width: "1em", height: "1em", display: "inline-block", verticalAlign: "middle" }}
    >
      <path
        d="M12 2 L22 12 L12 22 L2 12 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 2 L22 12 L12 12 Z" fill="currentColor" />
    </svg>
  );
}
