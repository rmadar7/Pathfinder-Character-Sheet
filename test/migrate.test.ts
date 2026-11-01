import { describe, expect, it } from 'vitest';
import { migrate } from '../src/model/migrate';
import { SCHEMA } from '../src/model/defaults';
import { kaldaran, rawKaldaran } from './helpers';

describe('migration v8 → v9', () => {
  const before = rawKaldaran();
  const ch = kaldaran();
  it('reaches the current schema', () => expect(ch.schema).toBe(SCHEMA));
  it('keeps every spellbook entry, item, skill and language', () => {
    expect(ch.book.map((b) => b.n)).toEqual(before.book.map((b: any) => b.n));
    expect(ch.gear.map((g) => g.id)).toEqual(before.gear.map((g: any) => g.id));
    expect(ch.skills).toEqual(before.skills);
    expect(ch.langs).toEqual(before.langs);
    expect([ch.gp, ch.sp, ch.cp, ch.craft.mats]).toEqual([521, 9, 0, 500]);
    expect(ch.house).toEqual(before.house);
    expect(ch.bio).toEqual(before.bio);
  });
  it('adds prepMeta aligned with prep', () => {
    for (let lv = 1; lv <= 9; lv++) expect(ch.prepMeta[lv] ?? []).toBeDefined();
  });
  it('moves the six traits into data', () => {
    expect(ch.traits).toHaveLength(6);
    expect(ch.traits[0]).toMatch(/^Magical Lineage \(Animate Dead\)/);
  });
  it('rewords the Ring of Sustenance and logs it', () => {
    expect(ch.gear.find((g) => g.n === 'Ring of Sustenance')!.desc).toMatch(/full 8 hours/);
    expect(ch.changelog.some((c) => /Ring of Sustenance/.test(c.what))).toBe(true);
  });
  it('marks the two unsourced cantrips', () => {
    expect(ch.book.filter((b) => b.unsourced).map((b) => b.n).sort()).toEqual(['Oath of Anonymity', 'Vacuous Vessel']);
  });
  it('is idempotent: migrating again changes nothing', () => expect(migrate(ch, 0)).toEqual(ch));
  it('does not touch the input object', () => {
    const raw = rawKaldaran();
    migrate(raw, 0);
    expect(raw).toEqual(rawKaldaran());
  });
});

describe('legacy migrations 0 → 8', () => {
  it('upgrades a schema-0 doc with old AC boxes and buffs into effects and gear', () => {
    const ch = migrate({ lvl: 1, ac: { armor: 4, dodge: 1 }, buffs: ['Shield'], buffAC: [{ name: 'Shield', type: 'shield', bonus: 4 }], wand: 7, inv: ['Bedroll', 'Ring of the Sophisticate — bonus'] }, 0);
    expect(ch.effects.map((e) => e.name)).toEqual(['Armor bonus', 'Dodge bonus', 'Shield']);
    expect(ch.gear.find((g) => g.id === 'wand-mm')!.uses!.cur).toBe(7);
    expect(ch.gear.find((g) => /Sophisticated/.test(g.n))!.fx!.length).toBe(2);
  });
});

describe('migration → v10: cantrip descriptions (approved clean-up 3)', () => {
  const ch = kaldaran();
  const get = (n: string) => ch.book.find((b) => b.n === n)!;
  it('fills the four empty descriptions, each with its d20pfsrd link', () => {
    for (const n of ['Detect Poison', 'Dancing Lights', 'Flare', 'Open/Close']) {
      expect(get(n).d, n).toBeTruthy();
      expect(get(n).url, n).toMatch(/^https:\/\/www\.d20pfsrd\.com\/magic\/all-spells\//);
    }
  });
  it('logs each one', () =>
    expect(ch.changelog.filter((c) => c.schema === 10).length).toBe(4));
  it('never overwrites a description the player wrote', () => {
    const raw = rawKaldaran();
    raw.book.find((b: any) => b.n === 'Flare').d = 'my own note';
    const c = migrate(raw, 0);
    expect(c.book.find((b) => b.n === 'Flare')!.d).toBe('my own note');
  });
  it('is not re-applied to a document already at v10', () => {
    const again = migrate(ch, 0);
    expect(again.changelog.filter((c) => c.schema === 10).length).toBe(4);
  });
});
