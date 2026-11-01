// Turning a compendium entry into something on the character: a spellbook entry, a feat line,
// an inventory item with its bonuses. Only bonuses this sheet can actually apply are carried
// over; anything else stays in the description and is counted, so it is never silently lost.

import type { BookSpell, GearItem, Mod } from '../model/types';
import { SK } from '../rules/skills';
import { typeFits } from '../rules/targets';
import type { Entry, RawChange } from './types';

/** Foundry change target → this sheet's stat key. */
const TARGET: Record<string, string> = {
  ac: 'ac', aac: 'ac', sac: 'ac', nac: 'ac', cmd: 'cmd', cmb: 'cmb', init: 'init', cl: 'cl',
  allSavingThrows: 'saves', fort: 'fort', ref: 'ref', will: 'will',
  attack: 'atk', mattack: 'melee', rattack: 'ranged', skills: 'skills',
  str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', cha: 'cha',
};
/** The AC sub-targets imply the bonus type. */
const IMPLIED_TYPE: Record<string, string> = { aac: 'armor', sac: 'shield', nac: 'natural' };

/** "skill.senseMotive" → "Sense Motive"; "skill.knowledge.arcana" → "Know. Arcana". Skills with
 *  a chosen specialty ("Craft (Jewelry)") are left out: a bonus to "craft" isn't to jewelry. */
const SKILL: Record<string, string> = Object.fromEntries(
  SK.filter(([n]) => !n.includes('(')).map(([n]) => {
    const know = n.match(/^Know\. (.+)$/);
    const key = know
      ? 'knowledge.' + know[1].toLowerCase()
      : n.replace(/\(.*\)/, '').trim().split(/\s+/).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
    return ['skill.' + key, 'skill:' + n];
  }),
);

export function toMods(fx: RawChange[] | undefined): { mods: Mod[]; skipped: number } {
  const mods: Mod[] = [];
  let skipped = 0;
  for (const c of fx || []) {
    const stat = TARGET[c.t] || SKILL[c.t];
    const v = Number(c.f);
    const type = IMPLIED_TYPE[c.t] || (c.y === 'untypedPerm' ? 'untyped' : c.y || 'untyped');
    // Only fixed numbers: a formula ("@cl", "floor(@attributes.hd.total / 4)") needs Phase 2.
    if (!stat || !Number.isFinite(v) || !v || !typeFits(type, stat)) { skipped++; continue; }
    mods.push({ stat, type, v });
  }
  return { mods, skipped };
}

/** A spell as this sheet's spellbook stores it, at its level for `classKey`. */
export function toBookSpell(e: Entry, classKey: string): BookSpell | null {
  const lv = e.cls?.[classKey];
  if (lv === undefined || e.k !== 'spell') return null;
  return { n: e.n, lv, sc: e.sc || '', d: e.d || e.sum || '', ct: e.ct || '', cp: e.cp || '', rg: e.rg || '', tg: e.ar || '', du: e.du || '', sv: e.sv || '', sr: e.sr || '' };
}

/** An inventory item; worn when it has bonuses to apply, otherwise in the pack. */
export function toGear(e: Entry): { item: GearItem; skipped: number } {
  const { mods, skipped } = toMods(e.fx);
  return {
    item: {
      id: 'g' + Date.now(), n: e.n, desc: e.sum || (e.d ? e.d.split('\n\n')[0] : ''), got: '',
      wt: typeof e.lb === 'number' ? e.lb : 0, qty: 1, slot: mods.length ? 'worn' : 'carried', cls: 'r', uses: null, fx: mods,
    },
    skipped,
  };
}
