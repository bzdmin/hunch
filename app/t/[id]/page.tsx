import Link from "next/link";
import { NAME } from "@/lib/brand";
import { nim } from "@/lib/message";
import { getPair } from "@/lib/pair";
import Respond from "./respond";

export const dynamic = "force-dynamic";

/**
 * What the second player lands on.
 *
 * Server-rendered, so it works in any browser with no wallet, this is a link sent
 * over a messenger to someone who may never have heard of any of this.
 *
 * It must never leak the first player's prediction. That number is the whole reveal;
 * showing it here would let the second player answer to it rather than honestly, and
 * the round would measure nothing.
 */
export default async function TrustLanding({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pair = await getPair(id);

  if (!pair || !pair.a) {
    return (
      <main className="screen">
        <p className="eyebrow">{NAME} · Trust</p>
        <h1>That round isn&rsquo;t there.</h1>
        <p className="soft">
          The link may be mistyped, or the round was never finished. Nothing is lost
, you can start your own.
        </p>
        <div className="grow" />
        <Link href="/about" className="btn">What is {NAME}?</Link>
      </main>
    );
  }

  const pot = pair.stake * pair.multiplier;
  const done = pair.status === "revealed";

  return (
    <main className="screen">
      <p className="eyebrow">{NAME} · Trust</p>

      {done ? (
        <>
          <h1>This round is already finished.</h1>
          <p className="soft">
            Someone else answered it first. You can start one of your own,
            it takes about a minute.
          </p>
        </>
      ) : (
        <>
          <h1>
            Someone handed you {nim(pair.stake)} NIM. It&rsquo;s now{" "}
            <span className="hl">{nim(pot)} NIM</span>.
          </h1>
          <p className="soft">
            A stranger had {nim(pair.stake)} NIM and could have kept it. They gave it
            away instead, which tripled it, and now you&rsquo;re holding all of
            it. How much goes back to them is entirely your call. Keeping the lot
            costs you nothing.
          </p>
        </>
      )}

      <div className="grow" />

      {/* Renders the install route by default and swaps itself for the real
          decision if the visitor turns out to be inside Nimiq Pay. */}
      <Respond
        id={pair.id}
        stake={pair.stake}
        multiplier={pair.multiplier}
        finished={done}
      />

      <Link href="/about" className="faint" style={{ textAlign: "center" }}>
        What is {NAME}?
      </Link>
    </main>
  );
}
