// Defaults fill gaps; they never overwrite (ARCHITECTURE M3). These are generic empties, not
// Kaldaran — his data comes from data/characters/kaldaran.json.

import type { Character, Used } from './types';

export const SCHEMA = 10;

export const blankUsed = (): Used => ({ mythic: 0, grave: 0, cmd: 0, cl: 0, dw: 0, st: 0, bond: 0 });

const byLevel = <T>(): Record<string, T[]> => ({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] });

export function defaults(): Character {
  return {
    schema: SCHEMA,
    id: 'character',
    lvl: 1,
    tier: 0,
    ab: { Str: 10, Dex: 10, Con: 10, Int: 10, Wis: 10, Cha: 10 },
    hp: 1,
    hpmax: 1,
    sv: { fort: 0, ref: 0, will: 0 },
    initMisc: 0,
    effects: [],
    conditions: [],
    mythic: { path: 'Arch-Mage', arcana: '', trials: [], abilities: [], feats: [], abilityScores: [], bonusHpPerTier: 3 },
    book: [],
    prep: byLevel<string>(),
    cast: byLevel<boolean>(),
    prepMeta: byLevel<string[]>(),
    lastPrep: null,
    used: blankUsed(),
    gear: [],
    gp: 0,
    sp: 0,
    cp: 0,
    undead: [],
    round: 0,
    strictUndead: false,
    hplog: [],
    theme: 'parchment',
    rulings: {},
    subschool: '',
    specialist: '',
    feats: [],
    traits: [],
    house: [],
    open: [],
    notes: '',
    identity: {},
    bio: '',
    langs: [],
    skills: {},
    craft: { mats: 0, hours: 0, pick: '', cl: null, log: [] },
    changelog: [],
  };
}

/** Merge saved data over the defaults WITHOUT clobbering nested objects. Arrays from the
 *  saved doc win outright. (v36: a shallow merge once dropped every field added later.) */
export function deepMerge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === 'object' && over && typeof over === 'object' && !Array.isArray(over)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>))
      out[k] = k in (base as object) ? deepMerge((base as Record<string, unknown>)[k], v) : v;
    return out as T;
  }
  return over as T;
}

export const withDefaults = (doc: unknown): Character => deepMerge(defaults(), doc);
