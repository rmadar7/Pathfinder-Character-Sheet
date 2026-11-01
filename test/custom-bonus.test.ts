// Custom bonuses (DM gifts, homebrew items): every target the editor offers must move a
// number, stacking must treat "all X" and "one X" as one pool, and situational bonuses must be
// listed, never added.
import { describe, expect, it } from 'vitest';
import type { Character, Mod } from '../src/model/types';
import { derive } from '../src/rules/derive';
import { abilityScores, resolve } from '../src/rules/effects';
import { skillTotal, SK } from '../src/rules/skills';
import { saveDC } from '../src/rules/spells';
import { TARGET_GROUPS } from '../src/rules/targets';
import { kaldaran } from './helpers';

const snapshot = (ch: Character) => {
  const d = derive(ch);
  return JSON.stringify({
    d: [d.AC, d.touch, d.ff, d.cmb, d.cmd, d.fort, d.ref, d.will, d.init, d.melee, d.ranged, d.conc, d.cl],
    dc: saveDC(ch, 1, 'Evocation'),
    sk: SK.map(([n]) => skillTotal(ch, n)),
    ab: abilityScores(ch),
  });
};
const withMods = (mods: Mod[]) => {
  const ch = kaldaran();
  ch.effects.push({ id: 't', name: 'DM gift', kind: 'manual', on: true, mods });
  return ch;
};

describe('every target in the bonus editor moves a number', () => {
  const base = snapshot(kaldaran());
  for (const g of TARGET_GROUPS)
    for (const [k, label] of g.items)
      it(`${g.g} → ${label}`, () => expect(snapshot(withMods([{ stat: k, type: 'untyped', v: 2 }]))).not.toBe(base));
});

describe('one stacking pool across "all" and "one"', () => {
  it('+2 luck to all saves and +1 luck to Will give +2, not +3', () => {
    const w0 = derive(kaldaran()).will;
    const ch = withMods([{ stat: 'saves', type: 'luck', v: 2 }, { stat: 'will', type: 'luck', v: 1 }]);
    expect(derive(ch).will - w0).toBe(2);
    expect(derive(ch).R.willR.suppressed.map((r) => r.v)).toEqual([1]);
  });
  it('different types still add: +2 luck all saves, +1 morale Will = +3', () => {
    const w0 = derive(kaldaran()).will;
    expect(derive(withMods([{ stat: 'saves', type: 'luck', v: 2 }, { stat: 'will', type: 'morale', v: 1 }])).will - w0).toBe(3);
  });
  it('skills: +2 competence all skills and +3 competence Stealth give +3', () => {
    const s0 = skillTotal(kaldaran(), 'Stealth');
    expect(skillTotal(withMods([{ stat: 'skills', type: 'competence', v: 2 }, { stat: 'skill:Stealth', type: 'competence', v: 3 }]), 'Stealth') - s0).toBe(3);
  });
  it('attacks: +1 luck all attacks and +1 luck melee give +1', () => {
    const m0 = derive(kaldaran()).melee;
    expect(derive(withMods([{ stat: 'atk', type: 'luck', v: 1 }, { stat: 'melee', type: 'luck', v: 1 }])).melee - m0).toBe(1);
  });
});

describe('situational bonuses', () => {
  const ch = withMods([{ stat: 'will', type: 'morale', v: 2, when: 'vs fear' }]);
  it('are not added to the total', () => expect(derive(ch).will).toBe(derive(kaldaran()).will));
  it('are listed on the receipt with their condition', () =>
    expect(resolve(ch, ['saves', 'will']).situational).toEqual([expect.objectContaining({ v: 2, when: 'vs fear', name: 'DM gift' })]));
});

describe('items carry several bonuses', () => {
  it('a worn item with two bonuses applies both', () => {
    const ch = kaldaran();
    const ac0 = derive(ch).AC, st0 = skillTotal(ch, 'Stealth');
    ch.gear.push({ id: 'cloak', n: 'Cloak of the DM', slot: 'worn', fx: [{ stat: 'ac', type: 'deflection', v: 1 }, { stat: 'skill:Stealth', type: 'competence', v: 5 }] });
    expect([derive(ch).AC - ac0, skillTotal(ch, 'Stealth') - st0]).toEqual([1, 5]);
  });
});
