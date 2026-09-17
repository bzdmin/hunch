/**
 * Reveal-screen flavour text.
 *
 * Kept deliberately separate from the money maths in lib/pair.ts and lib/message.ts,
 * so copy can be rewritten freely without touching anything that computes a payout.
 *
 * Sharp and specific, never profane or insulting toward the player. The rules'
 * scoring criteria literally ask whether the app "looks professional and trustworthy
 * at first glance," and this is a judged, live-streamed competition, a screen that
 * calls a real player names over real money is the fastest way to lose that point and
 * to undercut the one thing that differentiates Hunch from a joke app: it is built on
 * cited research, not a gimmick. Sharpness lives in how specific and true the line is,
 * not in profanity.
 *
 * Picking is simple random selection from a pool, not a "never repeat the last one"
 * guarantee, that needs session state to track history and was not worth building
 * with two days left. A pool of 4 to 6 lines per tier already makes an exact repeat
 * uncommon in practice.
 */

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------- Trust, B's return

const ICE_COLD = [
  "Ice cold.",
  "Not a single luna came back.",
  "This is the version where trust dies.",
  "They gambled on a stranger. The stranger was you.",
  "Kept the lot. Every last bit of it.",
  "Somewhere, a behavioural economist is nodding grimly.",
];

const KEPT_TIGHT = [
  "Kept it tight.",
  "A token gesture, at best.",
  "Technically, something came back.",
  "Just enough to not be nothing.",
  "They trusted you with everything. You returned a rounding error.",
];

const FAIR_SPLIT = [
  "A fair split.",
  "Right around what research would predict.",
  "An even hand.",
  "Textbook reciprocity.",
];

const GENEROUS = [
  "Genuinely generous.",
  "More than most would.",
  "Trust, repaid with interest.",
  "A good-faith return.",
];

const CHEERFUL_GIVER = [
  "A cheerful giver.",
  "Trust repaid in full, and then some.",
  "Outdid what was even hoped for.",
  "The kind of return that makes strangers trust the next stranger.",
];

/** sharePct: the returned amount as a percentage of the pot, 0 to 100+. */
export function trustReturnTier(sharePct: number): string {
  const pool =
    sharePct <= 0 ? ICE_COLD
    : sharePct < 20 ? KEPT_TIGHT
    : sharePct < 40 ? FAIR_SPLIT
    : sharePct < 70 ? GENEROUS
    : CHEERFUL_GIVER;
  return pick(pool);
}

// ------------------------------------------------------- Trust, A's opening move

const A_KEPT = [
  "Played it safe.",
  "Stayed guarded.",
  "Chose certainty over a stranger.",
  "No risk taken.",
];

const A_HANDED_OVER = [
  "Took the leap.",
  "Trusted a complete stranger.",
  "Handed over everything.",
  "Bet on someone they'll never meet.",
];

export function trustOpeningTier(handedOver: boolean): string {
  return pick(handedOver ? A_HANDED_OVER : A_KEPT);
}

// ---------------------------------------------------------------- Ultimatum

const REJECTED = [
  "Rejected. Both walk away with nothing.",
  "Too low, and it cost you everything.",
  "They'd rather have zero than accept that.",
  "The deal died on the table.",
];

const ACCEPTED_STINGY = [
  "Accepted, barely.",
  "They took it, and they'll remember it.",
  "A low offer that scraped by.",
];

const ACCEPTED_FAIR = [
  "Accepted, and it was fair.",
  "A reasonable split, taken without hesitation.",
  "Nobody walked away feeling cheated.",
];

const ACCEPTED_GENEROUS = [
  "Accepted, easily.",
  "More than fair, and it showed.",
  "A generous offer, taken without a second thought.",
];

/** offerPct: A's offer as a percentage of the stake. accepted: whether B took it. */
export function ultimatumTier(offerPct: number, accepted: boolean): string {
  if (!accepted) return pick(REJECTED);
  const pool = offerPct < 25 ? ACCEPTED_STINGY : offerPct < 45 ? ACCEPTED_FAIR : ACCEPTED_GENEROUS;
  return pick(pool);
}

// ------------------------------------------------------ guess-accuracy clause

/**
 * How close a percent guess landed against what actually happened, worded to
 * finish a sentence like "...but they offered 10%, which was {clause}."
 * Shared between Trust and Ultimatum's reveal screens, both compare one
 * player's guess of a percentage against the other player's real one, and
 * used to be two separate, near-identical tiered ladders that had drifted
 * into stitching together short, choppy sentence fragments instead of one
 * sentence a person would actually say.
 */
export function guessAccuracyClause(guessPct: number, actualPct: number): string {
  const gap = Math.abs(guessPct - actualPct);
  if (gap <= 3) return "almost exactly what you guessed";
  if (gap <= 10) return "pretty close to your guess";
  if (gap <= 25) return "not far off, but not exactly what you guessed either";
  return actualPct < guessPct ? "a lot less than you thought" : "a lot more than you thought";
}

// -------------------------------------------------------------- verdict line

/**
 * The reveal report card's closing line, see app/report-card.tsx. A real
 * percentile once lib/pair.ts's guessPercentile() has a real population to
 * rank against, the qualitative tier otherwise.
 *
 * "Better than N% of guesses" rather than "Nth percentile": percentile
 * framing is genuinely ambiguous here even to a numerate reader, whether a
 * high number means a small gap (good) or is itself the gap somehow, "better
 * than N%" cannot be misread either way.
 */
export function verdictValue(
  pct: { percentile: number; sampleSize: number } | null,
  fallbackClause: string,
): string {
  if (!pct) return fallbackClause;
  return `Better than ${pct.percentile}% of guesses`;
}
