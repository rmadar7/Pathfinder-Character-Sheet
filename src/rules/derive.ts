// ONE source for every derived combat number (ARCHITECTURE R2). The Today strip and the
// Combat tab both read this, so they can never disagree.

import type { Ability, Character } from '../model/types';
import { babOf, good, mod, poor } from './core';
import { abilityScores, resolve } from './effects';
import { CONDITIONS } from '../data/effects';
import { TOUCH_IGNORES, type Res } from './stacking';

export type Mods = Record<Ability, number>;

/** Ability modifiers from the ADJUSTED scores. */
export function mods(ch: Character): Mods {
  const a = abilityScores(ch);
  const m = {} as Mods;
  for (const k of Object.keys(a) as Ability[]) m[k] = mod(a[k]);
  return m;
}

/** CMD adds ONLY these bonus types to AC: circumstance, deflection, dodge, insight, luck,
 *  morale, profane, sacred. Not armor, shield, natural armor or enhancement.
 *  VERIFY.md → "CMD". */
export const CMD_TYPES = new Set(['circumstance', 'deflection', 'dodge', 'insight', 'luck', 'morale', 'profane', 'sacred']);

export interface Derived {
  m: Mods;
  AC: number;
  touch: number;
  ff: number;
  bab: number;
  /** Size modifier to AC (from effects). */
  size: number;
  /** Special size modifier for CMB/CMD — the mirror of the AC one. */
  sizeCM: number;
  cmb: number;
  cmd: number;
  fort: number;
  ref: number;
  will: number;
  init: number;
  melee: number;
  ranged: number;
  conc: number;
  cl: number;
  /** Dex bonus actually lost when flat-footed (never a penalty). */
  dexAC: number;
  /** Name of the condition denying the Dex bonus to AC right now (Blinded), or null. */
  dexDenied: string | null;
  R: {
    ac: Res; acT: Res; acFF: Res; svAll: Res; fortR: Res; refR: Res; willR: Res;
    atkR: Res; melR: Res; rngR: Res; initR: Res; cmbR: Res; cmdR: Res; clR: Res; concR: Res;
    acToCMD: Res;
  };
}

/** A condition such as Blinded "loses its Dexterity bonus to AC (if any)", and d20pfsrd,
 *  Combat → Armor Class → Dodge Bonuses: "Any situation that denies you your Dexterity bonus
 *  also denies you dodge bonuses." The dodge rows stay on the receipt, struck through. */
function denyDodge(r: Res, by: string): Res {
  const lost = r.applied.filter((x) => x.type === 'dodge' && x.v > 0);
  if (!lost.length) return r;
  return {
    total: r.total - lost.reduce((a, x) => a + x.v, 0),
    applied: r.applied.filter((x) => !lost.includes(x)),
    suppressed: [
      ...r.suppressed,
      ...lost.map((x) => ({ ...x, beatenBy: { name: by, type: 'condition', v: 0 }, why: `${by}: no Dex bonus to AC means no dodge bonuses either` })),
    ],
  };
}

export function derive(ch: Character): Derived {
  const m = mods(ch);
  const L = ch.lvl;
  const denier = (ch.conditions || []).map((c) => CONDITIONS[c]).find((d) => d && d.noDex);
  const dexDenied = denier ? denier.t : null;
  let ac = resolve(ch, 'ac');
  let acT = resolve(ch, 'ac', { skipTypes: TOUCH_IGNORES });
  if (dexDenied) { ac = denyDodge(ac, dexDenied); acT = denyDodge(acT, dexDenied); }
  const acFF = resolve(ch, 'ac', { skipTypes: new Set(['dodge']) });
  // You lose your Dex BONUS when flat-footed, never a Dex penalty.
  const dexAC = Math.max(0, m.Dex);
  const bab = babOf(L);

  // Denied Dex works like flat-footed: the bonus goes, a Dex penalty stays.
  const dexToAC = dexDenied ? m.Dex - dexAC : m.Dex;
  const AC = 10 + dexToAC + ac.total;
  const touch = 10 + dexToAC + acT.total;
  const ff = 10 + (m.Dex - dexAC) + acFF.total;

  const svAll = resolve(ch, 'saves');
  const fortR = resolve(ch, 'fort'), refR = resolve(ch, 'ref'), willR = resolve(ch, 'will');
  const atkR = resolve(ch, 'atk'), melR = resolve(ch, 'melee'), rngR = resolve(ch, 'ranged');
  const initR = resolve(ch, 'init'), cmbR = resolve(ch, 'cmb'), cmdR = resolve(ch, 'cmd');
  const clR = resolve(ch, 'cl'), concR = resolve(ch, 'conc');

  const acToCMD: Res = { total: 0, applied: [], suppressed: [] };
  for (const r of ac.applied) {
    if (CMD_TYPES.has(r.type)) { acToCMD.total += r.v; acToCMD.applied.push(r); }
  }
  // Penalties to AC also apply to CMD, whatever their type.
  for (const r of ac.applied) {
    if (r.v < 0 && !CMD_TYPES.has(r.type)) { acToCMD.total += r.v; acToCMD.applied.push(r); }
  }

  const size = ac.applied.filter((r) => r.type === 'size').reduce((a, r) => a + r.v, 0);
  // THE SPECIAL SIZE MODIFIER is the mirror of the AC one: Small is +1 AC but −1 CMB/CMD;
  // Large is −1 AC but +1 CMB/CMD. Using the AC figure for both gets Reduce/Enlarge Person
  // backwards by 2. VERIFY.md → "Special size modifier".
  const sizeCM = -size;

  return {
    m, AC, touch, ff, bab, size, sizeCM, dexAC, dexDenied,
    cmb: bab + m.Str + sizeCM + cmbR.total,
    cmd: 10 + bab + m.Str + m.Dex + sizeCM + acToCMD.total + cmdR.total,
    fort: poor(L) + m.Con + ch.sv.fort + svAll.total + fortR.total,
    ref: poor(L) + m.Dex + ch.sv.ref + svAll.total + refR.total,
    will: good(L) + m.Wis + ch.sv.will + svAll.total + willR.total,
    init: m.Dex + ch.initMisc + initR.total,
    melee: bab + m.Str + atkR.total + melR.total,
    ranged: bab + m.Dex + atkR.total + rngR.total,
    conc: L + m.Int + clR.total + concR.total,
    cl: L + clR.total,
    R: { ac, acT, acFF, svAll, fortR, refR, willR, atkR, melR, rngR, initR, cmbR, cmdR, clR, concR, acToCMD },
  };
}
