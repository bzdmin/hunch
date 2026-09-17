"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, ref as makeRef, trustMessage } from "@/lib/message";
import { trustOpeningTier, trustReturnTier, guessAccuracyClause, verdictValue } from "@/lib/copy";
import { wallet, firstAddress, readable, available, deviceId, DEVICE_ID_REASON } from "@/lib/nimiq";
import { loadOpenRound, saveOpenRound, clearOpenRound } from "@/lib/resume";
import { ReportCard } from "@/app/report-card";

type Stage = "loading" | "choose" | "predict" | "working" | "sent" | "kept" | "unavailable" | "resolved";
type Round = { id: string; stake: number; multiplier: number };
type Resolved = {
  stake: number;
  pot: number;
  predict: number;
  returned: number;
  payoff: { a: number; b: number; note: string };
  percentile: { percentile: number; sampleSize: number } | null;
};

/**
 * The first player's turn.
 *
 * The stake is random per round (200 to 500 NIM, see lib/brand.ts), chosen by the
 * server, not the client. So the round has to be created before this can show a
 * real number, that happens once on mount, before the "choose" screen renders,
 * rather than at commit time the way a fixed-stake version could get away with.
 *
 * Two paths after that, and only one needs a second person:
 *   keep      -> the round is over immediately. No link, no waiting.
 *   hand over -> predict what comes back, sign, then share a link.
 *
 * Keeping ending the round instantly matters: someone who does not want to involve
 * anyone else still gets a complete experience rather than a dead end.
 */
type WorkedExample = { stake: number; returned: number; final: number } | null;

export default function Flow({ example }: { example: WorkedExample }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [round, setRound] = useState<Round | null>(null);

  // Held as a percentage, same reason as B's side: a percent-of-pot guess is
  // "roughly how trusting were they" rather than a specific NIM figure to nail,
  // and it makes the input a clean integer, no decimal reformatting fighting
  // whoever is typing. The luna figure used for signing and the reveal is derived
  // from it below.
  const [predictPct, setPredictPct] = useState(0);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [gaveAway, setGaveAway] = useState(false);
  // Set at commit time, or restored from a resumed round, since the "sent"
  // screen can render without predictPct ever having been touched this session.
  const [sentPredict, setSentPredict] = useState(0);
  // A's own view of the outcome once B has answered, found on revisiting this
  // page with an open round cached, see lib/resume.ts. There was previously
  // no way for A to ever find this out at all, unlike B, who gets it inline
  // as the response to their own commit.
  const [resolved, setResolved] = useState<Resolved | null>(null);

  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      const found = await Promise.race([
        available(),
        new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
      ]);
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
      // Only the "handed over" path is ever cached, "kept" ends with no
      // link, so a resumed round is always the gaveAway one.
      const cached = loadOpenRound<{ stake: number; multiplier: number; predict: number }>("trust");
      if (cached) {
        try {
          const got = await fetch(`/api/pair?id=${cached.id}`);
          const info = await got.json();
          if (got.ok && info.waitingOn === "b") {
            if (!dead) {
              setRound({ id: cached.id, stake: info.stake, multiplier: info.multiplier });
              setSentPredict(cached.predict);
              setGaveAway(true);
              setLink(cached.link);
              setStage("sent");
            }
            return;
          }
          // Answered since. Shown once, then forgotten: the cache's job was
          // getting A back to a round in progress, not keeping history.
          if (got.ok && info.status === "revealed" && info.a && info.b && info.payoff) {
            clearOpenRound("trust");
            if (!dead) {
              setResolved({
                stake: info.stake,
                pot: info.stake * info.multiplier,
                predict: info.a.predict,
                returned: info.b.move,
                payoff: info.payoff,
                percentile: info.percentile ?? null,
              });
              setStage("resolved");
            }
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
  }, []);

  async function commit(move: number) {
    if (!round) return;
    setErr("");
    setStage("working");

    try {
      const w = await wallet();
      const payTo = await firstAddress();
      const ref = makeRef();
      const message = trustMessage({
        seat: "a", pairId: round.id, stake: round.stake, multiplier: round.multiplier,
        move, predict, ref,
      });
      const { publicKey, signature } = await w.sign(message);
      const device = await deviceId(DEVICE_ID_REASON);

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: round.id, move, predict, ref, message, publicKey, signature, payTo, deviceId: device,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      if (move === 0) {
        setStage("kept");
      } else {
        const shareLink = `${window.location.origin}/t/${round.id}`;
        setGaveAway(true);
        setSentPredict(predict);
        setLink(shareLink);
        saveOpenRound("trust", {
          id: round.id, link: shareLink, at: Date.now(),
          stake: round.stake, multiplier: round.multiplier, predict,
        });
        setStage("sent");
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
        <p className="eyebrow">{NAME} · Trust</p>
        <h1>Setting up your round&hellip;</h1>
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
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <div className="card"><h2>{trustReturnTier(sharePct)}</h2></div>

        <p className="soft">
          You handed over {nim(resolved.stake)} NIM, and it became{" "}
          {nim(resolved.pot)} NIM in their hands.
        </p>

        <ReportCard
          experiment="Trust"
          color="var(--good)"
          call={<>You handed over {nim(resolved.stake)} NIM.</>}
          hunch={<>You expected {nim(resolved.predict)} NIM back.</>}
          outcome={<>They sent back {nim(resolved.returned)} NIM.</>}
          verdictLabel="How well did you read them?"
          verdictValue={verdictValue(resolved.percentile, guessAccuracyClause(predictPct, sharePct))}
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
          {resolved.payoff.a > resolved.stake
            ? `Trusting them paid off, you came out ${nim(resolved.payoff.a - resolved.stake)} NIM ahead.`
            : resolved.payoff.a === resolved.stake
              ? "You broke even."
              : `You lost ${nim(resolved.stake - resolved.payoff.a)} NIM by trusting them.`}
        </p>

        <div className="grow" />
        <a className="btn" href="/trust">Play again</a>
      </main>
    );
  }

  if (stage === "unavailable" || !round) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
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

  // ---------------------------------------------------------------- choose
  if (stage === "choose") {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <h1>You have {nim(stake)} NIM. Keep it, or risk it.</h1>
        <p className="soft">
          If you hand it over, it becomes{" "}
          <span className="hl">{nim(pot)} NIM</span> in the other person&rsquo;s
          hands. Then <em>they</em> decide how much comes back to you. It could be
          more than you started with. It could be nothing.
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
              Someone had {nim(example.stake)} NIM and handed it over. The other
              person sent back {nim(example.returned)} NIM, leaving the first
              player with <strong>{nim(example.final)} NIM</strong>
              {example.final < example.stake
                ? `, ${nim(example.stake - example.final)} NIM less than if they'd just kept it.`
                : example.final === example.stake
                  ? ", almost exactly what they'd have had by keeping it."
                  : `, ${nim(example.final - example.stake)} NIM more than if they'd just kept it.`}
            </p>
          </div>
        )}

        <div className="card">
          <div className="split-readout">
            <div>
              <span className="k">Keep it</span>
              <span className="v">{nim(stake)} NIM</span>
            </div>
            <div className="right">
              <span className="k">Hand it over</span>
              <span className="v">{nim(pot)} NIM</span>
            </div>
          </div>
          <p className="faint" style={{ marginTop: "0.6rem" }}>
            Handing over is all or nothing, which is what makes it a test
            of trust and not a hedge.
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
          Hand it over
        </button>
        <button className="ghost" onClick={() => commit(0)} disabled={noWallet}>
          Keep the {nim(stake)} NIM
        </button>
      </main>
    );
  }

  // --------------------------------------------------------------- predict
  if (stage === "predict" || stage === "working") {
    const busy = stage === "working";
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust · Step 2 of 2</p>

        <div className="locked">
          <span className="k">Your answer, locked</span>
          <span className="v">You hand over {nim(stake)} NIM</span>
        </div>

        <h1>How much do you think comes back?</h1>
        <p className="soft">
          They&rsquo;ll be holding {nim(pot)} NIM. Keeping all of it costs them
          nothing, and you&rsquo;ll never meet them. What do you actually expect?
        </p>

        <div className="card guess">
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

        {/* This is the specific fact the trust game loses people on: not the
            multiplier, the COMPARISON against what they'd have had by keeping it.
            It was a faint one-line footnote here before, easy to skip. Now it is
            its own block, live, using the same styling the reveal screens use for
            the one sentence on the page that actually matters. Break-even is a
            third of the pot, that is exactly the stake handed over. */}
        <div className="verdict">
          <p className="soft" style={{ marginBottom: "0.35rem" }}>
            If that&rsquo;s what comes back, here&rsquo;s where you end up.
          </p>
          <p>
            <span className="hl">{nim(predict)} NIM</span>.{" "}
            {predictPct < 33
              ? `That's ${nim(stake - predict)} NIM less than the ${nim(stake)} NIM you'd have had by just keeping it.`
              : predictPct < 34
                ? `That's almost exactly the ${nim(stake)} NIM you'd have had by keeping it.`
                : `That's ${nim(predict - stake)} NIM more than the ${nim(stake)} NIM you'd have had by keeping it.`}
          </p>
        </div>

        {err && <p className="err">{err}</p>}

        <div className="grow" />
        <button onClick={() => commit(stake)} disabled={busy}>
          {busy ? "Confirming…" : "Hand it over"}
        </button>
        <button className="ghost" onClick={() => setStage("choose")} disabled={busy}>
          Back
        </button>
      </main>
    );
  }

  // ------------------------------------------------------------------ kept
  if (stage === "kept") {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <div className="card"><h2>{trustOpeningTier(false)}</h2></div>
        <h1>You kept the {nim(stake)} NIM.</h1>
        <p className="soft">
          No one else was involved, and nothing was risked. That&rsquo;s a real answer,
          in the original studies most people did hand it over, and on average
          they got back slightly less than they gave.
        </p>
        <div className="grow" />
        <a className="btn" href="/trust">Play again</a>
        <a className="btn ghost" href="/split">Try Split</a>
      </main>
    );
  }

  // ------------------------------------------------------------------ sent
  return (
    <main className="screen">
      <p className="eyebrow">{NAME} · Trust</p>
      {gaveAway && <div className="card"><h2>{trustOpeningTier(true)}</h2></div>}
      <h1>It&rsquo;s out of your hands.</h1>
      <p className="soft">
        Send this to someone. They&rsquo;ll be holding {nim(pot)} NIM and deciding
        what comes back to you. You&rsquo;ll find out when they answer.
      </p>

      <div className="card">
        <span className="k">You expect back</span>
        <div className="amount">{nim(sentPredict)}<small>NIM</small></div>
      </div>

      <div className="grow" />
      <button
        onClick={async () => {
          // No figures here on purpose. B's whole screen is built around never
          // seeing the exact pot before deciding, this message reaches B before the
          // app even opens, so a NIM amount here would spoil it before it starts.
          const text = `I just trusted a complete stranger with real NIM. It tripled in their hands, and now it's entirely up to them what comes back to me. ${link}`;
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
