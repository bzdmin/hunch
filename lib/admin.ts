import { timingSafeEqual } from "crypto";

/**
 * Is this the builder?
 *
 * The settlement page shows who is owed money and at which address, so it is shut
 * unless NIMLAB_ADMIN_KEY is set to something long, and the key presented matches it
 * exactly. Compared in constant time so the key cannot be guessed a character at a
 * time from response timings.
 */
export function authorised(key?: string | null): boolean {
  // Trimmed because a trailing space or line break pasted into the Vercel dashboard
  // is invisible there, and would otherwise refuse the builder's correct key.
  const real = (process.env.NIMLAB_ADMIN_KEY ?? "").trim();
  if (real.length < 16 || !key) return false;
  const a = Buffer.from(key.trim());
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Is this Vercel's own scheduler?
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on every invocation once
 * that env var is set on the project, see app/api/cron/sweep-expired/route.ts. Same
 * constant-time comparison as authorised() above, same reasoning: nothing here should
 * be guessable from response timing, even though the worst a wrong guess can do is
 * trigger sweepExpiredPairs() early, not move money or read anything private.
 */
export function authorisedCron(header: string | null): boolean {
  const real = (process.env.NIMLAB_CRON_SECRET ?? "").trim();
  if (real.length < 16 || !header) return false;
  const presented = header.replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(presented);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}
