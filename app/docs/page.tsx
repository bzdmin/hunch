import type { CSSProperties } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";
import { DocsSidebar } from "@/app/docs/sidebar";

export const metadata = { title: `Documentation · ${NAME}` };

/**
 * The docs hub, and also /docs's own "Overview" guide, see the comment on
 * GUIDES in ./sidebar.tsx for why there's no separate route for that.
 *
 * This page is a map, not a manual: four cards into the real guides, each of
 * which is checked against the code it describes (lib/pair.ts, lib/store.ts,
 * lib/payout.ts, lib/abuse.ts, lib/message.ts, lib/verify.ts). Nothing here
 * duplicates /terms, /privacy, or /research, every guide links out to those
 * instead, so there's exactly one authoritative copy of the legal, privacy,
 * and research content, see the "Security & privacy" and "Experiments"
 * guides for how that's done.
 */
export default function DocsHome() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Documentation</p>
          <h1>Understand how {NAME} works.</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Explore the experiments, the Nimiq payment flow, the rules behind
            every round, and the system that keeps real decisions and real
            NIM verifiable.
          </p>
        </div>

        <div className="docs-shell">
          <DocsSidebar />

          <div className="docs-content">
            <div className="docs-cards">
              <Link
                href="/docs/experiments"
                className="docs-card"
                style={{ "--pick-color": "var(--accent)" } as CSSProperties}
              >
                <p className="n">01 &middot; Experiment design</p>
                <h2>Experiments</h2>
                <p className="soft" style={{ marginTop: "0.35rem" }}>
                  Real decisions. Locked predictions. Observable outcomes.
                  See how every {NAME} round works.
                </p>
                <span className="go">Open guide &rarr;</span>
              </Link>

              <Link
                href="/docs/nimiq-pay"
                className="docs-card"
                style={{ "--pick-color": "var(--good)" } as CSSProperties}
              >
                <p className="n">02 &middot; Wallet flow</p>
                <h2>Nimiq Pay</h2>
                <p className="soft" style={{ marginTop: "0.35rem" }}>
                  From wallet signature to real settlement. See exactly
                  where Nimiq enters the experiment.
                </p>
                <span className="go">Open guide &rarr;</span>
              </Link>

              <Link
                href="/docs/security"
                className="docs-card"
                style={{ "--pick-color": "var(--warm)" } as CSSProperties}
              >
                <p className="n">03 &middot; Trust boundaries</p>
                <h2>Security &amp; privacy</h2>
                <p className="soft" style={{ marginTop: "0.35rem" }}>
                  The decision is blind. The commitment is signed. The
                  settlement is public. See how {NAME} keeps the experiment
                  honest.
                </p>
                <span className="go">Open guide &rarr;</span>
              </Link>

              <Link
                href="/docs/local-setup"
                className="docs-card"
                style={{ "--pick-color": "var(--accent)" } as CSSProperties}
              >
                <p className="n">04 &middot; Developer guide</p>
                <h2>Run {NAME} locally</h2>
                <p className="soft" style={{ marginTop: "0.35rem" }}>
                  Read the code. Run the experiments. Verify the flow.
                </p>
                <span className="go">Open guide &rarr;</span>
              </Link>
            </div>

            <p className="section-label">What {NAME} is</p>
            <div className="card">
              <p className="soft">
                {NAME} is a set of short behavioural experiments played with
                real NIM. Each one asks you to make a decision, predict
                another person&rsquo;s decision, and then compare your
                prediction with what actually happened.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                The outcome isn&rsquo;t random. It comes from another
                player&rsquo;s decision, or from a rule shown to you before
                you commit. {NAME} isn&rsquo;t a game of chance, a gambling
                product, or a financial product, it&rsquo;s a research and
                prediction product that happens to settle in real NIM.
              </p>
            </div>

            <p className="section-label">The three layers</p>
            <div className="card">
              <p className="soft">
                {NAME} doesn&rsquo;t use the blockchain to prove what someone
                decided. It uses a wallet signature to prove who committed
                to a decision, a server-side lock to preserve the blind
                experiment, and the Nimiq blockchain to settle the
                resulting NIM.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                Those are three different guarantees, and it matters that
                they don&rsquo;t get conflated. <Link href="/docs/nimiq-pay">Nimiq Pay</Link>{" "}
                covers the first and third, <Link href="/docs/experiments">Experiments</Link>{" "}
                covers the second.
              </p>
            </div>

            <p className="section-label">The loop</p>
            <div className="diagram">
{`DECIDE  ->  PREDICT  ->  LOCK  ->  REVEAL  ->  COMPARE`}
            </div>
            <div className="card">
              <p className="soft">
                <strong>Decide</strong> &middot; you make the decision the
                experiment asks for.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                <strong>Predict</strong> &middot; before seeing the other
                person&rsquo;s decision, you predict what they&rsquo;ll do.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                <strong>Lock</strong> &middot; your wallet signs the
                decision and prediction. {NAME} verifies the signature and
                stores the exact signed message.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                <strong>Reveal</strong> &middot; for two-player experiments,
                neither player&rsquo;s answer is revealed until both have
                committed.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                <strong>Compare</strong> &middot; {NAME} shows what
                happened, what you predicted, and how close your prediction
                was.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
