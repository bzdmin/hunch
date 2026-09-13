import "server-only";

/**
 * Sending NIM from the house wallet, with no phone involved.
 *
 * Gate 2, closed on mainnet on 13 Sep: transaction 646f6d8b...101d, 1 NIM, block
 * 61,454,625. The route that works is two separate jobs:
 *
 *   sign       pure cryptography with @nimiq/core, offline. No Client, no consensus.
 *   broadcast  hand the signed bytes to a public node via sendRawTransaction.
 *
 * The route that does NOT work, so nobody retries it: running the @nimiq/core Client
 * under Node. Its WASM networking never reaches consensus there, so it can never see
 * the chain and never send. Signing does not need the chain, only a block height,
 * which the node supplies.
 *
 * The node is a community service we do not run. It can drop a transaction but it
 * cannot alter or steal one, because the transaction is signed before it leaves here.
 * NIMIQ_RPC_URL switches to our own node later without a code change.
 */

const RPC_URL = process.env.NIMIQ_RPC_URL?.trim() || "https://rpc.nimiqwatch.com";

/** From core-rs-albatross primitives/src/networks.rs. */
const NETWORK_ID = process.env.NIMIQ_NETWORK === "main" ? 24 : 5;

const HEX_KEY = /^[0-9a-f]{64}$/;

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`node answered HTTP ${res.status} to ${method}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error).slice(0, 200)}`);
  return (body.result?.data ?? body.result) as T;
}

// The library is heavy and only needed when money actually moves, so it is loaded on
// first use rather than on every request that happens to import this file.
type Nimiq = typeof import("@nimiq/core");
let lib: Promise<Nimiq> | null = null;
const nimiq = () => (lib ??= import("@nimiq/core"));

/** The key, or null. Read fresh so a pasted key with quotes or spaces is caught here. */
function keyHex(): string | null {
  const raw = (process.env.NIMLAB_HOUSE_KEY ?? "").trim().replace(/^["']|["']$/g, "").toLowerCase();
  return HEX_KEY.test(raw) ? raw : null;
}

export function keyConfigured(): boolean {
  return keyHex() !== null;
}

async function keyPair() {
  const hex = keyHex();
  if (!hex) throw new Error("NIMLAB_HOUSE_KEY is missing or not 64 hex characters");
  const N = await nimiq();
  return N.KeyPair.derive(N.PrivateKey.fromHex(hex));
}

/** The address the key actually controls. Public, safe to show. */
export async function houseAddress(): Promise<string> {
  return (await keyPair()).toAddress().toUserFriendlyAddress();
}

export async function balanceOf(address: string): Promise<number> {
  const acct = await rpc<{ balance?: number | string }>("getAccountByAddress", [address]);
  return Number(acct?.balance ?? 0);
}

/**
 * Sign and broadcast one payment. Returns the transaction hash the node accepted.
 *
 * Throws before anything leaves this process if the key is bad or the house cannot
 * cover the amount, so a failure here never means money is half sent.
 */
export async function pay(args: { to: string; luna: number; note: string }): Promise<string> {
  if (!Number.isInteger(args.luna) || args.luna <= 0) {
    throw new Error(`refusing to send ${args.luna} luna`);
  }

  const N = await nimiq();
  const kp = await keyPair();
  const from = kp.toAddress();

  const balance = await balanceOf(from.toUserFriendlyAddress());
  if (balance < args.luna) {
    throw new Error(`house balance ${balance} luna is below ${args.luna}`);
  }

  const height = await rpc<number>("getBlockNumber");
  const tx = N.TransactionBuilder.newBasicWithData(
    from,
    N.Address.fromUserFriendlyAddress(args.to),
    new TextEncoder().encode(args.note.slice(0, 64)),
    BigInt(args.luna),
    BigInt(0),
    height,
    NETWORK_ID,
  );
  tx.sign(kp, undefined);

  return rpc<string>("sendRawTransaction", [Buffer.from(tx.serialize()).toString("hex")]);
}

/**
 * Prove the library loads and can sign in this runtime, without sending anything.
 * Vercel's bundler is the one place this could still break, so the health check calls
 * this instead of anyone finding out on a real payout.
 */
export async function canSign(): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  try {
    const N = await nimiq();
    const kp = await keyPair();
    const from = kp.toAddress();
    const tx = N.TransactionBuilder.newBasicWithData(
      from, from, new TextEncoder().encode("health"), BigInt(1), BigInt(0), 1, NETWORK_ID,
    );
    tx.sign(kp, undefined);
    return { ok: true, address: from.toUserFriendlyAddress() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const rpcUrl = () => RPC_URL;
