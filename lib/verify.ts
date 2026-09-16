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
 *
 * What that test did not settle: whether "message.length" is Nimiq Pay's own
 * JS string length (UTF-16 code units, what message.length means in the app's
 * own code below) or the UTF-8 byte length. They agree for pure ASCII, which
 * is all that first test happened to use, but lib/message.ts's real copy uses
 * "·" (U+00B7), one UTF-16 unit, two UTF-8 bytes, so the two interpretations
 * genuinely diverge on every real Trust and Ultimatum message. First real
 * round after this shipped failed verification here, confirming the gap.
 *
 * Trying both is not a weaker check: each is still exactly
 * sha256(prefix + N + message) for a specific N, and a valid signature under
 * either one still proves the same key signed this exact message, nobody can
 * forge a signature that passes without holding the private key regardless of
 * which N they used.
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
    const enc = new TextEncoder();
    const byteLength = enc.encode(message).length;

    const candidateLengths = new Set([message.length, byteLength]);
    for (const len of candidateLengths) {
      const data = enc.encode(PREFIX + len + message);
      const hash = N.Hash.computeSha256(data);
      if (pub.verify(sig, hash)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
