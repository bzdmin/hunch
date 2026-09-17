import type { CSSProperties } from "react";
import Link from "next/link";
import { NAME, STAKE_NIM, TRUST_STAKE_OPTIONS_NIM, ULTIMATUM_STAKE_OPTIONS_NIM } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * The front door.
 *
 * Someone who has never heard of this should be able to answer five questions
 * before tapping anything: what it is, why it is interesting, how a round
 * works, what the three experiments are, and what to do next. The constraint
 * that keeps that from becoming a landing page is that it all has to stay
 * short enough to read on a phone without it feeling like homework, so each
 * section is as small as it can be and still do its one job.
 *
 * Order is deliberate. Curiosity first (the question), then the loop (so the
 * cards mean something when they arrive), then the cards, then the facts,
 * then the explainer for anyone still deciding. Research is not in the hero:
 * it is the credibility layer, it belongs where results are, not where
 * curiosity is.
 *
 * Each card's accent reuses a token that already means something elsewhere in
 * the app rather than inventing new colour: --good is "it paid off" on Trust's
 * reveal, --warm is risk and refusal on Ultimatum's. Someone who plays all
 * three should feel the same colour meaning the same thing twice, on the way
 * in and on the way out, not three unrelated brands.
 *
 * The notation under each heading is notation, not illustration: KEEP <-> GIVE,
 * YOU -> THEM -> YOU, OFFER <-> ACCEPT, so the three are distinguishable at a
 * glance. Split gets a second, fainter line, YOU -> NEXT -> NEXT, because its
 * stake keeps moving after the round ends and nothing else here does that.
 *
 * No player count. A true count in the single digits makes a product look
 * empty rather than alive, and invented numbers are not on the table. Product
 * facts hold the slot until real usage is worth showing off.
 */
function range(nums: number[]): string {
  return `${Math.min(...nums)}-${Math.max(...nums)} NIM`;
}

const LOOP = [
  { n: "01", t: "Decide", d: "Make a real choice with real NIM." },
  { n: "02", t: "Predict", d: "Guess what the other person will do." },
  { n: "03", t: "Reveal", d: "See what actually happened." },
  { n: "04", t: "Compare", d: "See how your hunch stacks up against other humans." },
  { n: "05", t: "Share", d: "Send it to someone and find out if they read it better." },
];

export default function Home() {
  return (
    <main className="screen wide">
      <p className="eyebrow">{NAME}</p>
      <h1>Can you predict <span className="hl">people</span>?</h1>
      <p className="soft">
        Make a real decision with NIM. Make your prediction. Then see what
        humans actually do.
      </p>

      <div className="loop">
        {LOOP.map((s) => (
          <div className="step" key={s.n}>
            <span className="n">{s.n}</span>
            <div>
              <p className="t">{s.t}</p>
              <p className="d">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="section-label">Pick your experiment.</p>

      <div className="picks">
      <Link
        href="/split"
        className="pick"
        style={{ "--pick-color": "var(--accent)" } as CSSProperties}
      >
        <p className="eyebrow">01 &middot; Split</p>
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
        <span className="go">Run experiment &rarr;</span>
      </Link>

      <Link
        href="/trust"
        className="pick"
        style={{ "--pick-color": "var(--good)" } as CSSProperties}
      >
        <p className="eyebrow">02 &middot; Trust</p>
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
        <span className="go">Run experiment &rarr;</span>
      </Link>

      <Link
        href="/ultimatum"
        className="pick"
        style={{ "--pick-color": "var(--warm)" } as CSSProperties}
      >
        <p className="eyebrow">03 &middot; Ultimatum</p>
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
        <span className="go">Run experiment &rarr;</span>
      </Link>
      </div>

      <div className="stats">
        <div>
          <span className="n">3</span>
          <span className="l">experiments</span>
        </div>
        <div>
          <span className="n">60s</span>
          <span className="l">a round</span>
        </div>
        <div>
          <span className="n">Real</span>
          <span className="l">NIM at stake</span>
        </div>
      </div>

      <div className="card">
        <h2>What is {NAME}?</h2>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          Short experiments with real consequences. You make a decision with
          real NIM, you call what someone else will do, then you find out. The
          point isn&rsquo;t to tell you what kind of person you are. It&rsquo;s
          to find out how well you actually read people.
        </p>
        <p className="faint" style={{ marginTop: "0.6rem" }}>
          Where an experiment has a meaningful benchmark, your result is shown
          against other {NAME} players and against published findings, after
          you&rsquo;ve committed to your own answer, never before.
        </p>
      </div>

      <div className="grow" />

      <Link href="/about" className="btn ghost">How {NAME} works</Link>
    </main>
  );
}
