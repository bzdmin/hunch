import Link from "next/link";
import { NAME } from "@/lib/brand";
import { ExperimentHeader } from "@/app/experiment-header";
import { getPair } from "@/lib/pair";
import Respond from "./respond";

export const dynamic = "force-dynamic";

/**
 * What the second player lands on for Ultimatum.
 *
 * Server-rendered, works in any browser with no wallet, same reason as Trust's
 * landing page, this is a link sent to someone who has not opened Hunch before.
 *
 * No figures here, and none on the decide screen either. B sets their threshold
 * before seeing the offer, so at the moment this page is read, showing the stake
 * would let B do arithmetic on a number that is about to become an anchor for a
 * decision meant to be made on principle, not on a spreadsheet.
 */
export default async function UltimatumLanding({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pair = await getPair(id);

  if (!pair || !pair.a) {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Ultimatum" index={3} />
        <h1>That round isn&rsquo;t there.</h1>
        <p className="soft">
          The link may be mistyped, or the round was never finished. Nothing is
          lost, you can start your own.
        </p>
        <div className="grow" />
        <Link href="/about" className="btn">What is {NAME}?</Link>
      </main>
    );
  }

  const done = pair.status === "revealed";
  const expired = pair.status === "expired";

  // Finished/expired states have nothing for Respond to do but point back
  // to a fresh round, a plain narrow screen fits that fine, splitting it
  // into a column with nothing beside it would not.
  if (done || expired) {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Ultimatum" index={3} />
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
              Someone else answered it first. You can start one of your own, it
              takes about a minute.
            </p>
          </>
        )}
        <div className="grow" />
        <Respond id={pair.id} finished />
        <Link href="/about" className="faint" style={{ textAlign: "center" }}>
          What is {NAME}?
        </Link>
      </main>
    );
  }

  return (
    <main className="screen game">
      <ExperimentHeader experiment="Ultimatum" index={3} />
      <div className="game-shell">
        <div className="game-context">
          <h1>A stranger is offering you a share of something real.</h1>
          <p className="soft">
            You set the least you&rsquo;ll accept before you see what they
            offered. If their offer falls below your line, neither of you gets
            anything, not even the share they meant to keep for themselves.
          </p>
        </div>

        <div className="game-card">
          <Respond id={pair.id} finished={false} />
          <Link href="/about" className="faint" style={{ textAlign: "center" }}>
            What is {NAME}?
          </Link>
        </div>
      </div>
    </main>
  );
}
