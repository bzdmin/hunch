import Link from "next/link";
import { NAME } from "@/lib/brand";
import { SPLIT_MEAN_GIVEN, SPLIT_GAVE_SOMETHING, TRUST_RETURNED_SHARE } from "@/lib/benchmarks";
import { trustPopulation, ultimatumPopulation } from "@/lib/pair";
import { population as splitPopulation } from "@/lib/store";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

export const dynamic = "force-dynamic";
export const metadata = { title: `${NAME} · Research` };

const MIN_SAMPLE = 10;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * Real numbers only, gated the same way everywhere else in this app is:
 * lib/benchmarks.ts refuses to compare players against each other before
 * there's a real population, lib/pair.ts's guessPercentile and the two
 * population aggregates below refuse the same way. A Research page that
 * shows a mean of six rounds as if it were a finding would undercut the
 * exact thing this page exists to establish, that the comparison is honest.
 *
 * No personal "what you predicted, what you actually did" row here on
 * purpose, that already lives on your own reveal screen (see
 * app/report-card.tsx) the moment a round finishes. This page has no concept
 * of who is looking at it, there is nothing to log into, so it only ever
 * shows what is true for everyone: the published citation, and what Hunch
 * players as a whole have actually done.
 */
export default async function Research() {
  const [splitHouse, splitSelf, trust, ultimatum] = await Promise.all([
    splitPopulation("house"),
    splitPopulation("self"),
    trustPopulation(),
    ultimatumPopulation(),
  ]);

  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Research</p>
          <h1>Where the numbers come from</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Every experiment on {NAME} is a real paradigm behavioural
            scientists have run for decades. Your own result is checked
            against published findings, cited, and against what {NAME}{" "}
            players have actually done, once there are enough real rounds for
            that number to mean anything.
          </p>
        </div>

        <p className="section-label">Split</p>
        <div className="card">
          <h2>What people usually do</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            On average, people give away {pct(SPLIT_MEAN_GIVEN.value)} of what
            they&rsquo;re holding, and {pct(SPLIT_GAVE_SOMETHING.value)} give
            something rather than nothing.
          </p>
          <p className="faint" style={{ marginTop: "0.6rem" }}>{SPLIT_MEAN_GIVEN.source}</p>
          <p className="faint" style={{ marginTop: "0.4rem" }}>{SPLIT_MEAN_GIVEN.caveat}</p>
        </div>
        <div className="card">
          <h2>What {NAME} players did</h2>
          {splitHouse.n >= MIN_SAMPLE || splitSelf.n >= MIN_SAMPLE ? (
            <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.6rem" }}>
              {splitHouse.n >= MIN_SAMPLE && (
                <p className="soft">
                  With house-funded NIM ({splitHouse.n} rounds), players gave
                  away {pct(splitHouse.meanPct)} on average.
                </p>
              )}
              {splitSelf.n >= MIN_SAMPLE && (
                <p className="soft">
                  With their own NIM ({splitSelf.n} rounds), players gave away{" "}
                  {pct(splitSelf.meanPct)} on average.
                </p>
              )}
            </div>
          ) : (
            <p className="faint" style={{ marginTop: "0.5rem" }}>
              Not enough rounds yet for this number to mean anything. Be one of the first.
            </p>
          )}
        </div>

        <p className="section-label">Trust</p>
        <div className="card">
          <h2>What people usually do</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Trustees return {pct(TRUST_RETURNED_SHARE.value)} of the tripled
            pot on average, slightly less than trustors send.
          </p>
          <p className="faint" style={{ marginTop: "0.6rem" }}>{TRUST_RETURNED_SHARE.source}</p>
          <p className="faint" style={{ marginTop: "0.4rem" }}>{TRUST_RETURNED_SHARE.caveat}</p>
        </div>
        <div className="card">
          <h2>What {NAME} players did</h2>
          {trust ? (
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              Across {trust.n} real rounds, the average return was{" "}
              {pct(trust.meanReturnedPct)} of the tripled pot.
            </p>
          ) : (
            <p className="faint" style={{ marginTop: "0.5rem" }}>
              Not enough rounds yet for this number to mean anything. Be one of the first.
            </p>
          )}
        </div>

        <p className="section-label">Ultimatum</p>
        <div className="card">
          <h2>What {NAME} players did</h2>
          {/* No published-research card here, deliberately: lib/benchmarks.ts
              does not carry an Ultimatum figure, those numbers have not been
              verified yet, and this page follows the same rule everywhere
              else does, never a figure without a citation behind it. */}
          {ultimatum ? (
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              Across {ultimatum.n} real rounds, the average offer was{" "}
              {pct(ultimatum.meanOfferPct)} of the stake, and{" "}
              {pct(ultimatum.acceptedPct)} of offers were accepted.
            </p>
          ) : (
            <p className="faint" style={{ marginTop: "0.5rem" }}>
              Not enough rounds yet for this number to mean anything. Be one of the first.
            </p>
          )}
          <p className="faint" style={{ marginTop: "0.6rem" }}>
            The Ultimatum Game is one of the most replicated findings in
            behavioural economics: people routinely refuse offers they see as
            unfair, even though refusing costs them money too. We haven&rsquo;t
            verified a specific published figure to cite here yet, so this
            section shows {NAME} players only, not a research comparison.
          </p>
        </div>

        <div className="grow" />
        <Link href="/#experiments" className="btn">Add to the numbers</Link>
      </main>
      <Footer />
    </>
  );
}
