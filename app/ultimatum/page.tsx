import Link from "next/link";
import { NAME, ULTIMATUM_MAX_STAKE, ULTIMATUM_STAKE_OPTIONS_NIM } from "@/lib/brand";
import { ultimatumOpen } from "@/lib/payout";
import { randomWorkedExample, findWaitingRound, payoff } from "@/lib/pair";
import Flow from "./flow";

export const dynamic = "force-dynamic";

/**
 * Ultimatum, the first player's side.
 *
 * House-funded, same reasoning as Trust: the money has to exist before a round is
 * allowed to promise it. Cheaper than Trust round for round, accepted redistributes
 * exactly the stake, rejected pays nobody, nothing is ever multiplied.
 *
 * Unlike Trust, there is no early exit. Trust's first player can keep everything
 * and end the round alone. Ultimatum always needs a second person, an offer with
 * nobody to accept or refuse it settles nothing.
 */
export default async function UltimatumPage() {
  const [funded, waiting] = await Promise.all([
    ultimatumOpen(ULTIMATUM_MAX_STAKE),
    findWaitingRound("ultimatum"),
  ]);

  // A real round already sitting open costs nothing new to answer, the house
  // already promised it the moment the first player committed, so it is
  // offered here even when new rounds are paused below.
  const waitingCard = waiting && (
    <div className="card">
      <h2>Someone&rsquo;s waiting for an answer</h2>
      <p className="soft" style={{ marginTop: "0.5rem" }}>
        A real offer is already on the table, waiting to find out whether
        you&rsquo;d accept it. No invite needed.
      </p>
      <Link href={`/u/${waiting.id}`} className="btn" style={{ marginTop: "0.9rem" }}>
        Answer their offer &rarr;
      </Link>
    </div>
  );

  if (!funded) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum</p>
        <h1>Ultimatum isn&rsquo;t open yet.</h1>
        <p className="soft">
          You offer a stranger a share of somewhere between{" "}
          {ULTIMATUM_STAKE_OPTIONS_NIM[0]} and{" "}
          {ULTIMATUM_STAKE_OPTIONS_NIM[ULTIMATUM_STAKE_OPTIONS_NIM.length - 1]} NIM.
          They set the least they&rsquo;ll accept before they ever see your offer. If
          it&rsquo;s too low, <span className="hl">you both walk away with nothing</span>.
        </p>
        <p className="soft">
          That money has to be sitting somewhere before the round can promise it.
          Until it is, opening this would mean promising money that can&rsquo;t be paid.
        </p>

        {waitingCard}

        <div className="card">
          <h2>Meanwhile</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Split is live and runs on real NIM right now. One decision, one guess,
            about a minute.
          </p>
        </div>

        <div className="grow" />
        <Link href="/split" className="btn">Play Split instead</Link>
        <Link href="/about" className="btn ghost">What is {NAME}?</Link>
      </main>
    );
  }

  // A real completed round, shown before A's first offer instead of instructions.
  // Ultimatum is already one of the better-understood paradigms (26% misunderstood
  // versus Trust's 62-70%, Johannesson 2025), so this is a smaller fix than Trust's,
  // but it costs almost nothing to add and reinforces the one consequence that
  // matters: an offer that falls short costs both sides everything.
  const example = await randomWorkedExample("ultimatum");
  const worked = example
    ? {
        stake: example.stake,
        offerPct: Math.round((example.a!.move / example.stake) * 100),
        thresholdPct: example.b!.move,
        accepted: payoff(example).note === "accepted",
      }
    : null;

  return <Flow example={worked} waiting={waiting ? { id: waiting.id } : null} />;
}
