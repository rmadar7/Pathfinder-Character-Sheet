// METAMAGIC. Two rules people get backwards, both encoded and self-tested:
//
// 1. Metamagic does NOT raise the save DC. "Spells modified by a metamagic feat use a spell
//    slot higher than normal. This does not change the level of the spell, so the DC for
//    saving throws against it does not go up."
//    HEIGHTEN is the sole exception: "Unlike other metamagic feats, Heighten Spell actually
//    increases the effective level of the spell that it modifies. All effects dependent on
//    spell level (such as saving throw DCs...) are calculated according to the heightened level."
//
// 2. Magical Lineage: "When you apply metamagic feats to this spell that add at least 1 level
//    to the spell, treat its actual level as 1 lower for determining the spell's final
//    adjusted level." It never takes a spell below its own unmodified level.
//
// VERIFY.md → "Metamagic", "Magical Lineage".

import type { Character } from '../model/types';
import { METAMAGIC } from '../data/metamagic';

/** Metamagic feats the character has, read off the feat list like Spell Focus. */
export function metaFeats(ch: Character): string[] {
  const txt = (ch.feats || []).join(' | ').toLowerCase();
  return Object.keys(METAMAGIC).filter((n) => txt.includes(n.toLowerCase()));
}

/** The spell named by a Magical Lineage trait, lower-cased, or null if there is none. */
export function magicalLineageSpell(ch: Character): string | null {
  for (const t of ch.traits || []) {
    const m = t.match(/magical lineage\s*\(([^)]+)\)/i);
    if (m) return m[1].trim().toLowerCase();
  }
  return null;
}

export interface Adjusted {
  level: number;
  add: number;
  lineage: boolean;
}

/** The slot level a prepared spell actually consumes. */
export function adjustedLevel(lineageSpell: string | null, spellName: string, baseLv: number, metas: string[] = []): Adjusted {
  let add = metas.reduce((a, n) => a + (METAMAGIC[n]?.adj || 0), 0);
  let lineage = false;
  if (add >= 1 && lineageSpell && spellName.toLowerCase() === lineageSpell) {
    add -= 1; // never below the base level
    lineage = true;
  }
  return { level: baseLv + Math.max(0, add), add, lineage };
}

/** Level used for the save DC: metamagic leaves it alone; Heighten raises it. */
export function dcLevel(baseLv: number, metas: string[] = []): number {
  const h = metas.filter((n) => METAMAGIC[n]?.heighten).reduce((a, n) => a + (METAMAGIC[n].adj || 0), 0);
  return baseLv + h;
}

export const metaLabel = (metas: string[] | undefined): string => (!metas || !metas.length ? '' : metas.join(' + '));

export interface Preparable {
  n: string;
  base: number;
  metas: string[];
  sc: string;
}

/** Everything that can legally go in a slot of level lv: spells of that level as they are,
 *  plus lower-level spells a known metamagic feat lifts to exactly this level. There is no
 *  "must come from a lower level" test: Magical Lineage pays the +1 back, so an extended
 *  Animate Dead sits in an ordinary 3rd-level slot — the whole point of the trait. */
export function preparableIn(ch: Character, lv: number, schoolOnly: boolean): Preparable[] {
  const out: Preparable[] = [];
  const feats = metaFeats(ch);
  const ml = magicalLineageSpell(ch);
  for (const b of ch.book || []) {
    if (b.lv < 1 || b.lv > lv) continue;
    if (schoolOnly && b.sc !== ch.specialist) continue;
    if (b.lv === lv) out.push({ n: b.n, base: b.lv, metas: [], sc: b.sc });
    for (const f of feats) {
      const a = adjustedLevel(ml, b.n, b.lv, [f]);
      if (a.level === lv) out.push({ n: b.n, base: b.lv, metas: [f], sc: b.sc });
    }
  }
  const spec = ch.specialist;
  return out.sort(
    (x, y) => Number(y.sc === spec) - Number(x.sc === spec) || x.n.localeCompare(y.n) || x.metas.length - y.metas.length,
  );
}
