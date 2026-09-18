import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

export const metadata = { title: `Terms · ${NAME}` };

/**
 * Plain terms for what this app actually does, not a boilerplate contract.
 * Written in the same direct voice as the rest of the product rather than
 * imported legalese, and checked against what the code actually enforces
 * (lib/abuse.ts, lib/payout.ts, lib/pair.ts's OPEN_ROUND_TTL_MS) rather
 * than promising behaviour that isn't real.
 */
export default function Terms() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Terms</p>
          <h1>The plain version</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            {NAME} is a small, independent project built for the Nimiq Mini
            Apps Competition. These terms describe how it actually works,
            not a legal document written to cover every hypothetical.
          </p>
        </div>

        <p className="section-label">What {NAME} is</p>
        <div className="card">
          <p className="soft">
            {NAME} is a set of short behavioural experiments played with
            real NIM. You make a decision, predict what another person will
            do, and then see what actually happened.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            The outcome isn&rsquo;t random. It comes from another
            player&rsquo;s decision, or from a rule that was shown to you
            before you played, see &ldquo;{NAME}&rsquo;s rules&rdquo; below.
          </p>
        </div>

        <p className="section-label">{NAME}&rsquo;s rules</p>
        <div className="card">
          <p className="soft">
            {NAME}&rsquo;s experiments are inspired by well-known
            behavioural experiments, but they aren&rsquo;t exact copies.{" "}
            {NAME} has its own rules where they make the experiment more
            interesting.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            In Trust, there&rsquo;s one important difference: if you choose
            to keep the NIM instead of handing it to another player, you
            keep 25% of it.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            You&rsquo;ll see this rule before you make your choice. It is
            always 25% and never changes after you commit. See{" "}
            <Link href="/research">Research</Link> to compare {NAME} with
            the original experiments.
          </p>
        </div>

        <p className="section-label">What you need to play</p>
        <div className="card">
          <p className="soft">
            You need a Nimiq wallet that can sign messages, such as Nimiq
            Pay or Nimiq Hub.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Your wallet and its keys are your responsibility. {NAME} does
            not hold your funds or have access to your keys.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            You are also responsible for following the laws that apply to
            you when using cryptocurrency.
          </p>
        </div>

        <p className="section-label">Split and your NIM</p>
        <div className="card">
          <p className="soft">
            Split can use your own NIM or NIM provided by {NAME}. The app
            tells you which before you commit.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            If you play with your own NIM, anything you pass on is actually
            sent to the next player. You can&rsquo;t take that amount back
            after you commit. Anything you keep stays with you.
          </p>
        </div>

        <p className="section-label">Trust</p>
        <div className="card">
          <p className="soft">
            In Trust, you choose between keeping the NIM or handing it to
            another player.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Keep it and you receive 25% of the stake. Hand it over and the
            amount becomes 3&times; in the other player&rsquo;s hands. They
            then decide how much comes back to you.
          </p>
        </div>

        <p className="section-label">Ultimatum</p>
        <div className="card">
          <p className="soft">
            In Ultimatum, one player chooses an offer and the other chooses
            the minimum share they would accept, before seeing it.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            If the offer meets their minimum, the deal goes through. If it
            doesn&rsquo;t, the deal is rejected and neither player receives
            anything.
          </p>
        </div>

        <p className="section-label">{NAME}-funded rounds</p>
        <div className="card">
          <p className="soft">
            Trust and Ultimatum use NIM provided by {NAME}, so you
            don&rsquo;t need to bring your own NIM to play them.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} only starts a round when its funding wallet can cover
            the possible payout. There are also daily, wallet, and device
            limits. If those limits have been reached, a new round may not
            be available.
          </p>
        </div>

        <p className="section-label">Who you play with</p>
        <div className="card">
          <p className="soft">
            Trust and Ultimatum are played with other {NAME} players, not
            people you choose yourself.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} matches waiting players into available rounds. You
            don&rsquo;t get to choose the other player&rsquo;s wallet or
            decision.
          </p>
        </div>

        <p className="section-label">Blind decisions</p>
        <div className="card">
          <p className="soft">
            In Trust and Ultimatum, both players commit without seeing the
            other&rsquo;s answer.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} doesn&rsquo;t reveal either answer until both sides have
            committed.
          </p>
        </div>

        <p className="section-label">When NIM is paid</p>
        <div className="card">
          <p className="soft">
            {NAME}-funded payouts are sent from a {NAME} wallet. Depending
            on the network and the app&rsquo;s current funding setup, a
            payout may be sent automatically or settled manually.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            {NAME} only treats a payout as settled once the Nimiq
            transaction has actually been sent. When there is a transaction
            hash, you can verify it on the Nimiq blockchain.
          </p>
        </div>

        <p className="section-label">Rounds can expire</p>
        <div className="card">
          <p className="soft">
            If a round needs another player and nobody joins within 48
            hours, the round expires.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            You don&rsquo;t lose anything, since nothing was taken from your
            wallet to start it. That round simply can&rsquo;t be answered
            anymore, and you&rsquo;ll need to start a new one.
          </p>
        </div>

        <p className="section-label">Blockchain transactions</p>
        <div className="card">
          <p className="soft">
            {NAME} doesn&rsquo;t custody your funds or hold your keys, and
            it can&rsquo;t reverse a transaction once it has been sent.
            This is especially relevant for Split, where your own NIM can
            actually leave your wallet.
          </p>
        </div>

        <p className="section-label">No investment advice, no guaranteed value</p>
        <div className="card">
          <p className="soft">
            {NAME} is not financial or investment advice.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            NIM is a real cryptocurrency and its value can change. {NAME}{" "}
            does not control its value and makes no promises about what it
            will be worth.
          </p>
        </div>

        <p className="section-label">About the project</p>
        <div className="card">
          <p className="soft">
            {NAME} is built and maintained independently by one person. It
            is provided as-is and may have bugs, downtime, or changes as it
            develops.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            There is no uptime guarantee. If something goes wrong with a
            round and you believe it caused you to lose real NIM, contact
            the builder through{" "}
            <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">
              the GitHub repository
            </a>.
          </p>
        </div>

        <p className="section-label">Playing fair</p>
        <div className="card">
          <p className="soft">
            {NAME} limits house-funded rounds so there is NIM available for
            real players.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Don&rsquo;t try to get around these limits, for example by
            using multiple wallets or devices that you control to create
            or answer rounds.
          </p>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            If you deliberately work around these limits, {NAME} may block
            the wallet or device from future {NAME}-funded rounds.
          </p>
        </div>

        <div className="grow" />
        <Link href="/privacy" className="btn ghost">Read the privacy policy &rarr;</Link>
      </main>
      <Footer />
    </>
  );
}
