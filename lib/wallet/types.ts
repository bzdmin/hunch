/**
 * The wallet contract the rest of Hunch is allowed to know about.
 *
 * Nothing above this layer may reference Nimiq Pay or the Hub by name. An
 * experiment asks for a signature and an address to be paid at, and gets one,
 * and which of the two environments answered is not its business. That is the
 * whole point of the abstraction: the product is one Hunch, not a Mini App
 * build and a desktop build that happen to share a repository.
 */

/** Which wallet answered. Surfaced only where the UI genuinely has to differ. */
export type Environment = "nimiq-pay" | "hub" | "none";

/**
 * A signature and the address that produced it, from ONE user interaction.
 *
 * Deliberately one call rather than getAddress() then signMessage(): the Hub
 * runs in a popup, and a popup opened after an intervening await is a popup a
 * browser is entitled to block. Hub's signMessage already returns the signer,
 * so asking for both at once costs one prompt instead of two and cannot be
 * blocked halfway through. Every call site wanted both together anyway.
 */
export type Signed = {
  /** hex, the proven identity, see lib/verify.ts */
  publicKey: string;
  /** hex */
  signature: string;
  /** where to pay this player, never treated as identity */
  address: string;
};

export type SendArgs = {
  recipient: string;
  /** luna */
  value: number;
  /** transaction message, plain text */
  data: string;
};

export interface WalletAdapter {
  readonly environment: Environment;
  /** Resolves when this adapter can actually be used, rejects otherwise. */
  ready(): Promise<void>;
  signWithAddress(message: string): Promise<Signed>;
  sendNim(args: SendArgs): Promise<string>;
  /**
   * Anti-abuse device identifier, Nimiq Pay only. The Hub has no equivalent
   * and must not pretend to: null is honest, a fabricated id would quietly
   * weaken the per-device caps in lib/abuse.ts for everyone.
   */
  deviceId(reason: string): Promise<string | null>;
}
