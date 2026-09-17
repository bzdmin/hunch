"use client";

import type { SendArgs, Signed, WalletAdapter } from "./types";

/**
 * Nimiq Pay, the Mini App environment. First-class, not a fallback: this is
 * the environment the competition is judged in and the one real players are
 * in, so nothing here may be weakened to accommodate the desktop path.
 *
 * Gate 1 findings baked in so they cannot be forgotten:
 *  - There is no window global to sniff. Detection goes through the SDK's
 *    init(). A `window.nimiq` check silently fails on a real device.
 *  - listAccounts() costs one dialog per page session, then returns in 0 ms.
 *  - The address it returns is NOT the address that pays. Never treat it as
 *    identity. Identity is the signing key, proven server-side.
 *  - Rejection errors carry no `.name`, they surfaced as `undefined: User
 *    rejected the request.` So a cancel is detected from the message.
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

async function provider(): Promise<Provider> {
  if (cached) return cached;
  const mod = await import("@nimiq/mini-app-sdk");
  cached = (await mod.init()) as unknown as Provider;
  return cached;
}

let deviceCache: string | null | undefined;

export const nimiqPay: WalletAdapter = {
  environment: "nimiq-pay",

  async ready() {
    await provider();
  },

  async signWithAddress(message: string): Promise<Signed> {
    const w = await provider();
    const accounts = await w.listAccounts();
    const list = Array.isArray(accounts) ? accounts : [accounts];
    if (!list.length) throw new Error("no address available");
    const { publicKey, signature } = await w.sign(message);
    return { publicKey, signature, address: list[0] };
  },

  async sendNim({ recipient, value, data }: SendArgs): Promise<string> {
    const w = await provider();
    return w.sendBasicTransactionWithData({ recipient, value, data });
  },

  async deviceId(reason: string): Promise<string | null> {
    if (deviceCache !== undefined) return deviceCache;
    try {
      const mod = await import("@nimiq/mini-app-sdk");
      deviceCache = await mod.requestDeviceIdentifier({ reason });
    } catch {
      // Denied, an older Nimiq Pay build, or not inside Nimiq Pay at all.
      // Never blocks play, see lib/abuse.ts for what this does and does not do.
      deviceCache = null;
    }
    return deviceCache;
  },
};
