import Link from "next/link";
import { NAME, TAGLINE, STAKE_NIM } from "@/lib/brand";
import { totalPlayers } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The entry screen. Three questions, not three "experiments", the word experiment
 * is internal vocabulary and stays out of the interface.
 *
 * Split is playable immediately with no partner and no waiting, which is the whole
 * reason solo mode exists: someone who discovers this should never need a friend to
 * be available before anything happens.
 */
export default async function Home() {
  const played = await totalPlayers();

  return (
    <main className="screen">
      <p className="eyebrow">{NAME}</p>
      <h1>Can you predict <span className="hl">another human</span>?</h1>
      <p className="soft">
        Real money, one decision, and then you find out what everyone else did,
        and what researchers found running the same test on thousands of people.
      </p>

      <Link href="/split" className="btn">
        Start with {STAKE_NIM.toLocaleString()} NIM
      </Link>

      <div className="card">
        <h2>What would you keep?</h2>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          You have money on the table and one choice about how much of it to pass to
          a stranger. Nobody will know what you chose. Then guess what everyone else
          does, that&rsquo;s the part that&rsquo;s hard to get right.
        </p>
      </div>

      <div className="grow" />

      {/* Big number, small label. Says what this is at a glance, without a paragraph. */}
      <div className="stats">
        <div>
          <span className="n">{played}</span>
          <span className="l">{played === 1 ? "person has played" : "people have played"}</span>
        </div>
        <div>
          <span className="n">{STAKE_NIM.toLocaleString()}</span>
          <span className="l">NIM to decide over</span>
        </div>
        <div>
          <span className="n">60s</span>
          <span className="l">a round</span>
        </div>
      </div>
    </main>
  );
}
