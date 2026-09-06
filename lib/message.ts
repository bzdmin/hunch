import { NAME, type Mode } from "./brand";
/**
 * The string a person reads in the Nimiq Pay signing dialog.
 *
 * Gate 1 (3 Sep) showed the dialog renders whatever string we pass, verbatim.
 * Signing raw JSON put `"nonce":"d7df2853c9e87c3b…"` in front of the user at the
 * exact moment they commit real money. So the signed message is copy, not a payload.
 *
 * The server stores the exact string alongside the signature and rebuilds it
 * deterministically from the stored fields, build() is the single source of truth
 * for both sides. Never format this message anywhere else.
 */

export const LUNA = 100_000; // 1 NIM
export const nim = (luna: number) => (luna / LUNA).toFixed(2);

export type Experiment = "split" | "trust" | "ultimatum";

export type Decision = {
  exp: Experiment;
  /** windfall we funded, or the player's own NIM. changes the wording and the maths. */
  mode: Mode;
  session: string;
  /** total the player is deciding over, in luna */
  stake: number;
  /** luna passed on to the next player */
  give: number;
  /** their guess at what share of the stake most people pass on, 0-100 */
  predict: number;
  /** 8 hex chars, shown to the user so the dialog is traceable */
  ref: string;
};

export function build(d: Decision): string {
  if (d.exp !== "split") throw new Error(`no message template for "${d.exp}" yet`);

  const keep = d.stake - d.give;
  return [
    `${NAME} · Split`,
    "",
    `You keep ${nim(keep)} NIM.`,
    `You pass ${nim(d.give)} NIM to the next person who plays.`,
    `You predict most people pass on ${d.predict}%.`,
    "",
    "Signing locks this answer in.",
    `ref ${d.session}·${d.ref}`,
  ].join("\n");
}

/**
 * Random hex, and it must never throw.
 *
 * Nimiq's own docs warn that loading a mini app over plain http://<ip>:port is not a
 * secure context, so some Web Crypto APIs are missing in the WebView. On 4 Sep this
 * threw inside a useState initializer on the phone, which killed hydration and left
 * every button on the page inert while the server-rendered HTML still looked fine.
 *
 * Production is HTTPS and will use real crypto. The fallback exists so that a dev
 * build over LAN degrades instead of dying, these values are for uniqueness, not
 * secrecy, so Math.random is acceptable when there is no alternative.
 */
function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(a);
  } else {
    for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ref = () => randHex(4);
export const session = () => randHex(5);

/**
 * What each side of a Trust round reads in the signing dialog.
 *
 * Same rule as Split: this is copy, not a payload. It is the last thing someone sees
 * before committing real money, so it says what they chose in sentences a person can
 * check, never a JSON blob.
 */
export function trustMessage(a: {
  seat: "a" | "b";
  pairId: string;
  /** luna A is deciding over */
  stake: number;
  multiplier: number;
  /** A: 0 or stake. B: luna returned out of the tripled pot. */
  move: number;
  /** A: what they expect back. B: what they think A expected. */
  predict: number;
  ref: string;
}): string {
  const pot = a.stake * a.multiplier;

  const body =
    a.seat === "a"
      ? a.move === 0
        ? [
            `You keep ${nim(a.stake)} NIM.`,
            `The other person gets nothing.`,
          ]
        : [
            `You hand over ${nim(a.stake)} NIM.`,
            `It becomes ${nim(pot)} NIM in their hands.`,
            `They decide what comes back to you.`,
            `You expect ${nim(a.predict)} NIM.`,
          ]
      : [
          `You are holding ${nim(pot)} NIM.`,
          `You send back ${nim(a.move)} NIM.`,
          `You keep ${nim(pot - a.move)} NIM.`,
          `You think they expected ${nim(a.predict)} NIM back.`,
        ];

  return [
    `${NAME} · Trust`,
    "",
    ...body,
    "",
    "Signing locks this answer in.",
    `ref ${a.pairId}·${a.ref}`,
  ].join(String.fromCharCode(10));
}
