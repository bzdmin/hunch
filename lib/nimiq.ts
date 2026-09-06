"use client";

/**
 * Client-side wallet access.
 *
 * Gate 1 findings baked in here so they cannot be forgotten:
 *  - There is no window global to sniff. Detection goes through the SDK's init().
 *    A `window.nimiq` check silently fails on a real device.
 *  - listAccounts() costs one dialog per page session, then returns in 0 ms.
 *  - The address it returns is NOT the address that pays. Never treat it as identity.
 *    The real payer is read off the chain, server-side.
 *  - Rejection errors carry no `.name`, they surfaced as `undefined: User rejected
 *    the request.` So detect a cancel from the message.
 */

type Provider = {
  listAccounts(): Promise<string[] | string>;
  sign(message: string): Promise<{ publicKey: string; signature: string }>;
  sendBasicTransactionWithData(args: {
    recipient: string;
    value: number;
    data: string;
    fee?: number;
  }): Promise<string>;
};

let cached: Provider | null = null;

export async function wallet(): Promise<Provider> {
  if (cached) return cached;
  const mod = await import("@nimiq/mini-app-sdk");
  cached = (await mod.init()) as unknown as Provider;
  return cached;
}

/** True when we are running inside Nimiq Pay and the wallet answered. */
export async function available(): Promise<boolean> {
  try {
    await wallet();
    return true;
  } catch {
    return false;
  }
}

export async function firstAddress(): Promise<string> {
  const w = await wallet();
  const a = await w.listAccounts();
  const list = Array.isArray(a) ? a : [a];
  if (!list.length) throw new Error("no address available");
  return list[0];
}

export function isRejection(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /reject|denied|cancel/i.test(m);
}

export function readable(e: unknown): string {
  if (isRejection(e)) return "You cancelled that. Nothing was sent.";
  const m = e instanceof Error ? e.message : String(e);
  return m || "Something went wrong. Try again.";
}
