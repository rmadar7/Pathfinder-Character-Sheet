// THE SCRIPTORIUM — Scribe Scroll. VERIFY.md → "Scribe Scroll".
//
// PRICE  "The price of a scroll is equal to the level of the spell x the creator's caster
//        level x 25 gp." A cantrip counts as level 1/2.
// COST   The raw materials are "half of this base price".
// TIME   "2 hours if its base price is 250 gp or less", otherwise "1 day for each 1,000 gp in
//        its base price"; a crafting day is up to 8 hours and cannot be lengthened.
// CHECK  "The DC to create a magic item is 5 + the caster level for the item." Fail and "the
//        item does not function and the materials and time are wasted". "Failing this check
//        by 5 or more results in a cursed item."
// SLOT   "that spell slot is expended from the caster's currently prepared spells, just as if
//        it had been cast."
// CL     "A creator can create an item at a lower caster level than her own, but never lower
//        than the minimum level needed to cast the needed spell" — 2n − 1 for a wizard spell.

import type { Character } from '../model/types';

export const scrollBase = (lv: number, cl: number): number => (lv === 0 ? 0.5 : lv) * cl * 25;
export const scrollCost = (lv: number, cl: number): number => scrollBase(lv, cl) / 2;
export const scrollHours = (lv: number, cl: number): number => {
  const b = scrollBase(lv, cl);
  return b <= 250 ? 2 : Math.ceil(b / 1000) * 8;
};
export const scrollDC = (cl: number): number => 5 + cl;
export const minScrollCL = (lv: number): number => (lv === 0 ? 1 : 2 * lv - 1);
export const CRAFT_DAY = 8;

export interface Scribable {
  n: string;
  lv: number;
  sc: string;
  /** Index of the unspent prepared slot that would be burned; −1 for a cantrip. */
  slot: number;
}

/** What can be scribed right now: a prepared, unspent spell (scribing burns the slot).
 *  Cantrips are always available at this table (house ruling 2: cantrips unlimited). */
export function scribable(ch: Character): Scribable[] {
  const out: Scribable[] = [];
  for (const b of ch.book || []) {
    if (b.lv === 0) { out.push({ n: b.n, lv: 0, sc: b.sc, slot: -1 }); continue; }
    const prep = ch.prep[b.lv] || [];
    for (let i = 0; i < prep.length; i++) {
      if (prep[i] === b.n && !(ch.cast[b.lv] || [])[i]) { out.push({ n: b.n, lv: b.lv, sc: b.sc, slot: i }); break; }
    }
  }
  return out.sort((a, b) => a.lv - b.lv || a.n.localeCompare(b.n));
}

/** Plain-language failure chance for the Spellcraft check, worded as v36 words it.
 *  VERIFY.md → "Natural 1 on skill checks": RAW a natural 1 is not an automatic failure on a
 *  skill check, so "fail only on a natural 1" may really mean "cannot fail". */
export function failsOn(dc: number, bonus: number): string {
  return dc - bonus <= 1 ? 'natural 1' : `roll of ${dc - bonus - 1} or less`;
}
