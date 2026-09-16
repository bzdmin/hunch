import type { CSSProperties } from "react";
import Link from "next/link";
import { NAME, STAKE_NIM, TRUST_STAKE_OPTIONS_NIM, ULTIMATUM_STAKE_OPTIONS_NIM } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * The entry screen. Three questions, not three "experiments", the word experiment
 * is internal vocabulary and stays out of the interface.
 *
 * Rebuilt as a picker: three peer cards, not one primary CTA with two links buried
 * inside a secondary card. That funnel shape made sense while Split was the only
 * thing reliably open, but all three run on real NIM now, and a home screen
 * that visibly favours one undersells the other two before anyone has read a
 * word about them. Split still needs no partner and no waiting, that stays true
 * in its card's own meta line, it just no longer gets the only button on the page.
 *
 * Each card's accent reuses a token that already means something elsewhere in the
 * app rather than inventing new colour: --good is "it paid off" on Trust's reveal,
 * --warm is risk and refusal on Ultimatum's. Someone who plays all three should
 * feel the same colour meaning the same thing twice, not three unrelated brands.
 *
 * "Another human" in the headline undersold Split: Split's guess is against a
 * population, "what most people do", not one other person the way Trust and
 * Ultimatum are. "People" covers both without Split reading as a mismatch with
 * its own card. Research framing moved off this screen entirely, it belongs in
 * the result experience where it earns its place. This screen's only job is to
 * get a decision started, not to sound like a paper abstract first.
 *
 * The short line under each heading is notation, not illustration: KEEP <-> GIVE,
 * YOU -> THEM -> YOU, OFFER <-> ACCEPT. Each shape is recognisable before anyone
 * reads the paragraph under it, the three experiments should look different from
 * each other at a glance, not just read different once you commit to reading.
 * Split gets a second, fainter line, YOU -> NEXT -> NEXT: unlike Trust and
 * Ultimatum, Split's stake keeps moving after your round ends, see the About
 * page. That is worth surfacing here, it is the one mechanic none of the other
 * two has.
 *
 * The player-count stat is deliberately gone for now, not deleted, just not
 * rendered. A true count under maybe a dozen makes the product look empty
 * rather than alive, and undersells it more than omitting the number does.
 * Bring totalPlayers() back here once that number is worth showing off.
 */
function range(nums: number[]): string {
  return `${Math.min(...nums)}-${Math.max(...nums)} NIM`;
}

export default function Home() {
  return (
    <main className="screen">
      <p className="eyebrow">{NAME}</p>
      <h1>Can you predict <span className="hl">people</span>?</h1>
      <p className="soft">
        Three experiments. Real NIM. Make your prediction. See what humans
        actually do.
      </p>

      <Link
        href="/split"
        className="pick"
        style={{ "--pick-color": "var(--accent)" } as CSSProperties}
      >
        <p className="eyebrow">Split</p>
        <h2>What would you keep?</h2>
        <p className="metaphor">KEEP &harr; GIVE</p>
        <p className="metaphor chain">YOU &rarr; NEXT &rarr; NEXT</p>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          You have {STAKE_NIM.toLocaleString()} NIM. How much will you pass to
          the next person? Then see what people actually do.
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
        <p className="metaphor">YOU &rarr; THEM &rarr; YOU</p>
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
        <p className="metaphor">OFFER &harr; ACCEPT</p>
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

      {/* The About page already explains this loop well, choose, guess, find out,
          compare with research. Bringing a compressed version onto the home means
          someone understands the shape of the product before ever tapping into it,
          rather than only after tapping "What is Hunch?". */}
      <div>
        <p className="eyebrow">How it works</p>
        <p className="flow-steps">
          Make a choice <span>&rarr;</span> Predict <span>&rarr;</span> See what
          happened <span>&rarr;</span> Compare with humans
        </p>
      </div>

      <div className="grow" />

      <div className="stats">
        <div>
          <span className="n">3</span>
          <span className="l">experiments</span>
        </div>
        <div>
          <span className="n">2</span>
          <span className="l">need a friend</span>
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
