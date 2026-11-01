// Things the player DOES that change the document by a rule: rest, cast, scribe, level up.
// Pure mutators on a draft (call inside update()). Dice are rolled by the UI and passed in
// (ARCHITECTURE R1).

import { QUICK_EFFECTS } from '../data/effects';
import { blankUsed } from '../model/defaults';
import type { BookSpell, Character } from '../model/types';
import { CRAFT_DAY, scrollBase, scrollCost, scrollDC, scrollHours } from './crafting';
import { mods } from './derive';
import { durToRounds, parseDuration } from './duration';
import { mythicPower } from './mythic-math';
import { restHeal, schoolPowerUses } from './powers';
import { normalizePrep } from './spells';
import { spellDetails } from './spellinfo';

export function logHp(ch: Character, from: number, to: number, note: string, now = Date.now()): void {
  ch.hplog = [{ t: now, from, to, note }, ...(ch.hplog || [])].slice(0, 12);
}

/** Casting starts the spell's clock. If the quick-effects library knows the spell's real
 *  bonuses (Mage Armor, Shield…), they apply, so casting genuinely moves the numbers. */
export function trackBuff(ch: Character, sp: BookSpell, now = Date.now()): void {
  const full = spellDetails(sp);
  const dur = parseDuration(full.du, ch.lvl);
  if (dur === null) return; // instantaneous / permanent
  if (ch.effects.some((e) => (e.name || '').toLowerCase() === sp.n.toLowerCase())) return;
  const known = QUICK_EFFECTS.find((q) => q.name.toLowerCase() === sp.n.toLowerCase());
  const d = dur || known?.dur || null;
  ch.effects.push({
    id: 'fx' + now, name: sp.n, src: sp.lv === 0 ? 'cantrip' : 'level ' + sp.lv + ' spell',
    kind: 'spell', on: true, dur: d, left: durToRounds(d, ch.lvl),
    mods: known ? structuredClone(known.mods) : [],
  });
}

/** Mark slot i at level lv cast (or give it back). Casting starts the buff timer; giving it
 *  back removes the effect only when no other copy of the spell is still spent. */
export function setCast(ch: Character, lv: number, i: number, casting: boolean, now = Date.now()): void {
  normalizePrep(ch);
  const nm = ch.prep[lv][i];
  ch.cast[lv][i] = casting;
  const sp = ch.book.find((x) => x.n === nm);
  if (casting) {
    if (sp) trackBuff(ch, { ...sp, lv: sp.lv }, now);
  } else {
    const stillUp = ch.prep[lv].some((n, k) => n === nm && ch.cast[lv][k]);
    if (!stillUp) ch.effects = ch.effects.filter((x) => x.name !== nm);
  }
}

export interface DayReceipt {
  slotsBack: number;
  mythic: number;
  schoolUses: number;
  hpBefore: number;
  hpAfter: number;
  healed: number;
  items: { n: string; before: number; after: number; regain: number; max: number }[];
  anyNoRefresh: boolean;
}

/** A night's rest (8 hours). HOUSE RULING 5: heals 2 × level. The prepared list carries over
 *  — a rest refills the slots, it doesn't make you choose again. */
export function newDay(ch: Character, now = Date.now()): DayReceipt {
  const m = mods(ch);
  const slotsBack = Object.values(ch.cast).reduce((a, c) => a + (c || []).filter(Boolean).length, 0);
  ch.craft = ch.craft || { mats: 0, hours: 0, pick: '', cl: null, log: [] };
  ch.craft.hours = 0; // a fresh 8 hours at the desk
  const healed = restHeal(ch.lvl);
  const hpBefore = ch.hp;
  const hpAfter = Math.min(ch.hpmax, ch.hp + healed);

  const items: DayReceipt['items'] = [];
  let anyNoRefresh = false;
  for (const it of ch.gear || []) {
    if (!it.uses) continue;
    if (it.uses.regain > 0) {
      const before = it.uses.cur, after = Math.min(it.uses.max, it.uses.cur + it.uses.regain);
      it.uses.cur = after;
      if (after !== before) items.push({ n: it.n, before, after, regain: it.uses.regain, max: it.uses.max });
    } else anyNoRefresh = true;
  }
  ch.lastPrep = structuredClone(ch.prep);
  for (let lv = 1; lv <= 9; lv++) ch.cast[lv] = (ch.prep[lv] || []).map(() => false);
  ch.used = blankUsed();
  // Spells wear off overnight; permanent gear and mythic abilities don't.
  ch.effects = (ch.effects || []).filter((e) => e.dur === null || e.dur === undefined);
  ch.conditions = [];
  ch.round = 0;
  if (hpAfter !== hpBefore) logHp(ch, hpBefore, hpAfter, "8 hours' rest", now);
  ch.hp = hpAfter;
  return { slotsBack, mythic: mythicPower(ch.tier), schoolUses: schoolPowerUses(m.Int), hpBefore, hpAfter, healed, items, anyNoRefresh };
}

/** Advance the combat round: timed effects tick down; ones that hit zero end. */
export function nextRound(ch: Character): string[] {
  ch.round = (ch.round || 0) + 1;
  const ended: string[] = [];
  ch.effects = ch.effects
    .map((e) => {
      if (e.left === null || e.left === undefined || e.on === false) return e;
      const left = e.left - 1;
      if (left <= 0) ended.push(e.name);
      return { ...e, left };
    })
    .filter((e) => e.left === null || e.left === undefined || e.left > 0);
  return ended;
}

export interface ScribeResult {
  ok: boolean;
  cursed: boolean;
  txt: string;
}

/** Scribe a scroll with a Spellcraft total already rolled. Spends materials, hours and the
 *  prepared slot "just as if it had been cast" — on success or failure. */
export function scribe(ch: Character, pick: { n: string; lv: number; slot: number }, cl: number, rolled: number, now = Date.now()): ScribeResult {
  const cost = scrollCost(pick.lv, cl), hours = scrollHours(pick.lv, cl), dc = scrollDC(cl);
  const by = dc - rolled;
  ch.craft.mats -= cost;
  ch.craft.hours = (ch.craft.hours || 0) + hours;
  if (pick.lv > 0 && pick.slot >= 0) ch.cast[pick.lv][pick.slot] = true;
  let res: ScribeResult;
  if (rolled >= dc) {
    ch.gear.push({ id: 'scroll' + now, n: 'Scroll of ' + pick.n, desc: 'Caster level ' + cl + '. One use, then it is gone.', wt: 0, qty: 1, slot: 'carried', cls: 'y', uses: { cur: 1, max: 1, regain: 0 }, cat: 'magic' });
    res = { ok: true, cursed: false, txt: `Scroll of ${pick.n} (CL ${cl}) — rolled ${rolled} against DC ${dc}. ${cost} gp of materials used.` };
  } else if (by >= 5) {
    ch.gear.push({ id: 'scroll' + now, n: 'Cursed scroll of ' + pick.n, desc: `Failed the Spellcraft check by ${by}. It looks finished but it is not. Your DM decides what it does.`, wt: 0, qty: 1, slot: 'carried', cls: 'r', uses: { cur: 1, max: 1, regain: 0 }, cat: 'magic' });
    res = { ok: false, cursed: true, txt: `CURSED scroll of ${pick.n} — rolled ${rolled}, missed DC ${dc} by ${by}. Materials and hours gone.` };
  } else {
    res = { ok: false, cursed: false, txt: `Failed: ${pick.n} — rolled ${rolled} against DC ${dc}. ${cost} gp of materials and ${hours} hours wasted, no scroll.` };
  }
  ch.craft.log = [{ ok: res.ok, txt: res.txt }, ...(ch.craft.log || [])].slice(0, 12);
  return res;
}

export const scribeCheck = (lv: number, cl: number, mats: number, hoursUsed: number) => ({
  base: scrollBase(lv, cl), cost: scrollCost(lv, cl), hours: scrollHours(lv, cl), dc: scrollDC(cl),
  canPay: scrollCost(lv, cl) <= mats, canTime: scrollHours(lv, cl) <= CRAFT_DAY - hoursUsed,
});

/** Apply a level-up: one more wizard level and the hit points rolled for it. Everything else
 *  (slots, BAB, saves, caps) is derived and follows automatically. */
export function applyLevelUp(ch: Character, hpGain: number): void {
  ch.lvl = Math.min(20, ch.lvl + 1);
  ch.hpmax += hpGain;
  ch.hp += hpGain;
}
