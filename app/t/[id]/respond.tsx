"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, trustMessage } from "@/lib/message";
import { TRUST_RETURNED_SHARE } from "@/lib/benchmarks";
import { trustReturnTier, guessAccuracyClause, verdictValue } from "@/lib/copy";
import { signWithAddress, readable, available, deviceId, environment, DEVICE_ID_REASON } from "@/lib/wallet";
import { ReportCard } from "@/app/report-card";
import { ShareCard } from "@/app/share-card";
import { addHistory } from "@/lib/history";

const APP_STORE = "https://apps.apple.com/app/id6471844738";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";

type Reveal = {
  a: { move: number; predict: number } | null;
  b: { move: number; predict: number } | null;
  payoff: { a: number; b: number; note: string };
  percentile: { percentile: number; sampleSize: number } | null;
  settlementHash: string | null;
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

  // Held as percentages because that is all B ever sees. The luna figures are
  // derived only at commit time, so the two can never drift apart on screen.
  const [givePct, setGivePct] = useState(0);
  const [predictPct, setPredictPct] = useState(0);
  const give = Math.round((givePct / 100) * pot);
  const predict = Math.round((predictPct / 100) * pot);
  const [err, setErr] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      // Bounded inside lib/wallet itself now, not raced against an external
      // guess here: Nimiq Pay's own detection times out at 2.5s (see
      // lib/wallet/nimiq-pay.ts), then Hub is tried, near-instant since it is
      // just a module import. An outer race here used to beat that timeout,
      // reporting "no wallet" on desktop before Hub ever got a chance.
      const found = await available();
      if (!dead) setInWallet(found);
      // Fired here, not at commit time, so the one-time consent prompt (if any)
      // happens while the player is still reading the opening screen, not as a
      // surprise second dialog right when they expect signing to be the only step.
      if (found) void deviceId(DEVICE_ID_REASON);
    })();
    return () => { dead = true; };
  }, []);

  async function commit() {
    setErr("");
    setStage("working");
    try {
      const ref = makeRef();
      const message = trustMessage({
        seat: "b", pairId: id, stake, multiplier, move: give, predict, ref,
      });
      // One prompt, whichever wallet is answering, see lib/wallet/types.ts.
      const { publicKey, signature, address: payTo } = await signWithAddress(message);
      const device = await deviceId(DEVICE_ID_REASON);
      const env = await environment();

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id, move: give, predict, ref, message, publicKey, signature, payTo,
          deviceId: device, environment: env,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      const payoff = out.payoffIfRevealed ?? out.payoff;
      setReveal({
        a: out.a ?? null, b: out.b ?? null, payoff,
        percentile: out.percentile ?? null,
        settlementHash: out.settlement?.b ?? null,
      });
      addHistory({
        exp: "trust",
        call: `A stranger trusted you with ${nim(pot)} NIM.`,
        outcome: `You sent back ${Math.round((give / pot) * 100)}%, you end with ${nim(payoff.b)} NIM.`,
        href: "/trust",
      });
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
    const sharePct = Math.round((give / pot) * 100);

    // You were asked to guess what they expected, and the app used to ask that
    // question and never say whether the guess was any good. This is that missing
    // stat. Both sides are fundamentally percent-of-pot decisions now, so the
    // comparison is in percentage points, not luna, and it is graduated rather than
    // a flat right-or-wrong: how close you were matters, not just whether you nailed
    // the exact number.
    const expectedPct = Math.round((expected / pot) * 100);

    const gapPct = sharePct - TRUST_RETURNED_SHARE.value;
    const vsStudy =
      Math.abs(gapPct) <= 3 ? "about the study average"
      : gapPct < 0 ? "less generous than the study average"
      : "more generous than the study average";

    return (
      <>
        <div className="card"><h2>{trustReturnTier(sharePct)}</h2></div>

        <p className="soft">
          They had {nim(stake)} NIM and could have kept it. Trusting you
          tripled it to {nim(pot)} NIM.
        </p>

        <ReportCard
          experiment="Trust"
          color="var(--good)"
          call={<>You sent back {nim(give)} NIM, {sharePct}% of the pot.</>}
          hunch={<>You guessed they expected {predictPct}% back.</>}
          outcome={<>They actually expected {expectedPct}% back.</>}
          verdictLabel="How well did you read them?"
          verdictValue={verdictValue(reveal.percentile, guessAccuracyClause(predictPct, expectedPct))}
          settlementHash={reveal.settlementHash}
        >
          <div className="split-readout" style={{ marginBottom: "1rem" }}>
            <div>
              <span className="k">They end with</span>
              <span className="v">{nim(reveal.payoff.a)} NIM</span>
            </div>
            <div className="right">
              <span className="k">You end with</span>
              <span className="v">{nim(reveal.payoff.b)} NIM</span>
            </div>
          </div>
        </ReportCard>

        <p className="note">
          You sent back {sharePct}% of the pot, {vsStudy}, {TRUST_RETURNED_SHARE.value}%.
          <br />
          <span style={{ opacity: 0.7 }}>{TRUST_RETURNED_SHARE.source}</span>
        </p>

        <ShareCard
          experiment="Trust"
          color="var(--good)"
          path="/trust"
          predicted={<>A stranger trusted me with {nim(pot)} NIM.</>}
          happened={<>I sent back {sharePct}% of it.</>}
          challenge="What would you have done?"
          shareText={
            `A stranger trusted me with ${nim(pot)} NIM and I decided what came back. ` +
            `I sent ${sharePct}%. What would you have done?`
          }
        />

        <a className="btn ghost" href="/trust">Start your own round</a>
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
          <span className="v">You send back {givePct}%</span>
        </div>

        <h2>Before you find out, what were they hoping for?</h2>
        <p className="soft" style={{ marginTop: "0.4rem" }}>
          They guessed how much would come back before handing it over. How close do
          you think they were to what you just chose?
        </p>

        <div className="card guess">
          <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Your hunch</p>
          <p className="soft" style={{ marginBottom: "0.4rem" }}>
            I think they expected&hellip;
          </p>
          <div className="amount">{predictPct}<small>% back</small></div>
          <input
            type="range" min={0} max={100} step={1} value={predictPct}
            onChange={(e) => setPredictPct(Number(e.target.value))}
            disabled={busy}
            aria-label="What share you think they expected back"
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
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
            <span className="v">{100 - givePct}%</span>
          </div>
          <div className="right">
            <span className="k">You send back</span>
            <span className="v">{givePct}%</span>
          </div>
        </div>
        <input
          type="range" min={0} max={100} step={1} value={givePct}
          onChange={(e) => setGivePct(Number(e.target.value))}
          aria-label="What share to send back"
        />
        <div className="ends">
          <span>&larr; Keep it all</span>
          <span>Send it all &rarr;</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem" }}>
          <input
            type="number" inputMode="numeric" min={0} max={100} step={1}
            value={givePct}
            onChange={(e) => {
              const n = Number(e.target.value);
              setGivePct(Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
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
        {/* Says what the choice does to them without naming an amount. A third of
            the pot is exactly what they handed over, so that is the break-even line. */}
        <p className="faint" style={{ marginTop: "0.5rem" }}>
          {givePct === 0
            ? "They get nothing back. That is allowed."
            : givePct < 33
              ? "They end up worse off than if they had never trusted you."
              : givePct < 34
                ? "That is roughly what they handed over. They break even."
                : "More than they handed over. They come out ahead."}
        </p>
      </div>

      {err && <p className="err">{err}</p>}
      <button onClick={() => setStage("predict")}>Continue</button>
    </>
  );
}
