"use client";

import { useState } from "react";
import { wallet, readable } from "@/lib/nimiq";

// Plain ASCII on purpose: keeps the JS string's .length equal to its UTF-8
// byte length, so the Hub convention's "message.length" cannot be ambiguous
// between characters and bytes while we are figuring out which scheme is real.
const TEST_MESSAGE = "Hunch signature format check 12345";

/**
 * Throwaway page. See app/api/debug/verify-sign/route.ts for why this exists
 * and what it is checking. Not linked from anywhere in the app, delete both
 * once the real signature check is confirmed and live.
 */
export default function DebugSignPage() {
  const [out, setOut] = useState("Tap the button inside Nimiq Pay.");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setOut("Opening wallet...");
    try {
      const w = await wallet();
      setOut("Signing...");
      const { publicKey, signature } = await w.sign(TEST_MESSAGE);

      setOut("Signed. Checking which byte format verifies...");
      const res = await fetch("/api/debug/verify-sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: TEST_MESSAGE, publicKey, signature }),
      });
      const data = await res.json();
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setOut(`Error: ${readable(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: "1.5rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
      <h1 style={{ fontSize: "1.1rem" }}>Signature format check</h1>
      <p>Test message: &quot;{TEST_MESSAGE}&quot;</p>
      <button
        onClick={run}
        disabled={busy}
        style={{ padding: "0.9rem 1.4rem", fontSize: "1rem", marginTop: "0.5rem", marginBottom: "1rem" }}
      >
        {busy ? "Working..." : "Sign test message"}
      </button>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{out}</pre>
    </main>
  );
}
