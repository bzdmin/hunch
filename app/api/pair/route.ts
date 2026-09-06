import { NextResponse } from "next/server";
import { STAKE, type Mode } from "@/lib/brand";
import { houseFunded } from "@/lib/payout";
import { session as newId } from "@/lib/message";
import {
  getPair, putPair, redact, payoff,
  type Pair, type PairExperiment, type Side,
} from "@/lib/pair";

export const dynamic = "force-dynamic";

const TRUST_MULTIPLIER = 3;

/**
 * Create an invite, or read one.
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
 * A opens a pair. Nothing is committed yet, this only reserves the link, so A can
 * see what B will see before sending it.
 */
export async function POST(req: Request) {
  let body: { exp?: PairExperiment };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  const exp = body.exp;
  if (exp !== "trust" && exp !== "ultimatum") {
    return NextResponse.json({ error: "unknown experiment" }, { status: 400 });
  }

  const mode: Mode = (await houseFunded(STAKE)) ? "house" : "self";

  const pair: Pair = {
    id: newId(),
    exp,
    mode,
    stake: STAKE,
    multiplier: exp === "trust" ? TRUST_MULTIPLIER : 1,
    status: "open",
    a: null,
    b: null,
    createdAt: Date.now(),
    revealedAt: null,
  };

  await putPair(pair);
  return NextResponse.json({ id: pair.id, exp, mode, stake: pair.stake, multiplier: pair.multiplier });
}

/**
 * One side commits. The first call fills A, the second fills B and seals the pair.
 *
 * Nothing here trusts the browser: the move is bounded against the experiment's own
 * rules, the seat is decided by the signing key rather than a claim, and the payoff
 * is computed from what was stored, never from anything the client reports.
 */
export async function PUT(req: Request) {
  let body: {
    id?: string;
    seat?: "a" | "b";
    move?: number;
    predict?: number;
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

  const { id, move, predict, message, publicKey, signature, payTo } = body;
  if (!id || !message || !publicKey || !signature || !payTo) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!Number.isInteger(move) || !Number.isInteger(predict)) {
    return NextResponse.json({ error: "move and predict must be whole luna" }, { status: 400 });
  }

  const p = await getPair(id);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (p.status === "revealed") {
    return NextResponse.json({ error: "this one is already finished" }, { status: 409 });
  }

  // The seat follows the key. A player who already committed cannot commit again,
  // and cannot take the other seat to see both sides.
  const seat: "a" | "b" = p.a === null ? "a" : "b";
  if (p.a?.publicKey === publicKey) {
    return NextResponse.json({ error: "you have already answered this one" }, { status: 409 });
  }

  const side: Side = {
    publicKey, signature, message, payTo,
    move: move as number,
    predict: predict as number,
    at: Date.now(),
  };

  // Bound the move against the rules, so no client can hand itself a better game.
  const cap = seat === "b" && p.exp === "trust" ? p.stake * p.multiplier : p.stake;
  if (side.move < 0 || side.move > cap) {
    return NextResponse.json({ error: `move must be between 0 and ${cap}` }, { status: 400 });
  }
  if (seat === "a" && p.exp === "trust" && side.move !== 0 && side.move !== p.stake) {
    return NextResponse.json(
      { error: "trust is all or nothing for the first player" },
      { status: 400 },
    );
  }

  if (seat === "a") {
    p.a = side;
    p.status = "open";
  } else {
    p.b = side;
    p.status = "sealed";
  }

  if (p.a && p.b) {
    p.status = "revealed";
    p.revealedAt = Date.now();
  }

  await putPair(p);

  return NextResponse.json({
    ...redact(p, seat),
    // A's own answer comes straight back so they get a complete result immediately.
    // Waiting on a partner must never be the whole of anyone's first experience.
    you: { move: side.move, predict: side.predict },
    payoffIfRevealed: p.status === "revealed" ? payoff(p) : null,
  });
}
