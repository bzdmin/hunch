import "server-only";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Throwaway harness to find out, empirically, what bytes Nimiq Pay's wallet
 * actually signs when w.sign(message) is called from lib/nimiq.ts.
 *
 * The real production code (app/api/pair/route.ts) accepts publicKey and
 * signature without ever checking the signature is valid for that key, see
 * the TODO(security) there. The fix needs PublicKey.verify(signature, data),
 * but the Nimiq Hub's documented convention, sha256(prefix + len + message),
 * is the Hub's convention, not a confirmed one for Nimiq Pay's own wallet.
 * Guessing wrong in the real code would silently reject every genuine signed
 * round in production with no phone in hand to notice. So this tries every
 * plausible candidate against one real signature from a real phone instead of
 * guessing once and shipping it.
 *
 * Delete this route once lib/pair.ts verification is confirmed and live.
 */

type Nimiq = typeof import("@nimiq/core");
let lib: Promise<Nimiq> | null = null;
const nimiq = () => (lib ??= import("@nimiq/core"));

const HUB_PREFIX = "\x16Nimiq Signed Message:\n";

export async function POST(req: Request) {
  let body: { message?: string; publicKey?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  const { message, publicKey, signature } = body;
  if (!message || !publicKey || !signature) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const N = await nimiq();

  let pub, sig;
  try {
    pub = N.PublicKey.fromHex(publicKey);
    sig = N.Signature.fromHex(signature);
  } catch (e) {
    return NextResponse.json(
      { error: `could not parse key or signature: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  const enc = new TextEncoder();
  const prefixedAscii = HUB_PREFIX + message.length + message;

  const candidates: { name: string; bytes: Uint8Array }[] = [
    { name: "raw message bytes, unhashed", bytes: enc.encode(message) },
    { name: "sha256(message)", bytes: N.Hash.computeSha256(enc.encode(message)) },
    { name: "Hub convention: sha256(prefix + len + message)", bytes: N.Hash.computeSha256(enc.encode(prefixedAscii)) },
    { name: "prefix + len + message, unhashed", bytes: enc.encode(prefixedAscii) },
    { name: "double sha256 of Hub convention", bytes: N.Hash.computeSha256(N.Hash.computeSha256(enc.encode(prefixedAscii))) },
    { name: "blake2b(message)", bytes: N.Hash.computeBlake2b(enc.encode(message)) },
    { name: "blake2b(prefix + len + message)", bytes: N.Hash.computeBlake2b(enc.encode(prefixedAscii)) },
  ];

  const results = candidates.map((c) => {
    let ok = false;
    let error: string | null = null;
    try {
      ok = pub.verify(sig, c.bytes);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    return { name: c.name, ok, error };
  });

  return NextResponse.json({
    message,
    publicKey,
    signature,
    messageByteLength: enc.encode(message).length,
    messageCharLength: message.length,
    results,
    anyMatch: results.some((r) => r.ok),
  });
}
