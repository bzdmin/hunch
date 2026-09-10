import { NextResponse } from "next/server";
import { STAKE } from "@/lib/brand";
import { trustOpen, send } from "@/lib/payout";
import { session as newId, trustMessage } from "@/lib/message";
import {
  getPair, putPair, redact, payoff,
  type Pair, type PairExperiment, type Side,
} from "@/lib/pair";

export const dynamic = "force-dynamic";

const TRUST_MULTIPLIER = 3;

/**
 * Read a round.
 *
 * Reads go through redact() without exception. Returning a raw Pair would let one
 * side read the other's move before both had committed, which is the one thing this
 * whole engine exists to prevent.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });

  const p = await getPair(id);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  // The viewer is worked out from the signing key they present, not from a claim.
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const viewer = p.a?.publicKey === key ? "a" : p.b?.publicKey === key ? "b" : "stranger";

  return NextResponse.json(redact(p, viewer));
}

/**
 * The first player opens a round. Nothing is committed yet, this only reserves the id.
 *
 * Trust is always house-funded: the multiplier creates money that is in nobody's
 * wallet. So a round is refused outright while the house cannot cover a whole
 * handed-over pot, rather than opened and then left unable to pay.
 */
export async function POST(req: Request) {
  let body: { exp?: PairExperiment };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  if (body.exp !== "trust") {
    return NextResponse.json({ error: "only Trust is open" }, { status: 400 });
  }

  const pot = STAKE * TRUST_MULTIPLIER;
  if (!(await trustOpen(pot))) {
    return NextResponse.json(
      { error: "Trust isn't open right now. Try Split instead.", closed: true },
      { status: 503 },
    );
  }

  const pair: Pair = {
    id: newId(),
    exp: "trust",
    mode: "house",
    stake: STAKE,
    multiplier: TRUST_MULTIPLIER,
    status: "open",
    a: null,
    b: null,
    createdAt: Date.now(),
    revealedAt: null,
  };

  await putPair(pair);
  return NextResponse.json({ id: pair.id, exp: pair.exp, mode: pair.mode, stake: pair.stake, multiplier: pair.multiplier });
}

/**
 * One side commits. The first call fills A, the second fills B and reveals.
 *
 * Nothing here trusts the browser. The seat is decided by the server, the move is
 * bounded by the rules, the signed message is rebuilt from the answer and must match
 * it word for word, and the payoff is computed from what was stored.
 *
 * Money is owed from this point on, so every finished round records its payouts:
 *   A keeps      -> the round closes, A is owed the stake
 *   B answers    -> the round reveals, both are owed their share of the pot
 */
export async function PUT(req: Request) {
  let body: {
    id?: string;
    move?: number;
    predict?: number;
    ref?: string;
    message?: string;
    publicKey?: string;
    signature?: string;
    payTo?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  const { id, move, predict, ref, message, publicKey, signature, payTo } = body;
  if (!id || !message || !publicKey || !signature || !payTo || !ref) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!/^[0-9a-z]{1,32}$/i.test(ref)) {
    return NextResponse.json({ error: "bad ref" }, { status: 400 });
  }
  if (!Number.isInteger(move) || !Number.isInteger(predict)) {
    return NextResponse.json({ error: "move and predict must be whole luna" }, { status: 400 });
  }

  const p = await getPair(id);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (p.exp !== "trust") {
    return NextResponse.json({ error: "only Trust is open" }, { status: 400 });
  }
  if (p.status === "revealed" || p.status === "closed") {
    return NextResponse.json({ error: "this one is already finished" }, { status: 409 });
  }

  // The seat follows the order of arrival, and the second seat must be someone else.
  // Otherwise the first player could hand the money to themselves and keep the pot.
  const seat: "a" | "b" = p.a === null ? "a" : "b";
  if (p.a?.publicKey === publicKey) {
    return NextResponse.json(
      { error: "You started this round, so someone else has to answer it." },
      { status: 409 },
    );
  }

  const pot = p.stake * p.multiplier;
  const m = move as number;
  const guess = predict as number;

  // Bound the move and the guess against the rules, so no client can hand itself a
  // better game than the one on screen.
  const cap = seat === "b" ? pot : p.stake;
  if (m < 0 || m > cap) {
    return NextResponse.json({ error: `move must be between 0 and ${cap}` }, { status: 400 });
  }
  if (seat === "a" && m !== 0 && m !== p.stake) {
    return NextResponse.json({ error: "trust is all or nothing for the first player" }, { status: 400 });
  }
  if (guess < 0 || guess > pot) {
    return NextResponse.json({ error: `predict must be between 0 and ${pot}` }, { status: 400 });
  }

  // The dialog showed exactly this text. If the answer submitted is not the one the
  // player read and signed, the round would record something they never agreed to.
  const expected = trustMessage({
    seat, pairId: p.id, stake: p.stake, multiplier: p.multiplier, move: m, predict: guess, ref,
  });
  if (expected !== message) {
    return NextResponse.json(
      { error: "signed message does not match the answer it claims to describe" },
      { status: 400 },
    );
  }

  const side: Side = { publicKey, signature, message, payTo, move: m, predict: guess, at: Date.now() };

  if (seat === "a") {
    p.a = side;
    // Keeping ends the round on the spot. Nobody is waiting for a second player.
    p.status = m === 0 ? "closed" : "open";
    if (m === 0) p.revealedAt = Date.now();
  } else {
    p.b = side;
    p.status = "revealed";
    p.revealedAt = Date.now();
  }

  await putPair(p);

  // Record what is owed now that the round is settled. Payouts are ids of
  // (round, seat), so replaying this request cannot create a second debt.
  let settled: { a: number; b: number; note: string } | null = null;
  if (p.status === "closed" && p.a) {
    settled = { a: p.stake, b: 0, note: "kept it" };
    await send({ session: p.id, to: p.a.payTo, value: p.stake, reason: "trust-a" });
  } else if (p.status === "revealed" && p.a && p.b) {
    settled = payoff(p);
    if (settled.a > 0) await send({ session: p.id, to: p.a.payTo, value: settled.a, reason: "trust-a" });
    if (settled.b > 0) await send({ session: p.id, to: p.b.payTo, value: settled.b, reason: "trust-b" });
  }

  return NextResponse.json({
    ...redact(p, seat),
    // A's own answer comes straight back so they get a complete result immediately.
    // Waiting on a partner must never be the whole of anyone's first experience.
    you: { move: side.move, predict: side.predict },
    payoffIfRevealed: settled,
  });
}
