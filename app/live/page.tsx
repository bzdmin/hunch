"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAME } from "@/lib/brand";
import { getHistory } from "@/lib/history";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const nim = (luna: number) => (luna / 100000).toFixed(2);

/** "2 min ago", down to seconds, up to days, no identity anywhere in the shape. */
function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"} ago`;
}

type FeedItem =
  | { kind: "pair"; exp: "trust"; at: number; stake: number; multiplier: number; kept: boolean; move: number; accepted: boolean | null }
  | { kind: "pair"; exp: "ultimatum"; at: number; stake: number; multiplier: number; kept: boolean; move: number; accepted: boolean | null }
  | { kind: "split"; at: number; stake: number; give: number };

type SplitPop = { n: number; meanPct: number; gaveSomethingPct: number; distribution: number[] };
type SplitLive = { waiting: number; n: number; house?: SplitPop | null; self?: SplitPop | null };
type TrustLive = { waiting: number; n: number; joinId: string | null; players?: { n: number; meanReturnedPct: number } | null };
type UltimatumLive = { waiting: number; n: number; joinId: string | null; players?: { n: number; meanOfferPct: number; acceptedPct: number } | null };
type Data = { feed?: FeedItem[]; split?: SplitLive; trust?: TrustLive; ultimatum?: UltimatumLive };

/**
 * "Hunch is happening right now", not "here are our three games". Two kinds
 * of number here, deliberately treated differently, see app/api/live/route.ts:
 *
 *   waiting counts and join links are presence, always real, always public.
 *   No visitor has to have played anything to see that a real round is
 *   sitting open right now, that is the whole point of this page existing.
 *
 *   means and distributions ARE what people decided, so they follow the
 *   exact same play-gate as /research: this device's own local history
 *   decides which experiments' real figures this fetch is even allowed to
 *   ask for. A visitor who has not played Split yet sees that rounds are
 *   happening, never what people are choosing.
 */
export default function Live() {
  const [played, setPlayed] = useState<Set<string> | null>(null);
  const [data, setData] = useState<Data>({});

  useEffect(() => {
    const set = new Set(getHistory().map((e) => e.exp));
    setPlayed(set);
    const qs = set.size > 0 ? `?played=${[...set].join(",")}` : "";
    fetch(`/api/live${qs}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const maxBucket = (dist: number[]) => Math.max(1, ...dist);

  /**
   * One real anecdote, plain-language, no identity. "Someone" and "they",
   * never a name, address, or "Player 0x...", the interesting object is
   * the decision, not who made it, see recentPairEvents/recentSplitEvents.
   */
  function describeFeedItem(item: FeedItem): { color: string; line: string; badge: string } {
    if (item.kind === "split") {
      if (item.give === 0) {
        return { color: "var(--accent)", line: `Someone kept all ${nim(item.stake)} NIM.`, badge: "Kept it all" };
      }
      return {
        color: "var(--accent)",
        line: `Someone passed ${nim(item.give)} NIM to the next player.`,
        badge: `${pct(Math.round((item.give / item.stake) * 100))} passed on`,
      };
    }
    if (item.exp === "trust") {
      if (item.kept) {
        return { color: "var(--good)", line: "Someone kept everything instead of trusting a stranger.", badge: "Kept it all" };
      }
      const pot = item.stake * item.multiplier;
      return {
        color: "var(--good)",
        line: `${nim(item.stake)} NIM was handed to a stranger. They returned ${nim(item.move)} NIM.`,
        badge: `${pct(Math.round((item.move / pot) * 100))} came back`,
      };
    }
    // ultimatum
    return {
      color: "var(--warm)",
      line: `Someone offered ${pct(Math.round((item.move / item.stake) * 100))}. The other player ${item.accepted ? "accepted" : "rejected"} it.`,
      badge: item.accepted ? "Deal accepted" : "Deal rejected",
    };
  }

  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">{NAME} Live</p>
          <h1>People are actually here.</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            Real rounds, sitting open right now, and what {NAME} players have
            actually decided so far.
          </p>
        </div>

        <p className="section-label">What just happened</p>
        <div className="card-grid cols-3">
          {!data.feed ? (
            <p className="faint">Loading&hellip;</p>
          ) : data.feed.length === 0 ? (
            <div className="card">
              <p className="soft">
                Nothing&rsquo;s happened yet. Be the first real decision on
                this page.
              </p>
            </div>
          ) : (
            data.feed.map((item, i) => {
              const label = item.kind === "split" ? "Split" : item.exp === "trust" ? "Trust" : "Ultimatum";
              const { color, line, badge } = describeFeedItem(item);
              return (
                <div key={i} className="pick" style={{ "--pick-color": color } as React.CSSProperties}>
                  <p className="eyebrow">{label} &middot; {timeAgo(item.at)}</p>
                  <p className="soft" style={{ marginTop: "0.5rem" }}>{line}</p>
                  <p className="k" style={{ marginTop: "0.6rem" }}>{badge}</p>
                </div>
              );
            })
          )}
        </div>

        <p className="section-label" style={{ marginTop: "1rem" }}>Right now</p>

        <div className="picks">
          <div className="pick" style={{ "--pick-color": "var(--accent)" } as React.CSSProperties}>
            <p className="eyebrow">01 &middot;</p>
            <p className="name">Split</p>
            {data.split ? (
              data.split.waiting > 0 ? (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    {data.split.waiting} gift{data.split.waiting === 1 ? "" : "s"} passed on,
                    waiting to be claimed.
                  </p>
                  <Link href="/split" className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Claim it &rarr;
                  </Link>
                </>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    Nothing waiting right now. Start a fresh one.
                  </p>
                  <Link href="/split" className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Play Split &rarr;
                  </Link>
                </>
              )
            ) : (
              <p className="faint" style={{ marginTop: "0.35rem" }}>Loading&hellip;</p>
            )}
          </div>

          <div className="pick" style={{ "--pick-color": "var(--good)" } as React.CSSProperties}>
            <p className="eyebrow">02 &middot;</p>
            <p className="name">Trust</p>
            {data.trust ? (
              data.trust.waiting > 0 ? (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    {data.trust.waiting} round{data.trust.waiting === 1 ? "" : "s"} waiting
                    for an answer.
                  </p>
                  <Link href={`/t/${data.trust.joinId}`} className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Answer one &rarr;
                  </Link>
                </>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    No one&rsquo;s waiting right now. Start one.
                  </p>
                  <Link href="/trust" className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Play Trust &rarr;
                  </Link>
                </>
              )
            ) : (
              <p className="faint" style={{ marginTop: "0.35rem" }}>Loading&hellip;</p>
            )}
          </div>

          <div className="pick" style={{ "--pick-color": "var(--warm)" } as React.CSSProperties}>
            <p className="eyebrow">03 &middot;</p>
            <p className="name">Ultimatum</p>
            {data.ultimatum ? (
              data.ultimatum.waiting > 0 ? (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    {data.ultimatum.waiting} offer{data.ultimatum.waiting === 1 ? "" : "s"} waiting
                    for an answer.
                  </p>
                  <Link href={`/u/${data.ultimatum.joinId}`} className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Answer one &rarr;
                  </Link>
                </>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.35rem" }}>
                    No one&rsquo;s waiting right now. Start one.
                  </p>
                  <Link href="/ultimatum" className="go" style={{ marginTop: "0.6rem", display: "inline-block" }}>
                    Play Ultimatum &rarr;
                  </Link>
                </>
              )
            ) : (
              <p className="faint" style={{ marginTop: "0.35rem" }}>Loading&hellip;</p>
            )}
          </div>
        </div>

        <p className="section-label" style={{ marginTop: "1rem" }}>The numbers so far</p>

        {played === null ? null : (
          <div className="card-grid cols-3">
            <div className="card">
              <h2>Split</h2>
              {!data.split ? (
                <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.5rem" }}>
                    {data.split.n} decision{data.split.n === 1 ? "" : "s"} made so far.
                  </p>
                  {!played.has("split") ? (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Play Split to unlock what people actually chose.
                    </p>
                  ) : data.split.house || data.split.self ? (
                    <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.9rem" }}>
                      {[data.split.house, data.split.self].filter((p): p is SplitPop => !!p).map((pop, i) => (
                        <div key={i}>
                          <p className="soft">
                            On average, players gave away {pct(pop.meanPct)} of what they were
                            holding, and {pct(pop.gaveSomethingPct)} gave something rather than
                            nothing.
                          </p>
                          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.2rem" }}>
                            {pop.distribution.map((count, b) => (
                              <div key={b} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span className="faint" style={{ width: "3.2rem", flexShrink: 0, fontSize: "0.75rem" }}>
                                  {b * 10}-{b * 10 + 10}%
                                </span>
                                <div
                                  style={{
                                    height: "0.6rem",
                                    borderRadius: "3px",
                                    background: "var(--accent)",
                                    width: `${(count / maxBucket(pop.distribution)) * 100}%`,
                                    minWidth: count > 0 ? "3px" : "0",
                                  }}
                                />
                                <span className="faint" style={{ fontSize: "0.75rem" }}>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Not enough rounds yet for this to mean anything. Be one of the first.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <h2>Trust</h2>
              {!data.trust ? (
                <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.5rem" }}>
                    {data.trust.n} completed round{data.trust.n === 1 ? "" : "s"} so far.
                  </p>
                  {!played.has("trust") ? (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Play Trust to unlock what people actually returned.
                    </p>
                  ) : data.trust.players ? (
                    <p className="soft" style={{ marginTop: "0.4rem" }}>
                      Across {data.trust.players.n} real rounds, the average return was{" "}
                      {pct(data.trust.players.meanReturnedPct)} of the tripled pot.
                    </p>
                  ) : (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Not enough rounds yet for this to mean anything. Be one of the first.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <h2>Ultimatum</h2>
              {!data.ultimatum ? (
                <p className="faint" style={{ marginTop: "0.5rem" }}>Loading&hellip;</p>
              ) : (
                <>
                  <p className="soft" style={{ marginTop: "0.5rem" }}>
                    {data.ultimatum.n} completed round{data.ultimatum.n === 1 ? "" : "s"} so far.
                  </p>
                  {!played.has("ultimatum") ? (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Play Ultimatum to unlock what people actually offered.
                    </p>
                  ) : data.ultimatum.players ? (
                    <p className="soft" style={{ marginTop: "0.4rem" }}>
                      Across {data.ultimatum.players.n} real rounds, the average offer was{" "}
                      {pct(data.ultimatum.players.meanOfferPct)} of the stake, and{" "}
                      {pct(data.ultimatum.players.acceptedPct)} of offers were accepted.
                    </p>
                  ) : (
                    <p className="faint" style={{ marginTop: "0.4rem" }}>
                      Not enough rounds yet for this to mean anything. Be one of the first.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="grow" />
        <Link href="/#experiments" className="btn">Add to the numbers</Link>
      </main>
      <Footer />
    </>
  );
}
