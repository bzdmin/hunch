import type { Metadata } from "next";
import Link from "next/link";
import Enter from "./enter";
import { NAME } from "@/lib/brand";
import { ExperimentHeader } from "@/app/experiment-header";
import { nim } from "@/lib/message";
import { get } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ session: string }>;
}): Promise<Metadata> {
  const { session } = await params;
  const from = await get(session);
  const waiting = from?.give ?? 0;
  const title = waiting > 0 ? `Someone passed you ${nim(waiting)} NIM · Hunch` : "Split · Hunch";
  const desc = "You've been invited to make a decision in Hunch. What will you keep, and what will you pass on?";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `/e/${session}`,
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
    },
  };
}

/**
 * What a stranger sees when they tap a shared link.
 *
 * Gate 1, test 7: a phone with no Nimiq Pay currently gets "no provider found",
 * which is a developer error message, not an invitation. This screen is the whole
 * acquisition loop, it is the first thing a new person ever sees and the only
 * reason the product spreads. It must work in an ordinary mobile browser, outside
 * Nimiq Pay, with no wallet and no context.
 *
 * Rules, in order of importance:
 *   1. Say what is waiting for them before anything else.
 *   2. Never say "wallet", "crypto" or "blockchain" above the fold.
 *   3. Installing Nimiq Pay is the way to collect it, not a precondition to read on.
 */

export default async function Landing({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  const { session } = await params;
  const from = await get(session);
  const waiting = from?.give ?? 0;

  return (
    <main className="screen game">
      <ExperimentHeader experiment="Split" index={1} />
      <div className="game-shell">
        <div className="game-context">
          {waiting > 0 ? (
            <>
              <h1>Someone passed you {nim(waiting)} NIM.</h1>
              {/* The wording has to match how that player actually got their money.
                  Saying "they were given a sum" about a self-mode player describes a
                  windfall that never happened, the same fiction we removed from the
                  decide screen, hiding in a second file. */}
              <p className="soft">
                {from?.mode === "house"
                  ? "They were given a sum of money and asked how much of it to keep. They chose to pass this much to whoever came next. That turned out to be you."
                  : "They were asked how much of their own money they'd hand to a stranger. This is what they chose to pass on, and it came to you."}{" "}
                It reaches you when you take your own turn.
              </p>
            </>
          ) : (
            <>
              <h1>Someone wants to know what you&rsquo;d do.</h1>
              <p className="soft">
                You&rsquo;ll get a small amount of real NIM and one decision to
                make about it. No trick, no catch, nothing to pay.
              </p>
            </>
          )}

          <div className="card">
            <h2>How it works</h2>
            <p className="soft" style={{ marginTop: "0.6rem" }}>
              You make one choice, then guess what the average person would do.
              Afterward, you find out how close your guess was, how other{" "}
              {NAME} players compare, and what researchers found in studies of
              the same kind of decision.
            </p>
          </div>
        </div>

        <div className="game-card">
          {/* Renders the install route by default. If the visitor turns out to be
              inside Nimiq Pay already, it swaps itself for a play button, telling
              someone to install an app they are currently using reads as broken. */}
          <Enter waiting={waiting} session={session} />

          <Link href="/how-it-works" className="faint" style={{ textAlign: "center" }}>
            How {NAME} works
          </Link>
        </div>
      </div>
    </main>
  );
}
