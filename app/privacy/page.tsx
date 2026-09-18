import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

export const metadata = { title: `Privacy · ${NAME}` };

/**
 * What this page has to be honest about, specifically: this app is built
 * around a strict rule that every number it shows a player is real, never
 * invented (see /research, /live, lib/benchmarks.ts). A privacy page that
 * doesn't hold itself to the same standard would be the one dishonest
 * thing in the product. Everything below states what this codebase
 * actually does, not a generic template, checked against lib/history.ts,
 * lib/resume.ts, lib/pair.ts, lib/store.ts, and the admin routes as this
 * was written, 18 Sep 2026.
 */
export default function Privacy() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Privacy</p>
          <h1>What {NAME} does with your data</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            There is no account, no email, and no name anywhere in {NAME}.
            This page explains exactly what {NAME} stores, what stays on
            your device, what can be seen by other players, and what{" "}
            {NAME} does not collect.
          </p>
        </div>

        <p className="section-label">Your identity is a wallet signature</p>
        <div className="card">
          <p className="soft">
            {NAME} never asks for your name, email, phone number, password,
            or private key. When you play, your wallet signs a message
            describing your decision, {NAME} verifies that signature, and
            stores the public key that signed it.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} does not collect information that tells us your
            real-world name or identity. A public key or blockchain address
            can, however, be linked to a person elsewhere if that person has
            publicly associated it with themselves.
          </p>
        </div>

        <p className="section-label">What gets stored on a round</p>
        <div className="card">
          <p className="soft">Depending on the experiment, {NAME} stores:</p>
          <ul className="soft" style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
            <li>the public key that signed the decision</li>
            <li>the signature</li>
            <li>the exact message that was signed</li>
            <li>the payout address</li>
            <li>the blockchain address that actually paid, when there was one</li>
            <li>your decision</li>
            <li>your prediction</li>
            <li>the stake and amount involved</li>
            <li>whether the round used your own NIM or {NAME}-provided NIM</li>
            <li>the time of the decision</li>
            <li>the transaction hash when a transaction settles</li>
            <li>a small amount of technical round metadata needed to run and verify the experiment</li>
          </ul>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            This information is used to run the experiment, verify
            commitments, settle NIM, prevent abuse, and produce the real
            results {NAME} shows.
          </p>
        </div>

        <p className="section-label">Your decisions can be shown without your identity</p>
        <div className="card">
          <p className="soft">
            {NAME} uses real past decisions in Results, Research, and Live.
            For example, Live may show that someone kept 100% of a Split
            round, or that a Trust participant returned a particular
            amount.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            These public examples contain the decision, not your public
            key, device identifier, name, or other identity information.{" "}
            {NAME} deliberately separates the behaviour from the identity.
          </p>
        </div>

        <p className="section-label">Two-player decisions are revealed</p>
        <div className="card">
          <p className="soft">
            Trust and Ultimatum are blind until both players have
            committed. Before that point, neither player can see the
            other&rsquo;s decision.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Once both sides have committed, the experiment reveals the
            decisions and calculates the result. This is necessary for the
            experiment to work, and is enforced by the server, not just by
            the interface.
          </p>
        </div>

        <p className="section-label">Device identifier</p>
        <div className="card">
          <p className="soft">
            Nimiq Pay can provide {NAME} with a per-origin device
            identifier. {NAME} uses it only as an anti-abuse signal, to
            limit how many {NAME}-funded rounds can be played from one
            device. It helps stop someone from creating fresh wallet keys
            to repeatedly use the house-funded pool.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            It is not used as your identity and is not part of your signed
            decision. {NAME} does not use it to track you across other
            websites or apps.
          </p>
        </div>

        <p className="section-label">What stays on your device</p>
        <div className="card">
          <p className="soft">
            Your <Link href="/results">Results</Link> history and unfinished
            round shortcuts are stored in your browser&rsquo;s local
            storage, not as an account on {NAME}&rsquo;s servers. {NAME}{" "}
            keeps up to 30 recent Results entries on that device.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Clearing browser storage, using private browsing, or switching
            devices can remove those local shortcuts and Results. It does
            not delete the actual round records stored by {NAME}.
          </p>
        </div>

        <p className="section-label">What {NAME} does not collect</p>
        <div className="card">
          <p className="soft">{NAME}&rsquo;s own code does not use:</p>
          <ul className="soft" style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
            <li>tracking or advertising cookies</li>
            <li>Google Analytics or Meta pixels</li>
            <li>fingerprinting</li>
            <li>location data</li>
            <li>biometric data</li>
            <li>advertising profiles</li>
            <li>cross-site tracking</li>
          </ul>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} does not sell your data or share it with advertisers or
            data brokers.
          </p>
        </div>

        <p className="section-label">Blockchain transactions are public</p>
        <div className="card">
          <p className="soft">
            When NIM moves on the Nimiq blockchain, the transaction is
            public by design. A transaction can reveal the sending address,
            receiving address, amount, timestamp, and transaction hash
            through a block explorer.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} does not control this visibility. It is a property of
            the blockchain itself.
          </p>
        </div>

        <p className="section-label">Who can see data internally</p>
        <div className="card">
          <p className="soft">
            The builder has a password-protected admin tool used to operate{" "}
            {NAME}&rsquo;s house-funded rounds, review payouts, and
            investigate abuse. This can expose public wallet keys, device
            identifiers, round counts, payout records, and other
            information needed to operate the system.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            It does not give the builder access to a player&rsquo;s private
            wallet keys. This access exists to operate the product, settle
            NIM, prevent abuse, and keep the house-funded pool solvent. It
            is not used to build personal profiles.
          </p>
        </div>

        <p className="section-label">Hosting</p>
        <div className="card">
          <p className="soft">
            {NAME} runs on Vercel. {NAME}&rsquo;s own application code does
            not read or maintain a separate analytics profile about
            visitors. The hosting provider may process ordinary request and
            infrastructure information as part of operating its service.
          </p>
        </div>

        <p className="section-label">Retention</p>
        <div className="card">
          <p className="soft">
            {NAME} keeps round records because its Research, Live, and
            reveal experiences are based on real past rounds. Completed and
            settled rounds are retained.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Unanswered two-player rounds can become expired after 48 hours,
            but expiry changes their status rather than deleting the
            record.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            There is currently no self-serve way to delete a round. If you
            have a specific privacy request, contact the builder through{" "}
            <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">
              the GitHub repository
            </a>.
          </p>
        </div>

        <div className="grow" />
        <Link href="/terms" className="btn ghost">Read the terms</Link>
      </main>
      <Footer />
    </>
  );
}
