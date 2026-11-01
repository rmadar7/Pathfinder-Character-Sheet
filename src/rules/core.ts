// Small formulas every other rules module builds on. Ported verbatim from v36.
// Verification status: see docs/VERIFY.md → "Formulas and tables".

/** Ability modifier: (score − 10) ÷ 2, rounded down. */
export const mod = (score: number): number => Math.floor((score - 10) / 2);

/** Bonus spells per day from a high casting stat (Core Rulebook Table 1-3).
 *  A modifier below the spell level grants nothing; otherwise one, plus one
 *  more for every 4 points above the spell level. */
export const bonusSp = (m: number, L: number): number => (m >= L ? 1 + Math.floor((m - L) / 4) : 0);

/** Wizard is a poor-BAB class: half level, rounded down. */
export const babOf = (L: number): number => Math.floor(L / 2);
/** Poor save progression (wizard Fort and Ref): level ÷ 3. */
export const poor = (L: number): number => Math.floor(L / 3);
/** Good save progression (wizard Will): 2 + level ÷ 2. */
export const good = (L: number): number => 2 + Math.floor(L / 2);

/** Signed number for display: +2, −1, +0. */
export const sgn = (n: number): string => (n >= 0 ? '+' : '') + n;

/** Wizard spells per day by class level, index = spell level 0..9 (Core Rulebook). */
export const WSPD: Record<number, number[]> = {
  1: [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 2, 0, 0, 0, 0, 0, 0],
  7: [4, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  8: [4, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 4, 4, 3, 2, 1, 0, 0, 0, 0],
  10: [4, 4, 4, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 4, 4, 4, 3, 2, 1, 0, 0, 0],
  12: [4, 4, 4, 4, 3, 3, 2, 0, 0, 0],
  13: [4, 4, 4, 4, 4, 3, 2, 1, 0, 0],
  14: [4, 4, 4, 4, 4, 3, 3, 2, 0, 0],
  15: [4, 4, 4, 4, 4, 4, 3, 2, 1, 0],
  16: [4, 4, 4, 4, 4, 4, 3, 3, 2, 0],
  17: [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  18: [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  19: [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
  20: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
};
export const spellsPerDay = (lvl: number): number[] => WSPD[lvl] || WSPD[20];

/** Escape text going into a tip body (the one place raw HTML is used — ARCHITECTURE U8). */
export const esc = (s: unknown): string =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
