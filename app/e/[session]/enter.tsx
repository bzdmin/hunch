"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { nim } from "@/lib/message";
import { available } from "@/lib/wallet";

const APP_STORE = "https://apps.apple.com/app/id6471844738";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";

/**
 * Is a wallet reachable from wherever this visitor is?
 *
 * Used to run its own detection straight against the Mini App SDK, bypassing
 * lib/wallet entirely, from before Hub existed as a path, which meant every
 * desktop visitor to a shared link was told to install Nimiq Pay on a phone
 * regardless of whether Hub could have served them right there. Now shares
 * the same detection everything else uses.
 *
 * Three ways someone arrives here, and each needs a different screen:
 *   inside Nimiq Pay  -> send them straight in.
 *   a desktop browser -> send them straight in too, through Nimiq Hub, see
 *                        lib/wallet. Never assumed a phone.
 *   nowhere a wallet reaches, an in-app browser (WhatsApp, Telegram,
 *   Instagram) blocks both -> the install route, the one place neither helps.
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
      const found = await available();
      if (!cancelled && found) setInWallet(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (inWallet) {
    return (
      <>
        <Link href={`/split?from=${encodeURIComponent(session)}`} className="btn">
          {waiting > 0 ? `Take your ${nim(waiting)} NIM turn` : `Play ${NAME}`}
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
