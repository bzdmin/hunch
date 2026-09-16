"use client";

import { useState, useEffect } from "react";
import { NAME } from "@/lib/brand";
import { nim, LUNA, ref as makeRef, trustMessage } from "@/lib/message";
import { trustOpeningTier } from "@/lib/copy";
import { wallet, firstAddress, readable, available } from "@/lib/nimiq";

type Stage = "loading" | "choose" | "predict" | "working" | "sent" | "kept" | "unavailable";
type Round = { id: string; stake: number; multiplier: number };

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
export default function Flow() {
  const [stage, setStage] = useState<Stage>("loading");
  const [round, setRound] = useState<Round | null>(null);
  const [predict, setPredict] = useState(0);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [gaveAway, setGaveAway] = useState(false);

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

      const res = await fetch("/api/pair", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: round.id, move, predict, ref, message, publicKey, signature, payTo,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not record that.");

      if (move === 0) {
        setStage("kept");
      } else {
        setGaveAway(true);
        setLink(`${window.location.origin}/t/${round.id}`);
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
              Real money moves here, so it has to happen inside the wallet app.
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
          <div className="amount">{nim(predict)}<small>NIM</small></div>
          <input
            type="range" min={0} max={pot} step={1} value={predict}
            onChange={(e) => setPredict(Number(e.target.value))}
            disabled={busy}
            aria-label="How much you expect back"
          />
          {/* A slider alone cannot land on an exact figure like 1,111, only on
              whatever the drag granularity happens to hit. Typing bypasses that. */}
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
          <div className="ends">
            <span>&larr; Nothing</span>
            <span>All of it &rarr;</span>
          </div>
          <p className="faint" style={{ marginTop: "0.5rem" }}>
            {predict > stake
              ? `More than you started with, you'd come out ahead.`
              : predict === stake
                ? `Exactly what you started with.`
                : `Less than you started with, you'd lose ${nim(stake - predict)} NIM.`}
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
        <div className="amount">{nim(predict)}<small>NIM</small></div>
      </div>

      <div className="grow" />
      <button
        onClick={async () => {
          const text = `I just handed a stranger ${nim(stake)} NIM. It tripled in their hands and now they decide what comes back to me. I reckon ${nim(predict)}. ${link}`;
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
