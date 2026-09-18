import { NAME } from "@/lib/brand";

/**
 * The one piece of chrome Split, Trust, and Ultimatum all share, so they
 * read as three experiments inside one product rather than three unrelated
 * screens: the name of this experiment on the left, its place among the
 * three on the right. Deliberately not a progress bar or a step count
 * within the experiment's own flow, that already has its own indicator
 * where it matters (see .locked, "your answer, locked"), this is product-
 * level orientation, not task-level.
 */
export function ExperimentHeader({
  experiment,
  index,
}: {
  experiment: string;
  index: 1 | 2 | 3;
}) {
  return (
    <div className="exp-header">
      <p className="eyebrow">{NAME} &middot; {experiment}</p>
      <p className="eyebrow">{String(index).padStart(2, "0")} / 03</p>
    </div>
  );
}
