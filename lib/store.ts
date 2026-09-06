/**
 * State for commit → hold → reveal.
 *
 * DEV ONLY: file-backed JSON under .data/. Vercel's filesystem is read-only apart
 * from /tmp and is not shared between invocations, so this MUST be swapped for
 * Vercel KV or Postgres before the first real deploy. It is isolated behind this
 * module so that swap is one file, not a refactor.
 */

import { promises as fs } from "fs";
import path from "path";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "store.json");

export type Commit = {
  session: string;
  exp: "split" | "trust" | "ultimatum";
  /** which funding mode this decision was made under. never mix the two. */
  mode: "house" | "self";
  stake: number;
  give: number;
  predict: number;
  /**
   * Where the slider started, 0-100, or -1 if not reported. Client metadata, NOT part
   * of the signed commitment, a lying client only corrupts its own anchor record, and
   * nothing about payment or identity depends on it. Kept so we can check afterwards
   * whether the starting position moved people's answers.
   */
  anchor: number;
  ref: string;
  /** the exact string that was signed, kept verbatim so it can be re-verified */
  message: string;
  publicKey: string;
  signature: string;
  /** who the wallet actually paid from, read off the chain. null until settled. */
  payer: string | null;
  txHash: string | null;
  /** luna this player passed on, still waiting for a recipient */
  giftClaimedBy: string | null;
  at: number;
};

type Shape = { commits: Commit[] };

async function read(): Promise<Shape> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Shape;
  } catch {
    return { commits: [] };
  }
}

async function write(s: Shape): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 2), "utf8");
}

export async function put(c: Commit): Promise<void> {
  const s = await read();
  const i = s.commits.findIndex((x) => x.session === c.session);
  if (i >= 0) s.commits[i] = c;
  else s.commits.push(c);
  await write(s);
}

export async function get(session: string): Promise<Commit | null> {
  const s = await read();
  return s.commits.find((c) => c.session === session) ?? null;
}

export async function settled(): Promise<Commit[]> {
  const s = await read();
  return s.commits.filter((c) => c.payer !== null);
}

/**
 * The oldest settled gift nobody has received yet.
 * This is what makes solo Split real money at zero house cost: what you pass on
 * is paid to whoever plays next, and what you keep you simply never send.
 */
export async function nextUnclaimedGift(prefer?: string): Promise<Commit | null> {
  const s = await read();
  const open = s.commits.filter(
    (c) => c.payer !== null && c.give > 0 && c.giftClaimedBy === null,
  );
  // A shared link is personal, it says "someone passed YOU this much". Handing
  // the visitor a different gift than the one the page advertised makes the page
  // a liar, so a named gift wins over the queue.
  if (prefer) {
    const named = open.find((c) => c.session === prefer);
    if (named) return named;
  }
  return open.sort((a, b) => a.at - b.at)[0] ?? null;
}

export async function claimGift(session: string, by: string): Promise<void> {
  const s = await read();
  const c = s.commits.find((x) => x.session === session);
  if (c && c.giftClaimedBy === null) {
    c.giftClaimedBy = by;
    await write(s);
  }
}

/**
 * Live distribution of what players passed on, as a share of stake.
 *
 * ALWAYS scoped to one funding mode. Windfall and own-money decisions produce
 * different distributions, averaging them together is the exact confound the
 * published benchmark depends on us avoiding, and it would silently corrupt the
 * one number every player is shown.
 */
export async function population(
  mode: "house" | "self",
): Promise<{ n: number; meanPct: number; gaveSomethingPct: number }> {
  const all = (await settled()).filter((c) => c.mode === mode);
  if (all.length === 0) return { n: 0, meanPct: 0, gaveSomethingPct: 0 };
  const shares = all.map((c) => (c.give / c.stake) * 100);
  return {
    n: all.length,
    meanPct: shares.reduce((a, b) => a + b, 0) / all.length,
    gaveSomethingPct: (all.filter((c) => c.give > 0).length / all.length) * 100,
  };
}

/** Total players across both modes, for the "N people have played" line only. */
export async function totalPlayers(): Promise<number> {
  return (await settled()).length;
}
