import { NextResponse } from "next/server";
import { authorised } from "@/lib/admin";
import { db } from "@/lib/db";
import type { Pair } from "@/lib/pair";

export const dynamic = "force-dynamic";

/**
 * Read-only: every publicKey and deviceId seen in a house-funded round, so the
 * builder can find their own test wallets' identifiers and paste them into
 * NIMLAB_TEST_KEYS without needing database access.
 *
 * Same admin gate as /api/admin/payouts, same reason: a wrong or missing key
 * gets a plain 404, nothing should confirm this endpoint exists to a stranger.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!authorised(key)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows = await db().all("pairs");
  const seen = new Map<string, { publicKey: string; deviceId: string | null; rounds: number; lastAt: number }>();

  for (const r of rows) {
    const p = r.data as Pair;
    if (p.mode !== "house") continue;
    for (const side of [p.a, p.b]) {
      if (!side) continue;
      const cur = seen.get(side.publicKey);
      if (cur) {
        cur.rounds += 1;
        cur.lastAt = Math.max(cur.lastAt, side.at);
      } else {
        seen.set(side.publicKey, {
          publicKey: side.publicKey, deviceId: side.deviceId ?? null, rounds: 1, lastAt: side.at,
        });
      }
    }
  }

  return NextResponse.json(
    [...seen.values()].sort((a, b) => b.lastAt - a.lastAt),
  );
}
