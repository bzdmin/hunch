import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";
import { DocsSidebar } from "@/app/docs/sidebar";

export const metadata = { title: `Nimiq Pay · Docs · ${NAME}` };

/**
 * The wallet-to-settlement story, checked against lib/message.ts,
 * lib/verify.ts, app/split/flow.tsx (self-funded transactions), and
 * lib/payout.ts (queued/sending/sent/failed, trustOpen/ultimatumOpen). This
 * is where the app is allowed to get technical, this is the guide meant for
 * someone who wants to see the actual integration, not just the promise
 * that "real NIM" is involved.
 */
export default function NimiqPayDoc() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Docs &middot; Nimiq Pay</p>
          <h1>From wallet signature to real settlement</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Where Nimiq actually enters the experiment: how a decision
            becomes a signed commitment, and how a commitment becomes real
            NIM moving on the Nimiq blockchain.
          </p>
        </div>

        <div className="docs-shell">
          <DocsSidebar />

          <div className="docs-content">
            <p className="section-label" id="wallet-flow">Wallet flow</p>
            <div className="diagram">
{`Nimiq Pay / Nimiq Hub
        |
        v
 Wallet signature
        |
        v
   Hunch API
        |
        v
Verify commitment
        |
        v
  Round engine
        |
        v
Calculate outcome
        |
        v
     Payout
        |
        v
Nimiq blockchain
        |
        v
     Reveal`}
            </div>
            <div className="card">
              <p className="soft">
                {NAME} runs inside two real environments: the Mini App SDK
                inside Nimiq Pay, and Nimiq Hub in a normal browser. Which
                one answered is picked automatically, the rest of the app
                never knows or cares. Neither is a fallback for the other,
                and there is no third, simulated mode.
              </p>
            </div>

            <p className="section-label">Signed commitments</p>
            <div className="card">
              <p className="soft">
                Before you commit, your wallet is asked to sign a message.
                That message is plain, readable copy, the same sentences
                you saw on screen, describing exactly what you decided,
                never a JSON blob or an opaque payload. What you sign is
                what you read.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                The server rebuilds that exact message from the fields it
                receives and rejects the request outright if it
                doesn&rsquo;t match, word for word. It also verifies the
                signature actually corresponds to the public key claiming
                to have signed it. Together, those two checks mean a
                tampered client can&rsquo;t show you one thing and record
                another, and nobody can attach a decision to a key that
                never actually signed it.
              </p>
            </div>

            <p className="section-label">Payment modes</p>
            <div className="card">
              <p className="soft">
                <strong>Self-funded Split.</strong> The amount you pass on
                is a real transaction sent from your own wallet. {NAME}{" "}
                validates the round before that transaction is sent, so a
                stale or already-claimed gift is rejected before you pay,
                not after.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                <strong>House-funded rounds.</strong> Trust, Ultimatum, and
                house-funded Split never ask you to send anything. Before
                a round can even open, {NAME} checks whether its own
                funding wallet can cover the worst-case payout: for Trust
                that&rsquo;s the tripled pot, for Ultimatum it&rsquo;s one
                stake. If it can&rsquo;t, the round is refused outright
                rather than opened and left unable to pay.
              </p>
            </div>

            <p className="section-label" id="settlement">Settlement</p>
            <div className="card">
              <p className="soft">
                Calculating that you&rsquo;re owed NIM and actually paying
                it are two different moments, and {NAME} treats them as
                such. A payout record moves through real states: queued,
                sending, sent, or failed. A transaction hash only exists
                once a transaction has actually been sent, a queued or
                failed record is never shown as if it were a settlement.
              </p>
              <p className="soft" style={{ marginTop: "0.5rem" }}>
                Depending on the network and {NAME}&rsquo;s current
                funding setup, a payout may be sent automatically or
                settled by hand. Either way, the same rule applies: no
                hash, no claim of settlement.
              </p>
            </div>

            <p className="section-label">Blockchain confirmation</p>
            <div className="card">
              <p className="soft">
                Every settled transaction is a real, public entry on the
                Nimiq blockchain. Once a payout shows a hash, anyone can
                look it up on a Nimiq block explorer and see the sending
                address, receiving address, amount, and timestamp for
                themselves, {NAME} doesn&rsquo;t control that visibility,
                the blockchain does.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
