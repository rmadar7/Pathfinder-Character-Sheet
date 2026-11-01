// Fixed numbers for Kaldaran as v36 shows him (HANDOFF §4). These are EXPECTED to change when
// he levels or tiers up (ARCHITECTURE T2) — update them then, with the reason.
import { describe, expect, it } from 'vitest';
import { derive } from '../src/rules/derive';
import { slots } from '../src/rules/spells';
import { mythicPower } from '../src/rules/mythic-math';
import { capsOf, poolHD } from '../src/rules/undead';
import { kaldaran } from './helpers';

describe('Kaldaran, Wizard 4 / Arch-Mage 2', () => {
  const ch = kaldaran();
  const d = derive(ch);
  it('AC 17 = 10 + 2 Dex + 5 Enduring Armor', () => {
    expect(d.AC).toBe(17);
    expect(d.R.ac.applied.map((r) => [r.name, r.type, r.v])).toEqual([['Enduring Armor', 'armor', 5]]);
  });
  it('touch 12, flat-footed 15', () => { expect(d.touch).toBe(12); expect(d.ff).toBe(15); });
  it('Fort +3, Ref +3, Will +6', () => { expect([d.fort, d.ref, d.will]).toEqual([3, 3, 6]); });
  it('Init +6 = 2 Dex + 2 Reactionary + 2 Amazing Initiative', () => expect(d.init).toBe(6));
  it('CMD 14', () => expect(d.cmd).toBe(14));
  it('Concentration +10', () => expect(d.conc).toBe(10));
  it('slots: 6 at 1st, 5 at 2nd, none at 3rd', () => expect([1, 2, 3].map((l) => slots(ch, l))).toEqual([6, 5, 0]));
  it('mythic power 7', () => expect(mythicPower(ch.tier)).toBe(7));
  it('house ruling 9: animate dead cap 40 HD at CL 10', () => {
    const c = capsOf(ch);
    expect([c.animCL, c.strictCap, c.cmdCap]).toEqual([10, 40, 10]);
  });
  it('controls 6 of 10 HD by Command Undead', () => expect(poolHD(ch, 'cmd')).toBe(6));
  it('Mage Armor on top of Enduring Armor is suppressed, AC stays 17', () => {
    const s = structuredClone(ch);
    s.effects.find((e) => e.name === 'Mage Armor')!.on = true;
    const r = derive(s);
    expect(r.AC).toBe(17);
    expect(r.R.ac.suppressed.map((x) => [x.name, x.beatenBy.name])).toEqual([['Mage Armor', 'Enduring Armor']]);
  });
});
