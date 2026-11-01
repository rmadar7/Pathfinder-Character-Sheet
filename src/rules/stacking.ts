// THE stacking rules. Nothing else in the codebase re-implements these (ARCHITECTURE R4).
//
// Pathfinder: two bonuses of the SAME named type on the SAME stat do not stack — take the
// higher; the loser is reported as suppressed. Dodge, circumstance, untyped and racial
// bonuses DO stack. Penalties always stack.
// Verification status: docs/VERIFY.md → "Bonus-type stacking".

import type { Effect, Mod } from '../model/types';

export const STACKING_TYPES = new Set(['dodge', 'circumstance', 'untyped', 'racial']);

export const BONUS_TYPES = [
  'armor', 'shield', 'natural', 'deflection', 'dodge', 'size', 'enhancement', 'competence',
  'insight', 'luck', 'morale', 'profane', 'sacred', 'resistance', 'circumstance', 'untyped',
];

/** AC bonus types a touch attack ignores. */
export const TOUCH_IGNORES = new Set(['armor', 'shield', 'natural']);

/** Stats an effect can modify, with the label shown in editors. */
export const STATS: [string, string][] = [
  ['ac', 'Armor Class'], ['fort', 'Fortitude'], ['ref', 'Reflex'], ['will', 'Will'],
  ['saves', 'All saves'], ['init', 'Initiative'], ['atk', 'All attacks'], ['melee', 'Melee attack'],
  ['ranged', 'Ranged / ray attack'], ['cmb', 'CMB'], ['cmd', 'CMD'], ['cl', 'Caster level'],
  ['conc', 'Concentration'], ['dc', 'All spell DCs'], ['skills', 'All skills'], ['speed', 'Speed'],
  ['str', 'Strength score'], ['dex', 'Dexterity score'], ['con', 'Constitution score'],
  ['int', 'Intelligence score'], ['wis', 'Wisdom score'], ['cha', 'Charisma score'],
];

export interface Ctx {
  L: number;
  T: number;
}

/** Values that depend on tier or level are NAMED formulas, never eval (ARCHITECTURE R5). */
export const EFFCALC: Record<string, (c: Ctx) => number> = {
  tier: (c) => c.T,
  // Enduring Armor: armor bonus 3 + tier. VERIFY.md → "Enduring Armor value".
  enduringArm: (c) => 3 + c.T,
  halfLevel: (c) => Math.floor(c.L / 2),
  level: (c) => c.L,
};

export function modValue(mo: Mod, ctx: Ctx): number {
  if (mo.calc && EFFCALC[mo.calc]) return EFFCALC[mo.calc](ctx);
  return +(mo.v ?? 0) || 0;
}

export interface Row {
  name: string;
  src?: string;
  kind?: string;
  type: string;
  v: number;
}
export interface SuppressedRow extends Row {
  beatenBy: Row;
}
/** A resolved stat and its receipt (ARCHITECTURE R3). */
export interface Res {
  total: number;
  applied: Row[];
  suppressed: SuppressedRow[];
}

export const EMPTY_RES: Res = { total: 0, applied: [], suppressed: [] };

export interface ResolveOpts {
  skipTypes?: Set<string>;
}

/** Resolve one stat across a list of ACTIVE effects. */
export function resolveFrom(effects: Effect[], stat: string, ctx: Ctx, opts: ResolveOpts = {}): Res {
  const applied: Row[] = [];
  const suppressed: SuppressedRow[] = [];
  const best: Record<string, Row> = {};
  let total = 0;

  for (const e of effects) {
    for (const mo of e.mods || []) {
      if (mo.stat !== stat) continue;
      const type = (mo.type || 'untyped').toLowerCase();
      if (opts.skipTypes && opts.skipTypes.has(type)) continue;
      const v = modValue(mo, ctx);
      if (!v) continue;
      const row: Row = { name: e.name, src: e.src, kind: e.kind, type, v };
      if (v < 0 || STACKING_TYPES.has(type)) {
        // penalties and stacking types always count
        total += v;
        applied.push(row);
        continue;
      }
      const cur = best[type];
      if (!cur) {
        best[type] = row;
        continue;
      }
      if (v > cur.v) {
        suppressed.push({ ...cur, beatenBy: row });
        best[type] = row;
      } else {
        suppressed.push({ ...row, beatenBy: cur });
      }
    }
  }
  for (const r of Object.values(best)) {
    total += r.v;
    applied.push(r);
  }
  applied.sort((a, b) => b.v - a.v);
  return { total, applied, suppressed };
}

/** Two receipts added together — "all saves" plus "Will only", say. */
export function mergeRes(a: Res, b: Res): Res {
  return {
    total: a.total + b.total,
    applied: [...a.applied, ...b.applied],
    suppressed: [...a.suppressed, ...b.suppressed],
  };
}
