import { NextResponse } from "next/server";
import { authorisedCron } from "@/lib/admin";
import { sweepExpiredPairs } from "@/lib/pair";

export const dynamic = "force-dynamic";

/**
 * The active half of the expiry design, see OPEN_ROUND_TTL_MS in lib/pair.ts.
 *
 * Nothing anywhere else depends on this having run recently: every read path that
 * cares whether a round is still answerable checks the deadline itself. This exists
 * purely to reclaim the "open" bucket over time instead of leaving stale rows for
 * getPair's lazy check to catch one at a time, forever, only when someone happens to
 * request that exact id again.
 *
 * Scheduled from vercel.json, once a day. Skips silently (200, swept: 0) rather than
 * failing loudly if NIMLAB_CRON_SECRET was never set, since an unset secret should
 * mean "cron not wired up yet" during development, not a production incident.
 */
export async function GET(req: Request) {
  if (!process.env.NIMLAB_CRON_SECRET) return NextResponse.json({ swept: 0, skipped: true });
  if (!authorisedCron(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const swept = await sweepExpiredPairs();
  return NextResponse.json({ swept });
}
