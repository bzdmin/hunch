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
            This page says exactly what is collected instead, and just as
            importantly, what isn&rsquo;t.
          </p>
        </div>

        <p className="section-label">Your identity is a signing key, nothing else</p>
        <div className="card">
          <p className="soft">
            {NAME} never asks for your name, email, phone number, or a
            password. When you take part in an experiment, your wallet signs
            a message describing your decision, and that signature is what
            the server checks. The public key behind that signature is the
            only identifier {NAME} has for you, and it is not linked to
            anything about who you actually are.
          </p>
        </div>

        <p className="section-label">What gets stored on a round</p>
        <div className="card">
          <p className="soft">
            To run a round and pay it out, the server stores: the public key
            that signed, the signature itself, the exact text that was
            signed, the address the payout goes to, your decision and
            prediction as numbers, and a timestamp. This is the minimum
            needed to prove who committed what and to settle the round
            honestly, it is not collected for any other purpose.
          </p>
        </div>

        <p className="section-label">Device identifier</p>
        <div className="card">
          <p className="soft">
            Nimiq Pay can share a per-origin device identifier with{" "}
            {NAME}. It exists only to cap how many house-funded rounds one
            device can play in a day, so the house wallet can&rsquo;t be
            drained by one person cycling through fresh signing keys. It is
            never treated as identity, and a missing or false one only
            weakens that device&rsquo;s own limit, it can&rsquo;t be used to
            impersonate anyone or move anyone else&rsquo;s money.
          </p>
        </div>

        <p className="section-label">What stays on your device</p>
        <div className="card">
          <p className="soft">
            Your results on <Link href="/results">/results</Link> and the
            shortcut back to a round you haven&rsquo;t finished sharing yet
            are both stored in your browser&rsquo;s own local storage, not
            on {NAME}&rsquo;s servers. Clearing your browser or switching
            devices erases them completely on that side, the actual rounds
            are unaffected either way since they&rsquo;re recorded
            server-side under your signing key, not your device.
          </p>
        </div>

        <p className="section-label">What {NAME} does not do</p>
        <div className="card">
          <p className="soft">
            No cookies for tracking or advertising. No analytics or
            marketing pixels of any kind, there is nothing in this codebase
            that reports to Google Analytics, Meta, or anywhere similar. No
            fingerprinting. No selling or sharing data with advertisers or
            data brokers, there is no one to sell it to, {NAME} is not
            monetised through your data. No cross-site tracking. No
            location data. No biometric data.
          </p>
        </div>

        <p className="section-label">Settlement is public, because the blockchain is</p>
        <div className="card">
          <p className="soft">
            When a round settles, the payout is a real transaction on the
            Nimiq blockchain, and blockchain transactions are public by
            design, that is true of any wallet or app, not something{" "}
            {NAME} adds or controls. The settlement hash shown on a reveal
            screen can be looked up by anyone on a Nimiq block explorer,
            same as any transaction on the network.
          </p>
        </div>

        <p className="section-label">Who can see what, internally</p>
        <div className="card">
          <p className="soft">
            The builder has a password-protected admin tool to operate the
            house wallet, settle payouts by hand, and spot abuse. Through
            it, they can see signing keys, device identifiers, and how many
            rounds a key or device has played. That access exists to keep
            the product honest and solvent, not to build a profile of
            anyone, and it is never shared with a third party.
          </p>
        </div>

        <p className="section-label">Hosting</p>
        <div className="card">
          <p className="soft">
            {NAME} runs on Vercel. Like any website, the hosting
            infrastructure itself may keep ordinary request logs as part of
            normal operation, that is Vercel&rsquo;s platform behaviour, not
            something {NAME}&rsquo;s own code reads, stores, or uses.
          </p>
        </div>

        <p className="section-label">Retention</p>
        <div className="card">
          <p className="soft">
            Completed rounds are kept, the same way every reveal screen on
            this app compares your result against real past rounds, not
            invented ones, that only works if the real ones are kept. There
            is currently no self-serve way to delete a round. If you want
            one removed, the quickest way to reach the builder is through{" "}
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
