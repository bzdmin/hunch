"use client";

import { useState, useEffect } from "react";
import { NAME, STAKE, STAKE_NIM, type Mode } from "@/lib/brand";
import { build, nim, ref as makeRef, session as makeSession, type Decision } from "@/lib/message";
import { SPLIT_MEAN_GIVEN, SPLIT_GAVE_SOMETHING } from "@/lib/benchmarks";
import { wallet, firstAddress, readable, available } from "@/lib/nimiq";

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
  const inherited = inheritedFrom !== null;

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
      const found = await Promise.race([
        available(),
        new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
      ]);
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
      const w = await wallet();
      // Paying TO a listAccounts() address is the one thing Gate 1 proved safe.
      // It is a payout target, never identity, identity is the signing key.
      const payTo = await firstAddress();

      const { publicKey, signature } = await w.sign(message);

      // Only self mode moves the player's own money. In house mode they send
      // nothing at all, we pay them.
      if (!house && give > 0) {
        if (!POOL) throw new Error("No pool address configured yet.");
        await w.sendBasicTransactionWithData({
          recipient: POOL,
          value: give,
          data: `nimlab:${session}`,
        });
      }

      const r = await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, message, publicKey, signature, payTo, anchor, from }),
      });
      const bodyJson = await r.json();
      if (!r.ok) throw new Error(bodyJson.error ?? "Could not record that.");

      setRes(bodyJson);
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
      <main className="screen">
        <p className="eyebrow">{NAME} · Split · End of the chain</p>
        <h1>This chain ends with you.</h1>
        <p className="soft">
          It started at {STAKE_NIM.toLocaleString()} NIM and has been passed from
          stranger to stranger, getting smaller each time. What&rsquo;s left is{" "}
          {nim(stake)} NIM, too little to split again without it becoming
          meaningless.
        </p>

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
      </main>
    );
  }

  // ---------------------------------------------------------------- decide
  if (stage === "decide") {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Split</p>
        <h1>
          {inherited
            ? `Someone passed you ${nim(stake)} NIM.`
            : house
              ? `You've been given ${STAKE_NIM.toLocaleString()} NIM.`
              : `You're deciding over ${STAKE_NIM.toLocaleString()} NIM of your own.`}
        </h1>
        <p className="soft">
          {inherited
            ? "Now it's your turn with it. Keep what you want and pass the rest to the next person, a stranger who'll never know it was you. Keeping all of it is a real option."
            : house
              ? "It's yours. Split it however you like between yourself and the next person who plays, a stranger who'll never know it was you. Keeping all of it is a real option."
              : "Split it however you like between yourself and the next person who plays, a stranger who'll never know it was you. Passing on nothing is a real option."}
        </p>

        <div className="card">
          {/* Both numbers, always, neither one framed as "the question".
              Give-frames and take-frames provably produce different answers
              (Bardsley 2008, List 2007), so leading with either would bias the
              result, and a give-only readout hides that keeping it all is a
              legitimate choice. "Stays with you" is true in both modes: in house
              mode it lands in the wallet, in self mode it never leaves. */}
          <div className="split-readout">
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
            {100 - givePct}% stays with you, {givePct}% passed on.
          </p>
        </div>

        {noWallet && <WalletNotice />}

        <div className="grow" />
        <button onClick={() => setStage("predict")} disabled={noWallet}>Continue</button>
        <p className="faint" style={{ textAlign: "center" }}>
          {house
            ? "This NIM is already yours. You can still change your mind on the next screen."
            : "Real NIM, out of your own wallet. You can still change your mind on the next screen."}
        </p>
      </main>
    );
  }

  // --------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Split · Step 2 of 2</p>

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
          This is a guess about other people, not about you. Across everyone who has
          faced this decision, what share do you think the average person passes on?
        </p>

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
    <main className="screen">
      <p className="eyebrow">{NAME} · Split</p>
      <h1>You passed on {nim(give)} NIM.</h1>
      <p className="soft">You predicted the average person passes on {predict}%.</p>

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

      <p className="note">
        {SPLIT_MEAN_GIVEN.source} found {SPLIT_MEAN_GIVEN.value}% given away, with{" "}
        {SPLIT_GAVE_SOMETHING.value}% of people giving something.{" "}
        {/* The caveat only applies when the player used their own money, in house
            mode the comparison is like for like and the caveat would be false. */}
        {!house && SPLIT_MEAN_GIVEN.caveat}
      </p>

      <div className="grow" />
      <ShareCard give={givePct} predict={predict} session={session} />
    </main>
  );
}

/**
 * The share card. Exactly three tensions, what you did, what you predicted,
 * what the research says, and one tap into the identical experiment.
 * No fourth line. The thing a reader is invited to beat is a prediction,
 * not a score, because predictions are arguable and scores are not.
 */
function ShareCard({ give, predict, session }: { give: number; predict: number; session: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/e/${session}`;

  const text = [
    `I passed on ${give}% of the money.`,
    `I predicted most people pass on ${predict}%.`,
    `Published studies: ${SPLIT_MEAN_GIVEN.value}%.`,
    ``,
    `Think you'd predict better? ${url}`,
  ].join(String.fromCharCode(10));

  /**
   * Three tiers, because the first two do not exist over plain HTTP.
   *
   * navigator.share and navigator.clipboard are both secure-context only. Loading a
   * mini app from http://<ip>:port is not a secure context, so on 5 Sep this button
   * ran, found neither API, threw, and showed the user nothing at all. Production is
   * HTTPS and will use the share sheet, but a button that silently does nothing is
   * the worst possible failure for the one control the whole growth loop depends on.
   *
   * So: share sheet -> clipboard -> show the text on screen to copy by hand.
   * Every branch ends in visible feedback.
   */
  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user dismissed, or unavailable despite existing, fall through
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setState("copied");
        return;
      } catch {
        // blocked, fall through
      }
    }

    setState("manual");
  }

  return (
    <>
      <button onClick={share}>
        {state === "copied" ? "Copied, paste it anywhere" : "Challenge someone"}
      </button>

      {state === "manual" && (
        <div className="card">
          <p className="faint" style={{ marginBottom: "0.5rem" }}>
            Copying is blocked here. Select this and send it to someone:
          </p>
          <textarea
            readOnly
            value={text}
            rows={6}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: "100%",
              background: "var(--paper)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "0.6rem 0.7rem",
              font: "inherit",
              fontSize: "0.88rem",
              resize: "none",
            }}
          />
        </div>
      )}

      <p className="faint" style={{ textAlign: "center" }}>
        They see what you predicted, not what you kept.
      </p>
    </>
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
        Real money moves here, so it has to happen inside the wallet app. Open{" "}
        {NAME} from Nimiq Pay and you can pick up exactly where you are.
      </p>
      <p className="faint" style={{ marginTop: "0.6rem" }}>
        Reading from a browser is fine, you just can&rsquo;t take a turn from one.
      </p>
    </div>
  );
}
