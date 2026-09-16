"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, LUNA, ref as makeRef, trustMessage } from "@/lib/message";
import { TRUST_RETURNED_SHARE } from "@/lib/benchmarks";
import { trustReturnTier } from "@/lib/copy";
import { wallet, firstAddress, readable, available } from "@/lib/nimiq";

const APP_STORE = "https://apps.apple.com/app/id6471844738";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";

type Reveal = {
  a: { move: number; predict: number } | null;
  b: { move: number; predict: number } | null;
  payoff: { a: number; b: number; note: string };
};

/**
 * The second player's decision, and the reveal that follows it.
 *
 * The install route is what renders first, so a stranger with no wallet gets a
 * working page rather than a dead end, detection only ever upgrades it.
 */
export default function Respond({
  id, stake, multiplier, finished,
}: {
  id: string;
  stake: number;
  multiplier: number;
  finished: boolean;
}) {
  const pot = stake * multiplier;

  const [inWallet, setInWallet] = useState(false);
  const [stage, setStage] = useState<"decide" | "predict" | "working" | "done">("decide");
  const [give, setGive] = useState(0);
  const [predict, setPredict] = useState(0);
  const [err, setErr] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const found = await Promise.race([
        available(),
        new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
      ]);
      if (!dead) setInWallet(found);
    })();
    return () => { dead = true; };
  }, []);

  async function commit() {
    setErr("");
    setStage("working");
    try {
      const w = await wallet();
      const payTo = await firstAddress();
      const ref = makeRef();
      const message = trustMessage({
        seat: "b", pairId: id, stake, multiplier, move: give, predict, ref,
      });
      const { publicKey, signature } = await w.sign(message);

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, move: give, predict, ref, message, publicKey, signature, payTo }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      setReveal({ a: out.a ?? null, b: out.b ?? null, payoff: out.payoffIfRevealed ?? out.payoff });
      setStage("done");
    } catch (e) {
      setErr(readable(e));
      setStage("predict");
    }
  }

  if (finished) {
    return <a className="btn" href="/trust">Start your own round</a>;
  }

  if (!inWallet) {
    return (
      <>
        <p className="faint">
          The money moves through Nimiq Pay, a free app. It takes about a minute to
          set up and it&rsquo;s how you collect what&rsquo;s waiting.
        </p>
        <a className="btn" href={APP_STORE}>Get Nimiq Pay for iPhone</a>
        <a className="btn ghost" href={PLAY_STORE}>Get Nimiq Pay for Android</a>
        <p className="faint" style={{ textAlign: "center" }}>
          Already have it? Open {NAME} inside Nimiq Pay and this is waiting for you.
        </p>
      </>
    );
  }

  // ----------------------------------------------------------------- reveal
  if (stage === "done" && reveal) {
    const expected = reveal.a?.predict ?? 0;
    const gap = give - expected;
    const sharePct = Math.round((give / pot) * 100);

    // You were asked to guess what they expected, and the app used to ask that
    // question and never say whether the guess was any good. This is that missing
    // stat: predict is your own guess, expected is what they actually put down.
    const guessGap = predict - expected;
    const guessLine =
      Math.abs(guessGap) < pot * 0.05
        ? "and you read them almost exactly right."
        : guessGap > 0
          ? "but they actually expected less than you thought."
          : "but they actually expected more than you thought.";

    return (
      <>
        <div className="card"><h2>{trustReturnTier(sharePct)}</h2></div>

        <div className="verdict">
          <p className="soft" style={{ marginBottom: "0.35rem" }}>
            You guessed they expected {nim(predict)} NIM back. They actually hoped
            for {nim(expected)} NIM, {guessLine}
          </p>
          <p>
            You sent <span className="hl">{nim(give)} NIM</span>.{" "}
            {Math.abs(gap) < stake * 0.05
              ? "Almost exactly what they hoped for."
              : gap > 0
                ? "More than they dared expect."
                : "Less than they were hoping for."}
          </p>
        </div>

        <div className="card">
          <div className="split-readout">
            <div>
              <span className="k">They end with</span>
              <span className="v">{nim(reveal.payoff.a)} NIM</span>
            </div>
            <div className="right">
              <span className="k">You end with</span>
              <span className="v">{nim(reveal.payoff.b)} NIM</span>
            </div>
          </div>
          <p className="faint" style={{ marginTop: "0.6rem" }}>
            They started with {nim(stake)} NIM and gave it up.{" "}
            {reveal.payoff.a > stake
              ? "Trusting you paid off."
              : reveal.payoff.a === stake
                ? "They broke even."
                : `They ended ${nim(stake - reveal.payoff.a)} NIM down.`}
          </p>
        </div>

        {/* Computed, not a static quote, and it appears only after they have
            confirmed their own choice. Same reasoning as Split's scored prediction:
            printing the benchmark before someone acts turns the question into
            something to answer correctly rather than something to actually decide. */}
        {(() => {
          const gapPct = sharePct - TRUST_RETURNED_SHARE.value;
          const verdict =
            Math.abs(gapPct) <= 3
              ? <>You sent back <span className="hl">{sharePct}%</span> of the pot, about the same as the study average.</>
              : gapPct < 0
                ? <>You sent back <span className="hl">{sharePct}%</span> of the pot, less generous than the study average.</>
                : <>You sent back <span className="hl">{sharePct}%</span> of the pot, more generous than the study average.</>;
          return (
            <p className="note">
              {verdict} People in the original study returned about{" "}
              {TRUST_RETURNED_SHARE.value}% of what they held.
              <br />
              <span style={{ opacity: 0.7 }}>{TRUST_RETURNED_SHARE.source}</span>
            </p>
          );
        })()}

        <a className="btn" href="/trust">Now try it yourself</a>
      </>
    );
  }

  // ---------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <>
        <div className="locked">
          <span className="k">Your answer, locked</span>
          <span className="v">You send back {nim(give)} NIM</span>
        </div>

        <h2>Before you find out, what were they hoping for?</h2>
        <p className="soft" style={{ marginTop: "0.4rem" }}>
          They guessed how much would come back before handing it over. How close do
          you think they were to what you just chose?
        </p>

        <div className="card guess">
          <p className="soft" style={{ marginBottom: "0.4rem" }}>
            I think they expected&hellip;
          </p>
          <div className="amount">{nim(predict)}<small>NIM</small></div>
          <input
            type="range" min={0} max={pot} step={1} value={predict}
            onChange={(e) => setPredict(Number(e.target.value))}
            disabled={busy}
            aria-label="What you think they expected back"
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
            <input
              type="number" inputMode="decimal" min={0} max={pot / LUNA} step={0.01}
              value={(predict / LUNA).toFixed(2)}
              onChange={(e) => {
                const n = Number(e.target.value);
                const luna = Math.round((Number.isFinite(n) ? n : 0) * LUNA);
                setPredict(Math.min(pot, Math.max(0, luna)));
              }}
              disabled={busy}
              aria-label="Type an exact amount"
              style={{
                flex: 1, background: "var(--paper)", color: "var(--ink)",
                border: "2px solid var(--ink)", borderRadius: "8px",
                padding: "0.5rem 0.7rem", font: "inherit", fontSize: "1rem",
              }}
            />
            <span className="faint">NIM</span>
          </div>
        </div>

        {err && <p className="err">{err}</p>}

        <button onClick={commit} disabled={busy}>
          {busy ? "Confirming…" : "Lock it in"}
        </button>
        <button className="ghost" onClick={() => setStage("decide")} disabled={busy}>
          Back
        </button>
      </>
    );
  }

  // ----------------------------------------------------------------- decide
  return (
    <>
      <div className="card">
        <div className="split-readout">
          <div>
            <span className="k">You keep</span>
            <span className="v">{nim(pot - give)} NIM</span>
          </div>
          <div className="right">
            <span className="k">You send back</span>
            <span className="v">{nim(give)} NIM</span>
          </div>
        </div>
        <input
          type="range" min={0} max={pot} step={1} value={give}
          onChange={(e) => setGive(Number(e.target.value))}
          aria-label="How much to send back"
        />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
          <input
            type="number" inputMode="decimal" min={0} max={pot / LUNA} step={0.01}
            value={(give / LUNA).toFixed(2)}
            onChange={(e) => {
              const n = Number(e.target.value);
              const luna = Math.round((Number.isFinite(n) ? n : 0) * LUNA);
              setGive(Math.min(pot, Math.max(0, luna)));
            }}
            aria-label="Type an exact amount"
            style={{
              flex: 1, background: "var(--paper)", color: "var(--ink)",
              border: "2px solid var(--ink)", borderRadius: "8px",
              padding: "0.5rem 0.7rem", font: "inherit", fontSize: "1rem",
            }}
          />
          <span className="faint">NIM</span>
        </div>
        <div className="ends">
          <span>&larr; Keep it all</span>
          <span>Send it all &rarr;</span>
        </div>
        <p className="faint" style={{ marginTop: "0.5rem" }}>
          {give === 0
            ? "They get nothing back. That is allowed."
            : give < stake
              ? `They gave up ${nim(stake)} NIM, so this leaves them down.`
              : `More than they gave up, they come out ahead.`}
        </p>
      </div>

      {err && <p className="err">{err}</p>}
      <button onClick={() => setStage("predict")}>Continue</button>
    </>
  );
}
