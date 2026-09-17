"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory, type HistoryEntry } from "@/lib/history";
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

        <div className="grow" />
        <Link href="/#experiments" className="btn">Play {NAME}</Link>
      </main>
      <Footer />
    </>
  );
}
