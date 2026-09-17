import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { NAME, STAKE_NIM, TRUST_STAKE_OPTIONS_NIM, ULTIMATUM_STAKE_OPTIONS_NIM } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

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
 * glance.
 *
 * No player count. A true count in the single digits makes a product look
 * empty rather than alive, and invented numbers are not on the table. Product
 * facts hold the slot until real usage is worth showing off.
 */
function range(nums: number[]): string {
  return `${Math.min(...nums)}-${Math.max(...nums)} NIM`;
}

const LOOP = [
  { n: "01", t: "Decide", d: "Make your choice with real NIM." },
  { n: "02", t: "Predict", d: "Predict what another person will do." },
  { n: "03", t: "Reveal", d: "See what they actually chose." },
  { n: "04", t: "Compare", d: "See how your prediction compares." },
  { n: "05", t: "Share", d: "Challenge someone to make their own." },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="screen wide">
      <div className="hero-grid">
        <div>
          <p className="eyebrow">{NAME}</p>
          <h1>Can you predict <span className="hl">people</span>?</h1>
          <p className="soft">
            Make a real decision with NIM.<br />
            Lock your prediction.<br />
            See what another human actually does.
          </p>
          <div className="hero-cta">
            <Link href="/#experiments" className="btn">Play a Hunch &rarr;</Link>
            <Link href="/how-it-works" className="btn ghost">How it works &rarr;</Link>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/hero-trust.png"
            alt={`A retro car dashboard reads "Trust? trust who?" beside the words people are complicated, real decisions, real humans, real NIM.`}
            width={1767}
            height={890}
            priority
            sizes="(min-width: 52rem) 48vw, 100vw"
          />
        </div>
      </div>

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

      <p className="section-label center" id="experiments">Pick your experiment.</p>

      <div className="picks">
      <Link
        href="/split"
        className="pick"
        style={{ "--pick-color": "var(--accent)" } as CSSProperties}
      >
        <p className="eyebrow">01 &middot;</p>
        <p className="name">Split</p>
        <h2>What would you keep?</h2>
        <p className="metaphor">KEEP &harr; GIVE</p>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          You have {STAKE_NIM.toLocaleString()} NIM. Decide how much to pass
          to the next person. Then see what other people choose.
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
        <p className="eyebrow">02 &middot;</p>
        <p className="name">Trust</p>
        <h2>Hand it over, or keep it?</h2>
        <p className="metaphor">YOU &rarr; THEM &rarr; YOU</p>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          Put your NIM in another person&rsquo;s hands. Their decision
          determines what comes back.
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
        <p className="eyebrow">03 &middot;</p>
        <p className="name">Ultimatum</p>
        <h2>Offer a share, or lose it all?</h2>
        <p className="metaphor">OFFER &harr; ACCEPT</p>
        <p className="soft" style={{ marginTop: "0.35rem" }}>
          Offer another person a share of your NIM. They can accept it or
          reject the deal for both of you.
        </p>
        <div className="meta">
          <span>Two players</span>
          <span>All or nothing</span>
          <span>{range(ULTIMATUM_STAKE_OPTIONS_NIM)}</span>
        </div>
        <span className="go">Run experiment &rarr;</span>
      </Link>
      </div>

      <div className="stats center">
        <div>
          <span className="n">3</span>
          <span className="l">experiments</span>
        </div>
        <div>
          <span className="n">60s</span>
          <span className="l">per round</span>
        </div>
        <div>
          <span className="n">Real NIM</span>
          <span className="l">every decision</span>
        </div>
      </div>

      <div className="card">
        <h2>What is {NAME}?</h2>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          {NAME} is a collection of short behavioural experiments played with
          real NIM.
        </p>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          Make a decision. Predict what another person will do. Then find out.
        </p>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          Your result isn&rsquo;t a personality test. It&rsquo;s a chance to
          see how well your prediction matched another human&rsquo;s choice.
        </p>
        <p className="faint" style={{ marginTop: "0.6rem" }}>
          When an experiment has a meaningful benchmark, we compare your
          result with other {NAME} players and published behavioural
          research.
        </p>
        <p className="faint" style={{ marginTop: "0.4rem" }}>
          Every round gives you another decision to make, another person to
          predict, and another result to compare.
        </p>
      </div>

      <div className="grow" />

      <Link href="/how-it-works" className="btn ghost">See how {NAME} works &rarr;</Link>
      </main>
      <Footer />
    </>
  );
}
