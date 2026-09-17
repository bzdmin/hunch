"use client";

import { NAME } from "@/lib/brand";
import type { SendArgs, Signed, WalletAdapter } from "./types";

/**
 * Nimiq Hub, the desktop browser environment. First-class, not a hack: someone
 * who opens Hunch in a normal browser plays the same product, with the same
 * real NIM, and is never told to go and find a phone.
 *
 * Two properties make this drop in cleanly rather than needing a parallel
 * backend:
 *
 *  1. The Hub signs with the same convention Nimiq Pay does,
 *     sha256('\x16Nimiq Signed Message:\n' + length + message), which is where
 *     that convention is documented in the first place. lib/verify.ts already
 *     verifies exactly this, so a Hub signature is checked by the same code
 *     path with no special case.
 *  2. signMessage returns the signer address alongside the keys, so one prompt
 *     produces everything an experiment needs. See Signed in ./types.
 *
 * The Hub opens a popup, which browsers only reliably allow while a user
 * gesture is still in scope. That is why the interface is one call rather than
 * an address call followed by a signing call: there is no await in between to
 * lose the gesture to.
 */

type HubModule = typeof import("@nimiq/hub-api");
type Hub = InstanceType<HubModule["default"]>;

const HUB_URL = "https://hub.nimiq.com";

let hub: Hub | null = null;

async function api(): Promise<Hub> {
  if (hub) return hub;
  if (typeof window === "undefined") throw new Error("the Hub needs a browser");
  const mod = await import("@nimiq/hub-api");
  const HubApi = mod.default;
  hub = new HubApi(HUB_URL);
  return hub;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const hubWallet: WalletAdapter = {
  environment: "hub",

  async ready() {
    // Loading the module is the only thing that can be checked without putting
    // a popup in front of someone who has not asked for one yet. Whether they
    // actually have an account is answered when they first sign, which is the
    // first moment it matters.
    await api();
  },

  async signWithAddress(message: string): Promise<Signed> {
    const h = await api();
    // The declared return is `void | SignedMessage`, because the same method
    // resolves to void under the redirect behaviour. We only ever use the
    // popup behaviour, so the structural type is asserted here rather than
    // threading a behaviour generic through the whole adapter.
    const signed = (await h.signMessage({ appName: NAME, message })) as {
      signer: string;
      signerPublicKey: Uint8Array;
      signature: Uint8Array;
    };
    return {
      publicKey: toHex(signed.signerPublicKey),
      signature: toHex(signed.signature),
      address: signed.signer,
    };
  },

  async sendNim({ recipient, value, data }: SendArgs): Promise<string> {
    const h = await api();
    const result = await h.checkout({
      appName: NAME,
      recipient,
      value,
      extraData: data,
    });
    // Checkout resolves with the signed transaction once it has been sent.
    // Never synthesise a hash: if the Hub did not give us one, the caller is
    // told, rather than shown a plausible-looking string for a transaction
    // nobody can look up.
    const hash = (result as { hash?: string })?.hash;
    if (!hash) throw new Error("the wallet did not return a transaction hash");
    return hash;
  },

  async deviceId(): Promise<string | null> {
    // The Hub has no per-origin device identifier and must not invent one.
    // See the note on WalletAdapter.deviceId in ./types.
    return null;
  },
};
