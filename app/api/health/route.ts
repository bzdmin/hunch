import { NextResponse } from "next/server";
import { backend } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Which settings the running deployment can actually see.
 *
 * Presence only, never secret values. It exists to answer "did Vercel pick up the
 * variables" without anyone reading a dashboard: a setting saved to the wrong
 * environment, or a deploy that never reached Production, shows up here at once.
 * The key's length is reported because a pasted pair of quotes or a trailing
 * space is the usual reason a correct-looking key is refused.
 */
export async function GET() {
  const e = process.env;
  return NextResponse.json({
    commit: (e.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    env: e.VERCEL_ENV ?? "local",
    storage: backend(),
    network: e.NIMIQ_NETWORK ?? null,
    houseFundedValue: e.NIMLAB_HOUSE_FUNDED ?? null,
    houseFunded: e.NIMLAB_HOUSE_FUNDED === "1",
    houseAddressSet: Boolean(e.NIMLAB_HOUSE_ADDRESS && e.NIMLAB_HOUSE_ADDRESS.trim()),
    // A Nimiq address is public, so its shape can be checked without exposing anything.
    houseAddressLooksValid: /^NQ\d{2}( ?[0-9A-Z]{4}){8}$/.test((e.NIMLAB_HOUSE_ADDRESS ?? "").trim().toUpperCase()),
    adminKeyLength: (e.NIMLAB_ADMIN_KEY ?? "").trim().length,
    adminKeyHadWhitespace: (e.NIMLAB_ADMIN_KEY ?? "") !== (e.NIMLAB_ADMIN_KEY ?? "").trim(),
    splitMode: e.NIMLAB_SPLIT_MODE === "house" ? "house" : "self",
  });
}
