"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory, currentStreak, type HistoryEntry } from "@/lib/history";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

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
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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
          <h1>Your Hunches</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Your results from this device. Nothing here requires an account.
            Clear your browser or switch devices and your local history
            starts fresh.
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
          <p className="section-label">Keep exploring</p>
          <p className="soft" style={{ marginTop: "0.4rem" }}>
            Every experiment gives you another decision to make and another
            prediction to test.
          </p>
        </div>

        <div className="grow" />
        <Link href="/#experiments" className="btn">Play {NAME}</Link>
      </main>
      <Footer />
    </>
  );
}
