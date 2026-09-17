/**
 * Stops one wallet, or one device running many wallets, from farming the house
 * pot: commit, claim, repeat with a fresh keypair, until Trust and Ultimatum's
 * funding is gone.
 *
 * The daily cap in lib/payout.ts bounds total spend across everyone, but says
 * nothing about one player taking the whole thing alone. Capping by luna paid
 * would need predicting a payoff before both sides have committed, which for
 * Trust and Ultimatum is exactly the number the game is not allowed to reveal
 * early. Capping by ROUND COUNT sidesteps that: every house-funded round is
 * already bounded to one stake (Ultimatum) or one tripled pot (Trust), so a
 * cap on how many rounds a signing key or a device can enter per day bounds
 * total exposure without touching payoff math at all.
 *
 * A signing key is free, anyone can generate as many as they like, publicKey is
 * now proven, not merely claimed (lib/verify.ts), so this is a real per-identity
 * cap rather than one a script can walk through by inventing a fresh string.
 * deviceId still matters on top of that: it survives reinstalls and reaches
 * across every key generated on the same phone, which the key cap alone cannot
 * see.
 */

import { db } from "./db";
import type { Pair } from "./pair";

const DAY_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = (Number(process.env.NIMLAB_ROUND_COOLDOWN_SECONDS ?? 0) || 10) * 1000;
const PAIRS = "pairs";

/**
 * The builder's own test wallets, exempt from every cap below. Testing two
 * games across two real phones, repeatedly, in one sitting is indistinguishable
 * from farming to a count-based rule, there is no honest way to tell them apart
 * from inside the request. An explicit allowlist is the one way to let it
 * through without loosening the rule for everyone else. Comma-separated 64-hex
 * publicKeys, found via /api/admin/identities. Empty by default, so leaving
 * this unset changes nothing for anyone.
 */
const TEST_KEYS = new Set(
  (process.env.NIMLAB_TEST_KEYS ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean),
);

export function isTestKey(publicKey: string): boolean {
  return TEST_KEYS.has(publicKey.toLowerCase());
}

export const KEY_DAILY_ROUNDS = Number(process.env.NIMLAB_KEY_DAILY_ROUNDS ?? 0) || 3;
export const DEVICE_DAILY_ROUNDS = Number(process.env.NIMLAB_DEVICE_DAILY_ROUNDS ?? 0) || 3;

/**
 * The daily cap alone resets every 24h forever, so a patient farmer willing to
 * stay under it can still bleed the house slowly across weeks. A second,
 * higher ceiling that never resets bounds that too, at the cost of mattering
 * only to someone still around after many days, which is the point: a real
 * player never gets near it.
 */
export const KEY_LIFETIME_ROUNDS = Number(process.env.NIMLAB_KEY_LIFETIME_ROUNDS ?? 0) || 20;
export const DEVICE_LIFETIME_ROUNDS = Number(process.env.NIMLAB_DEVICE_LIFETIME_ROUNDS ?? 0) || 20;

type HouseSide = { publicKey: string; deviceId: string | null; at: number };

/** Every commit ever made into a house-funded round. One query serves the
 * cooldown, the daily cap, and the lifetime cap below without re-fetching. */
async function allHouseSides(): Promise<HouseSide[]> {
  const rows = await db().all(PAIRS);
  const out: HouseSide[] = [];
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.mode !== "house") continue;
    if (p.a) out.push({ publicKey: p.a.publicKey, deviceId: p.a.deviceId ?? null, at: p.a.at });
    if (p.b) out.push({ publicKey: p.b.publicKey, deviceId: p.b.deviceId ?? null, at: p.b.at });
  }
  return out;
}

function latest(sides: HouseSide[]): number {
  return sides.reduce((max, s) => Math.max(max, s.at), 0);
}

/**
 * Null when this commit may proceed, otherwise the reason it was refused, safe
 * to show directly to the player.
 *
 * Checked before the side is stored, so a wallet or device already at the limit
 * never gets to finish another round rather than finishing one that then fails
 * to pay. Order matters: cooldown first, since it is the cheapest check and the
 * one that actually stops a tight scripted loop, then lifetime, then daily, so
 * whichever limit is closest is the one reported.
 *
 * environment distinguishes "a real device chose not to check in" from "there
 * is no device to check in with": Nimiq Pay always has a deviceId unless the
 * player denied the one-time prompt or is on an old build, both real signals
 * worth refusing on. The Hub, Hunch's desktop environment (see lib/wallet),
 * has no equivalent at all and never will, refusing every Hub player over a
 * signal that environment cannot produce would not be caution, it would be
 * quietly turning off a whole first-class environment. Hub traffic still hits
 * every key-based check below exactly as Nimiq Pay always has, this only
 * withholds the one extra signal Hub genuinely cannot supply.
 */
export async function tooManyRounds(
  publicKey: string,
  deviceId: string | null,
  environment: "nimiq-pay" | "hub" | "none" | null,
): Promise<string | null> {
  if (isTestKey(publicKey)) return null;

  if (!deviceId && environment !== "hub") {
    return "This round needs your device to check in first. Update Nimiq Pay, allow the " +
      "prompt when it asks, or play Split instead.";
  }

  const now = Date.now();
  const sinceDay = now - DAY_MS;
  const all = await allHouseSides();

  const byKey = all.filter((s) => s.publicKey === publicKey);
  if (now - latest(byKey) < COOLDOWN_MS) {
    return "Give it a few seconds between rounds.";
  }
  if (byKey.length >= KEY_LIFETIME_ROUNDS) {
    return "That signing key has reached its lifetime limit for house-funded rounds. Play Split instead.";
  }
  if (byKey.filter((s) => s.at >= sinceDay).length >= KEY_DAILY_ROUNDS) {
    return "That signing key has played enough house-funded rounds for one day. Try again tomorrow, or play Split.";
  }

  if (deviceId) {
    const byDevice = all.filter((s) => s.deviceId === deviceId);
    if (now - latest(byDevice) < COOLDOWN_MS) {
      return "Give it a few seconds between rounds.";
    }
    if (byDevice.length >= DEVICE_LIFETIME_ROUNDS) {
      return "This device has reached its lifetime limit for house-funded rounds. Play Split instead.";
    }
    if (byDevice.filter((s) => s.at >= sinceDay).length >= DEVICE_DAILY_ROUNDS) {
      return "This device has played enough house-funded rounds for one day. Try again tomorrow, or play Split.";
    }
  }

  return null;
}

/**
 * Collusion between two real, separate devices is invisible to a per-identity
 * count: both parties are genuine, each is under their own limit, and only the
 * PAIR looks wrong. Counting harder never catches this, the fix has to look at
 * the relationship between two identities instead of either one alone, same
 * principle behind Gitcoin's pairwise/COCM matching for quadratic funding.
 *
 * Nimiq addresses, not signing keys: a signing key is free to regenerate, the
 * payout address is where the money actually has to land, and the whole point
 * of collusion is landing money somewhere specific. Order-independent, A and B
 * on a repeat round could be either way around.
 */
function pairKey(x: string, y: string): string {
  return [x, y].sort().join("::");
}

export async function alreadyPairedForHouseMoney(
  payToA: string,
  payToB: string,
): Promise<boolean> {
  const rows = await db().all(PAIRS);
  const key = pairKey(payToA, payToB);
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.mode !== "house" || p.status !== "revealed" || !p.a || !p.b) continue;
    if (pairKey(p.a.payTo, p.b.payTo) === key) return true;
  }
  return false;
}
