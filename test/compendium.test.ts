// The imported compendium (PLAN.md Phase 1): the data is PF1e, complete enough, clean text,
// and the bits the sheet relies on (class spell levels, durations, prerequisites, bonuses) came
// through right. Spot values are checked against the entry's printed rules.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toBookSpell, toGear, toMods } from '../src/compendium/convert';
import { d20Search, fold, search, sourceLine } from '../src/compendium/search';
import type { CompendiumIndex, Entry } from '../src/compendium/types';
// @ts-expect-error plain JS module
import { fmtDuration, toText } from '../scripts/compendium-text.mjs';

const read = <T,>(f: string): T => JSON.parse(readFileSync(`public/compendium/${f}`, 'utf8'));
const ix = read<CompendiumIndex>('index.json');
const spells = read<Entry[]>('spells.json'), feats = read<Entry[]>('feats.json'), items = read<Entry[]>('items.json');
const classes = read<Entry[]>('classes.json'), races = read<Entry[]>('races.json');
const all = [...spells, ...feats, ...items, ...classes, ...races, ...read<Entry[]>('abilities.json'), ...read<Entry[]>('buffs.json')];
const get = (l: Entry[], n: string) => l.find((e) => e.n === n)!;

describe('the data', () => {
  it('is Pathfinder 1st Edition', () => expect([ix.system, ix.edition]).toEqual(['pf1', 'Pathfinder 1st Edition']));
  it('has the expected size', () => {
    expect(spells.length).toBeGreaterThan(2900);
    expect(feats.length).toBeGreaterThan(350);
    expect(items.length).toBeGreaterThan(2500);
    expect(classes.length).toBeGreaterThan(40);
    expect(races.length).toBeGreaterThan(70);
  });
  it('every entry has an id, a name and a kind; ids are unique', () => {
    for (const e of all) expect(e.id && e.n && e.k, JSON.stringify(e).slice(0, 80)).toBeTruthy();
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });
  it('text is plain: no HTML tags and no Foundry enrichers left', () => {
    const bad = all.filter((e) => /<\/?(p|div|em|strong|table|a|span)\b|@UUID|@Compendium|\[\[\//.test((e.d || '') + (e.sum || '')));
    expect(bad.map((e) => e.n).slice(0, 5)).toEqual([]);
  });
  it('every core spell has class levels', () =>
    expect(spells.filter((e) => e.src?.some((s) => s.b === 'PZO1110') && !Object.keys(e.cls || {}).length).map((e) => e.n)).toEqual([]));
});

describe('spot checks against the printed rules', () => {
  it('Fireball: sorcerer/wizard 3, evocation, Reflex half', () => {
    const e = get(spells, 'Fireball');
    expect([e.cls!.wizard, e.cls!.sorcerer, e.sc, e.sv]).toEqual([3, 3, 'Evocation', 'Reflex half']);
  });
  it('Animate Dead: wizard 4, cleric 3 (table ruling 1 makes it 3 for Kaldaran; the data stays RAW)', () =>
    expect([get(spells, 'Animate Dead').cls!.wizard, get(spells, 'Animate Dead').cls!.cleric]).toEqual([4, 3]));
  it('durations read like the book', () => {
    expect(get(spells, 'Mage Armor').du).toBe('1 hour/level (D)');
    expect(get(spells, 'Haste').du).toBe('1 round/level');
    expect(get(spells, 'Animate Dead').du).toBe('instantaneous');
  });
  it('Power Attack: prerequisites pulled out', () => expect(get(feats, 'Power Attack').pre).toMatch(/Str 13, base attack bonus \+1/));
  it('Wizard: d6, ½ BAB, good Will, prepared arcane (Int)', () => {
    const w = get(classes, 'Wizard');
    expect([w.hd, w.bab, w.saves!.will, w.cast!.type, w.cast!.ability]).toEqual([6, 'low', 'high', 'prepared', 'int']);
  });
  it('Samsaran: −2 Con, +2 Int, +2 Wis', () =>
    expect(get(races, 'Samsaran').fx!.map((c) => `${c.t}${c.f}`).sort()).toEqual(['con-2', 'int2', 'wis2']));
  it('sources name the book and page', () => expect(sourceLine(get(spells, 'Fireball'), ix.books)).toBe('Core Rulebook p. 283'));
});

describe('search', () => {
  const S = (text: string, extra = {}) => search(spells, { text, ...extra }).hits.map((h) => h.e.n);
  it('exact name ranks first', () => expect(S('fireball')[0]).toBe('Fireball'));
  it('ignores apostrophes and case', () => expect(S("BULLS strength")).toContain("Bull's Strength"));
  it('filters to a class list and level', () => {
    const r = search(spells, { text: '', cls: 'wizard', maxLevel: 2 }, 5000).hits;
    expect(r.every((h) => h.e.cls!.wizard <= 2)).toBe(true);
    expect(r.some((h) => h.e.n === 'Fireball')).toBe(false);
    expect(r.some((h) => h.e.n === 'Mage Armor')).toBe(true);
  });
  it('filters by kind', () => expect(search(all, { text: 'power attack', kinds: ['feat'] }).hits[0].e.n).toBe('Power Attack'));
  it('fold', () => expect(fold("Bull's Strength, Mass")).toBe('bulls strength mass'));
  it('d20pfsrd link is a search, safely encoded', () => expect(d20Search("Bull's Strength, Mass")).toBe('https://www.d20pfsrd.com/?s=Bull\'s%20Strength%2C%20Mass'));
});

describe('adding to the character', () => {
  it('Ring of Protection +2 becomes +2 deflection to AC, worn', () => {
    const { item, skipped } = toGear(get(items, 'Ring of Protection +2'));
    expect([item.fx, item.slot, skipped]).toEqual([[{ stat: 'ac', type: 'deflection', v: 2 }], 'worn', 0]);
  });
  it('skill targets map to the sheet\'s skill names', () => {
    expect(toMods([{ f: '5', t: 'skill.perception', y: 'competence' }]).mods).toEqual([{ stat: 'skill:Perception', type: 'competence', v: 5 }]);
    expect(toMods([{ f: '2', t: 'skill.senseMotive', y: 'competence' }]).mods[0].stat).toBe('skill:Sense Motive');
    expect(toMods([{ f: '2', t: 'skill.knowledge.arcana', y: 'competence' }]).mods[0].stat).toBe('skill:Know. Arcana');
  });
  it('formulas and unknown targets are counted, not applied', () => {
    const r = toMods([{ f: '@cl', t: 'ac', y: 'deflection' }, { f: '2', t: 'landSpeed', y: 'enhancement' }]);
    expect([r.mods.length, r.skipped]).toEqual([0, 2]);
  });
  it('a spell becomes a spellbook entry at the class level', () => {
    expect(toBookSpell(get(spells, 'Fireball'), 'wizard')).toMatchObject({ n: 'Fireball', lv: 3, sc: 'Evocation', du: 'instantaneous' });
    expect(toBookSpell(get(spells, 'Cure Light Wounds'), 'wizard')).toBeNull();
  });
});

describe('import text helpers', () => {
  it('turns Foundry HTML into plain text', () => {
    expect(toText('<p>Deals @UUID[Compendium.pf1.spells.Item.x]{fireball} damage [[/r 1d6]].</p><p>Second &amp; last.</p>'))
      .toBe('Deals fireball damage 1d6.\n\nSecond & last.');
    expect(toText('<ul><li>One</li><li>Two</li></ul>')).toBe('• One\n• Two');
  });
  it('formats durations', () => {
    expect(fmtDuration({ units: 'minute', value: '10 * @cl' })).toBe('10 minutes/level');
    expect(fmtDuration({ units: 'round', value: 'floor(@cl / 2)' })).toBe('1 round per 2 levels');
    expect(fmtDuration({ units: 'hour', value: '24' })).toBe('24 hours');
    expect(fmtDuration({ units: 'inst' })).toBe('instantaneous');
  });
});
