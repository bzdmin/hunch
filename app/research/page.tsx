"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory } from "@/lib/history";
import type { Benchmark } from "@/lib/benchmarks";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

type SplitPop = { n: number; meanPct: number; gaveSomethingPct: number };
type SplitData = {
  research: { mean: Benchmark; gaveSomething: Benchmark };
  house: SplitPop | null;
  self: SplitPop | null;
};
type TrustData = { research: Benchmark; players: { n: number; meanReturnedPct: number } | null };
type UltimatumData = { players: { n: number; meanOfferPct: number; acceptedPct: number } | null };
type Data = { split?: SplitData; trust?: TrustData; ultimatum?: UltimatumData };

const EXPERIMENTS = [
  { exp: "split" as const, label: "Split", href: "/split" },
  { exp: "trust" as const, label: "Trust", href: "/trust" },
  { exp: "ultimatum" as const, label: "Ultimatum", href: "/ultimatum" },
];

/**
 * The final room, not the lobby. Research explains a result you already
 * have, it never helps decide one, so the gate is asymmetric on purpose:
 *
 *   Before playing an experiment, nothing about it appears here at all, not
 *   a published benchmark, not a Hunch average, not a distribution, not
 *   even an empty placeholder card for the Hunch-player comparison. Reading
 *   "people usually give 28%" before playing Split answers the one question
 *   Split asks honestly rather than by guessing. See app/api/research's own
 *   comment for how that's enforced server-side, not just hidden client-side.
 *
 *   After playing, the published benchmark shows immediately, that's a
 *   citation, not live data, it doesn't need a Hunch sample. The Hunch-
 *   player comparison is a second, separate gate: it only appears once the
 *   real sample clears MIN_SAMPLE/MIN_POPULATION_SAMPLE, and when it
 *   hasn't, this page shows nothing for it rather than an empty card
 *   apologising for a small number. A tiny sample isn't a finding, and
 *   showing it as one, even hedged, makes Hunch look smaller than saying
 *   nothing does.
 */
export default function Research() {
  const [played, setPlayed] = useState<Set<string> | null>(null);
  const [data, setData] = useState<Data>({});

  useEffect(() => {
    const set = new Set(getHistory().map((e) => e.exp));
    setPlayed(set);
    if (set.size === 0) return;
    fetch(`/api/research?played=${[...set].join(",")}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Research</p>
          <h1>Where the numbers come from</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            {NAME} uses real experiments from behavioural science as a
            reference point.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Play first. Then come here to see how your choice compares with
            published research and, when we have enough rounds, with other{" "}
            {NAME} players.
          </p>
        </div>

        {played === null ? null : (
          <div className="card-grid cols-3">
            {EXPERIMENTS.map(({ exp, label, href }) => {
              if (!played.has(exp)) {
                return (
                  <div key={exp}>
                    <p className="section-label">{label}</p>
                    <div className="card">
                      <h2>Not enough data yet</h2>
                      <p className="soft" style={{ marginTop: "0.5rem" }}>
                        Play {label} and we&rsquo;ll unlock this comparison
                        once there are enough rounds.
                      </p>
                      <Link href={href} className="btn" style={{ marginTop: "0.9rem" }}>
                        Play {label} &rarr;
                      </Link>
                    </div>
                  </div>
                );
              }

              if (exp === "split") {
                const d = data.split;
                const hunch = d && (d.house || d.self) ? d : null;
                return (
                  <div key={exp}>
                    <p className="section-label">Split</p>
                    <div className="card">
                      <h2>What research found</h2>
                      {d ? (
                        <>
                          <p className="soft" style={{ marginTop: "0.5rem" }}>
                            Across hundreds of dictator-game experiments,
                            people gave away about {Math.round(d.research.mean.value)}%
                            of the amount they were given. About{" "}
                            {Math.round(d.research.gaveSomething.value)}% gave
                            something rather than keeping everything.
                          </p>
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.mean.source}</p>
                          {d.research.mean.sourceDetail && (
                            <p className="faint" style={{ marginTop: "0.1rem" }}>{d.research.mean.sourceDetail}</p>
                          )}
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.mean.caveat}</p>
                        </>
                      ) : <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>}
                    </div>
                    {hunch && (
                      <div className="card">
                        <h2>Hunch players</h2>
                        {hunch.house && (
                          <>
                            <p className="soft" style={{ marginTop: "0.5rem" }}>
                              {pct(hunch.house.gaveSomethingPct)} of Hunch
                              players passed something on.
                            </p>
                            <p className="faint" style={{ marginTop: "0.4rem" }}>
                              {hunch.house.n} completed rounds
                            </p>
                          </>
                        )}
                        {hunch.self && (
                          <>
                            <p className="soft" style={{ marginTop: hunch.house ? "0.8rem" : "0.5rem" }}>
                              {pct(hunch.self.gaveSomethingPct)} of Hunch
                              players passed something on with their own NIM.
                            </p>
                            <p className="faint" style={{ marginTop: "0.4rem" }}>
                              {hunch.self.n} completed rounds
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (exp === "trust") {
                const d = data.trust;
                return (
                  <div key={exp}>
                    <p className="section-label">Trust</p>
                    <div className="card">
                      <h2>What research found</h2>
                      {d ? (
                        <>
                          <p className="soft" style={{ marginTop: "0.5rem" }}>
                            Trustees return {pct(d.research.value)} of the
                            tripled pot on average, slightly less than
                            trustors send.
                          </p>
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.source}</p>
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.caveat}</p>
                        </>
                      ) : <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>}
                    </div>
                    {d && d.players && (
                      <div className="card">
                        <h2>Hunch players</h2>
                        <p className="soft" style={{ marginTop: "0.5rem" }}>
                          Trustees returned {pct(d.players.meanReturnedPct)}{" "}
                          of the tripled pot on average.
                        </p>
                        <p className="faint" style={{ marginTop: "0.4rem" }}>
                          {d.players.n} completed rounds
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              // ultimatum: no published benchmark exists, see lib/benchmarks.ts
              const d = data.ultimatum;
              return (
                <div key={exp}>
                  <p className="section-label">Ultimatum</p>
                  {!d ? (
                    <div className="card">
                      <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
                    </div>
                  ) : d.players ? (
                    <div className="card">
                      <h2>Hunch players</h2>
                      <p className="soft" style={{ marginTop: "0.5rem" }}>
                        The average offer was {pct(d.players.meanOfferPct)} of
                        the stake, and {pct(d.players.acceptedPct)} of offers
                        were accepted.
                      </p>
                      <p className="faint" style={{ marginTop: "0.4rem" }}>
                        {d.players.n} completed rounds
                      </p>
                    </div>
                  ) : (
                    <div className="card">
                      <h2>Not enough data yet</h2>
                      <p className="soft" style={{ marginTop: "0.5rem" }}>
                        The Ultimatum Game is one of the most replicated
                        findings in behavioural economics: people routinely
                        refuse offers they see as unfair, even though
                        refusing costs them money too. We haven&rsquo;t
                        verified a published figure to cite here yet, this
                        will show {NAME} players only, once there are enough
                        rounds.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grow" />
        <Link href="/#experiments" className="btn">Try another experiment &rarr;</Link>
      </main>
      <Footer />
    </>
  );
}
