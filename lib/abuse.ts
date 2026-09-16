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
 * A signing key is free, anyone can generate as many as they like. A device is
 * not, which is why the device cap is the one that actually matters, requestDeviceIdentifier()
 * returns the same 64-char id across reinstalls and across accounts on the same
 * phone. The key cap is the cheaper backstop, for the lazy case of reusing one
 * key over and over rather than generating a fresh one per round.
 */

import { db } from "./db";
import type { Pair } from "./pair";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const PAIRS = "pairs";

export const KEY_DAILY_ROUNDS = Number(process.env.NIMLAB_KEY_DAILY_ROUNDS ?? 0) || 6;
export const DEVICE_DAILY_ROUNDS = Number(process.env.NIMLAB_DEVICE_DAILY_ROUNDS ?? 0) || 6;

async function houseSidesSince(since: number): Promise<{ publicKey: string; deviceId: string | null }[]> {
  const rows = await db().all(PAIRS);
  const out: { publicKey: string; deviceId: string | null }[] = [];
  for (const r of rows) {
    const p = r.data as Pair;
    if (p.mode !== "house") continue;
    if (p.a && p.a.at >= since) out.push({ publicKey: p.a.publicKey, deviceId: p.a.deviceId ?? null });
    if (p.b && p.b.at >= since) out.push({ publicKey: p.b.publicKey, deviceId: p.b.deviceId ?? null });
  }
  return out;
}

/**
 * Null when this commit may proceed, otherwise the reason it was refused, safe
 * to show directly to the player.
 *
 * Checked before the side is stored, so a wallet or device already at the limit
 * never gets to finish another round rather than finishing one that then fails
 * to pay.
 */
export async function tooManyRounds(
  publicKey: string,
  deviceId: string | null,
): Promise<string | null> {
  const since = Date.now() - WINDOW_MS;
  const sides = await houseSidesSince(since);

  const byKey = sides.filter((s) => s.publicKey === publicKey).length;
  if (byKey >= KEY_DAILY_ROUNDS) {
    return "That signing key has played enough house-funded rounds for one day. Try again tomorrow, or play Split.";
  }

  if (deviceId) {
    const byDevice = sides.filter((s) => s.deviceId === deviceId).length;
    if (byDevice >= DEVICE_DAILY_ROUNDS) {
      return "This device has played enough house-funded rounds for one day. Try again tomorrow, or play Split.";
    }
  }

  return null;
}
