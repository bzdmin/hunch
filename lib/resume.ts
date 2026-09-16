"use client";

/**
 * Remembers the last house-funded round this browser committed to but has
 * not finished sharing, so closing the app right after committing, before
 * tapping share, does not orphan the round and does not silently burn
 * another of this key's daily slots the next time the opening screen loads
 * and mints a fresh one without knowing the old one is still sitting open.
 *
 * Per-device browser storage only, so the caveats that implies apply: a
 * different device, a cleared browser, or a private window loses the
 * shortcut, not the round itself, which is unaffected and still sitting open
 * server-side either way. Never the only way back to a round, just the
 * convenient one.
 */

export type OpenRound<T> = T & { id: string; link: string; at: number };

function storageKey(exp: "trust" | "ultimatum"): string {
  return `hunch:${exp}:open`;
}

export function saveOpenRound<T>(exp: "trust" | "ultimatum", round: OpenRound<T>) {
  try {
    localStorage.setItem(storageKey(exp), JSON.stringify(round));
  } catch {
    // A private window or blocked storage just means no shortcut next time,
    // never a reason to fail the round that already committed successfully.
  }
}

export function loadOpenRound<T>(exp: "trust" | "ultimatum"): OpenRound<T> | null {
  try {
    const raw = localStorage.getItem(storageKey(exp));
    return raw ? (JSON.parse(raw) as OpenRound<T>) : null;
  } catch {
    return null;
  }
}

export function clearOpenRound(exp: "trust" | "ultimatum") {
  try {
    localStorage.removeItem(storageKey(exp));
  } catch {
    // ignore
  }
}
