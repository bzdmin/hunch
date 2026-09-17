import { NextResponse } from "next/server";
import { randomTrustStake, randomUltimatumStake } from "@/lib/brand";
import { trustOpen, ultimatumOpen, send, type PayoutReason } from "@/lib/payout";
import { session as newId, trustMessage, ultimatumMessage } from "@/lib/message";
import {
  getPair, putPair, redact, payoff, guessGapPct, guessPercentile,
  type Pair, type PairExperiment, type Side,
} from "@/lib/pair";
import { tooManyRounds, alreadyPairedForHouseMoney, isTestKey } from "@/lib/abuse";
import { verifySignedMessage } from "@/lib/verify";

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

  const key = new URL(req.url).searchParams.get("key") ?? "";
  const viewer = p.a?.publicKey === key ? "a" : p.b?.publicKey === key ? "b" : "stranger";

  // Only a player's own guess accuracy, never a stranger's, and only once there
  // is a real outcome to grade it against.
  let percentile = null;
  if (p.status === "revealed" && p.a && p.b && (viewer === "a" || viewer === "b")) {
    percentile = await guessPercentile(p.exp, viewer, guessGapPct(p, viewer));
  }

  return NextResponse.json({ ...redact(p, viewer), percentile });
}

/**
 * The first player opens a round. Nothing is committed yet, this only reserves the id.
 *
 * Both experiments are house-funded, refused outright while the house cannot cover
 * the worst case, rather than opened and then left unable to pay. Trust's worst case
 * is the pot, one stake tripled. Ultimatum's is one stake, it never multiplies.
 */
export async function POST(req: Request) {
  let body: { exp?: PairExperiment };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  if (body.exp !== "trust" && body.exp !== "ultimatum") {
    return NextResponse.json({ error: "unknown experiment" }, { status: 400 });
  }

  // Picked here, once, and stored on the pair, both players are bound by the same
  // number for this round even though it varies round to round.
  const stake = body.exp === "trust" ? randomTrustStake() : randomUltimatumStake();
  const multiplier = body.exp === "trust" ? TRUST_MULTIPLIER : 1;
  const pot = stake * multiplier;

  const open = body.exp === "trust" ? await trustOpen(pot) : await ultimatumOpen(stake);
  if (!open) {
    return NextResponse.json(
      { error: "That one isn't open right now. Try Split instead.", closed: true },
      { status: 503 },
    );
  }

  const pair: Pair = {
    id: newId(),
    exp: body.exp,
    mode: "house",
    stake,
    multiplier,
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
 * bounded by the rules for whichever experiment this is, the signed message is
 * rebuilt from the answer and must match it word for word, and the payoff is
 * computed from what was stored.
 *
 * Money is owed from this point on, so every finished round records its payouts:
 *   Trust, A keeps      -> the round closes, A is owed the stake
 *   either, B answers   -> the round reveals, both are owed their share
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
    deviceId?: string | null;
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
  // Metadata only, never trusted for identity, so a malformed value is simply
  // dropped rather than rejected. See Side.deviceId in lib/pair.ts.
  const deviceId = typeof body.deviceId === "string" && /^[0-9a-f]{64}$/i.test(body.deviceId)
    ? body.deviceId
    : null;
  if (!/^[0-9a-z]{1,32}$/i.test(ref)) {
    return NextResponse.json({ error: "bad ref" }, { status: 400 });
  }
  if (!Number.isInteger(move) || !Number.isInteger(predict)) {
    return NextResponse.json({ error: "move and predict must be whole numbers" }, { status: 400 });
  }

  const p = await getPair(id);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (p.status === "revealed" || p.status === "closed") {
    return NextResponse.json({ error: "this one is already finished" }, { status: 409 });
  }

  // The seat follows the order of arrival, and the second seat must be someone else.
  // Otherwise the first player could hand the money to themselves and keep it all.
  const seat: "a" | "b" = p.a === null ? "a" : "b";
  if (p.a?.publicKey === publicKey) {
    return NextResponse.json(
      { error: "You started this round, so someone else has to answer it." },
      { status: 409 },
    );
  }

  // House money only. Self mode costs the house nothing, so there is nothing to
  // farm and nothing to gate here.
  if (p.mode === "house") {
    const blocked = await tooManyRounds(publicKey, deviceId);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 429 });

    // Only checkable once B's payout address is known, which is now. Two real
    // devices, each honestly under their own cap, can still be one person, or
    // two people splitting a repeated house-funded outcome between themselves.
    if (seat === "b" && p.a && !isTestKey(p.a.publicKey) && !isTestKey(publicKey)) {
      const paired = await alreadyPairedForHouseMoney(p.a.payTo, payTo);
      if (paired) {
        return NextResponse.json(
          {
            error: "You two have already played a house-funded round together. " +
              "Try Split instead, or find someone new.",
          },
          { status: 409 },
        );
      }
    }
  }

  const pot = p.stake * p.multiplier;
  const m = move as number;
  const guess = predict as number;
  let expectedMessage: string;

  if (p.exp === "trust") {
    // Bound the move and the guess against the rules, so no client can hand itself
    // a better game than the one on screen.
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
    expectedMessage = trustMessage({
      seat, pairId: p.id, stake: p.stake, multiplier: p.multiplier, move: m, predict: guess, ref,
    });
  } else {
    // Ultimatum. A's move is a real luna offer out of the stake, any amount is
    // allowed, unlike Trust there is no all-or-nothing rule here. B's move is a
    // percent threshold, 0 to 100, never a luna figure, B is never shown one.
    if (seat === "a") {
      if (m < 0 || m > p.stake) {
        return NextResponse.json({ error: `offer must be between 0 and ${p.stake}` }, { status: 400 });
      }
    } else if (m < 0 || m > 100) {
      return NextResponse.json({ error: "threshold must be a percent between 0 and 100" }, { status: 400 });
    }
    if (guess < 0 || guess > 100) {
      return NextResponse.json({ error: "predict must be a percent between 0 and 100" }, { status: 400 });
    }
    expectedMessage = ultimatumMessage({
      seat, pairId: p.id, stake: p.stake, move: m, predictPct: guess, ref,
    });
  }

  // The dialog showed exactly this text. If the answer submitted is not the one the
  // player read and signed, the round would record something they never agreed to.
  if (expectedMessage !== message) {
    return NextResponse.json(
      { error: "signed message does not match the answer it claims to describe" },
      { status: 400 },
    );
  }

  // Proves publicKey actually signed message, not merely that a caller typed both
  // fields into the same request. Without this, "identity is the signing key"
  // (see Side in lib/pair.ts) was a claim nothing checked, every cap and block
  // keyed on publicKey in lib/abuse.ts could be walked through by anyone willing
  // to invent a fresh 64-hex string per request. Confirmed against Nimiq Pay's
  // real signing format on a real phone, see lib/verify.ts.
  if (!(await verifySignedMessage(message, publicKey, signature))) {
    return NextResponse.json(
      { error: "signature does not match the key that claims to have signed it" },
      { status: 400 },
    );
  }

  const side: Side = { publicKey, signature, message, payTo, deviceId, move: m, predict: guess, at: Date.now() };

  if (seat === "a") {
    p.a = side;
    // Trust alone can end here. A keeping the stake needs no second player.
    // Ultimatum always needs both sides, an offer with nobody to accept it settles
    // nothing.
    const instant = p.exp === "trust" && m === 0;
    p.status = instant ? "closed" : "open";
    if (instant) p.revealedAt = Date.now();
  } else {
    p.b = side;
    p.status = "revealed";
    p.revealedAt = Date.now();
  }

  await putPair(p);

  // Record what is owed now that the round is settled. Payouts are ids of
  // (round, reason), so replaying this request cannot create a second debt.
  let settled: { a: number; b: number; note: string } | null = null;
  const prefix = p.exp === "trust" ? "trust" : "ultimatum";
  if (p.status === "closed" && p.a) {
    settled = { a: p.stake, b: 0, note: "kept it" };
    await send({ session: p.id, to: p.a.payTo, value: p.stake, reason: `${prefix}-a` as PayoutReason });
  } else if (p.status === "revealed" && p.a && p.b) {
    settled = payoff(p);
    if (settled.a > 0) await send({ session: p.id, to: p.a.payTo, value: settled.a, reason: `${prefix}-a` as PayoutReason });
    if (settled.b > 0) await send({ session: p.id, to: p.b.payTo, value: settled.b, reason: `${prefix}-b` as PayoutReason });
  }

  // Seat b's own guess accuracy, ready the moment they commit rather than needing
  // a second round trip. Seat a only ever finds this out later, through GET, once
  // b has answered, there is nothing to grade yet at the point a commits.
  const percentile = p.status === "revealed" && p.a && p.b
    ? await guessPercentile(p.exp, "b", guessGapPct(p, "b"))
    : null;

  return NextResponse.json({
    ...redact(p, seat),
    // A's own answer comes straight back so they get a complete result immediately.
    // Waiting on a partner must never be the whole of anyone's first experience.
    you: { move: side.move, predict: side.predict },
    payoffIfRevealed: settled,
    percentile,
  });
}
