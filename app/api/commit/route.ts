import { NextResponse } from "next/server";
import { build, type Decision } from "@/lib/message";
import { STAKE, FLOOR } from "@/lib/brand";
import { put, get, nextUnclaimedGift, claimGift, population } from "@/lib/store";
import { send, houseFunded } from "@/lib/payout";

export const dynamic = "force-dynamic";

/**
 * Record one player's decision and settle it.
 *
 * House funding (locked 5 Sep): the player sends nothing. They sign, and we pay.
 *   keep -> to the player now
 *   give -> queued for whoever plays next
 *
 * The client is trusted for exactly one thing: the address to pay them at. Gate 1
 * proved paying TO a listAccounts() address works, while the address that PAYS is
 * never disclosed, so a self-reported address is a payout target, never identity.
 * Identity here is the signature's public key.
 */
export async function POST(req: Request) {
  let body: {
    decision: Decision;
    message: string;
    publicKey: string;
    signature: string;
    payTo?: string;
    anchor?: number;
    from?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed request" }, { status: 400 });
  }

  const { decision, message, publicKey, signature, payTo, anchor, from } = body ?? {};
  if (!decision || !message || !publicKey || !signature) {
    return NextResponse.json(
      { error: "missing decision, message, publicKey or signature" },
      { status: 400 },
    );
  }

  // 1. the message must be the one our own template produces. a client that signed
  //    something else signed something we never showed the user.
  if (build(decision) !== message) {
    return NextResponse.json(
      { error: "signed message does not match the decision it claims to describe" },
      { status: 400 },
    );
  }

  // 2. the numbers
  const { stake, give, predict } = decision;

  // The relay means the endowment varies, so it cannot simply be trusted, a client
  // claiming a 50,000 NIM stake would otherwise have us record a decision over money
  // that was never passed to it. Recompute what this player was actually entitled to.
  // Must mirror app/split/page.tsx exactly, including the terminal case. It did not,
  // so a player at the end of a chain was told "stake does not match what was passed
  // to you" while looking at the correct amount on screen.
  const gift = await nextUnclaimedGift(from);
  const isTerminal = gift !== null && gift.give > 0 && gift.give < FLOOR;
  const inherited = gift && !isTerminal ? gift : null;
  const expectedStake = isTerminal ? gift!.give : inherited ? inherited.give : STAKE;
  if (isTerminal && give !== 0) {
    return NextResponse.json(
      { error: "the chain ends here, there is nothing to pass on" },
      { status: 400 },
    );
  }
  if (stake !== expectedStake) {
    return NextResponse.json(
      { error: "stake does not match what was passed to you", expected: expectedStake },
      { status: 400 },
    );
  }
  if (!Number.isInteger(give) || give < 0 || give > stake) {
    return NextResponse.json(
      { error: "give must be a whole number of luna between 0 and the stake" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(predict) || predict < 0 || predict > 100) {
    return NextResponse.json({ error: "predict must be a whole percentage" }, { status: 400 });
  }
  if (await get(decision.session)) {
    return NextResponse.json({ error: "this session has already been answered" }, { status: 409 });
  }

  // 3. the client says which mode it played in, and that claim decides whether we
  //    owe money, so it is checked, not trusted. A client asking for "house" when
  //    the house is unfunded is asking us to pay out money we do not have.
  const mode = decision.mode;
  if (mode !== "house" && mode !== "self") {
    return NextResponse.json({ error: "unknown mode" }, { status: 400 });
  }
  if (mode === "house") {
    if (!payTo) {
      return NextResponse.json({ error: "no address to pay you at" }, { status: 400 });
    }
    if (!(await houseFunded(stake))) {
      return NextResponse.json(
        { error: "Today's funding is used up. Come back tomorrow.", capped: true },
        { status: 503 },
      );
    }
  }

  await put({
    session: decision.session,
    exp: decision.exp,
    mode,
    stake, give, predict,
    anchor: typeof anchor === "number" && anchor >= 0 && anchor <= 100 ? anchor : -1,
    ref: decision.ref,
    message, publicKey, signature,
    payer: payTo ?? null,
    txHash: null,
    giftClaimedBy: null,
    at: Date.now(),
  });

  // 4. settle. keep goes to the player, give waits for the next person.
  const keep = stake - give;
  const payouts = [];
  if (mode === "house" && payTo) {
    if (keep > 0) {
      payouts.push(await send({ session: decision.session, to: payTo, value: keep, reason: "keep" }));
    }
    // the "give" half is not sent yet, it is claimed by the next player below,
    // at which point it is paid to them.
  }

  // 5. consume the gift that funded this turn. It was the endowment, not a bonus
  //    handed out alongside one, claiming it here is what stops the next player
  //    inheriting the same money twice.
  const consumed = inherited ?? (isTerminal ? gift : null);
  if (consumed && payTo) {
    await claimGift(consumed.session, decision.session);
    payouts.push(
      await send({
        session: consumed.session,
        to: payTo,
        value: consumed.give,
        reason: "gift",
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    keep,
    payouts: payouts.map((p) => ({ value: p.value, reason: p.reason, status: p.status })),
    mode,
    population: await population(mode),
    inherited: consumed ? { amount: consumed.give } : null,
  });
}
