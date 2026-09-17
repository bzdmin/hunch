"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, ultimatumMessage } from "@/lib/message";
import { ultimatumTier, guessAccuracyClause, verdictValue } from "@/lib/copy";
import { signWithAddress, readable, available, deviceId, environment, DEVICE_ID_REASON } from "@/lib/wallet";
import { loadOpenRound, saveOpenRound, clearOpenRound } from "@/lib/resume";
import { ReportCard } from "@/app/report-card";
import { ShareCard } from "@/app/share-card";
import { addHistory } from "@/lib/history";

type Stage = "loading" | "unavailable" | "offer" | "predict" | "working" | "sent" | "resolved";
type Round = { id: string; stake: number };
type Resolved = {
  offer: number;
  offerPct: number;
  stake: number;
  theirThreshold: number;
  yourGuess: number;
  payoff: { a: number; b: number; note: string };
  percentile: { percentile: number; sampleSize: number } | null;
};

/**
 * The first player's turn: make an offer, then guess the least the other person
 * would accept.
 *
 * Unlike Trust, there is no instant path here. Trust's first player can keep
 * everything and end the round with nobody else involved. In Ultimatum an offer
 * with no one to accept or refuse it has settled nothing, this always needs a
 * second person, which is why there is no "kept" stage to mirror Trust's.
 *
 * A sees real NIM throughout, this is real money and a real decision, refused
 * means all of it is gone, not just the offer. B never does, same rule already
 * built for Trust, and for the same reason: B risks nothing of their own, so a
 * big number would only anchor a decision that should be made on feel.
 */
type WorkedExample = { stake: number; offerPct: number; thresholdPct: number; accepted: boolean } | null;

export default function Flow({ example }: { example: WorkedExample }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [round, setRound] = useState<Round | null>(null);
  const [offerPct, setOfferPct] = useState(0);
  const [predictPct, setPredictPct] = useState(0);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  // Set at commit time, or restored from a resumed round, since the "sent"
  // screen can render without offerPct ever having been touched this session.
  const [sentOffer, setSentOffer] = useState(0);
  // A's own view of the outcome once B has answered, found on revisiting this
  // page with an open round cached, see lib/resume.ts. There was previously
  // no way for A to ever find this out at all, unlike B, who gets it inline
  // as the response to their own commit.
  const [resolved, setResolved] = useState<Resolved | null>(null);

  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      // Bounded inside lib/wallet itself now, not raced against an external
      // guess here: Nimiq Pay's own detection times out at 2.5s (see
      // lib/wallet/nimiq-pay.ts), then Hub is tried, near-instant since it is
      // just a module import. An outer race here used to beat that timeout,
      // reporting "no wallet" on desktop before Hub ever got a chance.
      const found = await available();
      if (!dead) setHasWallet(found);
      // Fired here, not at commit time, so the one-time consent prompt (if any)
      // happens while the player is still reading the opening screen, not as a
      // surprise second dialog right when they expect signing to be the only step.
      if (found) void deviceId(DEVICE_ID_REASON);
    })();
    return () => { dead = true; };
  }, []);
  const noWallet = hasWallet === false;

  useEffect(() => {
    let dead = false;
    (async () => {
      // A round this browser already committed to and never finished sharing
      // beats minting a new one, see lib/resume.ts. Confirmed against the
      // server, not just trusted, in case it was answered or expired since.
      const cached = loadOpenRound<{ stake: number; offer: number }>("ultimatum");
      if (cached) {
        try {
          const got = await fetch(`/api/pair?id=${cached.id}`);
          const info = await got.json();
          if (got.ok && info.waitingOn === "b") {
            if (!dead) {
              setRound({ id: cached.id, stake: info.stake });
              setSentOffer(cached.offer);
              setLink(cached.link);
              setStage("sent");
            }
            return;
          }
          // Answered since. Shown once, then forgotten: the cache's job was
          // getting A back to a round in progress, not keeping history.
          if (got.ok && info.status === "revealed" && info.a && info.b && info.payoff) {
            clearOpenRound("ultimatum");
            if (!dead) {
              setResolved({
                offer: info.a.move,
                offerPct: Math.round((info.a.move / info.stake) * 100),
                stake: info.stake,
                theirThreshold: info.b.move,
                yourGuess: info.a.predict,
                payoff: info.payoff,
                percentile: info.percentile ?? null,
              });
              addHistory({
                exp: "ultimatum",
                call: `You offered ${nim(info.a.move)} NIM of ${nim(info.stake)} NIM.`,
                outcome: info.payoff.note === "accepted"
                  ? `Accepted, you end with ${nim(info.payoff.a)} NIM.`
                  : "Refused, neither of you got anything.",
                href: "/ultimatum",
              });
              setStage("resolved");
            }
            return;
          }
        } catch {
          // fall through to starting a fresh round
        }
        clearOpenRound("ultimatum");
      }

      try {
        const res = await fetch("/api/pair", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ exp: "ultimatum" }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error ?? "Ultimatum isn't open right now.");
        if (!dead) { setRound({ id: out.id, stake: out.stake }); setStage("offer"); }
      } catch (e) {
        if (!dead) { setErr(readable(e)); setStage("unavailable"); }
      }
    })();
    return () => { dead = true; };
  }, []);

  if (stage === "loading") {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum</p>
        <h1>Setting up your round&hellip;</h1>
      </main>
    );
  }

  // ---------------------------------------------------------------- resolved
  // A finding out what happened, whenever they come back to it. Does not need
  // round, this can render even though the fresh-round effect above never ran.
  if (stage === "resolved" && resolved) {
    const accepted = resolved.payoff.note === "accepted";
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum</p>
        <div className="card"><h2>{ultimatumTier(resolved.offerPct, accepted)}</h2></div>

        <p className="soft">
          You offered {nim(resolved.offer)} NIM of the {nim(resolved.stake)} NIM
          you had, {resolved.offerPct}% of it.
        </p>

        <ReportCard
          experiment="Ultimatum"
          color="var(--warm)"
          call={<>You offered {nim(resolved.offer)} NIM, {resolved.offerPct}% of your stake.</>}
          hunch={<>You guessed they&rsquo;d accept anything above {resolved.yourGuess}%.</>}
          outcome={<>The least they&rsquo;d actually take was {resolved.theirThreshold}%.</>}
          verdictLabel="How well did you read them?"
          verdictValue={verdictValue(resolved.percentile, guessAccuracyClause(resolved.yourGuess, resolved.theirThreshold))}
        >
          <div className="split-readout" style={{ marginBottom: "1rem" }}>
            <div>
              <span className="k">You end with</span>
              <span className="v">{nim(resolved.payoff.a)} NIM</span>
            </div>
            <div className="right">
              <span className="k">They end with</span>
              <span className="v">{nim(resolved.payoff.b)} NIM</span>
            </div>
          </div>
        </ReportCard>

        <p className="faint">
          {accepted
            ? "Your offer cleared what they said they'd accept, so the deal went through."
            : "Your offer fell short of what they said they'd accept, so neither of you got anything."}
        </p>

        <ShareCard
          experiment="Ultimatum"
          color="var(--warm)"
          path="/ultimatum"
          predicted={<>I guessed they&rsquo;d accept anything above {resolved.yourGuess}%.</>}
          happened={<>The least they&rsquo;d take was {resolved.theirThreshold}%.</>}
          challenge="Could you have read them?"
          shareText={
            `I offered a stranger ${resolved.offerPct}% and guessed they'd accept anything ` +
            `above ${resolved.yourGuess}%. The least they'd take was ${resolved.theirThreshold}%. ` +
            `Could you have read them?`
          }
        />

        <div className="grow" />
        <a className="btn ghost" href="/ultimatum">Play again</a>
      </main>
    );
  }

  if (stage === "unavailable" || !round) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum</p>
        <h1>Ultimatum isn&rsquo;t open right now.</h1>
        <p className="soft">{err || "Try again in a moment, or play Split instead."}</p>
        <div className="grow" />
        <a className="btn" href="/split">Play Split instead</a>
      </main>
    );
  }

  const { stake } = round;
  const offer = Math.round((offerPct / 100) * stake);
  const predict = Math.round((predictPct / 100) * stake);

  async function commit() {
    if (!round) return;
    setErr("");
    setStage("working");
    try {
      const ref = makeRef();
      const message = ultimatumMessage({
        seat: "a", pairId: round.id, stake, move: offer, predictPct, ref,
      });
      // One prompt, whichever wallet is answering, see lib/wallet/types.ts.
      const { publicKey, signature, address: payTo } = await signWithAddress(message);
      const device = await deviceId(DEVICE_ID_REASON);
      const env = await environment();

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: round.id, move: offer, predict: predictPct, ref, message, publicKey, signature, payTo,
          deviceId: device, environment: env,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      const shareLink = `${window.location.origin}/u/${round.id}`;
      setSentOffer(offer);
      setLink(shareLink);
      saveOpenRound("ultimatum", { id: round.id, link: shareLink, at: Date.now(), stake, offer });
      setStage("sent");
    } catch (e) {
      setErr(readable(e));
      setStage("predict");
    }
  }

  // ----------------------------------------------------------------- offer
  if (stage === "offer") {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum</p>
        <h1>You have {nim(stake)} NIM. Offer a share to a stranger.</h1>
        <p className="soft">
          They&rsquo;ll set the least they&rsquo;re willing to accept before they
          ever see your offer. Offer them less than that, and{" "}
          <span className="hl">you both walk away with nothing</span>, including
          the part you meant to keep.
        </p>

        {example && (
          <div className="card guess">
            <p className="faint" style={{ marginBottom: "0.5rem" }}>
              A round that already happened
            </p>
            <p className="soft">
              Someone offered {example.offerPct}% of {nim(example.stake)} NIM. The
              other person&rsquo;s line was {example.thresholdPct}%.{" "}
              {example.accepted
                ? "The offer cleared it, so the deal went through."
                : "The offer fell short, so neither of them got anything."}
            </p>
          </div>
        )}

        <div className="card">
          <div className="split-readout">
            <div>
              <span className="k">You keep, if accepted</span>
              <span className="v">{nim(stake - offer)} NIM</span>
            </div>
            <div className="right">
              <span className="k">You offer</span>
              <span className="v">{nim(offer)} NIM</span>
            </div>
          </div>
          <input
            type="range" min={0} max={100} step={1} value={offerPct}
            onChange={(e) => setOfferPct(Number(e.target.value))}
            aria-label="What share to offer"
          />
          <div className="ends">
            <span>&larr; Offer nothing</span>
            <span>Offer it all &rarr;</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem" }}>
            <input
              type="number" inputMode="numeric" min={0} max={100} step={1}
              value={offerPct}
              onChange={(e) => {
                const n = Number(e.target.value);
                setOfferPct(Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
              }}
              aria-label="Type an exact share"
              style={{
                flex: 1, background: "var(--paper)", color: "var(--ink)",
                border: "2px solid var(--ink)", borderRadius: "8px",
                padding: "0.5rem 0.7rem", font: "inherit", fontSize: "1rem",
              }}
            />
            <span className="faint">%</span>
          </div>
        </div>

        {noWallet && (
          <div className="card">
            <h2>You&rsquo;ll need Nimiq Pay for this bit</h2>
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              Real NIM moves here, so it has to happen inside the wallet app.
            </p>
          </div>
        )}
        {err && <p className="err">{err}</p>}

        <div className="grow" />
        <button onClick={() => setStage("predict")} disabled={noWallet}>
          Continue
        </button>
      </main>
    );
  }

  // --------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Ultimatum · Step 2 of 2</p>

        <div className="locked">
          <span className="k">Your offer, locked</span>
          <span className="v">{nim(offer)} NIM of {nim(stake)} NIM</span>
        </div>

        <h1>What&rsquo;s the least you think they&rsquo;d accept?</h1>
        <p className="soft">
          They&rsquo;re deciding this without seeing your offer, at the same time
          you&rsquo;re guessing it. How close do you think you&rsquo;ll land?
        </p>

        <div className="card guess">
          <p className="soft" style={{ marginBottom: "0.4rem" }}>
            I think they&rsquo;d refuse anything below&hellip;
          </p>
          <div className="amount">{predictPct}<small>% of the stake</small></div>
          <input
            type="range" min={0} max={100} step={1} value={predictPct}
            onChange={(e) => setPredictPct(Number(e.target.value))}
            disabled={busy}
            aria-label="What share you think their minimum is"
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem" }}>
            <input
              type="number" inputMode="numeric" min={0} max={100} step={1}
              value={predictPct}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPredictPct(Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
              }}
              disabled={busy}
              aria-label="Type an exact share"
              style={{
                flex: 1, background: "var(--paper)", color: "var(--ink)",
                border: "2px solid var(--ink)", borderRadius: "8px",
                padding: "0.5rem 0.7rem", font: "inherit", fontSize: "1rem",
              }}
            />
            <span className="faint">%</span>
          </div>
          <p className="faint" style={{ marginTop: "0.5rem" }}>
            {predict > offer
              ? "Your own offer would fall below your guess, you'd expect them to refuse it."
              : "Your offer clears your own guess, you'd expect them to accept it."}
          </p>
        </div>

        {err && <p className="err">{err}</p>}

        <div className="grow" />
        <button onClick={commit} disabled={busy}>
          {busy ? "Confirming…" : "Send the offer"}
        </button>
        <button className="ghost" onClick={() => setStage("offer")} disabled={busy}>
          Back
        </button>
      </main>
    );
  }

  // ------------------------------------------------------------------ sent
  return (
    <main className="screen">
      <p className="eyebrow">{NAME} · Ultimatum</p>
      <h1>It&rsquo;s in their hands now.</h1>
      <p className="soft">
        Send this to someone. They&rsquo;ll set their line before they see what
        you offered. You&rsquo;ll find out together.
      </p>

      <div className="card">
        <span className="k">You offered</span>
        <div className="amount">{nim(sentOffer)}<small>NIM</small></div>
      </div>

      <div className="grow" />
      <button
        onClick={async () => {
          // No figures, same reason as Trust: this reaches them before the app
          // ever opens, and their whole screen is built around not knowing the
          // number until they've already set their own line.
          const text = `I'm offering a complete stranger a share of something real. They set their own minimum before they see what I offered. ${link}`;
          if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            try { await navigator.share({ text }); return; } catch { /* fall through */ }
          }
          try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
        }}
      >
        {copied ? "Copied, paste it anywhere" : "Send it to someone"}
      </button>
      <p className="faint" style={{ textAlign: "center", wordBreak: "break-all" }}>{link}</p>
    </main>
  );
}
