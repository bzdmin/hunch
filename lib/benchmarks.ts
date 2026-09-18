/**
 * Published findings, checked against source on 2 Sep 2026.
 *
 * These exist because comparing a player to other Hunch players fails on day one:
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
  /** a second line under source, e.g. what the citation actually covers */
  sourceDetail?: string;
  /** true when we computed it from published figures rather than quoting one */
  derived?: boolean;
  /** shown wherever the figure is, so the comparison stays honest */
  caveat?: string;
};

// Checked directly against Engel's 2011 paper, not just the commonly quoted
// headline figure: it's a meta-analysis of 129 contributions and 616
// treatments, not "~600 studies", a judge who knows the paper would notice
// that specific inaccuracy.
export const SPLIT_MEAN_GIVEN: Benchmark = {
  value: 28.3,
  unit: "percent",
  claim: "Mean share of the endowment given away",
  source: "Engel (2011)",
  sourceDetail: "Meta-analysis of 616 treatments",
  caveat:
    "One important difference: those studies usually gave participants the money to divide. Hunch asks you to decide what to do with your own NIM. Giving can be lower when the money feels earned or owned, so this isn't a perfect apples-to-apples comparison.",
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
