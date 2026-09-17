"use client";

import { nimiqPay } from "./nimiq-pay";
import type { Environment, SendArgs, Signed, WalletAdapter } from "./types";

export type { Environment, SendArgs, Signed } from "./types";

/**
 * One wallet, two environments.
 *
 * Detection order is Nimiq Pay first, always. Inside Nimiq Pay the Hub module
 * is never even imported, so the environment the competition is judged in
 * carries none of the desktop path's weight, and a mistake in the Hub adapter
 * cannot reach a real player on a phone.
 *
 * Outside Nimiq Pay we fall to the Hub rather than telling a desktop visitor to
 * go and find a phone. Both are real wallets moving real NIM. Neither is a
 * simulation, and there is deliberately no third "demo" mode: if no wallet can
 * be reached, the UI says so plainly instead of inventing a balance.
 */

let resolved: WalletAdapter | null = null;
let probe: Promise<WalletAdapter | null> | null = null;

async function detect(): Promise<WalletAdapter | null> {
  // Inside Nimiq Pay the SDK's init() resolves. Outside, it rejects after its
  // own timeout, which is the documented way to tell, there is no global to
  // sniff (Gate 1).
  try {
    await nimiqPay.ready();
    return nimiqPay;
  } catch {
    // not in Nimiq Pay, try the desktop path
  }

  if (typeof window === "undefined") return null;

  try {
    const { hubWallet } = await import("./hub");
    await hubWallet.ready();
    return hubWallet;
  } catch {
    return null;
  }
}

/** The active wallet, or null when neither environment can be reached. */
export async function walletOrNull(): Promise<WalletAdapter | null> {
  if (resolved) return resolved;
  probe ??= detect();
  resolved = await probe;
  return resolved;
}

async function required(): Promise<WalletAdapter> {
  const w = await walletOrNull();
  if (!w) throw new Error("No Nimiq wallet is available in this browser.");
  return w;
}

/** Which wallet answered, for the few places the UI genuinely has to differ. */
export async function environment(): Promise<Environment> {
  return (await walletOrNull())?.environment ?? "none";
}

/** True when a real wallet, either one, can be used here. */
export async function available(): Promise<boolean> {
  return (await walletOrNull()) !== null;
}

export async function signWithAddress(message: string): Promise<Signed> {
  return (await required()).signWithAddress(message);
}

export async function sendNim(args: SendArgs): Promise<string> {
  return (await required()).sendNim(args);
}

export async function deviceId(reason: string): Promise<string | null> {
  const w = await walletOrNull();
  return w ? w.deviceId(reason) : null;
}

/**
 * Shared across every call site so the one-time consent prompt reads the same
 * way regardless of which screen triggers it first.
 */
export const DEVICE_ID_REASON =
  "So one device can't play more than its fair share of house-funded rounds";

export function isRejection(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /reject|denied|cancel|abort|closed/i.test(m);
}

/**
 * What a person is told when something goes wrong. Never a raw error, and
 * never ambiguous about money: the one thing someone needs to know first is
 * whether their NIM moved.
 */
export function readable(e: unknown): string {
  if (isRejection(e)) return "You cancelled that. Nothing was sent.";
  const m = e instanceof Error ? e.message : String(e);
  if (/popup|blocked/i.test(m)) {
    return "Your browser blocked the Nimiq window. Allow pop-ups for this site and try again, nothing was sent.";
  }
  if (/balance|insufficient|funds/i.test(m)) {
    return "There isn't enough NIM in that account to cover this. Nothing was sent.";
  }
  if (/network|timeout|fetch|offline/i.test(m)) {
    return "Couldn't reach the network. Nothing was sent, try again in a moment.";
  }
  if (/no nimiq wallet/i.test(m)) {
    return "No Nimiq wallet is available here. Open Hunch in Nimiq Pay, or use a browser where the Nimiq Hub can open.";
  }
  return m || "Something went wrong. Try again.";
}
