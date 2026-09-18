/**
 * The two-player engine.
 *
 * Split is solo: one person, one decision, done. Trust and Ultimatum need two people
 * who decide without seeing each other, and only then does the result unlock. That
 * blind-commit machinery is this file, and it is the single biggest piece of the
 * product, both remaining experiments sit on it.
 *
 * The shape, and why:
 *
 *   OPEN      A has committed. B has not arrived. The link is live.
 *   JOINED    B has arrived and seen the terms, but has not decided.
 *   SEALED    both have committed. Neither has seen the other's answer.
 *   REVEALED  both answers published together, payoff computed server-side.
 *
 * The server refuses to reveal anything until SEALED. That is the whole guarantee:
 * a player cannot learn what their partner did and then choose accordingly, and
 * neither can a tampered client, because the payoff is computed here from signed
 * commitments rather than anything the browser reports.
 *
 * Anti-drop-off rule, carried over from the freeze: A must get a complete result the
 * moment they commit, their own answer against the published benchmark. The partner
 * reveal is a SECOND payoff that arrives later. If A's whole experience is a
 * "waiting for Alex" screen, A is lost.
 */

import { TRUST_KEEP_PCT, type Mode } from "./brand";
import { db } from "./db";

export type PairExperiment = "trust" | "ultimatum";
/**
 * "closed" is a Trust round where the first player kept the money. There is no
 * second player, so it must stop accepting one rather than sit open forever.
 *
 * "expired" is the other way an "open" round stops being open: A committed,
 * nobody ever answered, see OPEN_ROUND_TTL_MS and isExpired() below for why
 * this exists and how it is enforced.
 */
export type PairStatus = "open" | "joined" | "sealed" | "revealed" | "closed" | "expired";

export type Side = {
  /** identity is the signing key, never a self-reported address */
  publicKey: string;
  signature: string;
  /** the exact string that was signed, kept verbatim so it can be re-verified */
  message: string;
  /** payout target, safe to take from listAccounts(), unlike identity */
  payTo: string;
  /**
   * Nimiq Pay's per-origin device identifier, or null when unavailable (denied,
   * outside Nimiq Pay, older client). Anti-abuse metadata only, never part of the
   * signed commitment, same treatment as Commit.anchor in lib/store.ts, a lying
   * or absent value only weakens that device's own cap, it cannot forge someone
   * else's identity or move money.
   */
  deviceId: string | null;
  /**
   * The player's move. Meaning depends on the experiment:
   *   trust     · A: luna handed over (0 or the stake). B: luna returned of the tripled pot.
   *   ultimatum · A: luna offered to B. B: the minimum they will accept.
   */
  move: number;
  /** what they think their partner will do, in luna. the shareable part. */
  predict: number;
  at: number;
};

export type Pair = {
  id: string;
  exp: PairExperiment;
  mode: Mode;
  /** luna A is deciding over */
  stake: number;
  /** trust only: what the pot becomes in B's hands */
  multiplier: number;
  status: PairStatus;
  a: Side | null;
  b: Side | null;
  createdAt: number;
  revealedAt: number | null;
};

export type Payoff = { a: number; b: number; note: string };

/**
 * Who gets what. Pure, so it can be reasoned about and tested without a database,
 * and computed here rather than anywhere the client can reach.
 */
export function payoff(p: Pair): Payoff {
  if (!p.a || !p.b) throw new Error("payoff requires both sides");

  if (p.exp === "trust") {
    const handed = p.a.move;
    if (handed === 0) {
      return { a: Math.round(p.stake * TRUST_KEEP_PCT), b: 0, note: "kept it" };
    }
    const pot = handed * p.multiplier;
    const returned = Math.min(p.b.move, pot);
    return { a: returned, b: pot - returned, note: "handed over" };
  }

  // ultimatum: B commits a threshold before seeing the offer, so both sides
  // commit blind and neither can react to the other.
  //
  // offer is luna (A always sees real figures), threshold is a PERCENT, 0 to 100
  // (B never does, same anchor rule as Trust's B). Comparing them directly compares
  // a number in the millions against one under 101, which is true for every offer
  // above zero, that bug shipped every Ultimatum round as "accepted" regardless of
  // B's actual threshold and was only caught by an end-to-end test, not by types.
  // Convert to the same unit, percent, before comparing.
  const offer = p.a.move;
  const threshold = p.b.move;
  const offerPct = Math.round((offer / p.stake) * 100);
  return offerPct >= threshold
    ? { a: p.stake - offer, b: offer, note: "accepted" }
    : { a: 0, b: 0, note: "rejected" };
}

/**
 * How far off a guess was, in percentage points, always 0-100 regardless of
 * which experiment or seat. The stored fields are not uniform, Trust keeps
 * predict in luna and needs the pot to convert, Ultimatum already stores it
 * as a percent (see the Side.predict comment and the unit-mismatch note in
 * payoff() above), so this is the one place that agrees with itself, used by
 * both the population lookup below and every reveal screen.
 *
 * What "guess" is compared against differs by seat, and matches exactly what
 * each reveal screen already asked before this existed:
 *   trust a       · guessed what b would return, compared to what b actually did
 *   trust b       · guessed what a expected, compared to what a actually said
 *   ultimatum a   · guessed b's threshold, compared to b's actual threshold
 *   ultimatum b   · guessed a's offer, compared to a's actual offer
 */
export function guessGapPct(p: Pair, seat: "a" | "b"): number {
  if (!p.a || !p.b) throw new Error("guessGapPct requires both sides");

  if (p.exp === "trust") {
    const pot = p.stake * p.multiplier;
    if (pot <= 0) return 0;
    const guess = seat === "a" ? p.a.predict : p.b.predict;
    const actual = seat === "a" ? p.b.move : p.a.predict;
    return Math.abs(Math.round((guess / pot) * 100) - Math.round((actual / pot) * 100));
  }

  // ultimatum: both predict fields are already a percent, no pot to convert through.
  if (seat === "a") return Math.abs(p.a.predict - p.b.move);
  const offerPct = Math.round((p.a.move / p.stake) * 100);
  return Math.abs(p.b.predict - offerPct);
}

const MIN_PERCENTILE_SAMPLE = 20;

export type Percentile = { percentile: number; sampleSize: number };

/**
 * Where this guess ranks against every other guess made from the same seat in
 * the same experiment. Smaller gap is better, so the percentile is the share
 * of that population this round beat.
 *
 * Null below MIN_PERCENTILE_SAMPLE, on purpose: a percentile computed from a
 * handful of rounds is not a statistic, it is noise wearing a costume, the
 * exact reason lib/benchmarks.ts refuses to compare players against each
 * other before there is a real population to compare against. Callers fall
 * back to the qualitative tier from guessAccuracyClause() in lib/copy.ts
 * instead of forcing a percentile that would only be honest about four people.
 */
export async function guessPercentile(
  exp: PairExperiment,
  seat: "a" | "b",
  gapPct: number,
): Promise<Percentile | null> {
  const rows = await db().all(COLL);
  const gaps: number[] = [];
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.exp !== exp || p.status !== "revealed" || !p.a || !p.b) continue;
    gaps.push(guessGapPct(p, seat));
  }
  if (gaps.length < MIN_PERCENTILE_SAMPLE) return null;
  const beaten = gaps.filter((g) => g > gapPct).length;
  return { percentile: Math.round((beaten / gaps.length) * 100), sampleSize: gaps.length };
}

/**
 * What Hunch's own players actually did, for the Research page: a real number
 * alongside the published citations in lib/benchmarks.ts, not a replacement
 * for them. Same sample-size discipline as guessPercentile above, and the
 * same reason: below MIN_POPULATION_SAMPLE this is null, not a number, a mean
 * of four rounds is not a finding.
 */
const MIN_POPULATION_SAMPLE = 10;

export type TrustPopulation = { n: number; meanReturnedPct: number };

export async function trustPopulation(): Promise<TrustPopulation | null> {
  const rows = await db().all(COLL);
  const shares: number[] = [];
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.exp !== "trust" || p.status !== "revealed" || !p.a || !p.b) continue;
    const pot = p.stake * p.multiplier;
    if (pot <= 0) continue;
    shares.push((p.b.move / pot) * 100);
  }
  if (shares.length < MIN_POPULATION_SAMPLE) return null;
  return {
    n: shares.length,
    meanReturnedPct: shares.reduce((a, b) => a + b, 0) / shares.length,
  };
}

/**
 * Ultimatum has no published benchmark in lib/benchmarks.ts, deliberately,
 * those numbers have not been verified yet. This is the only comparison the
 * Research page can honestly offer for it until that changes, real players,
 * not a citation.
 */
export type UltimatumPopulation = { n: number; meanOfferPct: number; acceptedPct: number };

export async function ultimatumPopulation(): Promise<UltimatumPopulation | null> {
  const rows = await db().all(COLL);
  const offers: number[] = [];
  let accepted = 0;
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.exp !== "ultimatum" || p.status !== "revealed" || !p.a || !p.b) continue;
    offers.push(Math.round((p.a.move / p.stake) * 100));
    if (payoff(p).note === "accepted") accepted += 1;
  }
  if (offers.length < MIN_POPULATION_SAMPLE) return null;
  return {
    n: offers.length,
    meanOfferPct: offers.reduce((a, b) => a + b, 0) / offers.length,
    acceptedPct: (accepted / offers.length) * 100,
  };
}

// ------------------------------------------------------------------ storage
// Goes through lib/db.ts, so it is files locally and Postgres in production.

const COLL = "pairs";

/**
 * How long an "open" round (A committed, B never showed) stays answerable.
 *
 * No money is at risk while a round sits open: unlike a typical escrow-timeout
 * design, nothing is sent anywhere until B answers, see send() in
 * lib/payout.ts, so this is a data-lifecycle problem, not a funds-safety one.
 * The gap is real anyway, an unbounded "open" row is a stale link that still
 * looks live forever, a candidate findWaitingRound() could hand a stranger a
 * round its own creator has long forgotten, and a table that only ever grows.
 *
 * 48 hours, not minutes: Hunch's own share flow is fundamentally async, "send
 * this to someone" (see the button text in trust/flow.tsx and
 * ultimatum/flow.tsx) means the recipient may not open it same-day. A window
 * long enough to survive someone reading a message the next morning, short
 * enough that "waiting for an answer" still means something.
 *
 * Two ideas that were rejected on purpose:
 *   hard delete on expiry    - every other completed round in this app is a
 *                              permanent record (see randomWorkedExample's
 *                              comment, and every Payout in lib/payout.ts).
 *                              An abandoned round is itself a real signal,
 *                              worth keeping to see how often invites go
 *                              unanswered, so expiry is a status transition,
 *                              not a deletion.
 *   a background sweep alone - a cron job is necessary for reclaiming the
 *                              "open" bucket's size over time (sweepExpired
 *                              below), but nothing that matters for
 *                              correctness may depend on it having run
 *                              recently. Every read path that decides whether
 *                              a round is still answerable checks the
 *                              deadline itself (isExpired, used in getPair
 *                              and findWaitingRound), the same lazy-check
 *                              principle Redis expiry relies on: a key is
 *                              treated as gone at the moment it is touched,
 *                              whether or not the background pass has reached
 *                              it yet.
 */
export const OPEN_ROUND_TTL_MS = 48 * 60 * 60 * 1000;

export function isExpired(p: Pair, now: number = Date.now()): boolean {
  return p.status === "open" && p.a !== null && p.b === null && now - p.a.at > OPEN_ROUND_TTL_MS;
}

/**
 * A read that self-heals: if what comes back is a genuinely stale open round,
 * it is written back as "expired" before it is handed to the caller, so
 * every caller of getPair sees the true state even if the daily sweep
 * (sweepExpiredPairs below) has not reached this row yet.
 */
export async function getPair(id: string): Promise<Pair | null> {
  const p = (await db().get(COLL, id)) as Pair | null;
  if (p && isExpired(p)) {
    p.status = "expired";
    await putPair(p);
  }
  return p;
}

export async function putPair(p: Pair): Promise<void> {
  await db().put(COLL, p.id, p);
}

/**
 * A real completed round, to show before someone's first decision instead of
 * instructions.
 *
 * The 2025 comprehension study across five standard economic games (Johannesson,
 * n=1568) found the trust game misunderstood by 62%, rising to 70% online, worse
 * than every other paradigm tested. The canonical implementation most platforms
 * build on (oTree's tutorial trust game) never explains the multiplier at all, it
 * only appears as a computed number on the receiver's screen, which is likely part
 * of why. The worked-example effect is well established for teaching procedures,
 * but a single fixed example causes learners to fixate on its surface details
 * rather than the underlying principle. Pulling a real, different, recent round
 * each time sidesteps that for free, we already store every completed round.
 *
 * Picked at random from the last few finished rounds rather than always the most
 * recent one, so a person refreshing does not see the identical example twice and
 * a network of testers does not all see the same one.
 */
export async function randomWorkedExample(exp: PairExperiment): Promise<Pair | null> {
  const rows = await db().all(COLL);
  const finished = rows
    .map((r) => r.data as Pair)
    .filter((p) => p.exp === exp && p.status === "revealed" && p.a && p.b)
    .sort((a, b) => (b.revealedAt ?? 0) - (a.revealedAt ?? 0))
    .slice(0, 10);
  if (finished.length === 0) return null;
  return finished[Math.floor(Math.random() * finished.length)];
}

/**
 * A real round already committed by someone else, still waiting on a second
 * answer, so a visitor can respond to it instead of needing to go and find
 * someone to send a link to first.
 *
 * Deliberately NOT auto-matching: A and B are not the same role here, A sees
 * real NIM and can keep everything, B never sees a NIM figure and only ever
 * sets a percentage. Silently dropping a visitor into whichever seat happens
 * to be open would mean the client might build and sign the wrong shape of
 * message for the seat the server actually assigns, and the server would
 * correctly refuse it, expectedMessage in app/api/pair/route.ts is built
 * from the real seat, not from what the client assumed. So this only ever
 * offers the existing, already-correct B screen (/t/[id], /u/[id]) as a
 * choice, the visitor still explicitly picks it.
 *
 * Oldest first, the same fairness rule nextUnclaimedGift() uses for Split.
 */
export async function findWaitingRound(exp: PairExperiment): Promise<Pair | null> {
  const rows = await db().all(COLL);
  const waiting = rows
    .map((r) => r.data as Pair)
    // This reads storage directly, not through getPair, so its own self-heal
    // never runs here: !isExpired() has to be checked explicitly rather than
    // trusting status === "open" to mean "actually still live". Otherwise a
    // round nobody answered in days could be handed to a stranger as "someone
    // is waiting right now", which is exactly the stale-but-still-looks-live
    // failure OPEN_ROUND_TTL_MS exists to prevent.
    .filter((p) => p.exp === exp && p.mode === "house" && p.status === "open" && p.a && !p.b && !isExpired(p))
    .sort((a, b) => (a.a?.at ?? 0) - (b.a?.at ?? 0));
  return waiting[0] ?? null;
}

/**
 * How many, not just whether one exists, for Hunch Live's "right now" section.
 * Same filter as findWaitingRound, this is presence, not a spoiler: it says
 * how many real people are mid-round, never what anyone decided, so unlike
 * the research figures below it needs no play-gate.
 */
export async function countWaitingRounds(exp: PairExperiment): Promise<number> {
  const rows = await db().all(COLL);
  return rows
    .map((r) => r.data as Pair)
    .filter((p) => p.exp === exp && p.mode === "house" && p.status === "open" && p.a && !p.b && !isExpired(p))
    .length;
}

/**
 * Every round that actually finished, revealed or closed, regardless of
 * sample size. A raw count is not a statistic the way a mean or a
 * distribution is, it makes no claim about what people typically do, so
 * unlike guessPercentile/trustPopulation/ultimatumPopulation above this
 * carries no MIN_SAMPLE floor and no play-gate: "3 decisions so far" is
 * exactly as honest at n=3 as at n=3000.
 */
export async function completedRoundCount(exp: PairExperiment): Promise<number> {
  const rows = await db().all(COLL);
  return rows
    .map((r) => r.data as Pair)
    .filter((p) => p.exp === exp && (p.status === "revealed" || p.status === "closed"))
    .length;
}

/**
 * The active half of the hybrid expiry model: reclaims the "open" bucket by
 * writing "expired" onto every row the lazy check in getPair would also
 * catch, so nothing here is load-bearing for correctness, see
 * OPEN_ROUND_TTL_MS above. Meant to be called on a schedule, not from a
 * request path, see app/api/cron/sweep-expired/route.ts.
 */
export async function sweepExpiredPairs(): Promise<number> {
  const rows = await db().all(COLL);
  let swept = 0;
  for (const r of rows) {
    const p = r.data as Pair;
    if (!isExpired(p)) continue;
    p.status = "expired";
    await putPair(p);
    swept += 1;
  }
  return swept;
}

/**
 * What a viewer is allowed to see. Never return a Pair straight to a client, the
 * whole point is that one side cannot read the other's move before both have
 * committed, and forgetting that once undoes the entire experiment.
 */
export function redact(p: Pair, viewer: "a" | "b" | "stranger") {
  const base = {
    id: p.id,
    exp: p.exp,
    mode: p.mode,
    stake: p.stake,
    multiplier: p.multiplier,
    status: p.status,
    waitingOn:
      p.status === "closed" || p.status === "expired" ? null : p.a && !p.b ? "b" : !p.a ? "a" : null,
  };

  // Keeping ends a round with no second player, so there is nothing left to hide.
  if (p.status === "closed" && p.a) {
    return {
      ...base,
      a: { move: p.a.move, predict: p.a.predict },
      payoff: { a: Math.round(p.stake * TRUST_KEEP_PCT), b: 0, note: "kept it" },
      youAre: viewer,
    };
  }

  // Expired the same way: A's own move is not a secret from A, but unlike
  // "closed" nothing was ever paid out, nobody answered, so there is no
  // payoff to report, real or otherwise.
  if (p.status === "expired" && p.a) {
    return { ...base, a: { move: p.a.move, predict: p.a.predict }, payoff: null, youAre: viewer };
  }

  if (p.status !== "revealed") return base;

  return {
    ...base,
    a: p.a && { move: p.a.move, predict: p.a.predict },
    b: p.b && { move: p.b.move, predict: p.b.predict },
    payoff: payoff(p),
    youAre: viewer,
  };
}
