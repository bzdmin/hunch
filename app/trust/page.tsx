import Link from "next/link";
import { NAME, TRUST_MAX_STAKE, TRUST_STAKE_OPTIONS_NIM } from "@/lib/brand";
import { trustOpen } from "@/lib/payout";
import { randomWorkedExample, payoff } from "@/lib/pair";
import Flow from "./flow";

export const dynamic = "force-dynamic";

/**
 * Trust, the first player's side.
 *
 * Unlike Split, this CANNOT run on the player's own money. Handing over the stake
 * and having it triple means someone funded the difference, and that someone is the
 * house. There is no self-funded version of a multiplier, so rather than quietly
 * degrade into a different game, the experiment refuses to open when it cannot pay.
 *
 * The stake is random per round (see randomTrustStake in lib/brand.ts), so the gate
 * checks the worst case, the largest possible draw, tripled, not any one value.
 * Flow discovers the actual stake for its own round by creating it on mount.
 */
export default async function TrustPage() {
  const funded = await trustOpen(TRUST_MAX_STAKE * 3);

  if (!funded) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <h1>Trust isn&rsquo;t open yet.</h1>
        <p className="soft">
          In this one you hand over somewhere between{" "}
          {TRUST_STAKE_OPTIONS_NIM[0]} and{" "}
          {TRUST_STAKE_OPTIONS_NIM[TRUST_STAKE_OPTIONS_NIM.length - 1]} NIM, and it{" "}
          <span className="hl">triples</span> in the other person&rsquo;s hands. They
          then decide how much comes back to you, possibly nothing.
        </p>
        <p className="soft">
          That extra money has to come from somewhere, and it isn&rsquo;t your wallet.
          Until the pot behind it is funded, opening this would mean promising money
          that can&rsquo;t be paid.
        </p>

        <div className="card">
          <h2>Meanwhile</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Split is live and runs on real money right now. One decision, one guess,
            about a minute.
          </p>
        </div>

        <div className="grow" />
        <Link href="/split" className="btn">Play Split instead</Link>
        <Link href="/about" className="btn ghost">What is {NAME}?</Link>
      </main>
    );
  }

  // A real completed round, shown before A's first decision instead of
  // instructions. See randomWorkedExample() in lib/pair.ts for why.
  const example = await randomWorkedExample("trust");
  const worked = example
    ? { stake: example.stake, returned: example.b!.move, final: payoff(example).a }
    : null;

  return <Flow example={worked} />;
}
