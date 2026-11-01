// DIAGNOSTICS. One function feeds both the Notes-tab panel and test/selftest.test.ts
// (ARCHITECTURE T1), so the two can't diverge.
//
// RULES checks assert the maths with FORMULAS, never Kaldaran's current numbers. v36 learned
// this the hard way: a check asserting "mythic power is 5" went red the day he hit tier 2.
//
// Ported from v36's runSelfTests(). Changes from v36, deliberately:
//  - The two DOM-structure checks ("every tab inside the saved container", "every panel
//    container present") guarded v36's whole-document autosave. That hazard no longer
//    exists, so they're replaced by checks on what replaced it.
//  - v36's CMD check used the AC size modifier; it now uses the special size modifier, and a
//    Reduce Person scenario pins the direction.
//  - Checks that compared an expression with itself now call the real function.

import type { Character } from '../model/types';
import { babOf, bonusSp, good, poor } from './core';
import { derive } from './derive';
import { resolve } from './effects';
import { characterIssues, type Issue } from './issues';
import { adjustedLevel, dcLevel, magicalLineageSpell } from './metamagic';
import { mythicPower, surgeDie } from './mythic-math';
import { schoolPowerUses } from './powers';
import { ranksPerLevel } from './skills';
import { normalizePrep, prepareSpell, saveDC, slots, specIndex, spellFocusBonus, unprepareAt } from './spells';
import { STACKING_TYPES, TOUCH_IGNORES } from './stacking';

export interface Check {
  name: string;
  got: unknown;
  want: unknown;
  ok: boolean;
  why: string;
}

const scratch = (ch: Character): Character => structuredClone(ch);

export function rulesChecks(ch0: Character): Check[] {
  const T: Check[] = [];
  const eq = (name: string, got: unknown, want: unknown, why: string) => T.push({ name, got, want, ok: got === want, why });
  const ch = scratch(ch0);
  const L = ch.lvl, tier = ch.tier | 0;
  const C = derive(ch), m = C.m, R = C.R;

  /* ---- formulas, checked against the book ---- */
  eq('Bonus spells: Int mod 5 grants two 1st-level', bonusSp(5, 1), 2, 'Core Table 1-3');
  eq('Bonus spells: Int mod 5 grants one 2nd-level', bonusSp(5, 2), 1, 'Core Table 1-3');
  eq('Bonus spells stop when mod < spell level', bonusSp(5, 6), 0, 'mod must be >= spell level');
  eq('Poor BAB = half level, rounded down', babOf(L), Math.floor(L / 2), 'wizard is poor BAB');
  eq('Poor save base = level / 3', poor(L), Math.floor(L / 3), 'Fort and Ref');
  eq('Good save base = 2 + level / 2', good(L), 2 + Math.floor(L / 2), 'Will');
  eq('Mythic power = 3 + 2 x tier', mythicPower(tier), tier > 0 ? 3 + 2 * tier : 0, `tier ${tier} = ${mythicPower(tier)}/day`);
  eq('Surge die follows the tier bands', surgeDie(tier),
    tier >= 10 ? '+1d12' : tier >= 7 ? '+1d10' : tier >= 4 ? '+1d8' : '+1d6', 'Mythic Adventures');
  eq('Spell DC = 10 + level + Int + focus', saveDC(ch, 1, 'Necromancy'),
    10 + 1 + m.Int + spellFocusBonus(ch, 'Necromancy'), 'one formula, used everywhere');
  eq('A school with no Spell Focus gets no bonus', saveDC(ch, 1, 'Evocation'), 10 + 1 + m.Int, 'no feat for that school');
  eq('Skill ranks per level = 2 + Int mod', ranksPerLevel(m.Int), 2 + m.Int, `= ${2 + m.Int} per level`);
  eq('Concentration = caster level + Int', C.conc - R.clR.total - R.concR.total, L + m.Int, 'before any effects');
  eq('Grave Touch uses = 3 + Int mod', schoolPowerUses(m.Int), 3 + m.Int, `= ${3 + m.Int}/day`);

  /* ---- the effects engine ---- */
  eq('Touch AC ignores armor, shield and natural armor',
    C.touch, 10 + m.Dex + resolve(ch, 'ac', { skipTypes: TOUCH_IGNORES }).total, 'touch never counts those');
  eq('Flat-footed AC drops your Dex bonus and dodge',
    C.ff, 10 + (m.Dex - Math.max(0, m.Dex)) + resolve(ch, 'ac', { skipTypes: new Set(['dodge']) }).total, 'no Dex, no dodge');
  eq('CMD includes deflection and dodge, excludes armor',
    C.cmd, 10 + C.bab + m.Str + m.Dex + C.sizeCM + R.acToCMD.total + R.cmdR.total, 'RAW CMD');

  {
    // Same-type bonuses don't stack: put Mage Armor (+4 armor) on top of whatever is there.
    const s = scratch(ch);
    s.effects.push({ id: 't-ma', name: 'Test armor +4', on: true, mods: [{ stat: 'ac', type: 'armor', v: 4 }] });
    s.effects.push({ id: 't-ma2', name: 'Test armor +1', on: true, mods: [{ stat: 'ac', type: 'armor', v: 1 }] });
    const ac = resolve(s, 'ac');
    const armor = ac.applied.filter((r) => r.type === 'armor');
    eq('Two armor bonuses do not stack — highest wins', armor.length, 1,
      `${armor.length} applied, ${ac.suppressed.filter((r) => r.type === 'armor').length} suppressed`);
    eq('The losing armor bonus is kept as suppressed, not dropped',
      ac.suppressed.some((r) => r.name === 'Test armor +1'), true, 'so the sheet can show it struck through');
  }
  eq('Dodge bonuses DO stack', STACKING_TYPES.has('dodge'), true, 'dodge, circumstance and untyped all stack');
  {
    const s = scratch(ch);
    s.effects.push({ id: 't-p1', name: 'Pen A', on: true, mods: [{ stat: 'fort', type: 'morale', v: -2 }] });
    s.effects.push({ id: 't-p2', name: 'Pen B', on: true, mods: [{ stat: 'fort', type: 'morale', v: -1 }] });
    eq('Penalties always stack, even of the same type', resolve(s, 'fort').total - resolve(ch, 'fort').total, -3, '−2 and −1 = −3');
  }
  {
    // Reduce Person: +1 size to AC, so the special size modifier is −1 to CMB and CMD.
    const s = scratch(ch);
    s.effects.push({ id: 't-rp', name: 'Small', on: true, mods: [{ stat: 'ac', type: 'size', v: 1 }] });
    const d = derive(s);
    eq('Getting smaller raises AC but lowers CMD', `${d.AC - C.AC},${d.cmd - C.cmd}`, '1,-1',
      'special size modifier mirrors the AC one');
  }

  /* ---- the specialist slot follows the school spell ---- */
  if (ch.specialist) {
    const s = scratch(ch);
    const Lv = 2;
    const n = slots(s, Lv);
    const school = s.book.find((x) => x.lv === Lv && x.sc === s.specialist)?.n;
    const other = s.book.find((x) => x.lv === Lv && x.sc !== s.specialist)?.n;
    if (n >= 2 && school && other) {
      s.prep[Lv] = [school, other];
      eq('Specialist slot follows the school spell', specIndex(s, Lv), 0, `it is wherever the ${s.specialist} spell sits`);
      s.prep[Lv] = [other];
      eq('With no school spell, the last slot is reserved', specIndex(s, Lv), n - 1, 'so there is somewhere to put one');
    }
  }

  /* ---- metamagic ---- */
  const ml = magicalLineageSpell(ch) ?? 'animate dead';
  eq('Metamagic does not raise the save DC', dcLevel(1, ['Extend Spell']), 1, 'a bigger slot, the same DC');
  eq('Heighten Spell is the exception and does raise it', dcLevel(1, ['Heighten Spell']), 2, 'it really is a higher-level spell');
  eq('Extend Spell costs one slot level', adjustedLevel(ml, 'Some Other Spell', 1, ['Extend Spell']).level, 2, '1st-level spell, 2nd-level slot');
  eq('Magical Lineage pays back one level', adjustedLevel(ml, ml, 3, ['Extend Spell']).level, 3, `extended ${ml} still fits its own slot`);
  eq('Magical Lineage never goes below the spell’s own level', adjustedLevel(ml, ml, 3, []).level, 3, 'no metamagic, no discount');

  /* ---- what replaced v36's container checks: slot bookkeeping ---- */
  {
    const s = scratch(ch);
    normalizePrep(s);
    prepareSpell(s, 1, 'A', ['Extend Spell']);
    prepareSpell(s, 1, 'B');
    s.cast[1][s.prep[1].length - 1] = true;
    unprepareAt(s, 1, s.prep[1].indexOf('A'));
    const i = s.prep[1].indexOf('B');
    eq('Prepared, cast and metamagic stay aligned after unpreparing', s.cast[1][i] === true && s.prepMeta[1][i].length === 0, true,
      'a misalignment marks the wrong slot spent');
    eq('Every level keeps the three slot lists the same length',
      [1, 2, 3, 4, 5, 6, 7, 8, 9].every((lv) => s.prep[lv].length === s.cast[lv].length && s.cast[lv].length === s.prepMeta[lv].length),
      true, 'prep, cast, prepMeta');
  }
  return T;
}

export interface SelfTestResult {
  checks: Check[];
  issues: Issue[];
}

export function runSelfTests(ch: Character): SelfTestResult {
  return { checks: rulesChecks(ch), issues: characterIssues(ch) };
}
