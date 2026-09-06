import Link from "next/link";
import { NAME, TAGLINE, STAKE_NIM } from "@/lib/brand";
import { SPLIT_MEAN_GIVEN } from "@/lib/benchmarks";
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
      <h1>{TAGLINE}</h1>
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

      <p className="faint">
        {played > 0
          ? `${played} ${played === 1 ? "person has" : "people have"} played so far.`
          : "Nobody has played yet. You'd be first."}{" "}
        Published studies put the average at {SPLIT_MEAN_GIVEN.value}%.
      </p>
    </main>
  );
}
