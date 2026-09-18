import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";
import { DocsSidebar } from "@/app/docs/sidebar";

export const metadata = { title: `Experiments · Docs · ${NAME}` };

/**
 * The serious mechanics doc: exactly what each experiment does, checked
 * against lib/pair.ts (payoff, guessGapPct, guessPercentile, trustPopulation,
 * ultimatumPopulation) and lib/store.ts (nextUnclaimedGift, distribution,
 * population) as this was written. Numbers here are the real rules, not the
 * marketing description on the home page, see app/page.tsx for that.
 *
 * Deliberately doesn't restate what /research already says about published
 * benchmarks, it links there instead, see the "Research comparison" card.
 */
export default function ExperimentsDoc() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Docs &middot; Experiments</p>
          <h1>The experiment model</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Split, Trust, and Ultimatum, exactly as the code enforces them:
            what each decision means, how predictions lock, and how the
            payoff is calculated.
          </p>
        </div>

        <div className="docs-shell">
          <DocsSidebar />

          <div className="docs-content">
            <p className="section-label" id="split">Split</p>
            <div className="card">
              <p className="soft">
                A fresh chain starts at 1,000 NIM. You decide how much to
                keep and how much to pass to the next person, any whole
                amount from zero up to your stake. Your prediction is a
                percentage: what share of their stake you think most
                people pass on.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                What you pass becomes available to the next player. Your
                own previous gift is never handed back to you, the server
                explicitly excludes it when picking who receives next, so
                the chain actually moves between different signing keys
                rather than only pretending to. The oldest unclaimed gift
                is used first.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                A chain ends once what&rsquo;s left falls below 100 NIM,
                the floor. Below that, another hop is small enough to be
                meaningless, so the person holding it keeps the rest
                instead.
              </p>
            </div>
            <div className="diagram">
{`1,000 NIM
   |
Player A keeps 400, passes 600
   |
Player B receives 600, keeps 250, passes 350
   |
Player C receives 350, ...
   |
  (below 100 NIM: chain ends, last holder keeps the rest)`}
            </div>
            <div className="card">
              <p className="soft">
                Split can run on your own NIM or on {NAME}-provided NIM.
                In self-funded mode, what you pass is an actual
                transaction from your wallet, sent before the round is
                recorded, so the server validates the round before any
                money moves. In house-funded mode you send nothing, {" "}
                {NAME} settles the result from its own wallet. The server
                records which mode was used for every round and rejects a
                claim that doesn&rsquo;t match how it was actually funded.
              </p>
            </div>

            <p className="section-label" id="trust">Trust</p>
            <div className="card">
              <p className="soft">
                Player A receives a stake and chooses between keeping it or
                handing it to Player B. Keeping ends the round immediately,
                A receives 25% of the stake, and there&rsquo;s no second
                player. Handing it over multiplies the stake by 3 in
                B&rsquo;s hands, B then decides how much of that pot to
                return to A.
              </p>
            </div>
            <div className="diagram">
{`A
|
+-- Keep -----------------> A receives 25% of stake
|
+-- Hand over --> stake x 3 --> B chooses a return amount
                                  |
                                  +-- A receives the returned amount
                                  +-- B keeps the rest`}
            </div>
            <div className="card">
              <p className="soft">
                A predicts what B will return. B predicts what A expected
                back. Neither sees the other&rsquo;s answer before
                committing, the prediction is locked in before the outcome
                exists, not asked as a decorative question after the fact.
              </p>
            </div>

            <p className="section-label" id="ultimatum">Ultimatum</p>
            <div className="card">
              <p className="soft">
                Player A receives a stake and offers B a share of it, any
                amount from zero to the whole stake. Before seeing that
                offer, B commits to the minimum share they&rsquo;d accept,
                as a percentage. If A&rsquo;s offer meets or exceeds
                B&rsquo;s threshold, the deal goes through: A keeps the
                rest, B gets the offer. If it doesn&rsquo;t, both receive
                nothing.
              </p>
            </div>
            <div className="diagram">
{`A                                B

Offers 30% -------------------> commits to accept 25% or more
                                 30% >= 25%  ->  ACCEPTED

Offers 20%                      commits to accept 25% or more
                                 20% <  25%  ->  REJECTED, both get 0`}
            </div>
            <div className="card">
              <p className="soft">
                A&rsquo;s offer is a real luna amount, A always sees real
                figures. B&rsquo;s threshold is a percentage, B never sees
                a NIM amount before committing, the same anchor-avoidance
                rule Trust&rsquo;s B seat follows. The server converts
                A&rsquo;s offer into a percentage before comparing it
                against B&rsquo;s threshold, and computes the final payoff
                itself, never the client.
              </p>
            </div>

            <p className="section-label">Prediction locking and reveal</p>
            <div className="card">
              <p className="soft">
                Trust and Ultimatum are blind by construction: A commits
                without knowing B&rsquo;s answer, B commits without seeing
                A&rsquo;s. The status field a round can hold allows for
                more states than this in principle, but only two are ever
                actually written for a two-player round: open (one side
                has committed, waiting on the other) and revealed (both
                sides have committed and the payoff is computed). Nothing
                in between is ever persisted, see the next paragraph for
                why that matters.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                The reveal happens inside the same request that receives
                the second commitment, atomically, there is no window
                where a round sits fully committed but not yet revealed
                for the server to leak from. The API only ever returns a
                redacted view of a round: neither side&rsquo;s move is
                included in a response until that round is actually
                revealed.
              </p>
            </div>

            <p className="section-label">Prediction accuracy</p>
            <div className="card">
              <p className="soft">
                {NAME} doesn&rsquo;t just ask whether you were right. It
                measures the distance between your prediction and the
                actual outcome, in percentage points, the same unit
                regardless of which experiment or seat.
              </p>
            </div>
            <div className="diagram">
{`Your prediction     70%
Actual outcome       55%

Prediction gap       15 points`}
            </div>
            <div className="card">
              <p className="soft">
                Once there are enough completed rounds, {NAME} can also
                show where a prediction ranked against everyone else who
                guessed from the same seat in the same experiment. That
                percentile is never shown below 20 comparable predictions,
                a percentile computed from a handful of rounds isn&rsquo;t
                a statistic, it&rsquo;s noise wearing a costume.
              </p>
            </div>

            <p className="section-label">Research comparison</p>
            <div className="card">
              <p className="soft">
                {NAME}&rsquo;s own results are kept separate from published
                benchmarks, never averaged together. Split and Trust are
                compared against published citations, Ultimatum currently
                has no published benchmark in {NAME}&rsquo;s own
                implementation, so it&rsquo;s only ever compared against{" "}
                {NAME}&rsquo;s own players. Population figures for Trust
                and Ultimatum aren&rsquo;t shown below 10 completed rounds,
                the same discipline as the prediction percentile above.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                For the citations, methodology, and the exact comparisons
                shown to players:
              </p>
              <Link href="/research" className="btn ghost" style={{ marginTop: "0.75rem" }}>
                Read Research &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
