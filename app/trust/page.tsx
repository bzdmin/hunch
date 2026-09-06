import Link from "next/link";
import { NAME, STAKE, STAKE_NIM } from "@/lib/brand";
import { houseFunded } from "@/lib/payout";
import Flow from "./flow";

export const dynamic = "force-dynamic";

/**
 * Trust, the first player's side.
 *
 * Unlike Split, this CANNOT run on the player's own money. Handing over 1,000 NIM
 * and having 3,000 arrive means someone funded the difference, and that someone is
 * the house. There is no self-funded version of a multiplier, so rather than quietly
 * degrade into a different game, the experiment refuses to open when it cannot pay.
 */
export default async function TrustPage() {
  const funded = await houseFunded(STAKE);

  if (!funded) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <h1>Trust isn&rsquo;t open yet.</h1>
        <p className="soft">
          In this one you hand over {STAKE_NIM.toLocaleString()} NIM and it{" "}
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

  return <Flow stake={STAKE} multiplier={3} />;
}
