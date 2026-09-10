import { notFound } from "next/navigation";
import { NAME } from "@/lib/brand";
import { authorised } from "@/lib/admin";
import { nim } from "@/lib/message";
import { allPayouts, type PayoutReason } from "@/lib/payout";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `${NAME} payouts`,
  robots: { index: false, follow: false },
};

const LABEL: Record<PayoutReason, string> = {
  keep: "Split, kept share",
  gift: "Split, passed on",
  "trust-a": "Trust, first player",
  "trust-b": "Trust, second player",
};

const field = {
  width: "100%",
  padding: "0.7rem 0.8rem",
  border: "2px solid var(--ink)",
  borderRadius: "10px",
  background: "var(--paper)",
  color: "var(--ink)",
  font: "inherit",
  fontSize: "0.9rem",
} as const;

/**
 * Who is owed what, for settling by hand.
 *
 * Pay each one from your own wallet, then paste the transaction hash here. Until a
 * payout has a hash it stays listed as owed, which is the whole point: the app must
 * never report money as moved on the strength of someone remembering to send it.
 */
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; err?: string }>;
}) {
  const { key, err } = await searchParams;
  if (!authorised(key)) notFound();

  const rows = await allPayouts();
  const owed = rows.filter((r) => r.status === "queued");
  const paid = rows.filter((r) => r.status === "sent");
  const failed = rows.filter((r) => r.status === "failed");
  const total = owed.reduce((a, b) => a + b.value, 0);

  return (
    <main className="screen">
      <p className="eyebrow">{NAME} · Payouts</p>
      <h1>
        {owed.length === 0 ? "Nothing owed." : <>{owed.length} owed, <span className="hl">{nim(total)} NIM</span></>}
      </h1>
      <p className="soft">
        Pay each one from your wallet to the address shown, then paste the transaction
        hash and mark it paid. Oldest first.
      </p>

      {err === "tx" && <p className="err">That isn&rsquo;t a transaction hash. It should be 64 characters of 0-9 and a-f.</p>}
      {err === "gone" && <p className="err">That payout was already marked, or no longer exists.</p>}

      {[...owed].reverse().map((p) => (
        <form key={p.id} method="post" action="/api/admin/payouts" className="card" style={{ display: "grid", gap: "0.6rem" }}>
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="id" value={p.id} />
          <div className="split-readout">
            <div>
              <span className="k">{LABEL[p.reason] ?? p.reason}</span>
              <span className="v">{nim(p.value)} NIM</span>
            </div>
            <div className="right">
              <span className="k">Recorded</span>
              <span className="v" style={{ fontSize: "0.95rem" }}>
                {new Date(p.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>
          <code style={{ wordBreak: "break-all", fontSize: "0.85rem" }}>{p.to}</code>
          <input name="tx" placeholder="Transaction hash, once paid" required style={field} />
          <button>Mark as paid</button>
        </form>
      ))}

      {failed.length > 0 && (
        <div className="card">
          <h2>Refused by the daily cap</h2>
          <p className="soft" style={{ marginTop: "0.4rem" }}>
            {failed.length} payout{failed.length === 1 ? "" : "s"}, {nim(failed.reduce((a, b) => a + b.value, 0))} NIM.
            These were never owed, because the cap stopped them before anything was promised.
          </p>
        </div>
      )}

      {paid.length > 0 && (
        <div className="card">
          <h2>Paid</h2>
          {paid.slice(0, 20).map((p) => (
            <p key={p.id} className="faint" style={{ marginTop: "0.5rem", wordBreak: "break-all" }}>
              {nim(p.value)} NIM, {LABEL[p.reason] ?? p.reason}, tx {p.txHash?.slice(0, 16)}&hellip;
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
