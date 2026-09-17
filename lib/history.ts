"use client";

/**
 * A record of this device's own finished rounds, for the Results page.
 *
 * There is no login here, and building one just to back a history page would
 * be exactly the "fake fallback" the wallet architecture pass explicitly
 * ruled out: a signing key is not an account, and pretending otherwise would
 * either lose someone's history the moment they use a second device, or
 * require asking for something Hunch has no business asking for. So this is
 * what it honestly can be: this browser's own memory of what it has seen,
 * same caveat as lib/resume.ts, a convenience, not a guarantee, and the
 * Results page says so rather than implying an account exists.
 */

export type HistoryEntry = {
  id: string;
  exp: "split" | "trust" | "ultimatum";
  at: number;
  /** what you decided */
  call: string;
  /** what actually happened */
  outcome: string;
  /** back into the same experiment, never the home screen */
  href: string;
};

const KEY = "hunch:history";
const MAX_ENTRIES = 30;

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "at">): void {
  try {
    const all = readAll();
    all.unshift({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX_ENTRIES)));
  } catch {
    // A private window or blocked storage just means no history to show
    // later, never a reason to fail the round that already finished.
  }
}

export function getHistory(): HistoryEntry[] {
  return readAll();
}
