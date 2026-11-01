// Things that are actually true of this character right now and might want attention.
// Feeds the Diagnostics panel and the tab badges.

import type { Character } from '../model/types';
import { mods } from './derive';
import { carryCap, gearWeight } from './gear';
import { languageMax, rankBudget, ranksSpent } from './skills';
import { preparedCount, schoolPrepared, schoolSlot, slots } from './spells';
import { capsOf, poolHD } from './undead';

export interface Issue {
  name: string;
  ok: boolean;
  detail: string;
  fix: string;
}

export function characterIssues(ch: Character): Issue[] {
  const out: Issue[] = [];
  const add = (name: string, ok: boolean, detail: string, fix = '') => out.push({ name, ok, detail, fix });
  const m = mods(ch), L = ch.lvl;

  const ranks = ranksSpent(ch), budget = rankBudget(ch, m.Int);
  add('Skill ranks spent', ranks === budget, `${ranks} of ${budget}`,
    ranks < budget ? `${budget - ranks} unspent.` : ranks > budget ? `${ranks - budget} over budget.` : '');
  const overRank = Object.entries(ch.skills).filter(([, x]) => (x.r || 0) > L).map(([n]) => n);
  add('No skill over the rank cap', !overRank.length, overRank.join(', ') || 'all within cap',
    overRank.length ? 'Maximum ranks in one skill equals character level.' : '');
  const lmax = languageMax(ch, m.Int);
  add('Languages', ch.langs.length >= lmax, `${ch.langs.length} of ${lmax}`,
    ch.langs.length < lmax ? `${lmax - ch.langs.length} slot(s) unused.` : '');

  const seen = new Set<string>(), dupes: string[] = [];
  for (const x of ch.book) {
    const k = x.n.toLowerCase() + ':' + x.lv;
    if (seen.has(k)) dupes.push(x.n);
    seen.add(k);
  }
  add('No duplicate spells', !dupes.length, dupes.join(', ') || 'clean');
  const orphan: string[] = [];
  for (let lv = 1; lv <= 9; lv++)
    for (const n of ch.prep[lv] || []) if (n && !ch.book.some((b) => b.n === n && b.lv === lv)) orphan.push(n);
  add('Prepared spells all in the book', !orphan.length, orphan.join(', ') || 'all present',
    orphan.length ? 'A prepared spell is no longer in the book.' : '');

  const badCon = (ch.gear || []).filter((it) => it.uses && (it.uses.cur > it.uses.max || it.uses.cur < 0));
  add('Item charges within their max', !badCon.length, badCon.map((it) => it.n).join(', ') || 'all in range');
  const load = gearWeight(ch), cap = carryCap(ch.ab.Str);
  add('Light load', load <= cap.light, `${+load.toFixed(1)} lb of ${cap.light} lb`,
    load > cap.light ? 'A medium or heavier load costs speed, AC and Max Dex.' : '');

  const caps = capsOf(ch);
  const animHD = poolHD(ch, 'anim'), cmdHD = poolHD(ch, 'cmd');
  add('Animate Dead pool within cap', animHD <= caps.strictCap, `${animHD} of ${caps.strictCap} HD`,
    animHD > caps.strictCap ? 'The excess breaks free.' : '');
  add('Command Undead pool within cap', cmdHD <= caps.cmdCap, `${cmdHD} of ${caps.cmdCap} HD`,
    cmdHD > caps.cmdCap ? 'The excess breaks free.' : '');

  // Undead Master's prerequisite. HOUSE RULING 7: the Command Undead FEAT counts.
  const featTxt = (ch.feats || []).join(' | ').toLowerCase();
  const canCastAnimate = slots(ch, 3, m.Int) > 0 && ch.book.some((b) => /^animate dead$/i.test(b.n));
  const canCastCommand = ch.book.some((b) => /^command undead$/i.test(b.n) && slots(ch, b.lv, m.Int) > 0);
  const hasUM = featTxt.includes('undead master');
  const byFeat = !!ch.rulings?.umFeatCountsAsSpell && featTxt.includes('command undead');
  add('Undead Master prerequisite', !hasUM || canCastAnimate || canCastCommand || byFeat,
    canCastAnimate ? 'animate dead' : canCastCommand ? 'command undead spell' : byFeat ? 'Command Undead feat (table ruling)' : 'neither castable',
    hasUM && !canCastAnimate && !canCastCommand && !byFeat
      ? 'Undead Master needs Spell Focus (necromancy) and the ability to cast animate dead or command undead.' : '');

  add('One extra school power', ch.subschool !== 'both', ch.subschool === 'undead' ? 'Bolster' : 'Grave Touch');

  if (ch.specialist)
    for (let lv = 1; lv <= 9; lv++) {
      const ss = schoolSlot(ch, lv);
      if (!ss) continue;
      const n = slots(ch, lv, m.Int);
      const necN = schoolPrepared(ch, lv);
      const full = preparedCount(ch, lv) >= n;
      add(`Level ${lv} ${ch.specialist} slot`, necN >= ss, `${necN} prepared of ${n} slots`,
        necN < ss
          ? full
            ? `All ${n} level ${lv} slots are full and none is ${ch.specialist}, so one of them is doing nothing. Unprepare a spell, then prepare a ${ch.specialist} one in its place.`
            : `One level ${lv} slot only holds ${ch.specialist}. Prepare a ${ch.specialist} spell in the empty slot.`
          : '');
    }
  for (let lv = 1; lv <= 9; lv++) {
    const n = slots(ch, lv, m.Int);
    if (!n) continue;
    const empty = n - preparedCount(ch, lv);
    if (empty > 0) add(`Level ${lv} slots unprepared`, false, `${empty} empty`, 'Nothing is in them.');
  }
  return out;
}
