import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";
import { DocsSidebar } from "@/app/docs/sidebar";

export const metadata = { title: `Security & privacy · Docs · ${NAME}` };

/**
 * The trust-boundaries guide: what actually stops a tampered client, what
 * stops repeated abuse of house funding, and what surfaces publicly.
 * Checked against app/api/pair/route.ts, lib/abuse.ts, and lib/pair.ts's
 * recentPairEvents / lib/store.ts's recentSplitEvents (the Live feed).
 *
 * Deliberately doesn't restate /privacy or /terms, it explains the system
 * and links out, see the two cards at the bottom. Copying paragraphs from
 * either page here would give this app two versions of the same policy
 * that can quietly drift apart, this page exists so that never happens.
 */
export default function SecurityDoc() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Docs &middot; Security &amp; privacy</p>
          <h1>How {NAME} keeps the experiment honest</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            The decision is blind. The commitment is signed. The settlement
            is public. This guide explains the trust boundaries between a
            player, another player, and {NAME} itself.
          </p>
        </div>

        <div className="docs-shell">
          <DocsSidebar />

          <div className="docs-content">
            <p className="section-label">Commitment integrity</p>
            <div className="card">
              <p className="soft">
                No security-sensitive part of a commitment is trusted from
                the browser. The server rebuilds the exact message a wallet
                was asked to sign from the values submitted, and rejects
                the request if it doesn&rsquo;t match. It verifies the
                signature actually belongs to the public key claiming it.
                And it bounds every move against the rules of the
                experiment on screen, so no client can hand itself a
                better game than the one it was shown.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                A few fields are the deliberate exception: things like a
                device identifier or where a slider started are stored as
                client-reported metadata, never part of the signed
                commitment. A lying client only corrupts its own record of
                those, it can&rsquo;t move money or forge someone
                else&rsquo;s answer.
              </p>
            </div>

            <p className="section-label">Blind decisions</p>
            <div className="card">
              <p className="soft">
                In Trust and Ultimatum, both players commit before seeing
                the other&rsquo;s answer. Nothing about the first
                player&rsquo;s move is ever included in a response to the
                second player before both have committed, that&rsquo;s
                enforced by what the server returns, not just by what the
                interface chooses to display. See{" "}
                <Link href="/docs/experiments">Experiments</Link> for the
                exact state each round moves through.
              </p>
            </div>

            <p className="section-label">Replay protection</p>
            <div className="card">
              <p className="soft">
                A signing key can only ever hold one seat in one round.
                A retried request from a key that already committed
                returns that same original result rather than accepting a
                new answer or paying out twice, payouts themselves are
                also idempotent, so a retried settlement can&rsquo;t create
                a second debt.
              </p>
            </div>

            <p className="section-label">House funding limits</p>
            <div className="card">
              <p className="soft">
                House-funded rounds are the one place real money can be
                farmed without a player risking anything of their own, so
                {" "}{NAME} bounds it from several directions at once, not
                just one.
              </p>
            </div>
            <div className="diagram">
{`Wallet
  -> daily limit
  -> lifetime limit

Device
  -> daily limit
  -> lifetime limit

Pair
  -> repeat-pair protection
  -> same-device match refusal

House
  -> daily funding cap`}
            </div>
            <div className="card">
              <p className="soft">
                A signing key is free to generate, so per-key limits alone
                aren&rsquo;t enough, a device identifier survives across
                fresh keys generated on the same phone. Two wallets that
                have already played a house-funded round together are
                refused a repeat, and matchmaking won&rsquo;t pair a
                waiting round with the same device that opened it. All of
                that sits underneath a hard daily cap on total house
                spending.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                Worth saying plainly: these controls reduce repeated
                house-funded abuse. They don&rsquo;t establish real-world
                identity, and they can&rsquo;t prove that two different
                devices belong to two different people. Two people
                deliberately coordinating across two real devices, each
                honestly under their own limit, isn&rsquo;t something a
                per-identity count can see, that risk is bounded by the
                caps above, not eliminated by them.
              </p>
            </div>

            <p className="section-label">What becomes public</p>
            <div className="card">
              <p className="soft">
                Real past decisions surface on Live and as worked examples
                elsewhere in the app, things like &ldquo;someone offered
                30%&rdquo; or &ldquo;someone kept the entire Split
                stake.&rdquo; Those events are built from a deliberately
                reduced shape: the behavioural result, never a public key,
                device identifier, or anything else that identifies who
                made the decision. {NAME} separates the behaviour from
                the identity on purpose, everywhere it shows real rounds
                to anyone other than the two players in them.
              </p>
            </div>

            <p className="section-label">Related pages</p>
            <div className="card">
              <p className="soft">
                This guide explains the system. The two pages below remain
                the authoritative source for the actual policy.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
                <Link href="/privacy" className="btn ghost" style={{ width: "auto", flex: "1 1 12rem" }}>
                  Read Privacy &rarr;
                </Link>
                <Link href="/terms" className="btn ghost" style={{ width: "auto", flex: "1 1 12rem" }}>
                  Read Terms &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
