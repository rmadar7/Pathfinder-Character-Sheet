// Carrying capacity and inventory helpers. VERIFY.md → "Carrying capacity".
import type { Character, GearItem } from '../model/types';
import { CATGUESS, GEARWT } from '../data/gear';

const HEAVY: Record<number, number> = {
  1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
  11: 115, 12: 130, 13: 150, 14: 175, 15: 200, 16: 230, 17: 260, 18: 300, 19: 350, 20: 400,
  21: 460, 22: 520, 23: 600, 24: 700, 25: 800, 26: 920, 27: 1040, 28: 1200, 29: 1400,
};

/** Light/medium/heavy thresholds for a Medium creature. Above 29, take the score in 20–29 with
 *  the same ones digit and multiply by 4 per 10 points above. */
export function carryCap(str: number): { light: number; medium: number; heavy: number } {
  const heavy = str <= 29 ? HEAVY[Math.max(1, str)] || 10 : HEAVY[20 + ((str - 20) % 10)] * Math.pow(4, Math.floor((str - 20) / 10));
  return { light: Math.floor(heavy / 3), medium: Math.floor((heavy * 2) / 3), heavy };
}

export const itemWeight = (g: GearItem): number => (+(g.wt ?? 0) || 0) * Math.max(0, +(g.qty ?? 0) || 0);
/** Weight on you: worn and carried count; stowed (mount/camp) doesn't. */
export const gearWeight = (ch: Character): number =>
  (ch.gear || []).filter((g) => g.slot !== 'stowed').reduce((s, g) => s + itemWeight(g), 0);
export const stowedWeight = (ch: Character): number =>
  (ch.gear || []).filter((g) => g.slot === 'stowed').reduce((s, g) => s + itemWeight(g), 0);

export function loadBand(total: number, cap: ReturnType<typeof carryCap>): string {
  return total <= cap.light ? 'light' : total <= cap.medium ? 'medium' : total <= cap.heavy ? 'heavy' : 'OVER YOUR LIMIT';
}

export const guessWeight = (n: string): number => {
  for (const [re, w] of GEARWT) if (re.test(n)) return w;
  return 0;
};
export const guessCat = (n: string): string => {
  for (const [re, c] of CATGUESS) if (re.test(n)) return c;
  return 'gear';
};
export const catOf = (g: GearItem): string => g.cat || guessCat(g.n || '');

/** "Sophisticante", "sophisticant" and "Sophisticated" are the same ring: compare letters only
 *  and allow a short tail to differ. Used by the schema-8 migration. */
export function sameItem(a: string, b: string): boolean {
  const norm = (s: string) => ('' + s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const short = x.length < y.length ? x : y, long = x.length < y.length ? y : x;
  return short.length >= 8 && long.startsWith(short.slice(0, Math.max(8, short.length - 3)));
}

/** Count of a survival stock by name pattern. */
export const stockOf = (ch: Character, re: RegExp): number =>
  (ch.gear || []).filter((g) => catOf(g) === 'survival' && re.test(g.n || '')).reduce((a, g) => a + Math.max(0, +(g.qty ?? 0) || 0), 0);
