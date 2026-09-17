"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory } from "@/lib/history";
import type { Benchmark } from "@/lib/benchmarks";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

type SplitData = {
  research: { mean: Benchmark; gaveSomething: Benchmark };
  house: { n: number; meanPct: number } | null;
  self: { n: number; meanPct: number } | null;
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
 * The numbers people are trying to guess must not be readable before they
 * guess them, the same rule every reveal screen in this app already follows
 * (see about/page.tsx). This page used to break it: every benchmark and
 * every live figure rendered unconditionally, server-side, one click away
 * in the global nav before anyone had played anything.
 *
 * Fixed properly, not with a client-side hide: client-rendered now, reads
 * which experiments this device has actually finished from lib/history.ts,
 * and only ever requests that experiment's numbers from /api/research. An
 * unplayed experiment's figures never arrive in the browser at all, they
 * are never computed into a response the client could inspect, not merely
 * hidden behind a conditional render after arriving.
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
            Every experiment on {NAME} is a real paradigm behavioural
            scientists have run for decades. Play one first, its numbers only
            unlock here once you have, seeing them before you guess would
            turn the one interesting question in {NAME} into a reading
            comprehension test.
          </p>
        </div>

        {played === null ? null : (
          <>
            {EXPERIMENTS.map(({ exp, label, href }) => {
              if (!played.has(exp)) {
                return (
                  <div key={exp}>
                    <p className="section-label">{label}</p>
                    <div className="card">
                      <h2>Locked</h2>
                      <p className="soft" style={{ marginTop: "0.5rem" }}>
                        Play {label} once and its numbers unlock here, what
                        people usually do, and what {NAME} players have
                        actually done.
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
                return (
                  <div key={exp}>
                    <p className="section-label">Split</p>
                    <div className="card">
                      <h2>What people usually do</h2>
                      {d ? (
                        <>
                          <p className="soft" style={{ marginTop: "0.5rem" }}>
                            On average, people give away {pct(d.research.mean.value)} of
                            what they&rsquo;re holding, and{" "}
                            {pct(d.research.gaveSomething.value)} give something rather
                            than nothing.
                          </p>
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.mean.source}</p>
                          <p className="faint" style={{ marginTop: "0.4rem" }}>{d.research.mean.caveat}</p>
                        </>
                      ) : <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>}
                    </div>
                    <div className="card">
                      <h2>What {NAME} players did</h2>
                      {!d ? (
                        <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
                      ) : d.house || d.self ? (
                        <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.6rem" }}>
                          {d.house && (
                            <p className="soft">
                              With house-funded NIM ({d.house.n} rounds), players
                              gave away {pct(d.house.meanPct)} on average.
                            </p>
                          )}
                          {d.self && (
                            <p className="soft">
                              With their own NIM ({d.self.n} rounds), players gave
                              away {pct(d.self.meanPct)} on average.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="faint" style={{ marginTop: "0.5rem" }}>
                          Not enough rounds yet for this number to mean anything. Be one of the first.
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (exp === "trust") {
                const d = data.trust;
                return (
                  <div key={exp}>
                    <p className="section-label">Trust</p>
                    <div className="card">
                      <h2>What people usually do</h2>
                      {d ? (
                        <>
                          <p className="soft" style={{ marginTop: "0.5rem" }}>
                            Trustees return {pct(d.research.value)} of the
                            tripled pot on average, slightly less than
                            trustors send.
                          </p>
                          <p className="faint" style={{ marginTop: "0.6rem" }}>{d.research.source}</p>
                          <p className="faint" style={{ marginTop: "0.4rem" }}>{d.research.caveat}</p>
                        </>
                      ) : <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>}
                    </div>
                    <div className="card">
                      <h2>What {NAME} players did</h2>
                      {!d ? (
                        <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
                      ) : d.players ? (
                        <p className="soft" style={{ marginTop: "0.5rem" }}>
                          Across {d.players.n} real rounds, the average return
                          was {pct(d.players.meanReturnedPct)} of the tripled pot.
                        </p>
                      ) : (
                        <p className="faint" style={{ marginTop: "0.5rem" }}>
                          Not enough rounds yet for this number to mean anything. Be one of the first.
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              // ultimatum
              const d = data.ultimatum;
              return (
                <div key={exp}>
                  <p className="section-label">Ultimatum</p>
                  <div className="card">
                    <h2>What {NAME} players did</h2>
                    {/* No published-research card here, deliberately:
                        lib/benchmarks.ts does not carry an Ultimatum figure,
                        those numbers have not been verified yet. */}
                    {!d ? (
                      <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
                    ) : d.players ? (
                      <p className="soft" style={{ marginTop: "0.5rem" }}>
                        Across {d.players.n} real rounds, the average offer
                        was {pct(d.players.meanOfferPct)} of the stake, and{" "}
                        {pct(d.players.acceptedPct)} of offers were accepted.
                      </p>
                    ) : (
                      <p className="faint" style={{ marginTop: "0.5rem" }}>
                        Not enough rounds yet for this number to mean anything. Be one of the first.
                      </p>
                    )}
                    <p className="faint" style={{ marginTop: "0.6rem" }}>
                      The Ultimatum Game is one of the most replicated
                      findings in behavioural economics: people routinely
                      refuse offers they see as unfair, even though refusing
                      costs them money too. We haven&rsquo;t verified a
                      specific published figure to cite here yet, so this
                      section shows {NAME} players only, not a research
                      comparison.
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="grow" />
        <Link href="/#experiments" className="btn">Add to the numbers</Link>
      </main>
      <Footer />
    </>
  );
}
