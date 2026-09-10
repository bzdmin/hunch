import { NextResponse } from "next/server";
import { authorised } from "@/lib/admin";
import { allPayouts, markSent } from "@/lib/payout";

export const dynamic = "force-dynamic";

/**
 * Manual settlement, until payouts broadcast automatically.
 *
 * Every payout is recorded as owed and paid by hand from a wallet the builder
 * controls. This lists what is owed, and records the transaction hash once it has
 * been paid, so the ledger never claims money moved when it did not.
 *
 * A wrong or missing key gets a plain 404, not a 401: nothing should confirm to a
 * stranger that this endpoint exists.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!authorised(key)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await allPayouts());
}

/** Posted by the form on /admin. Redirects back so a refresh cannot resubmit. */
export async function POST(req: Request) {
  const form = await req.formData();
  const key = String(form.get("key") ?? "");
  if (!authorised(key)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const id = String(form.get("id") ?? "");
  const tx = String(form.get("tx") ?? "").trim();
  const back = (extra = "") =>
    NextResponse.redirect(new URL(`/admin?key=${encodeURIComponent(key)}${extra}`, req.url), 303);

  // A Nimiq transaction hash is 64 hex characters. Anything else is a typo, and a
  // typo here would mark a payout as settled against a transaction that does not exist.
  if (!id || !/^[0-9a-f]{64}$/i.test(tx)) return back("&err=tx");

  const done = await markSent(id, tx.toLowerCase());
  return back(done ? "" : "&err=gone");
}
