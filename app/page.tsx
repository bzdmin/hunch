import type { CSSProperties } from "react";
import Link from "next/link";
import { NAME, STAKE_NIM, TRUST_STAKE_OPTIONS_NIM, ULTIMATUM_STAKE_OPTIONS_NIM } from "@/lib/brand";
import { totalPlayers } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The entry screen. Three questions, not three "experiments", the word experiment
 * is internal vocabulary and stays out of the interface.
 *
 * Rebuilt as a picker: three peer cards, not one primary CTA with two links buried
 * inside a secondary card. That funnel shape made sense while Split was the only
 * thing reliably open, but all three run on real money now, and a home screen
 * that visibly favours one undersells the other two before anyone has read a
 * word about them. Split still needs no partner and no waiting, that stays true
 * in its card's own meta line, it just no longer gets the only button on the page.
 *
 * Each card's accent reuses a token that already means something elsewhere in the
 * app rather than inventing new colour: --good is "it paid off" on Trust's reveal,
 * --warm is risk and refusal on Ultimatum's. Someone who plays all three should
 * feel the same colour meaning the same thing twice, not three unrelated brands.
 */
function range(nums: number[]): string {
  return `${Math.min(...nums)}-${Math.max(...nums)} NIM`;
}

export default async function Home() {
  const played = await totalPlayers();

  return (
    <main className="screen">
      <p className="eyebrow">{NAME}</p>
      <h1>Can you predict <span className="hl">another human</span>?</h1>
      <p className="soft">
        Three short experiments, real money, and a benchmark from published
        research to check your guess against. Pick one.
      </p>

      <Link
        href="/split"
        className="pick"
        style={{ "--pick-color": "var(--accent)" } as CSSProperties}
      >
        <p className="eyebrow">Split</p>
        <h2>What would you keep?</h2>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          You have {STAKE_NIM.toLocaleString()} NIM and one choice, how much of it
          to pass to a stranger. Then find out what most people actually do.
        </p>
        <div className="meta">
          <span>Solo</span>
          <span>Instant</span>
          <span>{STAKE_NIM.toLocaleString()} NIM</span>
        </div>
      </Link>

      <Link
        href="/trust"
        className="pick"
        style={{ "--pick-color": "var(--good)" } as CSSProperties}
      >
        <p className="eyebrow">Trust</p>
        <h2>Hand it over, or keep it?</h2>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          Trust a stranger with your stake and it triples in their hands. They
          decide what comes back. Could be everything. Could be nothing.
        </p>
        <div className="meta">
          <span>Two players</span>
          <span>Up to 3&times;</span>
          <span>{range(TRUST_STAKE_OPTIONS_NIM)}</span>
        </div>
      </Link>

      <Link
        href="/ultimatum"
        className="pick"
        style={{ "--pick-color": "var(--warm)" } as CSSProperties}
      >
        <p className="eyebrow">Ultimatum</p>
        <h2>Offer a share, or lose it all?</h2>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          Offer a stranger a cut of what you have. Too low, and you both walk
          away with nothing, not even the part you meant to keep.
        </p>
        <div className="meta">
          <span>Two players</span>
          <span>All or nothing</span>
          <span>{range(ULTIMATUM_STAKE_OPTIONS_NIM)}</span>
        </div>
      </Link>

      <div className="grow" />

      {/* Big number, small label. Says what this is at a glance, without a paragraph. */}
      <div className="stats">
        <div>
          <span className="n">{played}</span>
          <span className="l">{played === 1 ? "person has played" : "people have played"}</span>
        </div>
        <div>
          <span className="n">3</span>
          <span className="l">experiments, real money</span>
        </div>
        <div>
          <span className="n">60s</span>
          <span className="l">a round</span>
        </div>
      </div>

      <Link href="/about" className="btn ghost">What is {NAME}?</Link>
    </main>
  );
}
