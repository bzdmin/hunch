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
  "Kept the lot.",
  "Held on tight.",
  "Nothing made the return trip.",
];

const KEPT_TIGHT = [
  "Kept it tight.",
  "Played it close to the chest.",
  "A token gesture, at best.",
  "Barely loosened the grip.",
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
