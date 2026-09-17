"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, ultimatumMessage } from "@/lib/message";
import { ultimatumTier, guessAccuracyClause, verdictValue } from "@/lib/copy";
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
};

/**
 * The second player's decision, and the reveal that follows it.
 *
 * B never staked anything and never sees the stake as a figure until the reveal,
 * same rule as Trust's B, and doubly important here: seeing the exact number would
 * turn "the least I'd accept on principle" into "the least I'd accept given this
 * specific amount," which is a different, weaker experiment.
 *
 * Ultimatum's predict field is stored as a plain percent for both seats, unlike
 * Trust where predict is always luna. Each experiment is internally consistent,
 * they just do not share a representation, so do not mix the two mentally.
 */
export default function Respond({ id, finished }: { id: string; finished: boolean }) {
  const [inWallet, setInWallet] = useState(false);
  const [stage, setStage] = useState<"decide" | "predict" | "working" | "done">("decide");
  const [thresholdPct, setThresholdPct] = useState(0);
  const [guessPct, setGuessPct] = useState(0);
  const [err, setErr] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [stake, setStake] = useState(0);

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
      // The stake is only fetched now, right before signing, never rendered on
      // the decide or predict screens, exactly the same discipline Trust's B
      // screen follows.
      const got = await fetch(`/api/pair?id=${id}&key=`);
      const info = await got.json();
      if (!got.ok) throw new Error(info.error ?? "Could not load this round.");
      setStake(info.stake);

      const ref = makeRef();
      const message = ultimatumMessage({
        seat: "b", pairId: id, stake: info.stake, move: thresholdPct, predictPct: guessPct, ref,
      });
      // One prompt, whichever wallet is answering, see lib/wallet/types.ts.
      const { publicKey, signature, address: payTo } = await signWithAddress(message);
      const device = await deviceId(DEVICE_ID_REASON);
      const env = await environment();

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id, move: thresholdPct, predict: guessPct, ref, message, publicKey, signature, payTo,
          deviceId: device, environment: env,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      const payoff = out.payoffIfRevealed ?? out.payoff;
      setReveal({ a: out.a ?? null, b: out.b ?? null, payoff, percentile: out.percentile ?? null });
      addHistory({
        exp: "ultimatum",
        call: `A stranger offered you ${nim(out.a?.move ?? 0)} NIM of ${nim(info.stake)} NIM.`,
        outcome: payoff.note === "accepted"
          ? `You accepted, you end with ${nim(payoff.b)} NIM.`
          : "You refused, neither of you got anything.",
        href: "/ultimatum",
      });
      setStage("done");
    } catch (e) {
      setErr(readable(e));
      setStage("predict");
    }
  }

  if (finished) {
    return <a className="btn" href="/ultimatum">Start your own round</a>;
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
    const offerPct = Math.round((reveal.a!.move / stake) * 100);
    const accepted = reveal.payoff.note === "accepted";
    const aGuessedThreshold = reveal.a?.predict ?? 0;

    return (
      <>
        <div className="card"><h2>{ultimatumTier(offerPct, accepted)}</h2></div>

        <p className="soft">
          They had {nim(stake)} NIM and offered you {nim(reveal.a!.move)} NIM,{" "}
          {offerPct}% of it.
        </p>

        <ReportCard
          experiment="Ultimatum"
          color="var(--warm)"
          call={<>You said you&rsquo;d accept nothing less than {thresholdPct}%.</>}
          hunch={<>You guessed they&rsquo;d offer {guessPct}%.</>}
          outcome={<>They actually offered {offerPct}%.</>}
          verdictLabel="How well did you read them?"
          verdictValue={verdictValue(reveal.percentile, guessAccuracyClause(guessPct, offerPct))}
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

        <p className="faint">
          {accepted
            ? "Their offer cleared what you said you'd accept, so the deal went through."
            : "Their offer fell short of what you said you'd accept, so neither of you gets anything."}
        </p>

        <p className="note">
          They guessed the least you&rsquo;d accept was {aGuessedThreshold}%, yours
          was {thresholdPct}%.
          <br />
          <span style={{ opacity: 0.7 }}>
            The Ultimatum Game is one of the most replicated findings in
            behavioural economics that shows people routinely refuse offers
            they see as unfair, even though refusing costs them money too.
          </span>
        </p>

        <ShareCard
          experiment="Ultimatum"
          color="var(--warm)"
          path="/ultimatum"
          predicted={<>A stranger offered me {offerPct}% of {nim(stake)} NIM.</>}
          happened={accepted ? <>I took it.</> : <>I refused, so we both got nothing.</>}
          challenge="Would you have taken it?"
          shareText={
            `A stranger offered me ${offerPct}% of ${nim(stake)} NIM. ` +
            `${accepted ? "I took it." : "I refused, so we both walked away with nothing."} ` +
            `Would you have taken it?`
          }
        />

        <a className="btn ghost" href="/ultimatum">Start your own round</a>
      </>
    );
  }

  // ---------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <>
        <div className="locked">
          <span className="k">Your line, locked</span>
          <span className="v">{thresholdPct}% or you both get nothing</span>
        </div>

        <h2>Before you find out, what do you think they offered?</h2>
        <p className="soft" style={{ marginTop: "0.4rem" }}>
          They set their offer without knowing your line. How close do you think
          your guess will land?
        </p>

        <div className="card guess">
          <p className="soft" style={{ marginBottom: "0.4rem" }}>
            I think they offered&hellip;
          </p>
          <div className="amount">{guessPct}<small>%</small></div>
          <input
            type="range" min={0} max={100} step={1} value={guessPct}
            onChange={(e) => setGuessPct(Number(e.target.value))}
            disabled={busy}
            aria-label="What share you think they offered"
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem" }}>
            <input
              type="number" inputMode="numeric" min={0} max={100} step={1}
              value={guessPct}
              onChange={(e) => {
                const n = Number(e.target.value);
                setGuessPct(Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
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
        <p className="soft" style={{ marginBottom: "0.6rem" }}>
          The least you&rsquo;ll accept, as a share of whatever they have.
        </p>
        <div className="amount">{thresholdPct}<small>% or nothing</small></div>
        <input
          type="range" min={0} max={100} step={1} value={thresholdPct}
          onChange={(e) => setThresholdPct(Number(e.target.value))}
          aria-label="The least share you will accept"
        />
        <div className="ends">
          <span>&larr; I&rsquo;ll take anything</span>
          <span>Nothing less than everything &rarr;</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem" }}>
          <input
            type="number" inputMode="numeric" min={0} max={100} step={1}
            value={thresholdPct}
            onChange={(e) => {
              const n = Number(e.target.value);
              setThresholdPct(Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
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
        <p className="faint" style={{ marginTop: "0.6rem" }}>
          {thresholdPct === 0
            ? "You'll accept whatever they offer, even nothing."
            : `An offer below ${thresholdPct}% gets refused, and you both get nothing.`}
        </p>
      </div>

      {err && <p className="err">{err}</p>}
      <button onClick={() => setStage("predict")}>Continue</button>
    </>
  );
}
