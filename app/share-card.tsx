"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { NAME } from "@/lib/brand";

/**
 * The share card, and the button that sends it.
 *
 * This is acquisition, not decoration. A result that only ever exists on the
 * screen of the person who earned it grows nothing, so the card is built to be
 * screenshot-worthy on its own: branded, self-explanatory without the app
 * around it, and carrying the address so an image alone is still actionable.
 *
 * Two rules it must not break:
 *
 *  1. It never repeats the reveal screen. The reveal answers "what happened to
 *     me". The card asks a stranger "could you have read them?", which is a
 *     different question and the only one that makes a stranger tap.
 *  2. The link goes straight into the experiment, never to the home screen or
 *     an explainer. Someone who taps a Trust result lands in Trust, mid-decision,
 *     with their own stake in front of them. The loop only closes if the tap
 *     puts them where the result came from.
 */
export function ShareCard({
  experiment,
  color,
  path,
  predicted,
  happened,
  challenge,
  shareText,
}: {
  experiment: string;
  /** a CSS color expression, e.g. "var(--good)" */
  color: string;
  /** the experiment's own route, e.g. "/trust", never "/" */
  path: string;
  predicted: ReactNode;
  happened: ReactNode;
  challenge: string;
  /** what actually gets sent, minus the link, which is appended here */
  shareText: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}${path}`;
  const shown = origin.replace(/^https?:\/\//, "");
  const text = `${shareText} ${link}`;

  /**
   * Three tiers, because the first two do not exist over plain HTTP.
   *
   * navigator.share and navigator.clipboard are both secure-context only, and a
   * mini app loaded from http://<ip>:port is not a secure context. Split hit
   * exactly this on 5 Sep: the button ran, found neither API, threw, and showed
   * the user nothing at all. A button that silently does nothing is the worst
   * possible failure for the one control the entire growth loop depends on, so
   * every branch here ends in visible feedback.
   */
  async function send() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // dismissed, or unavailable despite existing, fall through
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setState("copied");
        return;
      } catch {
        // blocked, fall through
      }
    }

    setState("manual");
  }

  return (
    <>
      <div className="share-card" style={{ "--pick-color": color } as CSSProperties}>
        <div className="brand">
          <span className="name">{NAME.toUpperCase()}</span>
          <span className="exp">{experiment}</span>
        </div>

        <p className="line">{predicted}</p>
        <p className="line strong">{happened}</p>

        <p className="challenge">{challenge}</p>

        <p className="addr">{shown}{path}</p>
      </div>

      <button onClick={send}>
        {state === "copied" ? "Copied, paste it anywhere" : "Send this to someone"}
      </button>

      {state === "manual" && (
        <div className="card">
          <p className="faint" style={{ marginBottom: "0.5rem" }}>
            Copying is blocked here. Select this and send it to someone:
          </p>
          <textarea
            readOnly
            value={text}
            rows={4}
            style={{
              width: "100%", background: "var(--paper)", color: "var(--ink)",
              border: "2px solid var(--ink)", borderRadius: "8px",
              padding: "0.6rem 0.7rem", font: "inherit", fontSize: "0.9rem",
            }}
          />
        </div>
      )}
    </>
  );
}
