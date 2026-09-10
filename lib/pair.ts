/**
 * The two-player engine.
 *
 * Split is solo: one person, one decision, done. Trust and Ultimatum need two people
 * who decide without seeing each other, and only then does the result unlock. That
 * blind-commit machinery is this file, and it is the single biggest piece of the
 * product, both remaining experiments sit on it.
 *
 * The shape, and why:
 *
 *   OPEN      A has committed. B has not arrived. The link is live.
 *   JOINED    B has arrived and seen the terms, but has not decided.
 *   SEALED    both have committed. Neither has seen the other's answer.
 *   REVEALED  both answers published together, payoff computed server-side.
 *
 * The server refuses to reveal anything until SEALED. That is the whole guarantee:
 * a player cannot learn what their partner did and then choose accordingly, and
 * neither can a tampered client, because the payoff is computed here from signed
 * commitments rather than anything the browser reports.
 *
 * Anti-drop-off rule, carried over from the freeze: A must get a complete result the
 * moment they commit, their own answer against the published benchmark. The partner
 * reveal is a SECOND payoff that arrives later. If A's whole experience is a
 * "waiting for Alex" screen, A is lost.
 */

import type { Mode } from "./brand";
import { db } from "./db";

export type PairExperiment = "trust" | "ultimatum";
/**
 * "closed" is a Trust round where the first player kept the money. There is no
 * second player, so it must stop accepting one rather than sit open forever.
 */
export type PairStatus = "open" | "joined" | "sealed" | "revealed" | "closed";

export type Side = {
  /** identity is the signing key, never a self-reported address */
  publicKey: string;
  signature: string;
  /** the exact string that was signed, kept verbatim so it can be re-verified */
  message: string;
  /** payout target, safe to take from listAccounts(), unlike identity */
  payTo: string;
  /**
   * The player's move. Meaning depends on the experiment:
   *   trust     · A: luna handed over (0 or the stake). B: luna returned of the tripled pot.
   *   ultimatum · A: luna offered to B. B: the minimum they will accept.
   */
  move: number;
  /** what they think their partner will do, in luna. the shareable part. */
  predict: number;
  at: number;
};

export type Pair = {
  id: string;
  exp: PairExperiment;
  mode: Mode;
  /** luna A is deciding over */
  stake: number;
  /** trust only: what the pot becomes in B's hands */
  multiplier: number;
  status: PairStatus;
  a: Side | null;
  b: Side | null;
  createdAt: number;
  revealedAt: number | null;
};

export type Payoff = { a: number; b: number; note: string };

/**
 * Who gets what. Pure, so it can be reasoned about and tested without a database,
 * and computed here rather than anywhere the client can reach.
 */
export function payoff(p: Pair): Payoff {
  if (!p.a || !p.b) throw new Error("payoff requires both sides");

  if (p.exp === "trust") {
    const handed = p.a.move;
    if (handed === 0) {
      return { a: p.stake, b: 0, note: "kept it" };
    }
    const pot = handed * p.multiplier;
    const returned = Math.min(p.b.move, pot);
    return { a: returned, b: pot - returned, note: "handed over" };
  }

  // ultimatum: B commits a threshold before seeing the offer, so both sides
  // commit blind and neither can react to the other.
  const offer = p.a.move;
  const threshold = p.b.move;
  return offer >= threshold
    ? { a: p.stake - offer, b: offer, note: "accepted" }
    : { a: 0, b: 0, note: "rejected" };
}

// ------------------------------------------------------------------ storage
// Goes through lib/db.ts, so it is files locally and Postgres in production.

const COLL = "pairs";

export async function getPair(id: string): Promise<Pair | null> {
  return (await db().get(COLL, id)) as Pair | null;
}

export async function putPair(p: Pair): Promise<void> {
  await db().put(COLL, p.id, p);
}

/**
 * What a viewer is allowed to see. Never return a Pair straight to a client, the
 * whole point is that one side cannot read the other's move before both have
 * committed, and forgetting that once undoes the entire experiment.
 */
export function redact(p: Pair, viewer: "a" | "b" | "stranger") {
  const base = {
    id: p.id,
    exp: p.exp,
    mode: p.mode,
    stake: p.stake,
    multiplier: p.multiplier,
    status: p.status,
    waitingOn: p.status === "closed" ? null : p.a && !p.b ? "b" : !p.a ? "a" : null,
  };

  // Keeping ends a round with no second player, so there is nothing left to hide.
  if (p.status === "closed" && p.a) {
    return {
      ...base,
      a: { move: p.a.move, predict: p.a.predict },
      payoff: { a: p.stake, b: 0, note: "kept it" },
      youAre: viewer,
    };
  }

  if (p.status !== "revealed") return base;

  return {
    ...base,
    a: p.a && { move: p.a.move, predict: p.a.predict },
    b: p.b && { move: p.b.move, predict: p.b.predict },
    payoff: payoff(p),
    youAre: viewer,
  };
}
