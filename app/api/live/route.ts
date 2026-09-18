import { NextResponse } from "next/server";
import {
  countWaitingRounds, completedRoundCount, findWaitingRound, trustPopulation, ultimatumPopulation,
  recentPairEvents, type PairEvent,
} from "@/lib/pair";
import {
  unclaimedGiftCount, totalPlayers, population as splitPopulation, distribution as splitDistribution,
  recentSplitEvents, type SplitEvent,
} from "@/lib/store";

const FEED_LIMIT = 8;

export const dynamic = "force-dynamic";

const MIN_SAMPLE = 10;
type Exp = "split" | "trust" | "ultimatum";
const KNOWN: Exp[] = ["split", "trust", "ultimatum"];

/**
 * Backs the Hunch Live page (app/live/page.tsx). Three different trust
 * levels in one response, on purpose:
 *
 *   "feed" ("what just happened") is one real anecdote at a time, never an
 *   aggregate, the exact move randomWorkedExample() already makes safely on
 *   Trust/Ultimatum's own pre-play screens. So, like "right now" below, it
 *   needs no play-gate, always real, always public, see
 *   recentPairEvents/recentSplitEvents' own comments.
 *
 *   "right now" (waiting, a live join link) is presence, not an answer. It
 *   says a real person is mid-round, never what they decided, so it is
 *   always real and always public, no play-gate, same reasoning as
 *   countWaitingRounds' own comment.
 *
 *   "the numbers so far" (mean, distribution) IS what people decided, the
 *   exact thing /research already learned the hard way cannot render
 *   unconditionally, see app/api/research/route.ts. So it repeats that
 *   route's rule verbatim: an experiment's real figures are only computed
 *   into this response for experiments the caller's own local history says
 *   they have already played. Raw counts (n) are the one exception, a count
 *   makes no claim about what people typically do, so it is always included,
 *   never gated, even below MIN_SAMPLE.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("played") ?? "";
  const played = new Set(
    raw.split(",").map((s) => s.trim()).filter((s): s is Exp => (KNOWN as string[]).includes(s)),
  );

  const [splitWaiting, trustWaiting, ultimatumWaiting, splitTotal, trustTotal, ultimatumTotal, pairEvents, splitEvents] = await Promise.all([
    unclaimedGiftCount(),
    countWaitingRounds("trust"),
    countWaitingRounds("ultimatum"),
    totalPlayers(),
    completedRoundCount("trust"),
    completedRoundCount("ultimatum"),
    recentPairEvents(FEED_LIMIT),
    recentSplitEvents(FEED_LIMIT),
  ]);

  // Two real sources, one feed. Anecdotes, not a statistic, see
  // recentPairEvents/recentSplitEvents' own comments for why this needs no
  // play-gate, unlike everything below it in this response.
  const feed: ((PairEvent & { kind: "pair" }) | (SplitEvent & { kind: "split" }))[] = [
    ...pairEvents.map((e) => ({ ...e, kind: "pair" as const })),
    ...splitEvents.map((e) => ({ ...e, kind: "split" as const })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, FEED_LIMIT);

  const [trustJoin, ultimatumJoin] = await Promise.all([
    trustWaiting > 0 ? findWaitingRound("trust") : null,
    ultimatumWaiting > 0 ? findWaitingRound("ultimatum") : null,
  ]);

  const out: Record<string, unknown> = {
    feed,
    split: { waiting: splitWaiting, n: splitTotal },
    trust: { waiting: trustWaiting, n: trustTotal, joinId: trustJoin?.id ?? null },
    ultimatum: { waiting: ultimatumWaiting, n: ultimatumTotal, joinId: ultimatumJoin?.id ?? null },
  };

  if (played.has("split")) {
    const [house, self, houseDist, selfDist] = await Promise.all([
      splitPopulation("house"),
      splitPopulation("self"),
      splitDistribution("house"),
      splitDistribution("self"),
    ]);
    (out.split as Record<string, unknown>).house = house.n >= MIN_SAMPLE ? { ...house, distribution: houseDist } : null;
    (out.split as Record<string, unknown>).self = self.n >= MIN_SAMPLE ? { ...self, distribution: selfDist } : null;
  }

  if (played.has("trust")) {
    const trust = await trustPopulation();
    (out.trust as Record<string, unknown>).players = trust;
  }

  if (played.has("ultimatum")) {
    const ultimatum = await ultimatumPopulation();
    (out.ultimatum as Record<string, unknown>).players = ultimatum;
  }

  return NextResponse.json(out);
}
