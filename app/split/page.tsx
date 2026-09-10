import { STAKE, FLOOR } from "@/lib/brand";
import { splitHouseMode } from "@/lib/payout";
import { nextUnclaimedGift } from "@/lib/store";
import Flow from "./flow";

export const dynamic = "force-dynamic";

/**
 * Which funding mode a player gets is decided here, on the server, at the moment
 * they arrive, never in the browser. House mode obliges us to pay out STAKE, so
 * whether we can afford it is not a question the client is allowed to answer.
 *
 * Today the house wallet is deliberately unfunded, so everyone gets self mode and
 * nothing is promised that cannot be paid. Fund the wallet, set NIMLAB_HOUSE_FUNDED=1,
 * and set NIMLAB_SPLIT_MODE=house to switch Split to the windfall. Funding alone
 * does not do it on purpose: Trust needs the house and Split does not, and opening
 * one must never silently change the other.
 */
export default async function SplitPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  // The relay: you decide over what the last player passed you.
  //
  // Three cases, and the third is what gives a chain an ending:
  //   gift at or above the floor -> your turn, split it and pass it on
  //   gift below the floor       -> the chain ends with you. You keep it, and you
  //                                 are not asked to split a sum too small to
  //                                 meaningfully divide again.
  //   no gift at all             -> you start a fresh chain
  const gift = await nextUnclaimedGift(from);
  const terminal = gift !== null && gift.give > 0 && gift.give < FLOOR;
  const inherited = gift && !terminal ? gift : null;
  const stake = terminal ? gift!.give : inherited ? inherited.give : STAKE;

  const mode = (await splitHouseMode(stake)) ? "house" : "self";
  return (
    <Flow
      mode={mode}
      from={gift?.session}
      stake={stake}
      inheritedFrom={inherited ? inherited.session : null}
      terminal={terminal}
    />
  );
}
