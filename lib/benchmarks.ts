/**
 * Published findings, checked against source on 2 Sep 2026.
 *
 * These exist because comparing a player to other NIM Lab players fails on day one:
 * the twentieth user learns they are more generous than nineteen people, which is
 * worth nothing. Sixty years of research works from the first session.
 *
 * RULE: never put a figure on screen that is not in this file with a citation.
 * Ultimatum is deliberately absent, those numbers have not been verified yet.
 */

export type Benchmark = {
  value: number;
  unit: "percent";
  claim: string;
  source: string;
  /** true when we computed it from published figures rather than quoting one */
  derived?: boolean;
  /** shown wherever the figure is, so the comparison stays honest */
  caveat?: string;
};

export const SPLIT_MEAN_GIVEN: Benchmark = {
  value: 28.3,
  unit: "percent",
  claim: "Mean share of the endowment given away",
  source: "Engel 2011, meta-study of ~600 dictator-game studies",
  caveat:
    "Those studies handed participants a windfall; players here are deciding over their own money, which the literature associates with lower giving, so expect our numbers to run below this, and say so rather than calling it a difference in generosity.",
};

export const SPLIT_GAVE_SOMETHING: Benchmark = {
  value: 64,
  unit: "percent",
  claim: "Share of players who give something at all",
  source: "Engel 2011",
};

export const TRUST_RETURNED_SHARE: Benchmark = {
  value: 30,
  unit: "percent",
  claim: "Share of the tripled pot the trustee returns",
  source: "Berg, Dickhaut & McCabe 1995, $4.66 returned of 3 × $5.16 received",
  derived: true,
  caveat:
    "Trustees returned on average slightly less than trustors sent. State that pattern, never 'trusting lost you money', which subtracts two averages taken over different roles.",
};
