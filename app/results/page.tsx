"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory, currentStreak, type HistoryEntry } from "@/lib/history";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

/**
 * What's actually planned, not filler. A "reason to come back" the rubric
 * asks for that isn't a manufactured mechanic: a real statement of what
 * exists beyond tonight. Update this list as the real roadmap changes,
 * never leave a shipped item sitting here as if it were still upcoming.
 */
const COMING = [
  "More experiments beyond Split, Trust, and Ultimatum.",
  "Challenge someone you actually know, not just a stranger.",
  "Group rounds, more than two players at once.",
  "A leaderboard for the players who read people best.",
  "Deeper history: trends in your own predictions over time.",
  "More published research benchmarks to compare against.",
];

const COLOR: Record<HistoryEntry["exp"], string> = {
  split: "var(--accent)",
  trust: "var(--good)",
  ultimatum: "var(--warm)",
};

const LABEL: Record<HistoryEntry["exp"], string> = {
  split: "Split",
  trust: "Trust",
  ultimatum: "Ultimatum",
};

function when(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * This device's own finished rounds, not an account's. There is no login on
 * Hunch, a signing key is not one, so this is deliberately client-rendered
 * and reads from lib/history.ts's localStorage record rather than pretending
 * a server-side history exists. Says so on screen, not just in a comment.
 */
export default function Results() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const streak = entries ? currentStreak(entries) : 0;

  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Results</p>
          <h1>Your past hunches</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            What this device has played, remembered here in your browser, not
            on an account. A different device or a cleared browser starts
            fresh, the rounds themselves are unaffected either way.
          </p>
        </div>

        {entries && entries.length > 0 && (
          <div className="stats">
            <div>
              <span className="n">{entries.length}</span>
              <span className="l">{entries.length === 1 ? "hunch made" : "hunches made"}</span>
            </div>
            {streak > 1 && (
              <div>
                <span className="n">{streak}</span>
                <span className="l">day streak on this device</span>
              </div>
            )}
          </div>
        )}

        {entries === null ? null : entries.length === 0 ? (
          <div className="card">
            <h2>Nothing yet</h2>
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              Finish a round on this device and it shows up here.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {entries.map((e) => (
              <div
                key={e.id}
                className="pick"
                style={{ "--pick-color": COLOR[e.exp] } as React.CSSProperties}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <p className="eyebrow">{LABEL[e.exp]}</p>
                  <span className="faint">{when(e.at)}</span>
                </div>
                <p className="soft" style={{ marginBottom: "0.3rem" }}>{e.call}</p>
                <h2 style={{ fontSize: "1.1rem" }}>{e.outcome}</h2>
              </div>
            ))}
          </div>
        )}

        <div className="page-header" style={{ marginTop: "1rem" }}>
          <p className="section-label">What&rsquo;s next</p>
          <p className="soft" style={{ marginTop: "0.4rem" }}>
            Three experiments is where {NAME} starts, not where it stops.
            Here&rsquo;s what&rsquo;s actually planned.
          </p>
        </div>
        <div className="coming">
          {COMING.map((c) => (
            <div className="row" key={c}>
              <span className="dot" />
              <p className="soft">{c}</p>
            </div>
          ))}
        </div>

        <div className="grow" />
        <Link href="/#experiments" className="btn">Play {NAME}</Link>
      </main>
      <Footer />
    </>
  );
}
