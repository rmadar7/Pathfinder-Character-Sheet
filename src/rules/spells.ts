// Spell slots, the specialist slot, save DCs, and the prep/cast/prepMeta helpers that keep
// those three arrays index-aligned (ARCHITECTURE M4).

import type { BookSpell, Character } from '../model/types';
import { bonusSp, spellsPerDay } from './core';
import { mods } from './derive';
import { resolve } from './effects';
import type { Res } from './stacking';

/** A specialist wizard gets an extra slot at every spell level he can cast.
 *  "A specialist wizard receives an additional spell slot of each spell level he can cast,
 *  from 1st on up. Each day, a wizard can prepare a spell from his specialty school in that
 *  slot." VERIFY.md → "Specialist slot". */
export function schoolSlot(ch: Character, L: number): number {
  if (!ch.specialist || L < 1) return 0;
  return spellsPerDay(ch.lvl)[L] > 0 ? 1 : 0;
}

/** Slots at spell level L = class table + Int bonus spells + specialist slot. */
export function slots(ch: Character, L: number, intMod = mods(ch).Int): number {
  const b = spellsPerDay(ch.lvl)[L];
  return b > 0 ? b + bonusSp(intMod, L) + schoolSlot(ch, L) : 0;
}

export const findSpell = (ch: Character, name: string, L?: number): BookSpell | undefined =>
  ch.book.find((x) => x.n === name && (L === undefined || x.lv === L));

export function isSchoolSpell(ch: Character, name: string | undefined, L: number): boolean {
  if (!name) return false;
  const bk = findSpell(ch, name, L);
  return !!(bk && ch.specialist && bk.sc === ch.specialist);
}

/** How many school spells are prepared at level L. */
export const schoolPrepared = (ch: Character, L: number): number =>
  (ch.prep[L] || []).filter((nm) => isSchoolSpell(ch, nm, L)).length;

/** The specialist slot is NOT a fixed position. Nothing in the rule says WHICH slot, so it
 *  follows whichever slot holds a school spell; only when none is prepared does it reserve
 *  the last free slot. Pinning it to the last index (as v36 once did) meant unpreparing any
 *  ordinary spell left the freed slot marked school-only and the spell couldn't go back. */
export function specIndex(ch: Character, L: number): number {
  if (!schoolSlot(ch, L)) return -1;
  const prep = ch.prep[L] || [];
  for (let i = prep.length - 1; i >= 0; i--) if (isSchoolSpell(ch, prep[i], L)) return i;
  return slots(ch, L) - 1;
}

/** Spell Focus is read straight off the feat list, so adding "Spell Focus (Evocation)" raises
 *  every evocation DC with no other edit. Greater Spell Focus counts again.
 *  VERIFY.md → "Spell DC". */
export function spellFocusBonus(ch: Character, school: string | null | undefined): number {
  if (!school) return 0;
  const sc = school.toLowerCase();
  let b = 0;
  for (const f of ch.feats || []) {
    const re = /(?:greater\s+)?spell focus\s*\(\s*([^)]+?)\s*\)/gi;
    let x: RegExpExecArray | null;
    while ((x = re.exec(f)) !== null) if (x[1].trim().toLowerCase() === sc) b++;
  }
  return b;
}

/** Spell save DC = 10 + spell level + Int modifier + Spell Focus. */
/** Bonuses from effects to every spell save DC (an item or a DM gift: "+1 to all spell DCs"). */
export const dcFx = (ch: Character): Res => resolve(ch, 'dc');

export const saveDC = (ch: Character, lv: number, school: string | null | undefined, intMod = mods(ch).Int): number =>
  10 + lv + intMod + spellFocusBonus(ch, school) + dcFx(ch).total;

/** Old saves stored nulls and short arrays; a misaligned pair silently marks the wrong slot
 *  spent, so normalise before anything reads them. Mutates `ch` (call inside update()). */
export function normalizePrep(ch: Character): void {
  ch.prepMeta = ch.prepMeta || {};
  for (let lv = 1; lv <= 9; lv++) {
    const p = (ch.prep[lv] = ch.prep[lv] || []);
    const c = (ch.cast[lv] = ch.cast[lv] || []);
    const mm = (ch.prepMeta[lv] = ch.prepMeta[lv] || []);
    c.length = p.length;
    mm.length = p.length;
    for (let i = 0; i < p.length; i++) {
      c[i] = !!c[i];
      mm[i] = Array.isArray(mm[i]) ? mm[i] : [];
    }
  }
}

/** Prepare a spell into the next slot at level `lv`, with optional metamagic. */
export function prepareSpell(ch: Character, lv: number, name: string, metas: string[] = []): void {
  normalizePrep(ch);
  ch.prep[lv].push(name);
  ch.cast[lv].push(false);
  ch.prepMeta[lv].push(metas.slice());
}

/** Remove the prepared spell at index i, keeping all three arrays aligned. */
export function unprepareAt(ch: Character, lv: number, i: number): void {
  normalizePrep(ch);
  ch.prep[lv].splice(i, 1);
  ch.cast[lv].splice(i, 1);
  ch.prepMeta[lv].splice(i, 1);
}

/** Indices at which `name` is prepared at level lv (a spell can fill several slots). */
export const preparedIdx = (ch: Character, lv: number, name: string): number[] =>
  (ch.prep[lv] || []).reduce<number[]>((a, nm, i) => (nm === name && a.push(i), a), []);

export const castCount = (ch: Character, lv: number): number => (ch.cast[lv] || []).filter(Boolean).length;
export const preparedCount = (ch: Character, lv: number): number => (ch.prep[lv] || []).filter(Boolean).length;
