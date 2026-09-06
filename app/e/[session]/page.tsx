import Link from "next/link";
import Enter from "./enter";
import { NAME } from "@/lib/brand";
import { nim } from "@/lib/message";
import { get } from "@/lib/store";

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
    <main className="screen">
      <p className="eyebrow">{NAME}</p>

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
            You&rsquo;ll be given a small sum of real money and one decision to make
            about it. No trick, no catch, nothing to pay.
          </p>
        </>
      )}

      <div className="card">
        <h2>How it works</h2>
        <p className="soft" style={{ marginTop: "0.6rem" }}>
          You make one choice, and you guess what most other people chose. Then you
          find out how you compare to everyone who&rsquo;s played, and to what
          researchers found running this same test on thousands of people.
        </p>
      </div>

      <div className="grow" />

      {/* Renders the install route by default. If the visitor turns out to be
          inside Nimiq Pay already, it swaps itself for a play button, telling
          someone to install an app they are currently using reads as broken. */}
      <Enter waiting={waiting} session={session} />

      <Link href="/about" className="faint" style={{ textAlign: "center" }}>
        What is {NAME}?
      </Link>
    </main>
  );
}
