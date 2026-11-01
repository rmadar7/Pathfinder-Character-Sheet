// LEVEL UP — everything that changes, what's automatic and what the player chooses.
// Port of v36 openLevelUp(). VERIFY.md → "Level-up".
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { babOf, bonusSp, good, poor, sgn, spellsPerDay } from '../../rules/core';
import { mods } from '../../rules/derive';
import { graveTouchRounds, schoolPowerUses } from '../../rules/powers';
import { ranksPerLevel } from '../../rules/skills';
import { undeadCaps } from '../../rules/undead';
import { applyLevelUp } from '../../rules/actions';
import type { Character } from '../../model/types';
import { backup, update } from '../store';

interface Step { name: string; num?: string; todo?: boolean; w: ComponentChildren; extra?: ComponentChildren }

/** Wizard hit die. CHARACTER-SPECIFIC: wizard. */
const HD = 6;

export function LevelUp({ ch, onClose, onDone }: { ch: Character; onClose: () => void; onDone: (lines: ComponentChildren[]) => void }) {
  const from = ch.lvl, to = Math.min(20, from + 1);
  const m = mods(ch);
  const [hp, setHp] = useState<number | null>(null);
  const [rolled, setRolled] = useState<number | null>(null);
  const avg = Math.max(1, Math.ceil((HD + 1) / 2) + m.Con);

  const steps: Step[] = [];
  steps.push({
    todo: true, name: 'Hit points',
    w: <>Roll <b>1d{HD}</b> and add your <b>Con modifier ({sgn(m.Con)})</b>. Minimum 1.<br /><span class="src">Average is {avg} hp with your Con.</span> Some tables let you take the average instead of rolling.</>,
    extra: (
      <div class="hproll">
        <button onClick={() => { const r = 1 + Math.floor(Math.random() * HD); setRolled(r); setHp(Math.max(1, r + m.Con)); }}>{rolled ? `Rolled ${rolled}` : `Roll 1d${HD}`}</button>
        <button onClick={() => { setRolled(null); setHp(avg); }}>Take average</button>
        <span class="big2">{hp != null ? sgn(hp) : ''}</span>
        <input type="number" class="w3" placeholder="or type" onChange={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (!isNaN(v)) setHp(v); }} />
      </div>
    ),
  });
  const babD = babOf(to) - babOf(from);
  steps.push(babD
    ? { name: 'Base attack bonus', num: `${sgn(babOf(from))} → ${sgn(babOf(to))}`, w: <>Wizard is a <b>poor BAB</b> class — half your level, rounded down.<br />Your melee and ray attacks both go up by {babD}.</> }
    : { name: 'Base attack bonus', num: sgn(babOf(to)), w: 'No change. Wizard BAB only ticks up on even levels.' });
  const sv: ComponentChildren[] = [];
  if (poor(to) !== poor(from)) sv.push(<>Fort <b>{sgn(poor(from) + m.Con)} → {sgn(poor(to) + m.Con)}</b></>, <>Ref <b>{sgn(poor(from) + m.Dex)} → {sgn(poor(to) + m.Dex)}</b></>);
  if (good(to) !== good(from)) sv.push(<>Will <b>{sgn(good(from) + m.Wis)} → {sgn(good(to) + m.Wis)}</b></>);
  steps.push({
    name: 'Saving throws',
    w: sv.length ? <>{sv.map((s, i) => <>{i > 0 && ' · '}{s}</>)}<br />Wizard: Fort and Ref are <b>poor</b>, Will is <b>good</b>.</> : 'No change this level. Wizard poor saves rise every 3rd level, Will every 2nd.',
  });
  steps.push({
    todo: true, name: 'Skill ranks', num: `+${ranksPerLevel(m.Int)}`,
    w: <><b>2</b> from the wizard class <b>+ {m.Int}</b> from your Int modifier = <b>{ranksPerLevel(m.Int)}</b> new ranks.<br />Spend them on the Skills tab. Max ranks in any one skill = your level ({to}).</>,
  });
  const oldS = spellsPerDay(from), newS = spellsPerDay(to);
  const slotRows: ComponentChildren[] = [];
  let unlocked = 0;
  for (let lv = 1; lv <= 9; lv++) {
    const spec = ch.specialist ? 1 : 0;
    const oT = oldS[lv] > 0 ? oldS[lv] + bonusSp(m.Int, lv) + spec : 0;
    const nT = newS[lv] > 0 ? newS[lv] + bonusSp(m.Int, lv) + spec : 0;
    if (nT !== oT) {
      slotRows.push(<>Level {lv}: <b>{oT} → {nT}</b>{oT === 0 && <span class="src"> NEW SPELL LEVEL</span>}</>);
      if (oT === 0 && nT > 0) unlocked = lv;
    }
  }
  if (slotRows.length)
    steps.push({ name: 'Spells per day', w: <>{slotRows.map((r, i) => <>{i > 0 && <br />}{r}</>)}<br /><span class="src">Bonus spells from Int {ch.ab.Int}{ch.specialist ? ` and the ${ch.specialist} specialist slot` : ''} are included.</span></> });
  if (unlocked)
    steps.push({
      name: `Level ${unlocked} spells unlock`,
      w: <>You can now cast <b>level {unlocked}</b> spells.{unlocked === 3 && ch.book.some((b) => b.n === 'Animate Dead' && b.lv === 3) && <> That includes <span class="src">Animate Dead</span> (3rd level for you, table ruling 1).</>}</>,
    });
  steps.push({ todo: true, name: '2 free spells for your spellbook', w: <>Every wizard level, you add <b>2 spells of any level you can cast</b> to your book, free.<br />Add them on the Spellbook tab. You can also copy spells from scrolls and captured books.</> });
  if (to % 2 === 1) steps.push({ todo: true, name: 'New feat', w: <>You get a feat at every <b>odd</b> level. Add it on the Character tab.</> });
  if (to % 5 === 0)
    steps.push({ todo: true, name: 'Wizard bonus feat', w: <>Wizards get a bonus feat at levels <b>5, 10, 15, and 20</b>. Must be a metamagic feat, an item creation feat, or Spell Mastery.{ch.traits.some((t) => /magical lineage/i.test(t)) && <><br /><span class="src">A metamagic feat here is the one Magical Lineage discounts.</span></>}</> });
  if (to % 4 === 0) {
    const i = ch.ab.Int;
    steps.push({ todo: true, name: '+1 to one ability score', w: <>Every <b>4th</b> level. <span class="src">Int {i} → {i + 1} {(i + 1) % 2 === 0 ? 'raises your modifier' : 'does not change your modifier'}</span>; Con {ch.ab.Con} → {ch.ab.Con + 1} {(ch.ab.Con + 1) % 2 === 0 ? `would give you ${to} more hp` : 'does not change your modifier'}.</> });
  }
  if (ch.specialist === 'Necromancy') {
    const cf = undeadCaps(from, ch.tier, false), ct = undeadCaps(to, ch.tier, false);
    steps.push({ name: 'Undead you can control', w: <>Animate Dead pool: <b>{cf.strictCap} → {ct.strictCap} HD</b> (4 HD per effective caster level).<br />Command Undead feat: <b>{cf.cmdCap} → {ct.cmdCap} HD</b> (your level + 4 + tier).<br /><span class="src">Both grow every level. They stay separate pools.</span></> });
    steps.push({ name: 'Grave Touch', num: `${schoolPowerUses(m.Int)}/day`, w: <>Uses stay at 3 + Int mod. Duration is <b>{graveTouchRounds(to)} rounds</b> shaken (half your wizard level).</> });
  }
  if (ch.tier > 0) steps.push({ name: 'Mythic tier', num: String(ch.tier), w: <>Mythic tiers advance from <b>trials</b>, not from levelling. If your DM awarded one, change the tier box at the top — that updates your Mythic Power and Surge die.</> });

  const apply = async () => {
    if (hp == null) { alert('Roll your hit points first (or take the average).'); return; }
    await backup(`before level ${to}`); // rollback point before a one-way change
    update((d) => applyLevelUp(d, hp), `now wizard level ${to}`);
    onDone([
      <>Now <b>wizard level {to}</b></>,
      <>Max HP <b>+{hp}</b> → {ch.hpmax + hp}</>,
      <>Spell slots, BAB, and saves updated automatically</>,
      <span class="no">Still to do: spend your skill ranks, add 2 spells to your book{to % 2 === 1 ? ', pick a feat' : ''}{to % 4 === 0 ? ', raise an ability score' : ''}</span>,
    ]);
  };

  return (
    <div class="modal on" onClick={(e) => (e.target as HTMLElement).classList.contains('modal') && onClose()}>
      <div class="mbox">
        <h2>Level <em>{to}</em></h2>
        <div class="msub">Wizard {from} → {to} · everything that changes</div>
        {steps.map((s) => (
          <div class={'step ' + (s.todo ? 'todo' : 'done')}>
            <div class="st"><span class="sn">{s.name}{s.num && <span class="num">{s.num}</span>}</span></div>
            <div class="sw">{s.w}</div>
            {s.extra}
          </div>
        ))}
        <div class="mfoot">
          <button class="go" onClick={() => void apply()}>Apply everything</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
