// Upgrade old documents one schema step at a time (ARCHITECTURE M2).
//
// Steps 1–8 are v36's migrate() ported verbatim, so an old export still imports. They work on
// an untyped object because the shapes they read no longer exist.
// Step 9 is the first step written for the repo build. Every change it makes to something
// the player entered is logged in `changelog`.

import { guessCat, guessWeight, sameItem } from '../rules/gear';
import { SCHEMA, withDefaults } from './defaults';
import type { Character } from './types';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function legacySteps(o: Any): void {
  const from = o.schema || 0;
  if (from < 1) {
    // buffs were plain strings
    if (Array.isArray(o.buffs)) o.buffs = o.buffs.map((b: any) => (typeof b === 'string' ? { n: b, r: null } : b));
  }
  if (from < 2) {
    // used.bond didn't exist
    o.used = o.used || {};
    if (o.used.bond === undefined) o.used.bond = 0;
  }
  if (from < 3) {
    // undead entries needed numeric HD
    if (Array.isArray(o.undead)) o.undead = o.undead.map((u: any) => ({ n: u.n || 'undead', hd: +u.hd || 1 }));
  }
  if (from < 4) {
    // undead split into two pools
    if (Array.isArray(o.undead)) o.undead = o.undead.map((u: any) => ({ ...u, pool: u.pool || 'anim' }));
    if (o.strictUndead === undefined) o.strictUndead = false;
  }
  if (from < 5) {
    // wand + potions folded into one consumables list
    if (!Array.isArray(o.consumables)) {
      const w = o.wand != null ? o.wand : 20;
      const cl = o.potCLW != null ? o.potCLW : 3;
      const gr = o.potGreat != null ? o.potGreat : 1;
      o.consumables = [
        { id: 'wand-mm', name: 'Wand of Magic Missile', desc: '1d4+1 per missile · auto-hit, no save, no SR', cur: w, max: 20, cls: 'y', refresh: { daily: 5 }, help: 'wand' },
        { id: 'pot-clw', name: 'Potion of Cure Light Wounds', desc: 'Heals 1d8+1. Not restored by resting.', cur: cl, max: 3, cls: 'r', refresh: null, help: 'potions' },
        { id: 'pot-great', name: 'Greater healing potion', desc: 'Not restored by resting.', cur: gr, max: 1, cls: 'r', refresh: null },
      ];
    }
    delete o.wand; delete o.potCLW; delete o.potGreat;
  }
  if (from < 6) {
    // If Mage Armor was baked into the armor component AND running as a buff, it would double.
    const mage = (o.buffs || []).some((b: any) => /mage armor/i.test((b && b.n) || b || ''));
    if (mage && o.ac && o.ac.armor === 4) o.ac.armor = 0;
  }
  if (from < 7) {
    // Four disconnected sources of numbers became one list of effects.
    const eff: any[] = Array.isArray(o.effects) ? o.effects : [];
    const TYPEMAP: Any = { armor: 'armor', shield: 'shield', natural: 'natural', deflect: 'deflection', deflection: 'deflection', dodge: 'dodge', size: 'size', misc: 'untyped' };
    const LABEL: Any = { armor: 'Armor', shield: 'Shield', natural: 'Natural armor', deflect: 'Deflection', dodge: 'Dodge', size: 'Size', misc: 'Misc' };
    const running = (o.buffs || []).map((b: any) => ((b && b.n) || b || '').toString());
    const lc = (s: unknown) => ('' + s).toLowerCase();
    if (o.ac)
      for (const k in o.ac) {
        const v = +o.ac[k] || 0;
        if (!v) continue;
        eff.push({ id: 'mig-ac-' + k, name: (LABEL[k] || k) + ' bonus', src: 'carried over from your old AC boxes', kind: 'manual', on: true, dur: null, left: null, mods: [{ stat: 'ac', type: TYPEMAP[k] || 'untyped', v }] });
      }
    (o.buffAC || []).forEach((e: any, i: number) => {
      if (!e || !e.name) return;
      const live = running.find((n: string) => lc(n) === lc(e.name));
      const b = (o.buffs || []).find((x: any) => lc((x && x.n) || x || '') === lc(e.name));
      eff.push({ id: 'mig-buff-' + i, name: e.name, src: 'spell', kind: 'spell', on: !!live, dur: null, left: b && typeof b === 'object' && b.r != null ? b.r : null, mods: [{ stat: 'ac', type: TYPEMAP[e.type] || 'untyped', v: +e.bonus || 0 }] });
    });
    (o.buffs || []).forEach((b: any, i: number) => {
      const n = ((b && b.n) || b || '').toString();
      if (!n) return;
      if ((o.buffAC || []).some((e: any) => e && e.name && lc(e.name) === lc(n))) return;
      eff.push({ id: 'mig-note-' + i, name: n, src: '', kind: 'spell', on: true, dur: null, left: b && typeof b === 'object' && b.r != null ? b.r : null, mods: [] });
    });
    o.effects = eff;
    delete o.ac; delete o.buffAC; delete o.buffs;

    o.mythic = o.mythic || {};
    const my = o.mythic;
    my.path = my.path || 'Arch-Mage';
    my.arcana = my.arcana || 'Wild Arcana';
    my.bonusHpPerTier = my.bonusHpPerTier == null ? 3 : my.bonusHpPerTier;
    my.trials = my.trials || [];
    if (!Array.isArray(my.abilities) || !my.abilities.length) my.abilities = [{ tier: 1, name: 'Harmonious Mage' }, { tier: 2, name: 'Enduring Armor' }];
    if (!Array.isArray(my.feats) || !my.feats.length) my.feats = [{ tier: 1, name: 'Undead Master (Mythic)' }];
    my.abilityScores = my.abilityScores || [];
    o.conditions = o.conditions || [];
    if (o.schoolPower !== undefined) { o.subschool = ''; delete o.schoolPower; }
    if (o.subschool === undefined) o.subschool = '';
    if (!o.prepMeta || typeof o.prepMeta !== 'object') o.prepMeta = {};
    if (!o.craft || typeof o.craft !== 'object') o.craft = { mats: 0, hours: 0, pick: '', cl: null, log: [] };
    if (!Array.isArray(o.craft.log)) o.craft.log = [];
    if (!o.brug || typeof o.brug !== 'object') {
      o.brug = {
        name: 'Brug', hp: o.brughp != null ? o.brughp : 30, hpmax: 30, ac: 17, touch: 8, ff: 16, fort: 6, ref: 1, will: 3, speed: 30, size: 'Large',
        ab: { Str: 21, Dex: 8, Con: 15, Int: 6, Wis: 10, Cha: 7 },
        attacks: [{ n: 'Greatclub', hit: 7, dmg: '2d8+7', crit: '×2' }, { n: 'Javelin (thrown)', hit: 1, dmg: '1d8+5', crit: '×2' }],
        note: 'Ogre. Life debt, not a hireling — he rolls his own initiative and acts on his own turn. Darkvision 60 ft.',
      };
      delete o.brughp;
    }
    o.rulings = o.rulings || { umFeatCountsAsSpell: true };
    if (o.specialist === undefined) o.specialist = 'Necromancy';
    const hasRing = (o.inv || []).some((it: any) => /sophistic/i.test((it && it.n) || it || ''));
    if (hasRing && !o.effects.some((e: any) => /sophistic/i.test(e.name || '')))
      o.effects.push({ id: 'ring-soph', name: 'Ring of the Sophisticate', src: 'magic item, worn', kind: 'item', on: true, dur: null, left: null, mods: [{ stat: 'skill:Know. Local', type: 'competence', v: 4 }, { stat: 'skill:Sense Motive', type: 'competence', v: 4 }] });
  }
  if (from < 8) {
    // "Charges & Potions" and "Carried" merged into one gear list.
    if (!Array.isArray(o.gear)) {
      const g: any[] = [];
      const push = (it: any) => {
        const dup = g.find((x) => sameItem(x.n, it.n));
        if (dup) {
          if (!dup.desc && it.desc) dup.desc = it.desc;
          if (!dup.uses && it.uses) { dup.uses = it.uses; dup.cls = it.cls || dup.cls; }
          if (!dup.wt && it.wt) dup.wt = it.wt;
          if ((it.n || '').length > (dup.n || '').length) dup.n = it.n;
          return;
        }
        g.push(it);
      };
      (o.consumables || []).forEach((c: any) => push({
        id: c.id || 'g' + Math.random().toString(36).slice(2), n: c.name || 'Item', desc: c.desc || '', wt: 0, qty: 1, slot: 'carried', cls: c.cls || 'r', help: c.help,
        uses: { cur: c.cur != null ? c.cur : 1, max: c.max || 1, regain: (c.refresh && c.refresh.daily) || 0 },
      }));
      (o.inv || []).forEach((it: any) => {
        let n = it && typeof it === 'object' ? it.n || '' : String(it || '');
        let desc = (it && it.desc) || '';
        if (!n) return;
        if (!desc) {
          const em = n.indexOf('—');
          if (em >= 0) { desc = n.slice(em + 1).trim(); n = n.slice(0, em).trim(); }
        }
        push({ id: 'g' + Math.random().toString(36).slice(2), n, desc, wt: +(it && it.wt) || 0, qty: Math.max(1, parseInt(it && it.qty) || 1), slot: 'carried', uses: null });
      });
      g.forEach((it) => { if (!it.wt) it.wt = guessWeight(it.n); });
      g.forEach((it) => { if (!it.cat) it.cat = guessCat(it.n); });
      g.forEach((it) => {
        it.slot = /saddle|ration|torch|bedroll|iron pot|mess kit|waterskin/i.test(it.n) ? 'stowed' : /ring|amulet|robe/i.test(it.n) ? 'worn' : 'carried';
        delete it.carried;
      });
      g.forEach((it) => {
        if (!/sophistic/i.test(it.n)) return;
        it.n = 'Ring of the Sophisticated';
        it.fx = [{ stat: 'skill:Know. Local', type: 'competence', v: 4 }, { stat: 'skill:Sense Motive', type: 'competence', v: 4 }];
        if (!it.desc) it.desc = '+4 Knowledge (Local), +4 Sense Motive. 1/day cast locate creature or object. On command, finds the nearest bar within 20 miles.';
        if (!it.uses) it.uses = { cur: 1, max: 1, regain: 1 };
      });
      o.effects = (o.effects || []).filter((e: any) => !/sophistic/i.test(e.name || ''));
      g.forEach((it) => {
        const m = (it.n || '').match(/^(\d+)\s+(days?\s+)?(.+)$/);
        if (m && it.qty === 1) { it.qty = +m[1]; it.n = m[3].replace(/^\w/, (c: string) => c.toUpperCase()); }
      });
      o.gear = g.filter((it) => (it.n || '').trim().toLowerCase() !== 'brug');
    }
    delete o.consumables; delete o.inv;
  }
}

/** v36 hard-coded Kaldaran's traits and racial abilities into the page. They are his data,
 *  so step 9 moves them into the document (ARCHITECTURE G1). Same "Name — note" shape as feats. */
const V36_TRAITS = [
  'Magical Lineage (Animate Dead) — metamagic applied to Animate Dead costs one level less',
  'Reactionary — this is where your +2 initiative comes from',
  'Lifebound — racial. +2 on saves vs. death effects, negative energy, negative levels',
  'Low-Light Vision — racial. See twice as far as a human in dim light.',
  'Samsaran Magic — racial. Comprehend languages, deathwatch, stabilize, 1/day each.',
  'Mystic Past Life — racial, replaces Shards of the Past. 6 spells added to your wizard list from the witch list.',
];

const RING_OLD = "a full night's rest takes 2 hours instead of 8 (needs 1 week of wear first)";
const RING_NEW =
  "Covers spell preparation. You still need the full 8 hours of rest (table ruling 6). By the book it cuts the rest you need to 2 hours, after 1 week of wear.";

function step9(o: Any, now: number): void {
  const log = (what: string) => (o.changelog = o.changelog || []).push({ at: now, schema: 9, what });
  o.changelog = o.changelog || [];
  if (!o.id) o.id = 'kaldaran';
  o.identity = o.identity || {};
  if (!o.identity.name) o.identity.name = 'Kaldaran';
  if (!Array.isArray(o.traits)) {
    o.traits = V36_TRAITS.slice();
    log('Traits and racial abilities moved from the page into your character data (same six entries).');
  }
  // Approved clean-ups (DECISIONS.md, 2026-11-01).
  for (const g of o.gear || []) {
    if (/ring of sustenance/i.test(g.n || '') && (g.desc || '').trim() === RING_OLD) {
      g.desc = RING_NEW;
      log(`Ring of Sustenance description reworded to match table ruling 6. Was: "${RING_OLD}"`);
    }
  }
  for (const b of o.book || []) {
    if (/^(oath of anonymity|vacuous vessel)$/i.test(b.n || '') && !b.unsourced) {
      b.unsourced = true;
      log(`${b.n} marked unsourced: not found on d20pfsrd, source book unknown.`);
    }
  }
}

/** Bring any saved document up to the current schema and fill missing fields. */
export function migrate(raw: unknown, now = Date.now()): Character {
  const o: Any = structuredClone(raw ?? {}) as Any;
  const from = o.schema || 0;
  if (from < 8) legacySteps(o);
  if (from < 9) step9(o, now);
  o.schema = SCHEMA;
  return withDefaults(o);
}
