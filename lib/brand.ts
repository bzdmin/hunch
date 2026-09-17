/**
 * Name lives here so changing it is one line, not a find-and-replace.
 *
 * NOT "NimLabs" / "Nimiq Labs", that is the entity that publishes Nimiq Pay. The
 * rules prohibit impersonation and unauthorised third-party IP use, and the judges
 * are the Nimiq community. Nim-prefixed names are fine in general (NimJump, NimQuest,
 * NimHunt all placed), the collision is with the company name.
 */
export const NAME = "Hunch";
/**
 * "People", not "another human". Split's guess is against a population, what
 * most people do, not one other person the way Trust and Ultimatum are, so the
 * narrower wording quietly undersold a third of the product. This is also the
 * link preview whenever anyone shares Hunch, so it has to match the home screen
 * word for word.
 */
export const TAGLINE = "Can you predict people?";

/**
 * Stake, in luna. 100,000 luna = 1 NIM.
 *
 * Mainnet is what gets scored, so this is real money. At ~$0.0004/NIM (110,000 NIM
 * showed as $43.70 on 3 Sep) 1,000 NIM is about $0.40, small enough that nobody
 * hesitates to try it, large enough that passing it on is an actual decision. The
 * premise collapses if the amount is too small to feel, so do not quietly shrink it.
 */
export const STAKE_NIM = 1_000;
export const STAKE = STAKE_NIM * 100_000; // luna

/**
 * Both funding modes exist at once. Which one a player gets depends on whether the
 * house wallet is funded right now, see houseFunded() in payout.ts.
 *
 *  "house", the app really sends the player STAKE first, so the windfall is literal
 *            and the decision is directly comparable to the dictator-game literature.
 *            Costs STAKE per player. Only offered while the house wallet has money
 *            and the daily cap has headroom.
 *
 *  "self", the player passes on their own NIM. Keeping is simply not sending, so
 *            there is no endowment and nothing is credited. Costs nothing to run and
 *            is always available. A harder test, but NOT the same experiment.
 *
 * THE TRAP: these two produce different distributions. Engel 2011 measures windfalls;
 * own-money giving runs lower. Every commit records its mode and every comparison is
 * segmented by it. Never average the two together, that is the confound the whole
 * benchmark rests on avoiding.
 */
export type Mode = "house" | "self";

export const MODE_LABEL: Record<Mode, string> = {
  house: "with money we gave you",
  self: "with your own money",
};

/**
 * The relay floor, in luna.
 *
 * Money travels: you decide over whatever the last player passed you. But if
 * everyone passes on ~30%, a chain shrinks 1,000 -> 300 -> 90 -> 27 and is
 * meaningless within four hops. Below this floor the chain has run its course and
 * the next player starts a fresh stake instead of inheriting a crumb.
 *
 * 100 NIM is a tenth of the stake, still a real decision, not yet an insult.
 */
export const FLOOR = 100 * 100_000;

/**
 * Trust's stake pool, in NIM. Picked once per round on the server when it is
 * created, and both players see and are bound by that same number.
 *
 * Two reasons to randomise rather than use one fixed number:
 *
 *   1. A fixed, known stake means a repeat player already knows the exact tripled
 *      total before a round even starts, and can plan an answer in advance instead
 *      of reacting to it. The relay floor and the random Split slider start exist
 *      for the same reason, do not let the player pre-compute the "correct" move.
 *   2. It lets the house run at a lower ceiling per round while funds are tight.
 *
 * Safe to vary because every comparison to research is a PERCENTAGE of the pot,
 * which is scale invariant, 30% of 600 NIM and 30% of 1,000 NIM are the same finding.
 * A separate, smaller stake-size effect on generosity is documented in the
 * literature, but at these sub-dollar amounts it is not worth correcting for.
 */
export const TRUST_STAKE_OPTIONS_NIM = [200, 300, 400, 500];

export function randomTrustStake(): number {
  const n = TRUST_STAKE_OPTIONS_NIM[Math.floor(Math.random() * TRUST_STAKE_OPTIONS_NIM.length)];
  return n * 100_000;
}

/** Worst case for the house-funding gate: the largest possible draw, tripled. */
export const TRUST_MAX_STAKE = Math.max(...TRUST_STAKE_OPTIONS_NIM) * 100_000;

/**
 * Ultimatum's stake pool. Same numbers as Trust, same reasoning, a repeat player
 * should not know the exact figure before a round starts.
 *
 * Ultimatum never multiplies money the way Trust does. Accepted, the stake is
 * redistributed between the two players and totals exactly what it started as.
 * Rejected, nothing is paid to either side. So the worst case for the house is one
 * stake, not one stake tripled, cheaper to fund than Trust round for round.
 */
export const ULTIMATUM_STAKE_OPTIONS_NIM = TRUST_STAKE_OPTIONS_NIM;

export function randomUltimatumStake(): number {
  return randomTrustStake();
}

export const ULTIMATUM_MAX_STAKE = Math.max(...ULTIMATUM_STAKE_OPTIONS_NIM) * 100_000;
