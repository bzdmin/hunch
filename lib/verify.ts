import "server-only";

/**
 * Proves a signature was actually produced by the claimed public key, closing
 * the gap flagged in app/api/pair/route.ts and app/api/commit/route.ts: until
 * this existed, publicKey was a claimed identity, never a proven one, and
 * every identity-based defense in lib/abuse.ts and lib/store.ts (self-claim
 * exclusion, same-key seat block, per-key caps) trusted a string a caller
 * could set to anything.
 *
 * The byte format is Nimiq Pay's own, confirmed empirically against a real
 * signature from a real phone on 2026-09-16 (see git history for
 * app/api/debug/verify-sign, now removed), not assumed from documentation:
 * sha256('\x16Nimiq Signed Message:\n' + message.length + message), the same
 * convention documented for the Nimiq Hub.
 */

type Nimiq = typeof import("@nimiq/core");
let lib: Promise<Nimiq> | null = null;
const nimiq = () => (lib ??= import("@nimiq/core"));

const PREFIX = "\x16Nimiq Signed Message:\n";
const HEX_PUBLIC_KEY = /^[0-9a-f]{64}$/i;
const HEX_SIGNATURE = /^[0-9a-f]{128}$/i;

export async function verifySignedMessage(
  message: string,
  publicKeyHex: string,
  signatureHex: string,
): Promise<boolean> {
  if (!HEX_PUBLIC_KEY.test(publicKeyHex) || !HEX_SIGNATURE.test(signatureHex)) return false;

  try {
    const N = await nimiq();
    const pub = N.PublicKey.fromHex(publicKeyHex);
    const sig = N.Signature.fromHex(signatureHex);
    const data = new TextEncoder().encode(PREFIX + message.length + message);
    const hash = N.Hash.computeSha256(data);
    return pub.verify(sig, hash);
  } catch {
    return false;
  }
}
