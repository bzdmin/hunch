import { NextResponse } from "next/server";
import { SPLIT_MEAN_GIVEN, SPLIT_GAVE_SOMETHING, TRUST_RETURNED_SHARE } from "@/lib/benchmarks";
import { trustPopulation, ultimatumPopulation } from "@/lib/pair";
import { population as splitPopulation } from "@/lib/store";

export const dynamic = "force-dynamic";

const MIN_SAMPLE = 10;
type Exp = "split" | "trust" | "ultimatum";
const KNOWN: Exp[] = ["split", "trust", "ultimatum"];

/**
 * The numbers a visitor is allowed to see, gated by what they claim to have
 * already played.
 *
 * Genuine bug, not a design choice: the Research page used to render every
 * benchmark and every live population figure unconditionally, server-side,
 * reachable from the global nav before anyone had played anything. That
 * directly broke the rule every other screen in this app already follows,
 * see the comment on about/page.tsx, "the number people are trying to guess
 * must not be readable before they guess it." A visitor could open
 * "Research" out of curiosity, read the exact published average, then go
 * answer to it instead of honestly.
 *
 * Fixed at the source, not with a client-side hide: an experiment's numbers
 * are only ever computed and sent for experiments listed in ?played=, so an
 * unplayed experiment's figures never enter the response at all, not merely
 * hidden by a conditional render after arriving. `played` is self-reported
 * from this device's own history (lib/history.ts), the same trust level as
 * every other piece of client metadata in this app, honest about being a
 * convenience against accidental spoiling, not a defence against someone
 * deliberately editing a query string to cheat themselves out of their own
 * experiment.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("played") ?? "";
  const played = new Set(
    raw.split(",").map((s) => s.trim()).filter((s): s is Exp => (KNOWN as string[]).includes(s)),
  );

  const out: Record<string, unknown> = {};

  if (played.has("split")) {
    const [house, self] = await Promise.all([splitPopulation("house"), splitPopulation("self")]);
    out.split = {
      research: { mean: SPLIT_MEAN_GIVEN, gaveSomething: SPLIT_GAVE_SOMETHING },
      house: house.n >= MIN_SAMPLE ? house : null,
      self: self.n >= MIN_SAMPLE ? self : null,
    };
  }

  if (played.has("trust")) {
    const trust = await trustPopulation();
    out.trust = { research: TRUST_RETURNED_SHARE, players: trust };
  }

  if (played.has("ultimatum")) {
    const ultimatum = await ultimatumPopulation();
    out.ultimatum = { players: ultimatum };
  }

  return NextResponse.json(out);
}
