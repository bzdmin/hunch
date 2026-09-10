"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, trustMessage } from "@/lib/message";
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
    return (
      <>
        <div className="verdict">
          <p className="soft" style={{ marginBottom: "0.35rem" }}>
            They expected {nim(expected)} NIM back.
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

        <p className="note">
          In the study this comes from, people handed over about half of what they had
          and got back slightly less than they sent, and almost everyone handed
          something over anyway.
          <br />
          <span style={{ opacity: 0.7 }}>Berg, Dickhaut &amp; McCabe 1995</span>
        </p>

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
            type="range" min={0} max={pot} step={Math.round(pot / 100)} value={predict}
            onChange={(e) => setPredict(Number(e.target.value))}
            disabled={busy}
            aria-label="What you think they expected back"
          />
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
          type="range" min={0} max={pot} step={Math.round(pot / 100)} value={give}
          onChange={(e) => setGive(Number(e.target.value))}
          aria-label="How much to send back"
        />
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
