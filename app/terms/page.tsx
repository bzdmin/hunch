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
            do, and find out what actually happened. It is a research and
            prediction product, not a game of chance, there is no house
            edge, no jackpot, and no random outcome, every result comes from
            a real decision another real person made.
          </p>
        </div>

        <p className="section-label">What you need to play</p>
        <div className="card">
          <p className="soft">
            A Nimiq wallet capable of signing messages, either Nimiq Pay or
            the Nimiq Hub. You are responsible for that wallet, its keys,
            and whatever laws apply to using cryptocurrency where you live.{" "}
            {NAME} doesn&rsquo;t custody your funds and can&rsquo;t recover
            them for you.
          </p>
        </div>

        <p className="section-label">House-funded rounds</p>
        <div className="card">
          <p className="soft">
            Trust and Ultimatum are funded by a wallet {NAME} controls, not
            by you. That wallet opens a round only when it can cover the
            worst case, and it is subject to a daily spending cap and
            per-key and per-device limits, so a round can be refused if
            those are reached. Split can run on your own NIM or on the same
            house funding, the app tells you which before you commit.
          </p>
        </div>

        <p className="section-label">Rounds can expire</p>
        <div className="card">
          <p className="soft">
            If you start a round that needs a second person and nobody
            answers within 48 hours, it expires. Nothing is lost, since
            nothing was taken from you to open it, but that specific round
            can no longer be answered, and starting a new one is the only
            way back in.
          </p>
        </div>

        <p className="section-label">No investment advice, no guaranteed value</p>
        <div className="card">
          <p className="soft">
            Nothing in {NAME} is financial or investment advice. NIM is a
            real cryptocurrency with a real, fluctuating value that{" "}
            {NAME} does not control and makes no promises about.
          </p>
        </div>

        <p className="section-label">This is a work in progress</p>
        <div className="card">
          <p className="soft">
            {NAME} is provided as-is, built and maintained by one person
            outside of a company. It can have bugs, downtime, or change as
            the product develops, including these terms. There is no
            uptime guarantee. If something breaks a round in a way that
            actually cost you real NIM, the fastest way to reach the
            builder is through{" "}
            <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">
              the GitHub repository
            </a>.
          </p>
        </div>

        <p className="section-label">Playing fair</p>
        <div className="card">
          <p className="soft">
            The abuse limits described above exist to keep house funding
            available for real players. Deliberately working around them,
            for instance splitting a house-funded outcome between two
            devices you control, is against these terms and may get a key
            or device blocked from house-funded rounds.
          </p>
        </div>

        <div className="grow" />
        <Link href="/privacy" className="btn ghost">Read the privacy page</Link>
      </main>
      <Footer />
    </>
  );
}
