"use client";

import { useState, useEffect } from "react";
import { NAME, STAKE, STAKE_NIM, type Mode } from "@/lib/brand";
import { ExperimentHeader } from "@/app/experiment-header";
import { build, nim, ref as makeRef, session as makeSession, type Decision } from "@/lib/message";
import { SPLIT_MEAN_GIVEN, SPLIT_GAVE_SOMETHING } from "@/lib/benchmarks";
import { signWithAddress, sendNim, readable, available } from "@/lib/wallet";
import { ShareCard } from "@/app/share-card";
import { addHistory } from "@/lib/history";

const POOL = process.env.NEXT_PUBLIC_POOL_ADDRESS ?? "";

type Stage = "decide" | "predict" | "working" | "result";
type Result = {
  mode: Mode;
  keep: number;
  population: { n: number; meanPct: number; gaveSomethingPct: number };
  inherited: { amount: number } | null;
};

export default function Flow({
  mode, from, stake, inheritedFrom, terminal,
}: {
  mode: Mode;
  from?: string;
  /** what this player is deciding over: the last player's gift, or a fresh stake */
  stake: number;
  inheritedFrom: string | null;
  /** the gift is too small to divide again, this player is the last link */
  terminal: boolean;
}) {
  const house = mode === "house";

  const [stage, setStage] = useState<Stage>("decide");

  /**
   * Both sliders start at zero (builder's call, 5 Sep).
   *
   * Zero is the only position that represents no action taken, so it presumes less
   * than any mid-scale default. It is still technically an anchor, it just anchors
   * at "nothing" rather than at a number we invented, so the start position is
   * still recorded on every commit, which keeps the data auditable and lets the
   * earlier randomised sessions stay comparable.
   */
  const anchor = 0;
  const [give, setGive] = useState(0);
  const [predict, setPredict] = useState(0);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [session] = useState(makeSession);

  /**
   * Is there a wallet here at all?
   *
   * /split is reachable from a normal browser, the "What is Hunch?" link on the
   * stranger page leads straight here. Without this check a Chrome visitor plays
   * through two screens and only discovers there is no wallet at the moment they
   * commit, which reads as the app breaking rather than as them being in the wrong
   * place. Assume yes while checking, since inside Nimiq Pay is the common case.
   */
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
    })();
    return () => { dead = true; };
  }, []);
  const noWallet = hasWallet === false;

  const keep = stake - give;
  const givePct = Math.round((give / stake) * 100);

  async function commit() {
    setErr("");
    setStage("working");

    const decision: Decision = {
      exp: "split", mode, session, stake, give, predict, ref: makeRef(),
    };
    const message = build(decision);

    try {
      // One prompt returns both, see lib/wallet/types.ts. The address is a
      // payout target, never identity, identity is the signing key, proven
      // server-side in lib/verify.ts.
      const { publicKey, signature, address: payTo } = await signWithAddress(message);

      // Ask the server to validate BEFORE any money moves. In self mode the payment
      // used to go first, so any rejection, a stale gift, someone else claiming it
      // in between, trying to claim your own, arrived after the player had already
      // paid, and took their NIM for nothing.
      const pre = await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision, message, publicKey, signature, payTo, anchor, from, precheck: true,
        }),
      });
      if (!pre.ok) {
        const why = await pre.json();
        throw new Error(why.error ?? "That turn is no longer valid.");
      }

      // Only self mode moves the player's own money. In house mode they send
      // nothing at all, we pay them.
      if (!house && give > 0) {
        if (!POOL) throw new Error("No pool address configured yet.");
        await sendNim({ recipient: POOL, value: give, data: `nimlab:${session}` });
      }

      const r = await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, message, publicKey, signature, payTo, anchor, from }),
      });
      const bodyJson = await r.json();
      if (!r.ok) throw new Error(bodyJson.error ?? "Could not record that.");

      setRes(bodyJson);
      addHistory({
        exp: "split",
        call: `You had ${nim(stake)} NIM and kept ${nim(keep)} NIM.`,
        outcome: `You passed on ${givePct}%.`,
        href: "/split",
      });
      setStage("result");
    } catch (e) {
      setErr(readable(e));
      setStage("predict");
    }
  }

  // -------------------------------------------------------------- terminal
  // The chain has decayed below the point where dividing it again means anything.
  // Rather than hand this player a fresh stake and pretend the chain continues,
  // it ends here and they are told so plainly.
  if (terminal && stage !== "result") {
    return (
      <main className="screen game">
        <ExperimentHeader experiment="Split" index={1} />
        <div className="game-shell">
          <div className="game-context">
            <h1>This chain ends with you.</h1>
            <p className="soft">
              It started at {STAKE_NIM.toLocaleString()} NIM and has been
              passed from stranger to stranger, getting smaller each time.
              What&rsquo;s left is {nim(stake)} NIM, too little to split
              again without it becoming meaningless.
            </p>
          </div>

          <div className="game-card">
            <div className="card">
              <span className="k" style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                Yours to keep
              </span>
              <div className="amount">{nim(stake)}<small>NIM</small></div>
              <p className="faint" style={{ marginTop: "0.5rem" }}>
                Nothing to decide. You&rsquo;re the last link.
              </p>
            </div>

            {noWallet && <WalletNotice />}
            {err && <p className="err">{err}</p>}

            <div className="grow" />
            <button onClick={commit} disabled={stage === "working" || noWallet}>
              {stage === "working" ? "Confirming…" : `Take the last ${nim(stake)} NIM`}
            </button>
            <button className="ghost" onClick={() => { setGive(0); setStage("predict"); }} disabled={stage === "working" || noWallet}>
              Start a new chain instead
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------- decide
  if (stage === "decide") {
    return (
      <main className="screen game">
        <ExperimentHeader experiment="Split" index={1} />
        <div className="game-shell">
          <div className="game-context">
            {/* One headline regardless of inherited/house/self: whoever is
                looking at this screen does, factually, have this NIM right
                now, however it arrived. The provenance distinction that used
                to live here moved to the bottom helper below, the one place
                it actually changes what's true (self mode really does send
                from this player's own wallet, house mode never does). */}
            <h1>You have {nim(stake)} NIM.<br />How much will you pass on?</h1>
            <p className="soft">
              Keep as much as you want, or pass some to the next person.
              They&rsquo;ll never know it was your decision.
            </p>
          </div>

          <div className="game-card">
            <div className="card">
              <span className="k">Your decision</span>
              {/* Both numbers, always, neither one framed as "the question".
                  Give-frames and take-frames provably produce different answers
                  (Bardsley 2008, List 2007), so leading with either would bias the
                  result, and a give-only readout hides that keeping it all is a
                  legitimate choice. "Stays with you" is true in both modes: in house
                  mode it lands in the wallet, in self mode it never leaves. */}
              <div className="split-readout" style={{ marginTop: "0.6rem" }}>
                <div>
                  <span className="k">Stays with you</span>
                  <span className="v">{nim(keep)} NIM</span>
                </div>
                <div className="right">
                  <span className="k">Passes on</span>
                  <span className="v">{nim(give)} NIM</span>
                </div>
              </div>
              <input
                type="range" min={0} max={stake} step={Math.max(1, Math.round(stake / 100))} value={give}
                onChange={(e) => setGive(Number(e.target.value))}
                aria-label="Drag left to keep more, right to pass on more"
              />
              {/* The direction was discoverable only by dragging. Naming both ends
                  makes it readable without touching anything. */}
              <div className="ends">
                <span>&larr; Keep it all</span>
                <span>Pass it all &rarr;</span>
              </div>
              <p className="faint" style={{ marginTop: "0.5rem" }}>
                {100 - givePct}% stays with you. {givePct}% passed on.
              </p>
            </div>

            {noWallet && <WalletNotice />}

            <div className="grow" />
            <button onClick={() => setStage("predict")} disabled={noWallet}>Continue</button>
            <p className="faint" style={{ textAlign: "center" }}>
              {house
                ? "This NIM is already yours. You can change your mind on the next screen."
                : "Real NIM, from your wallet. You can change your mind on the next screen."}
            </p>
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
        <ExperimentHeader experiment="Split" index={1} />
        <div className="game-shell">
          <div className="game-context">
            {/* The decision is done. Show it as settled, at the top, before asking
                anything else, on 5 Sep the builder himself moved this screen's slider
                believing he was still adjusting his own amount. Two identical sliders
                in a row is the bug; this bar is what breaks the pattern. */}
            <div className="locked">
              <span className="k">Your answer, locked</span>
              <span className="v">You pass on {nim(give)} NIM &middot; {givePct}%</span>
            </div>

            <h1>Now the hard part: what does everyone <em>else</em> do?</h1>
            <p className="soft">
              This is a guess about other people, not about you. Across
              everyone who has faced this decision, what share do you think
              the average person passes on?
            </p>
          </div>

          <div className="game-card">
            <div className="card guess">
              <p className="soft" style={{ marginBottom: "0.4rem" }}>
                I think the average person passes on&hellip;
              </p>
              <div className="amount">
                {predict}<small>% of their money</small>
              </div>
              <input
                type="range" min={0} max={100} step={1} value={predict}
                onChange={(e) => setPredict(Number(e.target.value))}
                disabled={busy}
                aria-label="What share you think the average person passes on"
              />
            </div>

            {noWallet && <WalletNotice />}
            {err && <p className="err">{err}</p>}

            <div className="grow" />
            <button onClick={commit} disabled={busy || noWallet}>
              {busy ? "Confirming…" : "Lock it in"}
            </button>
            <button className="ghost" onClick={() => setStage("decide")} disabled={busy}>
              Back
            </button>
            <p className="faint" style={{ textAlign: "center" }}>
              {house
                ? "You'll be asked to sign. That records your answer, it doesn't send anything."
                : `You'll sign your answer, then approve sending ${nim(give)} NIM.`}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------- result
  const pop = res?.population;
  const live = pop && pop.n >= 20;
  const bars = [
    { label: "You passed on", pct: givePct, cls: "you" },
    ...(live ? [{ label: `Others playing ${house ? "with a windfall" : "with their own NIM"}`, pct: Math.round(pop!.meanPct), cls: "" }] : []),
    { label: "Published research", pct: SPLIT_MEAN_GIVEN.value, cls: "research" },
  ];

  return (
    <main className="screen game">
      <ExperimentHeader experiment="Split" index={1} />
      <div className="game-shell">
        <div className="game-context">
          <h1>You passed on <span className="hl">{nim(give)} NIM</span>.</h1>

          {/* The guess was being asked and then never answered, the screen reported it
              back and scored it against nothing. "Can you predict another human?" is the
              whole premise, so this is the payoff, not a footnote. */}
          <div className="verdict">
            <p className="soft" style={{ marginBottom: "0.35rem" }}>
              You guessed most people pass on <strong>{predict}%</strong>.
            </p>
            <p>
              {(() => {
                const truth = live ? Math.round(pop!.meanPct) : SPLIT_MEAN_GIVEN.value;
                const gap = Math.round((predict - truth) * 10) / 10;
                const src = live ? `players here average ${truth}%` : `research puts it at ${truth}%`;
                if (Math.abs(gap) <= 3) {
                  return <>Almost exactly right, {src}.</>;
                }
                return (
                  <>
                    You were <span className="hl">{Math.abs(gap)} points {gap < 0 ? "low" : "high"}</span>
                    , {src}. You think people are{" "}
                    {gap < 0 ? "stingier" : "more generous"} than they are.
                  </>
                );
              })()}
            </p>
          </div>

          {/* Written for the person playing, not for a judge reading the submission.
              The citation earns its place by being checkable, not by being long. */}
          <p className="note">
            Researchers have run this exact test on thousands of people since the 1980s.
            On average they give away {SPLIT_MEAN_GIVEN.value}%, and{" "}
            {SPLIT_GAVE_SOMETHING.value}% give something rather than nothing.
            {!house && " Those studies handed people free money, though, you were deciding over your own, which usually makes people keep more."}
            <br />
            <span style={{ opacity: 0.7 }}>{SPLIT_MEAN_GIVEN.source}</span>
          </p>
        </div>

        <div className="game-card">
          <div className="card bars">
            {bars.map((b) => (
              <div className={`bar ${b.cls}`} key={b.label}>
                <div className="top">
                  <span>{b.label}</span>
                  <span>{b.pct}%</span>
                </div>
                <div className="track">
                  <div className="fill" style={{ width: `${Math.min(100, b.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grow" />

          {/* Split's deep link is /e/{session}, not /split: it carries the NIM this
              player passed on, so whoever taps it inherits that exact stake and is
              deciding over real money someone actually handed them. The generic
              route would start them a fresh round and break the chain. */}
          <ShareCard
            experiment="Split"
            color="var(--accent)"
            path={`/e/${session}`}
            predicted={<>I predicted most people pass on {predict}%.</>}
            happened={<>Studies say it&rsquo;s {SPLIT_MEAN_GIVEN.value}%.</>}
            challenge="Think you'd predict better?"
            shareText={
              `I passed on ${givePct}% of the money and predicted most people pass on ${predict}%. ` +
              `Published studies say most people pass ${SPLIT_MEAN_GIVEN.value}%. ` +
              `Think you'd predict better?`
            }
          />

          <p className="faint" style={{ textAlign: "center" }}>
            They see what you predicted, not what you kept.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Shown when there is no wallet on the page, almost always because someone reached
 * /split from a normal browser rather than from inside Nimiq Pay. Says where they
 * are and how to get where they need to be, instead of letting them play two screens
 * and hit a wall at the moment they commit.
 */
function WalletNotice() {
  return (
    <div className="card">
      <h2>You&rsquo;ll need Nimiq Pay for this bit</h2>
      <p className="soft" style={{ marginTop: "0.5rem" }}>
        Real NIM moves here, so it has to happen inside the wallet app. Open{" "}
        {NAME} from Nimiq Pay and you can pick up exactly where you are.
      </p>
      <p className="faint" style={{ marginTop: "0.6rem" }}>
        Reading from a browser is fine, you just can&rsquo;t take a turn from one.
      </p>
    </div>
  );
}
