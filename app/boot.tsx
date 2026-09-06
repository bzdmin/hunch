"use client";

import { useEffect, useState } from "react";

/**
 * On-screen diagnostics, because there is no console on the phone.
 *
 * The badge only ever appears if client JavaScript ran at all. That single fact
 * separates the two failure modes we keep confusing:
 *   badge missing  -> React never hydrated; every button on the page is inert
 *   badge present  -> React is alive and the problem is in the handler itself
 *
 * Errors and unhandled promise rejections are printed in full, since a truncated
 * message has cost us two rounds already.
 */
export default function Boot() {
  const [errors, setErrors] = useState<string[]>([]);
  const [alive, setAlive] = useState(false);

  useEffect(() => {
    setAlive(true);

    const onErr = (e: ErrorEvent) => {
      setErrors((p) => [
        ...p,
        `${e.message}\n  at ${e.filename ?? "?"}:${e.lineno ?? "?"}:${e.colno ?? "?"}` +
          (e.error?.stack ? `\n${String(e.error.stack).slice(0, 600)}` : ""),
      ]);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      setErrors((p) => [
        ...p,
        `unhandled rejection: ${r instanceof Error ? r.message : String(r)}` +
          (r instanceof Error && r.stack ? `\n${r.stack.slice(0, 600)}` : ""),
      ]);
    };

    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: "none",
        font: "11px/1.45 ui-monospace, Menlo, monospace",
      }}
    >
      {errors.length > 0 && (
        <div
          style={{
            pointerEvents: "auto",
            maxHeight: "45vh",
            overflow: "auto",
            background: "#2b1512",
            color: "#ffb4a2",
            padding: "10px 12px",
            borderTop: "2px solid #e8836e",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {errors.map((e, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              {e}
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          textAlign: "center",
          padding: "3px 0",
          background: alive ? "#15291f" : "#3a2a10",
          color: alive ? "#5fc08d" : "#dca843",
          letterSpacing: "0.08em",
        }}
      >
        {alive ? "JS ALIVE, react hydrated" : "JS NOT RUNNING"}
      </div>
    </div>
  );
}
