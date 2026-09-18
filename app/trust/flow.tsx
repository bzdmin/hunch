"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NAME, TRUST_KEEP_PCT } from "@/lib/brand";
import { ExperimentHeader } from "@/app/experiment-header";
import { nim, ref as makeRef, trustMessage } from "@/lib/message";
import { trustOpeningTier, trustReturnTier, guessAccuracyClause, verdictValue } from "@/lib/copy";
import { signWithAddress, readable, available, deviceId, environment, DEVICE_ID_REASON } from "@/lib/wallet";
import { loadOpenRound, saveOpenRound, clearOpenRound } from "@/lib/resume";
import { ReportCard } from "@/app/report-card";
import { ShareCard } from "@/app/share-card";
import { addHistory } from "@/lib/history";

type Stage = "loading" | "choose" | "predict" | "working" | "waiting" | "kept" | "unavailable" | "resolved";
type Round = { id: string; stake: number; multiplier: number };
type Resolved = {
  stake: number;
  pot: number;
  predict: number;
  returned: number;
  payoff: { a: number; b: number; note: string };
  percentile: { percentile: number; sampleSize: number } | null;
  settlementHash: string | null;
};

/**
 * The first player's turn.
 *
 * The stake is random per round (200 to 500 NIM, see lib/brand.ts), chosen by the
 * server, not the client. So the round has to be created before this can show a
 * real number, that happens once on mount, before the "choose" screen renders,
 * rather than at commit time the way a fixed-stake version could get away with.
 *
 * Stranger-to-stranger, not link-sharing: this used to hand A a URL to send
 * someone. Now the server itself finds a real waiting round (findWaitingRound
 * in lib/pair.ts) before A ever creates a new one, so playing Trust is "join
 * the live pool", never "find a friend to text". If a match exists, this
 * redirects straight into answering it (/t/[id], unchanged, that screen was
 * always the correct "second player" experience). If not, A commits and
 * waits, polling for a real stranger to arrive rather than sharing a link.
 *
 * Two paths after committing, and only one needs a second person:
 *   keep      -> the round is over immediately, at Hunch's own rate, see
 *                TRUST_KEEP_PCT. No waiting.
 *   trust     -> predict what comes back, sign, then wait for a match.
 *
 * Keeping ending the round instantly matters: someone who does not want to involve
 * anyone else still gets a complete experience rather than a dead end.
 */
type WorkedExample = { stake: number; returned: number; final: number } | null;
type Waiting = { id: string } | null;

export default function Flow({ example, waiting }: { example: WorkedExample; waiting?: Waiting }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [round, setRound] = useState<Round | null>(null);

  // Held as a percentage, same reason as B's side: a percent-of-pot guess is
  // "roughly how trusting were they" rather than a specific NIM figure to nail,
  // and it makes the input a clean integer, no decimal reformatting fighting
  // whoever is typing. The luna figure used for signing and the reveal is derived
  // from it below.
  const [predictPct, setPredictPct] = useState(0);
  const [err, setErr] = useState("");
  const [gaveAway, setGaveAway] = useState(false);
  // Set at commit time, or restored from a resumed round, since the "waiting"
  // screen can render without predictPct ever having been touched this session.
  const [sentPredict, setSentPredict] = useState(0);
  // A's own view of the outcome once B has answered, found either by polling
  // while waiting or on revisiting this page with an open round cached, see
  // lib/resume.ts. There was previously no way for A to ever find this out
  // at all, unlike B, who gets it inline as the response to their own commit.
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

  // Turns one GET into either "still waiting", "matched, here's the reveal",
  // or "expired", shared by the initial resume check and the poll below so
  // there is exactly one place that interprets a round's status.
  async function checkRound(id: string): Promise<"waiting" | "revealed" | "expired" | "unknown"> {
    const got = await fetch(`/api/pair?id=${id}`);
    const info = await got.json();
    if (!got.ok) return "unknown";
    if (info.status === "expired") return "expired";
    if (info.status === "revealed" && info.a && info.b && info.payoff) {
      setResolved({
        stake: info.stake,
        pot: info.stake * info.multiplier,
        predict: info.a.predict,
        returned: info.b.move,
        payoff: info.payoff,
        percentile: info.percentile ?? null,
        settlementHash: info.settlement?.a ?? null,
      });
      addHistory({
        exp: "trust",
        call: `You handed over ${nim(info.stake)} NIM.`,
        outcome: `They sent back ${nim(info.b.move)} NIM, you end with ${nim(info.payoff.a)} NIM.`,
        href: "/trust",
      });
      return "revealed";
    }
    if (info.waitingOn === "b") return "waiting";
    return "unknown";
  }

  useEffect(() => {
    let dead = false;
    (async () => {
      // A real match, found by the server (findWaitingRound in lib/pair.ts),
      // beats minting a new round: joining an already-open one is exactly
      // what "stranger-to-stranger, not a link" means. /t/[id] is the
      // existing, correct second-player screen, this just sends someone
      // there automatically instead of making them wait for a link.
      if (waiting) {
        router.push(`/t/${waiting.id}`);
        return;
      }

      // A round this browser already committed to and never finished waiting
      // on beats minting a new one, see lib/resume.ts. Confirmed against the
      // server, not just trusted, in case it was answered or expired since.
      // Only the "trusted them" path is ever cached, "kept" ends with
      // nothing left to wait on.
      const cached = loadOpenRound<{ stake: number; multiplier: number; predict: number }>("trust");
      if (cached) {
        try {
          const status = await checkRound(cached.id);
          if (status === "waiting") {
            if (!dead) {
              setRound({ id: cached.id, stake: cached.stake, multiplier: cached.multiplier });
              setSentPredict(cached.predict);
              setGaveAway(true);
              setStage("waiting");
            }
            return;
          }
          if (status === "expired") {
            clearOpenRound("trust");
            if (!dead) setErr("Nobody answered your last round in time, so it expired. Here's a new one.");
          } else if (status === "revealed") {
            clearOpenRound("trust");
            if (!dead) setStage("resolved");
            return;
          }
        } catch {
          // fall through to starting a fresh round
        }
        clearOpenRound("trust");
      }

      try {
        const res = await fetch("/api/pair", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ exp: "trust" }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error ?? "Trust isn't open right now.");
        if (!dead) {
          setRound({ id: out.id, stake: out.stake, multiplier: out.multiplier });
          setStage("choose");
        }
      } catch (e) {
        if (!dead) { setErr(readable(e)); setStage("unavailable"); }
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polls while genuinely waiting for a stranger, the live-pool equivalent
  // of what used to be "wait for someone to open your link". Stops itself
  // the moment the round leaves "waiting", revealed or expired either way.
  const roundRef = useRef(round);
  roundRef.current = round;
  useEffect(() => {
    if (stage !== "waiting") return;
    const id = roundRef.current?.id;
    if (!id) return;
    let dead = false;
    const iv = setInterval(async () => {
      if (dead) return;
      try {
        const status = await checkRound(id);
        if (dead) return;
        if (status === "revealed") {
          clearOpenRound("trust");
          setStage("resolved");
        } else if (status === "expired") {
          clearOpenRound("trust");
          setErr("Nobody answered in time, so it expired. Here's a new one.");
          setStage("loading");
          // Re-run the mount sequence's fresh-round path directly rather
          // than reloading the page, a poll finding "expired" should not
          // cost a real navigation.
          try {
            const res = await fetch("/api/pair", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ exp: "trust" }),
            });
            const out = await res.json();
            if (res.ok && !dead) {
              setRound({ id: out.id, stake: out.stake, multiplier: out.multiplier });
              setGaveAway(false);
              setStage("choose");
            }
          } catch { /* stays on loading, next visit will retry */ }
        }
      } catch {
        // a dropped poll just tries again next tick
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 4000);
    return () => { dead = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function commit(move: number) {
    if (!round) return;
    setErr("");
    setStage("working");

    try {
      const ref = makeRef();
      const message = trustMessage({
        seat: "a", pairId: round.id, stake: round.stake, multiplier: round.multiplier,
        move, predict, ref,
      });
      // One prompt, whichever wallet is answering, see lib/wallet/types.ts.
      const { publicKey, signature, address: payTo } = await signWithAddress(message);
      const device = await deviceId(DEVICE_ID_REASON);
      const env = await environment();

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: round.id, move, predict, ref, message, publicKey, signature, payTo,
          deviceId: device, environment: env,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      if (move === 0) {
        setStage("kept");
      } else {
        setGaveAway(true);
        setSentPredict(predict);
        saveOpenRound("trust", {
          id: round.id, link: `${window.location.origin}/t/${round.id}`, at: Date.now(),
          stake: round.stake, multiplier: round.multiplier, predict,
        });
        setStage("waiting");
      }
    } catch (e) {
      setErr(readable(e));
      setStage(predict > 0 ? "predict" : "choose");
    }
  }

  // -------------------------------------------------------------- loading
  if (stage === "loading") {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Trust" index={2} />
        <h1>Finding your round&hellip;</h1>
      </main>
    );
  }

  // ---------------------------------------------------------------- resolved
  // A finding out what happened, whenever they come back to it. Does not need
  // round, this can render even though the fresh-round effect above never ran.
  if (stage === "resolved" && resolved) {
    const sharePct = Math.round((resolved.returned / resolved.pot) * 100);
    const predictPct = Math.round((resolved.predict / resolved.pot) * 100);
    return (
      <main className="screen game">
        <ExperimentHeader experiment="Trust" index={2} />
        <div className="game-shell">
          <div className="game-context">
            <div className="card"><h2>{trustReturnTier(sharePct)}</h2></div>

            <p className="soft">
              You trusted them with {nim(resolved.stake)} NIM, and it became{" "}
              {nim(resolved.pot)} NIM in their hands.
            </p>

            <p className="faint">
              {resolved.payoff.a > resolved.stake
                ? `Trusting them paid off, you came out ${nim(resolved.payoff.a - resolved.stake)} NIM ahead.`
                : resolved.payoff.a === resolved.stake
                  ? "You broke even."
                  : `You ended with ${nim(resolved.payoff.a)} NIM, less than the ${nim(resolved.stake)} NIM you started with.`}
            </p>
          </div>

          <div className="game-card">
            <ReportCard
              experiment="Trust"
              color="var(--good)"
              call={<>You trusted them with {nim(resolved.stake)} NIM.</>}
              hunch={<>You expected {nim(resolved.predict)} NIM back.</>}
              outcome={<>They sent back {nim(resolved.returned)} NIM.</>}
              verdictLabel="How well did you read them?"
              verdictValue={verdictValue(resolved.percentile, guessAccuracyClause(predictPct, sharePct))}
              settlementHash={resolved.settlementHash}
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

            <ShareCard
              experiment="Trust"
              color="var(--good)"
              path="/trust"
              predicted={<>I predicted they&rsquo;d return {nim(resolved.predict)} NIM.</>}
              happened={<>They returned {nim(resolved.returned)} NIM.</>}
              challenge="How well would you read them?"
              shareText={
                `I trusted a stranger with ${nim(resolved.stake)} NIM and predicted ` +
                `${nim(resolved.predict)} NIM would come back. ${nim(resolved.returned)} NIM did. ` +
                `How well would you read them?`
              }
            />

            <div className="grow" />
            <a className="btn ghost" href="/trust">Play again</a>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "unavailable" || !round) {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Trust" index={2} />
        <h1>Trust isn&rsquo;t open right now.</h1>
        <p className="soft">{err || "Try again in a moment, or play Split instead."}</p>
        <div className="grow" />
        <a className="btn" href="/split">Play Split instead</a>
      </main>
    );
  }

  const { stake, multiplier } = round;
  const pot = stake * multiplier;
  const predict = Math.round((predictPct / 100) * pot);
  const kept = Math.round(stake * TRUST_KEEP_PCT);
  const keepPctLabel = Math.round(TRUST_KEEP_PCT * 100);

  // ---------------------------------------------------------------- choose
  if (stage === "choose") {
    return (
      <main className="screen game">
        <ExperimentHeader experiment="Trust" index={2} />
        <div className="game-shell">
          <div className="game-context">
            <h1>How much would you trust a stranger?</h1>
            <p className="soft">
              Put {nim(stake)} NIM in another player&rsquo;s hands. They&rsquo;ll
              decide how much comes back to you. It could be more than you
              started with. It could be nothing.
            </p>

            {/* The trust game is the worst-understood of all five standard economic
                games, misunderstood by 62-70% of participants in the 2025 comprehension
                study across 1568 people, and the canonical implementation most platforms
                build on never explains the multiplier at all. A real completed round,
                pulled at random from recent play so it is not the same one twice, does
                that work instead of an instructions block. */}
            {example && (
              <div className="card guess">
                <p className="faint" style={{ marginBottom: "0.5rem" }}>
                  A round that already happened
                </p>
                <p className="soft">
                  Someone had {nim(example.stake)} NIM and trusted a stranger
                  with it. The other person sent back {nim(example.returned)} NIM,
                  leaving the first player with{" "}
                  <strong>{nim(example.final)} NIM</strong>
                  {example.final < example.stake
                    ? `, ${nim(example.stake - example.final)} NIM less than if they'd just kept it.`
                    : example.final === example.stake
                      ? ", almost exactly what they'd have had by keeping it."
                      : `, ${nim(example.final - example.stake)} NIM more than if they'd just kept it.`}
                </p>
              </div>
            )}
          </div>

          <div className="game-card">
            <div className="card">
              <div className="split-readout">
                <div>
                  <span className="k">Keep it all</span>
                  <span className="v">{nim(kept)} NIM</span>
                </div>
                <div className="right">
                  <span className="k">Trust them</span>
                  <span className="v">{nim(pot)} NIM</span>
                </div>
              </div>
              {/* The disclosed rule, on the card itself, before anyone commits.
                  Not the standard Trust Game's payoff, a Hunch rule stated
                  up front rather than a hidden deduction, see TRUST_KEEP_PCT
                  in lib/brand.ts. */}
              <p className="faint" style={{ marginTop: "0.6rem" }}>
                Playing it safe pays {keepPctLabel}% here, that&rsquo;s a Hunch
                rule, not a hidden one. Trusting them is all or nothing, and
                what comes back is entirely their call.
              </p>
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
              Trust them
            </button>
            <button className="ghost" onClick={() => commit(0)} disabled={noWallet}>
              Keep it all, keep {keepPctLabel}%
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <main className="screen game">
        <ExperimentHeader experiment="Trust" index={2} />
        <div className="game-shell">
          <div className="game-context">
            <div className="locked">
              <span className="k">Your answer, locked</span>
              <span className="v">You trust them with {nim(stake)} NIM</span>
            </div>

            <h1>How much do you think comes back?</h1>
            <p className="soft">
              They&rsquo;ll be holding {nim(pot)} NIM. Keeping all of it costs
              them nothing, and you&rsquo;ll never meet them. What do you
              actually expect?
            </p>

            {/* The comparison that actually matters now isn't the full stake,
                it's what playing it safe would have paid, TRUST_KEEP_PCT of
                it. Trusting beats "safe" the moment the return clears that
                bar, which is a lower bar than the old 100%-stake baseline
                on purpose, that's the whole point of the disclosed rule. */}
            <div className="verdict">
              <p className="soft" style={{ marginBottom: "0.35rem" }}>
                If that&rsquo;s what comes back, here&rsquo;s where you end up.
              </p>
              <p>
                <span className="hl">{nim(predict)} NIM</span>.{" "}
                {predict < kept
                  ? `That's ${nim(kept - predict)} NIM less than the ${nim(kept)} NIM you'd have kept by playing it safe.`
                  : predict === kept
                    ? `That's almost exactly the ${nim(kept)} NIM you'd have kept by playing it safe.`
                    : `That's ${nim(predict - kept)} NIM more than the ${nim(kept)} NIM you'd have kept by playing it safe.`}
              </p>
            </div>
          </div>

          <div className="game-card">
            <div className="card guess">
              <p className="eyebrow" style={{ marginBottom: "0.4rem" }}>Your hunch</p>
              <p className="soft" style={{ marginBottom: "0.4rem" }}>
                I expect them to send back&hellip;
              </p>
              <div className="amount">{predictPct}<small>% of it</small></div>
              <input
                type="range" min={0} max={100} step={1} value={predictPct}
                onChange={(e) => setPredictPct(Number(e.target.value))}
                disabled={busy}
                aria-label="What share you expect back"
              />
              {/* The ends labels sit right under the slider, where the CSS spacing
                  between them was actually tuned. An input row used to sit between them
                  and the slider, which pulled the labels up into the input's own edge. */}
              <div className="ends">
                <span>&larr; Nothing</span>
                <span>All of it &rarr;</span>
              </div>
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
            </div>

            {err && <p className="err">{err}</p>}

            <div className="grow" />
            <button onClick={() => commit(stake)} disabled={busy}>
              {busy ? "Confirming…" : "Trust them"}
            </button>
            <button className="ghost" onClick={() => setStage("choose")} disabled={busy}>
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------------ kept
  if (stage === "kept") {
    return (
      <main className="screen">
        <ExperimentHeader experiment="Trust" index={2} />
        <div className="card"><h2>{trustOpeningTier(false)}</h2></div>
        <h1>You kept {nim(kept)} NIM.</h1>
        <p className="soft">
          Playing it safe pays {keepPctLabel}% here, a Hunch rule stated on
          the card before you chose, not the full {nim(stake)} NIM you
          started with. No one else was involved, and nothing else was risked.
        </p>
        <div className="grow" />
        <a className="btn" href="/trust">Play again</a>
        <a className="btn ghost" href="/split">Try Split</a>
      </main>
    );
  }

  // --------------------------------------------------------------- waiting
  const sentPredictPct = Math.round((sentPredict / pot) * 100);
  return (
    <main className="screen">
      <ExperimentHeader experiment="Trust" index={2} />
      {gaveAway && (
        <div className="card">
          <span className="k">You&rsquo;ve trusted them</span>
          <p className="soft" style={{ marginTop: "0.4rem" }}>{nim(pot)} NIM is now in their hands.</p>
        </div>
      )}
      <h1>Looking for someone to trust you back.</h1>
      <p className="soft">
        You&rsquo;ll both make your decisions without seeing the other&rsquo;s
        choice. We&rsquo;ll let you know the moment they answer.
      </p>

      <div className="card">
        <span className="k">Your expectation</span>
        <div className="amount">{nim(sentPredict)}<small>NIM</small></div>
        <p className="faint" style={{ marginTop: "0.4rem" }}>
          You&rsquo;re predicting they&rsquo;ll return {sentPredictPct}%.
        </p>
      </div>

      {err && <p className="err">{err}</p>}

      <div className="grow" />
      <p className="faint" style={{ textAlign: "center" }}>
        {NAME} is watching for a match. Keep this open, or come back later,
        nothing is lost either way.
      </p>
    </main>
  );
}
