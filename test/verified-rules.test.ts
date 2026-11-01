// Rules re-checked against d20pfsrd (DECISIONS.md, "VERIFY.md suspected problems").
// Each test pins the behaviour the quoted rule requires, so a regression to the v36
// reading fails here.
import { describe, expect, it } from 'vitest';
import { newDay, recuperate } from '../src/rules/actions';
import { failsOn, takeTenMakes } from '../src/rules/crafting';
import { derive } from '../src/rules/derive';
import { mythicPower } from '../src/rules/mythic-math';
import { concentrationDC } from '../src/rules/powers';
import { kaldaran } from './helpers';

describe('Concentration DCs by cause', () => {
  it('no damage is NOT a flat 15 + spell level', () => {
    expect(concentrationDC('grappled', 1, 4)).toBe(15);
    expect(concentrationDC('grappled', 1, 9)).toBe(20);
    expect(concentrationDC('vigorous', 1)).toBe(11);
    expect(concentrationDC('windRain', 2)).toBe(7);
  });
  it('continuous damage counts half, rounded down', () => expect(concentrationDC('continuous', 1, 7)).toBe(14));
  it('extremely violent motion is 20 + spell level', () => expect(concentrationDC('extreme', 4)).toBe(24));
});

describe('Blinded', () => {
  it('Kaldaran blinded: AC 17 → 13 (−2 and loses +2 Dex), touch 12 → 8', () => {
    const ch = kaldaran();
    ch.conditions = ['blinded'];
    const d = derive(ch);
    expect([d.AC, d.touch, d.dexDenied]).toEqual([13, 8, 'Blinded']);
  });
  it('a Dex PENALTY still applies when the bonus is denied', () => {
    const ch = kaldaran();
    ch.ab.Dex = 8;
    const base = derive(ch).AC;
    ch.conditions = ['blinded'];
    expect(derive(ch).AC).toBe(base - 2);
  });
});

describe('Scriptorium wording', () => {
  it('cannot fail when 1 + bonus meets the DC', () => expect(failsOn(9, 8)).toMatch(/cannot fail/));
  it('names the failing faces otherwise', () => expect(failsOn(9, 4)).toBe('you fail on a roll of 4 or less'));
  it('take 10 makes the DC when 10 + bonus ≥ DC', () => {
    expect(takeTenMakes(9, -1)).toBe(true);
    expect(takeTenMakes(9, -2)).toBe(false);
  });
});

describe('Recuperation (tier 3)', () => {
  const at = (tier: number, hp: number) => { const ch = kaldaran(); ch.tier = tier; ch.hp = hp; return ch; };
  it('below tier 3, a rest heals 2 × level (house ruling 5)', () => {
    const ch = at(2, 5);
    const r = newDay(ch, 0);
    expect([r.recuperated, ch.hp]).toEqual([false, Math.min(ch.hpmax, 5 + 2 * ch.lvl)]);
  });
  it('at tier 3, 8 hours of rest restores full hp', () => {
    const ch = at(3, 2);
    const r = newDay(ch, 0);
    expect([r.recuperated, ch.hp]).toEqual([true, ch.hpmax]);
  });
  it('the dead are not restored', () => {
    const ch = at(3, -100);
    expect(newDay(ch, 0).recuperated).toBe(false);
  });
  it('1 mythic power + 1 hour: half full hp and spell slots back, mythic power not refreshed', () => {
    const ch = at(3, 1);
    ch.used.mythic = 2;
    ch.used.cmd = 3;
    const lv = Object.keys(ch.prep).map(Number).find((l) => (ch.prep[l] || []).length)!;
    ch.cast[lv] = ch.prep[lv].map(() => true);
    const r = recuperate(ch, 0);
    expect(r.ok).toBe(true);
    expect(ch.hp).toBe(Math.min(ch.hpmax, 1 + Math.floor(ch.hpmax / 2)));
    expect(ch.used.mythic).toBe(3);
    expect(ch.used.cmd).toBe(0);
    expect(ch.cast[lv].every((c) => !c)).toBe(true);
  });
  it('needs tier 3 and a use of mythic power', () => {
    expect(recuperate(at(2, 1), 0).ok).toBe(false);
    const ch = at(3, 1);
    ch.used.mythic = mythicPower(3);
    expect(recuperate(ch, 0).ok).toBe(false);
  });
});
