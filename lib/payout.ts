/**
 * Paying players from the house wallet.
 *
 * House funding means the player never sends anything. They sign a decision, and we
 * settle it. Every payout in the app, Split and Trust alike, goes through send().
 *
 * Automatic sending (Gate 2, proven on mainnet 13 Sep) is lib/broadcast.ts: sign
 * offline, broadcast through a public node. It only runs when all three are true:
 *
 *   NIMIQ_NETWORK=main      the only public node is mainnet
 *   NIMLAB_AUTOPAY=1        a deliberate switch, never on by accident
 *   NIMLAB_HOUSE_KEY        a valid key, server-only
 *
 * Otherwise payouts are recorded as "queued" and settled by hand from /admin, which
 * is still the fallback whenever a broadcast fails.
 *
 * NEVER put the house key in NEXT_PUBLIC_* or anywhere the client bundle can reach.
 */

import { db } from "./db";
import { pay, keyConfigured } from "./broadcast";

/**
 * Is the house able to fund a windfall right now?
 *
 * House mode is only offered when there is money behind it. Today the wallet is
 * deliberately unfunded, so every player gets self mode and nothing is promised that
 * cannot be paid. Funding the wallet and setting NIMLAB_HOUSE_FUNDED=1 turns house
 * mode on for everyone, with no code change and no redeploy of the flow.
 *
 * Deliberately conservative: if anything here is unset, the answer is no.
 */
export async function houseFunded(need: number): Promise<boolean> {
  if (process.env.NIMLAB_HOUSE_FUNDED !== "1") return false;
  if (!process.env.NIMLAB_HOUSE_ADDRESS) return false;
  return withinCap(need);
}

/** Hard bound on what the house can spend in a day, in luna. */
export const DAILY_CAP = Number(process.env.NIMLAB_DAILY_CAP_LUNA ?? 0) || 50_000 * 100_000;

/**
 * Why money is owed. Each pair of (session, reason) is paid at most once, since the
 * payout id is built from both.
 */
export type PayoutReason = "keep" | "gift" | "trust-a" | "trust-b";

export type Payout = {
  id: string;
  session: string;
  to: string;
  value: number;
  reason: PayoutReason;
  /**
   * sending: a broadcast was started. If a record is ever stuck here, the node may or
   * may not have the transaction, so check the chain before paying it by hand.
   */
  status: "queued" | "sending" | "sent" | "failed";
  txHash: string | null;
  error: string | null;
  at: number;
};

const COLL = "payouts";

async function read(): Promise<Payout[]> {
  return (await db().all(COLL)).map((r) => r.data as Payout);
}

/** Total already committed today, so the cap counts queued money as spent. */
export async function spentToday(): Promise<number> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return (await read())
    .filter((p) => p.at >= since && p.status !== "failed")
    .reduce((a, b) => a + b.value, 0);
}

export async function withinCap(add: number): Promise<boolean> {
  return (await spentToday()) + add <= DAILY_CAP;
}

export function autopayEnabled(): boolean {
  return (
    process.env.NIMIQ_NETWORK === "main" &&
    process.env.NIMLAB_AUTOPAY === "1" &&
    keyConfigured()
  );
}

/**
 * Record a payout and, when autopay is on, send it.
 *
 * Idempotent by id. The id is (session, reason), and a record that already exists is
 * returned untouched. This used to overwrite the record on every call, which was
 * harmless while payouts were manual and would pay twice once they are not: a
 * retried request would broadcast a second transaction for the same debt.
 *
 * The record is written as "sending" BEFORE the broadcast, so if the process dies
 * mid-send the ledger shows an unknown outcome rather than silently inviting a
 * second payment.
 */
export async function send(args: {
  session: string;
  to: string;
  value: number;
  reason: PayoutReason;
}): Promise<Payout> {
  const id = `${args.session}-${args.reason}`;

  const existing = (await db().get(COLL, id)) as Payout | null;
  if (existing) return existing;

  const rec: Payout = {
    id,
    session: args.session,
    to: args.to,
    value: args.value,
    reason: args.reason,
    status: "queued",
    txHash: null,
    error: null,
    at: Date.now(),
  };

  if (!(await withinCap(args.value))) {
    rec.status = "failed";
    rec.error = "daily cap reached";
    await db().put(COLL, id, rec);
    return rec;
  }

  if (!autopayEnabled()) {
    await db().put(COLL, id, rec);
    return rec;
  }

  rec.status = "sending";
  await db().put(COLL, id, rec);

  try {
    rec.txHash = await pay({ to: args.to, luna: args.value, note: `hunch:${args.session}` });
    rec.status = "sent";
  } catch (e) {
    // Nothing left this process if pay() threw before broadcasting, so it is safe to
    // leave for manual settlement. The message says which case it was.
    rec.status = "queued";
    rec.error = e instanceof Error ? e.message.slice(0, 300) : String(e);
  }

  await db().put(COLL, id, rec);
  return rec;
}

export async function pending(): Promise<Payout[]> {
  return (await read()).filter((p) => p.status === "queued");
}

/**
 * Trust opens when the house can cover a whole handed-over round, which is the
 * tripled pot, not the stake. Checked against the pot so the daily cap cannot be
 * overrun by a round that was affordable only on paper.
 */
export async function trustOpen(pot: number): Promise<boolean> {
  return houseFunded(pot);
}

/**
 * Split only uses the windfall when asked to explicitly. Funding the house is what
 * opens Trust, and that must not silently change how Split works for everyone:
 * the two modes produce different data, and a player mid-chain would suddenly be
 * deciding over different money. NIMLAB_SPLIT_MODE=house switches it deliberately.
 */
export async function splitHouseMode(stake: number): Promise<boolean> {
  if (process.env.NIMLAB_SPLIT_MODE !== "house") return false;
  return houseFunded(stake);
}

/** Every payout, newest first. For the settlement page only. */
export async function allPayouts(): Promise<Payout[]> {
  return (await read()).sort((a, b) => b.at - a.at);
}

/**
 * Record that a payout was settled by hand. The hash is required so the ledger can
 * never say money moved without pointing at the transaction that moved it.
 */
export async function markSent(id: string, txHash: string): Promise<Payout | null> {
  const p = (await db().get(COLL, id)) as Payout | null;
  if (!p || (p.status !== "queued" && p.status !== "sending")) return null;
  p.status = "sent";
  p.txHash = txHash;
  p.error = null;
  await db().put(COLL, id, p);
  return p;
}
