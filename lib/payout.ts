/**
 * Paying players from the house wallet.
 *
 * House funding (locked 5 Sep) means the player never sends anything. They sign a
 * decision, and we settle it:
 *
 *     keep  -> paid to the player now
 *     give  -> queued for whoever plays next
 *
 * Total outflow is STAKE per player either way, so the daily cap is what bounds cost.
 *
 * THE OPEN PROBLEM: the mini-app SDK only exists in the player's browser, so the
 * server needs its own route onto the Nimiq network. Neither option is a drop-in:
 *
 *   @nimiq/core 2.21.0        WASM client, must reach consensus before sending.
 *                             Needs a long-lived process; will not work inside a
 *                             Vercel serverless function that cold-starts per request.
 *   nimiq-rpc-client-ts       Assumes we run a Nimiq node with RPC enabled.
 *
 * Until one is proven, send() records the intent and returns "queued". Nothing is
 * lost, pending payouts can be settled by hand from Nimiq Pay, which is the agreed
 * fallback if the automated path does not land in time.
 *
 * NEVER put the house private key in NEXT_PUBLIC_* or anywhere the client bundle
 * can reach. It belongs in a server-only env var.
 */

import { db } from "./db";

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

export type Payout = {
  id: string;
  session: string;
  to: string;
  value: number;
  reason: "keep" | "gift";
  status: "queued" | "sent" | "failed";
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

/**
 * Record a payout and attempt to send it.
 * Returns the stored record; status is "queued" until the network path is proven.
 */
export async function send(args: {
  session: string;
  to: string;
  value: number;
  reason: "keep" | "gift";
}): Promise<Payout> {
  const rec: Payout = {
    id: `${args.session}-${args.reason}`,
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
  }

  // TODO(gate 2): broadcast here once a server-side send path is proven.
  // Until then the record stands and the payout is settled manually.

  await db().put(COLL, rec.id, rec);
  return rec;
}

export async function pending(): Promise<Payout[]> {
  return (await read()).filter((p) => p.status === "queued");
}
