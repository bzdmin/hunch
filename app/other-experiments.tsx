import Link from "next/link";
import type { CSSProperties } from "react";

const EXPERIMENTS = {
  split: {
    id: "split",
    name: "Split",
    href: "/split",
    color: "var(--accent)",
    index: "01",
    tagline: "What would you keep?",
    desc: "One choice, one guess. Decide what to keep and what to pass on.",
  },
  trust: {
    id: "trust",
    name: "Trust",
    href: "/trust",
    color: "var(--good)",
    index: "02",
    tagline: "Hand it over, or keep it?",
    desc: "Trusted, your stake triples in their hands. How much comes back is their call.",
  },
  ultimatum: {
    id: "ultimatum",
    name: "Ultimatum",
    href: "/ultimatum",
    color: "var(--warm)",
    index: "03",
    tagline: "Offer a share, or lose it all?",
    desc: "Make an offer. If they refuse it, neither of you gets anything.",
  },
} as const;

export type ExpKey = keyof typeof EXPERIMENTS;

export function OtherExperiments({ current }: { current: ExpKey }) {
  const others = (Object.keys(EXPERIMENTS) as ExpKey[]).filter((k) => k !== current);

  return (
    <div className="other-experiments" aria-label="Try another experiment">
      <p className="other-experiments-label">Try another experiment</p>
      <div className="other-experiments-grid">
        {others.map((key) => {
          const exp = EXPERIMENTS[key];
          return (
            <Link
              key={key}
              href={exp.href}
              className="other-experiment-card"
              style={{ "--exp-color": exp.color } as CSSProperties}
            >
              <div className="top">
                <span className="name">{exp.name}</span>
                <span className="index">{exp.index}</span>
              </div>
              <p className="tagline">{exp.tagline}</p>
              <p className="desc">{exp.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
