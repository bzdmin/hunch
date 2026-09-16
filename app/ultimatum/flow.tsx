"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, ultimatumMessage } from "@/lib/message";
import { wallet, firstAddress, readable, available } from "@/lib/nimiq";

type Stage = "loading" | "unavailable" | "offer" | "predict" | "working" | "sent";
type Round = { id: string; stake: number };

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

  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      const found = await Promise.race([
        available(),
        new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
      ]);
      if (!dead) setHasWallet(found);
    })();
    return () => { dead = true; };
  }, []);
  const noWallet = hasWallet === false;

  useEffect(() => {
    let dead = false;
    (async () => {
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
      const w = await wallet();
      const payTo = await firstAddress();
      const ref = makeRef();
      const message = ultimatumMessage({
        seat: "a", pairId: round.id, stake, move: offer, predictPct, ref,
      });
      const { publicKey, signature } = await w.sign(message);

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: round.id, move: offer, predict: predictPct, ref, message, publicKey, signature, payTo,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      setLink(`${window.location.origin}/u/${round.id}`);
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
              Real money moves here, so it has to happen inside the wallet app.
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
        <div className="amount">{nim(offer)}<small>NIM</small></div>
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
