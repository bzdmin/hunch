import type { Metadata } from "next";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { ExperimentHeader } from "@/app/experiment-header";
import { nim } from "@/lib/message";
import { getPair } from "@/lib/pair";
import Respond from "./respond";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = "Trust · Hunch";
  const desc = "A stranger just trusted you with real NIM that tripled in your hands. How much will you send back?";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `/t/${id}`,
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
    },
  };
}

export const dynamic = "force-dynamic";

/**
 * What the second player lands on.
 *
 * Server-rendered, so it works in any browser with no wallet, this is a link sent
 * over a messenger to someone who may never have heard of any of this.
 *
 * It must never leak the first player's prediction. That number is the whole reveal;
 * showing it here would let the second player answer to it rather than honestly, and
 * the round would measure nothing.
 */
export default async function TrustLanding({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pair = await getPair(id);

  if (!pair || !pair.a) {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Trust" index={2} />
        <h1>That round isn&rsquo;t there.</h1>
        <p className="soft">
          The link may be mistyped, or the round was never finished. Nothing is lost
, you can start your own.
        </p>
        <div className="grow" />
        <Link href="/about" className="btn">What is {NAME}?</Link>
      </main>
    );
  }

  const pot = pair.stake * pair.multiplier;
  const done = pair.status === "revealed";
  const expired = pair.status === "expired";

  // Finished/expired states have nothing for Respond to do but point back
  // to a fresh round, a plain narrow screen fits that fine, splitting it
  // into a column with nothing beside it would not.
  if (done || expired) {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Trust" index={2} />
        {expired ? (
          <>
            <h1>This invite expired.</h1>
            <p className="soft">
              Nobody answered it in time. Nothing is lost, you can start your
              own round right now.
            </p>
          </>
        ) : (
          <>
            <h1>This round is already finished.</h1>
            <p className="soft">
              Someone else answered it first. You can start one of your own,
              it takes about a minute.
            </p>
          </>
        )}
        <div className="grow" />
        <Respond id={pair.id} stake={pair.stake} multiplier={pair.multiplier} finished />
        {expired && (
          <Link href="/about" className="faint" style={{ textAlign: "center" }}>
            What is {NAME}?
          </Link>
        )}
      </main>
    );
  }

  return (
    <main className="screen game">
      <ExperimentHeader experiment="Trust" index={2} />
      <div className="game-shell">
        <div className="game-context">
          {/* Deliberately no NIM figures here. Leading with the tripled total turns
              this into a math problem, how much of a big number do I keep, before the
              person has even weighed the fact that a stranger trusted them with
              everything. The pot size only appears later, on the decide card, where
              it is functionally needed to set an amount. Same anchor fix as Split.
              This heading persists across every stage Respond renders (decide,
              predict, done), same as it always has, just beside them now instead
              of only above them. */}
          <h1>A stranger just trusted you with everything they had.</h1>
          <p className="soft">
            They could have kept it. They handed it to you instead, and it grew
            because of that. How much comes back to them is entirely your call, and
            keeping all of it costs you nothing.
          </p>
        </div>

        <div className="game-card">
          {/* Renders the install route by default and swaps itself for the real
              decision if the visitor turns out to be inside Nimiq Pay. */}
          <Respond id={pair.id} stake={pair.stake} multiplier={pair.multiplier} finished={false} />
          <Link href="/about" className="faint" style={{ textAlign: "center" }}>
            What is {NAME}?
          </Link>
        </div>
      </div>
    </main>
  );
}
