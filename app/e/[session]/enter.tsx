"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { nim } from "@/lib/message";

const APP_STORE = "https://apps.apple.com/app/id6471844738";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";

/**
 * Is this visitor already inside Nimiq Pay?
 *
 * Gate 1 established there is no window global to sniff, the SDK talks over a
 * message bridge and exposes nothing. So the only honest check is to call init()
 * and see whether anything answers.
 *
 * Three ways someone arrives here, and each needs a different screen:
 *   inside Nimiq Pay        -> send them straight in. Never suggest installing.
 *   a normal mobile browser -> show the install route.
 *   an in-app browser (WhatsApp, Telegram, Instagram) -> also the install route,
 *                              since those cannot reach the wallet either.
 *
 * The install route is what the server renders, so it is what shows with no JS, on
 * a slow connection, or if detection hangs. Detection can only ever *upgrade* the
 * page, it is never required for it to work.
 */
export default function Enter({ waiting, session }: { waiting: number; session: string }) {
  const [inWallet, setInWallet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const probe = (async () => {
          const mod = await import("@nimiq/mini-app-sdk");
          await mod.init();
          return true;
        })();

        // Outside Nimiq Pay init() rejects rather than hangs, but a timeout costs
        // nothing and stops a hung bridge leaving the page in limbo forever.
        const found = await Promise.race([
          probe,
          new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
        ]);

        if (!cancelled && found) setInWallet(true);
      } catch {
        // not in Nimiq Pay, the install route stays, which is already on screen
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (inWallet) {
    return (
      <>
        <Link href={`/split?from=${encodeURIComponent(session)}`} className="btn">
          {waiting > 0 ? `Collect ${nim(waiting)} NIM` : `Play ${NAME}`}
        </Link>
        {/* Say what collecting actually involves. The money is not sitting in a
            box waiting to be opened, it arrives when you take your own turn, and
            a page that implies otherwise is promising something it cannot do. */}
        <p className="faint" style={{ textAlign: "center" }}>
          {waiting > 0
            ? "It comes to you when you take your own turn, one decision, one guess, about a minute."
            : "Takes about a minute. One decision, one guess."}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="faint">
        The money moves through Nimiq Pay, a free app. It takes about a minute to set
        up and it&rsquo;s how you collect what&rsquo;s waiting.
      </p>
      <a className="btn" href={APP_STORE}>Get Nimiq Pay for iPhone</a>
      <a className="btn ghost" href={PLAY_STORE}>Get Nimiq Pay for Android</a>
      <p className="faint" style={{ textAlign: "center" }}>
        Already have it? Open {NAME} inside Nimiq Pay and this is waiting for you.
      </p>
    </>
  );
}
