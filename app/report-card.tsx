import type { CSSProperties, ReactNode } from "react";
import { NAME } from "@/lib/brand";
import { Mark } from "@/app/mark";

/**
 * The reveal's report card, shared by Trust and Ultimatum's four reveal
 * surfaces (each side, each experiment) so a rewrite of the shape only ever
 * happens in one place.
 *
 * Three sections, always in this order, because the narrative is always the
 * same shape regardless of which experiment or which seat is reading it:
 *   CALL          what you actually decided
 *   HUNCH         what you guessed about the other person
 *   WHAT HAPPENED the real number that resolves the hunch
 * The verdict line answers the question the whole card was building to,
 * a percentile once there is a real population to rank against
 * (see guessPercentile in lib/pair.ts), otherwise the qualitative tier from
 * guessAccuracyClause() in lib/copy.ts. Never both, and never a percentile
 * computed from too small a sample pretending to be a real statistic.
 */
export function ReportCard({
  experiment,
  color,
  call,
  hunch,
  outcome,
  verdictLabel,
  verdictValue,
  children,
}: {
  experiment: string;
  /** a CSS color expression, e.g. "var(--good)" */
  color: string;
  call: ReactNode;
  hunch: ReactNode;
  outcome: ReactNode;
  verdictLabel: string;
  verdictValue: ReactNode;
  /** extra content after the three sections, before the verdict line, e.g. a
   * split-readout of final balances */
  children?: ReactNode;
}) {
  return (
    <div className="report" style={{ "--pick-color": color } as CSSProperties}>
      <div className="brand">
        <span className="name"><Mark /> {NAME.toUpperCase()}</span>
        <span className="exp">{experiment}</span>
      </div>

      <div className="section">
        <p className="label">Your call</p>
        <p>{call}</p>
      </div>
      <div className="section">
        <p className="label">Your hunch</p>
        <p>{hunch}</p>
      </div>
      <div className="section">
        <p className="label">What happened</p>
        <p>{outcome}</p>
      </div>

      {children}

      <div className="verdict-line">
        <p className="label">{verdictLabel}</p>
        <p className="big">{verdictValue}</p>
      </div>
    </div>
  );
}
