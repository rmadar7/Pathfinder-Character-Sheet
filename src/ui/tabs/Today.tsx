// TODAY — the at-the-table view. Port of v36 renderToday() + renderHighlights().
import { useState } from 'preact/hooks';
import { METAMAGIC } from '../../data/metamagic';
import type { Character } from '../../model/types';
import { esc, good, poor, sgn } from '../../rules/core';
import { derive, type Derived } from '../../rules/derive';
import { fmtDur } from '../../rules/duration';
import { activeEffects } from '../../rules/effects';
import { adjustedLevel, dcLevel, magicalLineageSpell, metaFeats, metaLabel, preparableIn } from '../../rules/metamagic';
import { deathLine, mythicPower, surgeDie } from '../../rules/mythic-math';
import { concentrationDC, restHeal, SAMSARAN_SLAS, schoolPowerUses } from '../../rules/powers';
import {
  castCount, isSchoolSpell, prepareSpell, preparedCount, saveDC, schoolPrepared, schoolSlot, slots, specIndex, spellFocusBonus,
} from '../../rules/spells';
import { spellDice } from '../../rules/spellinfo';
import { mergeRes } from '../../rules/stacking';
import { capsOf, poolHD } from '../../rules/undead';
import { nextRound, setCast } from '../../rules/actions';
import { roll } from '../components/Dice';
import { EffectsManager } from '../components/EffectsManager';
import { Pip } from '../components/Pips';
import { receiptText, Rollable } from '../components/Receipt';
import { update, useCh } from '../store';

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------- HIGHLIGHTS: what is running, running out, or unfinished ---------- */
function highlights(ch: Character, C: Derived) {
  const L = ch.lvl, rows: { k: 'bad' | 'warn' | 'ok'; t: string; d: string }[] = [];
  const live = activeEffects(ch).filter((e) => (e.mods && e.mods.length) || e.kind === 'condition');
  const conds = live.filter((e) => e.kind === 'condition');
  if (conds.length) rows.push({ k: 'bad', t: conds.map((c) => c.name).join(', '), d: 'Conditions on you right now.' });
  for (const e of live.filter((e) => e.left != null && e.left <= 3)) rows.push({ k: 'warn', t: `${e.name} — ${fmtDur(e.left)}`, d: 'About to end.' });
  const running = live.filter((e) => e.left == null && e.kind !== 'condition');
  if (running.length) rows.push({ k: 'ok', t: running.map((e) => e.name).join(' · '), d: 'Running with no time limit.' });

  const pct = ch.hpmax ? Math.round((ch.hp / ch.hpmax) * 100) : 0;
  if (ch.hp <= 0) rows.push({ k: 'bad', t: `${ch.hp} hp`, d: ch.tier > 0 ? `Hard to Kill: stable and unconscious. You die at ${deathLine(ch.ab.Con)}.` : 'Dying.' });
  // v36 said "Resting restores 2 × level" here but 1 × level in the help; ruling 5 is 2 ×.
  else if (pct <= 25) rows.push({ k: 'bad', t: `${ch.hp} of ${ch.hpmax} hp`, d: `Resting restores ${restHeal(L)}.` });
  else if (pct <= 50) rows.push({ k: 'warn', t: `${ch.hp} of ${ch.hpmax} hp`, d: 'Bloodied.' });

  for (let lv = 1; lv <= 9; lv++) {
    const n = slots(ch, lv, C.m.Int);
    if (!n) continue;
    const open = n - castCount(ch, lv), empty = n - preparedCount(ch, lv);
    if (empty > 0) rows.push({ k: 'warn', t: `Level ${lv}: ${empty} slot${empty === 1 ? '' : 's'} unprepared`, d: 'Nothing is in them.' });
    else if (open === 0) rows.push({ k: 'warn', t: `Level ${lv}: nothing left today`, d: 'All spent.' });
  }
  if (ch.specialist)
    for (let lv = 1; lv <= 9; lv++) {
      const ss = schoolSlot(ch, lv);
      if (!ss || schoolPrepared(ch, lv) >= ss) continue;
      const n = slots(ch, lv, C.m.Int);
      rows.push({
        k: 'warn', t: `Level ${lv} ${ch.specialist} slot going to waste`,
        d: preparedCount(ch, lv) >= n ? `All ${n} slots are full and none is ${ch.specialist} — swap one out.` : `One of those slots only holds ${ch.specialist}.`,
      });
    }
  for (const g of ch.gear) {
    if (!g.uses) continue;
    if (g.uses.cur === 0) rows.push({ k: 'bad', t: `${g.n} — empty`, d: g.uses.regain > 0 ? `Back ${g.uses.regain}/day.` : 'Gone until you buy more.' });
    else if (g.uses.max > 2 && g.uses.cur <= Math.ceil(g.uses.max * 0.25)) rows.push({ k: 'warn', t: `${g.n} — ${g.uses.cur} left`, d: 'Running low.' });
  }
  const food = ch.gear.filter((g) => /ration|food/i.test(g.n || '')).reduce((a, g) => a + Math.max(0, +(g.qty ?? 0) || 0), 0);
  const shelter = ch.gear.some((g) => /bedroll|tent|blanket/i.test(g.n || '') && Math.max(0, +(g.qty ?? 0) || 0) > 0);
  if (!food) rows.push({ k: 'bad', t: 'No rations', d: 'Nothing to eat tonight.' });
  else if (food <= 2) rows.push({ k: 'warn', t: `${food} day${food === 1 ? '' : 's'} of rations left`, d: 'Restock soon.' });
  if (!shelter) rows.push({ k: 'warn', t: 'No shelter', d: 'No bedroll or tent in your inventory.' });

  const gt = schoolPowerUses(C.m.Int), mpM = mythicPower(ch.tier);
  if (mpM && mpM - ch.used.mythic === 0) rows.push({ k: 'bad', t: 'Mythic power spent', d: 'No Wild Arcana, no Surge.' });
  if (ch.specialist === 'Necromancy' && gt - ch.used.cmd === 0) rows.push({ k: 'warn', t: 'Command Undead spent', d: 'No attempts left today.' });
  const caps = capsOf(ch), animHD = poolHD(ch, 'anim'), cmdHD = poolHD(ch, 'cmd');
  if (animHD > caps.strictCap) rows.push({ k: 'bad', t: `Animate Dead over cap: ${animHD} of ${caps.strictCap} HD`, d: 'The excess breaks free.' });
  if (cmdHD > caps.cmdCap) rows.push({ k: 'bad', t: `Command Undead over cap: ${cmdHD} of ${caps.cmdCap} HD`, d: 'The excess breaks free.' });
  const order = { bad: 0, warn: 1, ok: 2 };
  return rows.sort((a, b) => order[a.k] - order[b.k]);
}

function Highlights({ ch, C }: { ch: Character; C: Derived }) {
  const rows = highlights(ch, C);
  if (!rows.length) return <div id="highlights"><div class="hl ok"><span class="hlt">Nothing outstanding.</span></div></div>;
  return (
    <div id="highlights">
      {rows.map((r) => <div class={'hl ' + r.k}><span class="hlt">{r.t}</span><span class="hld">{r.d}</span></div>)}
    </div>
  );
}

/* ---------- the numbers you get asked for mid-combat ---------- */
function DefenceStrip({ ch, C }: { ch: Character; C: Derived }) {
  const { m, R } = C, L = ch.lvl;
  const dexP = `${sgn(m.Dex)} Dex`;
  const mf = ch.sv.fort ? ` ${sgn(ch.sv.fort)} misc` : '', mr = ch.sv.ref ? ` ${sgn(ch.sv.ref)} misc` : '', mw = ch.sv.will ? ` ${sgn(ch.sv.will)} misc` : '';
  const reactionary = ch.traits.some((t) => /^reactionary/i.test(t));
  const rows: [string, number | string, string, string, string, boolean?, number?][] = [
    ['AC', C.AC, R.ac.suppressed.length ? `${R.ac.suppressed.length} suppressed` : 'incl. effects', 'Armor Class', receiptText(['10 base', dexP], R.ac), true],
    ['Touch', C.touch, '', 'Touch AC', receiptText(['10 base', dexP], R.acT, { hideSuppressed: true }) + '. Armor, shield and natural armor never count against a touch attack.', true],
    ['Flat-ft', C.ff, '', 'Flat-Footed AC', receiptText(['10 base', 'you lose your ' + dexP + ' bonus'], R.acFF, { hideSuppressed: true }) + '. Dodge bonuses drop too.', true],
    ['Fort', sgn(C.fort), '', 'Fortitude save', receiptText([`${poor(L)} base (wizard poor)`, `${sgn(m.Con)} Con${mf}`], mergeRes(R.svAll, R.fortR)), false, C.fort],
    ['Ref', sgn(C.ref), '', 'Reflex save', receiptText([`${poor(L)} base (wizard poor)`, `${sgn(m.Dex)} Dex${mr}`], mergeRes(R.svAll, R.refR)), false, C.ref],
    ['Will', sgn(C.will), 'good save', 'Will save', receiptText([`${good(L)} base (wizard good)`, `${sgn(m.Wis)} Wis${mw}`], mergeRes(R.svAll, R.willR)), false, C.will],
    ['Init', sgn(C.init), '', 'Initiative', receiptText([`${sgn(m.Dex)} Dex`, `${sgn(ch.initMisc)} misc${reactionary && ch.initMisc === 2 ? ' (Reactionary)' : ''}`], R.initR), false, C.init],
    ['CMD', C.cmd, '', 'Combat Maneuver Defense', receiptText(['10', `${sgn(C.bab)} BAB`, `${sgn(m.Str)} Str`, `${sgn(m.Dex)} Dex`, C.sizeCM ? `${sgn(C.sizeCM)} special size` : ''], mergeRes(R.acToCMD, R.cmdR)), true],
    ['Ranged touch', sgn(C.ranged), 'rays', 'Ranged / ray attack', receiptText([`${sgn(C.bab)} BAB`, `${sgn(m.Dex)} Dex`], mergeRes(R.atkR, R.rngR)), false, C.ranged],
    ['Concentration', sgn(C.conc), 'if disrupted', 'Concentration', receiptText([`${L} caster level`, `${sgn(m.Int)} Int`], mergeRes(R.clR, R.concR)) + '. DC 10 + damage taken + spell level.', false, C.conc],
  ];
  // AC, touch, flat-footed and CMD are numbers an enemy rolls against, so no dice handle.
  return (
    <div class="big">
      {rows.map(([l, v, w, ct, cc, noRoll, rv]) => (
        <div class="c" data-calc-title={ct} data-calc={esc(cc)}>
          <div class="l">{l}</div>
          <div class="v">{noRoll ? v : <Rollable v={rv!} label={l}>{v}</Rollable>}</div>
          <div class="w">{w}</div>
        </div>
      ))}
    </div>
  );
}

function Concentration({ conc }: { conc: number }) {
  const [dmg, setDmg] = useState(0);
  const [lvl, setLvl] = useState(1);
  const [res, setRes] = useState<{ t: number; dc: number } | null>(null);
  const dc = concentrationDC(dmg, lvl);
  return (
    <div class="conc">
      <span class="concl">Disrupted mid-cast?</span>
      <label class="bl">damage taken<input type="number" class="w3" value={dmg} min={0} onInput={(e) => setDmg(Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))} /></label>
      <label class="bl">spell level<input type="number" class="w3" value={lvl} min={0} max={9} onInput={(e) => setLvl(Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))} /></label>
      <span class="concdc">DC <b>{dc}</b></span>
      <button class="go" onClick={() => setRes({ t: roll('Concentration', conc), dc })}>Roll {sgn(conc)}</button>
      <span class="concr">
        {res && (res.t >= res.dc
          ? <span style="color:var(--grave)">{res.t} vs DC {res.dc} — the spell holds</span>
          : <span style="color:var(--rust)">{res.t} vs DC {res.dc} — spell lost, slot gone</span>)}
      </span>
    </div>
  );
}

function MetamagicCard({ ch }: { ch: Character }) {
  const have = metaFeats(ch);
  const rows = Object.entries(METAMAGIC)
    .map(([n, f]) => ({ n, f, mine: have.includes(n) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.f.adj - b.f.adj || a.n.localeCompare(b.n));
  const ml = magicalLineageSpell(ch);
  return (
    <div class="card">
      <h3 data-help="metamagic">Metamagic<span class="nt">bend a spell, pay a bigger slot</span> <span class="qm">?</span></h3>
      <div class="why">
        A metamagic spell fills a <b>higher slot</b> than normal, but its level does not really change — <b>the save DC stays the same</b>. Heighten Spell is the one exception, and its DC does go up.<br />
        You choose metamagic when you prepare: an empty slot below offers lower-level spells that your feats can lift into it.
      </div>
      {!have.length && <div class="flag">You have no metamagic feat yet. Your 5th-level wizard bonus feat can be one, and that is the moment this list starts working.</div>}
      <table><tbody>
        <tr><th>Feat</th><th style="text-align:right;width:58px">Slot</th></tr>
        {rows.map((r) => (
          <tr class={r.mine ? 'mmine' : ''}>
            <td>{r.n}{r.mine && <> <span class="badge on">you have this</span></>}
              <div class="mmd">{r.f.d}{r.f.pre && <> <span class="mmpre">Needs {r.f.pre}</span></>}</div></td>
            <td class="n"><b>{r.f.varies ? 'varies' : '+' + r.f.adj}</b></td>
          </tr>
        ))}
      </tbody></table>
      {ml && (
        <div class="note2">
          Magical Lineage ({titleCase(ml)}) takes 1 level back off any metamagic you put on that spell, but never below its own level. With Extend Spell that makes an extended {titleCase(ml)} cost its normal slot.
        </div>
      )}
    </div>
  );
}

/* ---------- prepared spells, slot by slot ---------- */
function SlotGroup({ ch, lv, C }: { ch: Character; lv: number; C: Derived }) {
  const n = slots(ch, lv, C.m.Int);
  const open = n - castCount(ch, lv);
  const spec = ch.specialist;
  const fbN = spellFocusBonus(ch, spec);
  const ss = schoolSlot(ch, lv);
  const schoolN = schoolPrepared(ch, lv);
  const si = specIndex(ch, lv);
  const ml = magicalLineageSpell(ch);
  const cards = [];
  for (let i = 0; i < n; i++) {
    const nm = ch.prep[lv]?.[i];
    if (!nm) {
      // Fill it here — bouncing to the Spellbook to place eleven spells every morning was
      // the single most repeated action on the sheet.
      const isSpec = i === si;
      const choices = preparableIn(ch, lv, isSpec);
      cards.push(
        <div class={'slotfill' + (isSpec ? ' specslot' : '')}>
          <select title={isSpec ? `This slot only holds ${spec} spells.` : undefined} value=""
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              const pick = choices[+v];
              if (v === '' || !pick) return;
              update((d) => prepareSpell(d, lv, pick.n, pick.metas));
            }}>
            <option value="">{isSpec ? `${spec} slot — choose a spell…` : 'Empty slot — choose a spell…'}</option>
            {choices.map((x, ci) => (
              <option value={ci}>
                {x.n}{x.metas.length ? ` + ${metaLabel(x.metas)} (a level ${x.base} spell)` : ''}{x.sc === spec ? ' — ' + spec : ''}
              </option>
            ))}
          </select>
          {isSpec && <span class="slotneed">{spec} only · specialist slot</span>}
        </div>,
      );
      continue;
    }
    const metas = ch.prepMeta[lv]?.[i] || [];
    const baseLv = (ch.book.find((x) => x.n === nm) || { lv }).lv;
    const sp = ch.book.find((x) => x.n === nm && x.lv === baseLv) || { n: nm, sc: '?', d: '', lv: baseLv };
    const spent = !!ch.cast[lv]?.[i];
    const dc = saveDC(ch, dcLevel(baseLv, metas), sp.sc, C.m.Int);
    const fb = spellFocusBonus(ch, sp.sc);
    const adj = adjustedLevel(ml, nm, baseLv, metas);
    const wrongSpec = i === si && !isSchoolSpell(ch, nm, lv);
    cards.push(
      <div class={'rc' + (sp.sc === 'Necromancy' ? ' necro' : '') + ('gm' in sp && sp.gm ? ' gm' : '') + (spent ? ' spent' : '') + (wrongSpec ? ' wrongspec' : '')}
        data-spell={`${sp.lv}|${sp.n}`}>
        <div class="rl">
          <div class="n">{nm}</div>
          {sp.d && <div class="d">{sp.d}</div>}
          <div class="dc">Save DC {dc}{fb ? ` · includes +${fb} Spell Focus` : ''}</div>
          {wrongSpec && <div class="dc" style="color:var(--rust)">This is the {spec} specialist slot — {nm} cannot go here. Unprepare it and pick a {spec} spell.</div>}
          {i === si && !wrongSpec && <div class="dc" style="color:var(--grave)">{spec} specialist slot</div>}
          {metas.length > 0 && (
            <div class="dc" style="color:var(--gold)">
              {metaLabel(metas)} · a level {baseLv} spell in a level {adj.level} slot{adj.lineage ? ' · Magical Lineage −1' : ''} · {dcLevel(baseLv, metas) === baseLv ? 'save DC unchanged' : 'DC raised by Heighten'}
            </div>
          )}
        </div>
        {spellDice(sp).map((d) => (
          <button class="sm" title={`Roll ${d.label} for ${sp.n}`} onClick={() => roll(`${sp.n} — ${d.label}`, 0, { die: d.die, n: d.n })}>{d.label}</button>
        ))}
        <button class={spent ? '' : 'go'} onClick={() => update((d) => setCast(d, lv, i, !spent))}>{spent ? 'Give it back' : 'Cast'}</button>
      </div>,
    );
  }
  return (
    <div class="rgroup">
      <div class="rghd">
        <span class="t">Level {lv}</span>
        <span class="c">
          {open} of {n} left today · save DC {saveDC(ch, lv, null, C.m.Int)}
          {fbN > 0 && <> (<span style="color:var(--grave)">{saveDC(ch, lv, spec, C.m.Int)} {spec.toLowerCase()}</span>)</>}
          {ss > 0 && <> · <span style={{ color: schoolN >= ss ? 'var(--grave)' : 'var(--rust)' }}>includes {ss} {spec}-only slot{schoolN >= ss ? '' : ` — nothing ${spec} prepared here`}</span></>}
        </span>
      </div>
      {cards}
    </div>
  );
}

function Brug({ ch }: { ch: Character }) {
  const B = ch.brug!;
  const f = (k: keyof typeof B, label: string) => (
    <label class="bl">{label}<input type="number" class="w3" value={B[k] as number} onChange={(e) => update((d) => void ((d.brug as any)[k] = parseInt((e.target as HTMLInputElement).value) || 0))} /></label>
  );
  return (
    <div class="card">
      <h3 data-help="brug">{B.name} <span class="qm">?</span></h3>
      <div class="brugtop">
        <span class="brugn">{B.name}</span>
        <span class="brughp">
          <input type="number" class="w4" value={B.hp} onChange={(e) => update((d) => void (d.brug!.hp = parseInt((e.target as HTMLInputElement).value) || 0))} />
          <span class="sl2">/</span>
          <input type="number" class="w3" value={B.hpmax} onChange={(e) => update((d) => void (d.brug!.hpmax = parseInt((e.target as HTMLInputElement).value) || 0))} /> hp
        </span>
      </div>
      <div class="brugrow">{f('ac', 'AC')}{f('touch', 'Touch')}{f('ff', 'FF')}{f('fort', 'Fort')}{f('ref', 'Ref')}{f('will', 'Will')}</div>
      <table><tbody>
        <tr><th>Attack</th><th style="text-align:right">To hit</th><th style="text-align:right">Damage</th></tr>
        {B.attacks.map((a) => {
          const dm = (a.dmg || '').match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/);
          return (
            <tr>
              <td>{a.n}</td>
              <td class="n"><b><Rollable v={a.hit} label={`${B.name} — ${a.n}`} /></b></td>
              <td class="n">{a.dmg} · {a.crit || ''}{' '}
                {dm && <button class="sm" onClick={() => roll(`${B.name} — ${a.n}`, dm[3] ? parseInt(dm[3].replace(/\s/g, '')) : 0, { die: +dm[2], n: +dm[1] })}>roll</button>}
              </td>
            </tr>
          );
        })}
      </tbody></table>
      <div class="note2" style="margin-top:8px">
        {B.note} Str {B.ab.Str} · Dex {B.ab.Dex} · Con {B.ab.Con} · Int {B.ab.Int} · Wis {B.ab.Wis} · Cha {B.ab.Cha} · Speed {B.speed} ft · {B.size}
      </div>
      <div class="flag g">Cast <b>Enlarge Person</b> on him: Huge, +2 Str, reach 15 ft. That is the best use of a 1st-level slot in a fight.</div>
    </div>
  );
}

export function Today() {
  const ch = useCh();
  const C = derive(ch);
  const m = C.m;
  const [ended, setEnded] = useState('');

  let empty = 0, total = 0;
  const levels: number[] = [];
  for (let lv = 1; lv <= 9; lv++) {
    const n = slots(ch, lv, m.Int);
    if (!n) continue;
    levels.push(lv);
    total += n;
    empty += n - preparedCount(ch, lv);
  }
  const gt = schoolPowerUses(m.Int), mpM = mythicPower(ch.tier);
  const isNecro = ch.specialist === 'Necromancy'; // CHARACTER-SPECIFIC school powers
  const isSamsaran = (ch.identity.race || '') === 'Samsaran'; // CHARACTER-SPECIFIC spell-likes

  return (
    <>
      <Highlights ch={ch} C={C} />
      {empty > 0 && (
        <div class="prep">
          <span class="prepn"><b>{empty}</b> of {total} slots still empty</span>
          <button onClick={() => confirm('Clear every prepared spell?') && update((d) => { for (let lv = 1; lv <= 9; lv++) { d.prep[lv] = []; d.cast[lv] = []; d.prepMeta[lv] = []; } })}>
            Clear all prepared
          </button>
        </div>
      )}
      <MetamagicCard ch={ch} />
      <Concentration conc={C.conc} />
      <DefenceStrip ch={ch} C={C} />

      {levels.length ? levels.map((lv) => <SlotGroup ch={ch} lv={lv} C={C} />) : <div class="empty2">No spell slots at this level.</div>}

      <div class="card">
        <h3>At will — no limit</h3>
        {ch.book.filter((s) => s.lv === 0).map((s) => (
          <span class={'atw' + (s.sc === 'Necromancy' ? ' n' : '')} data-spell={`0|${s.n}`}>
            {s.n} <span class="d2">DC {saveDC(ch, 0, s.sc, m.Int)}</span>
          </span>
        ))}
        {!ch.book.some((s) => s.lv === 0) && <span style="color:var(--faint);font-style:italic">No cantrips in your book.</span>}
      </div>

      <div class="card">
        <h3>Other things you can do today</h3>
        {ch.gear.map((it, i) => it.uses && (
          <Pip name={it.n} sub={it.desc} cur={it.uses.cur} max={it.uses.max} cls={it.cls || 'r'} help={it.help}
            onSet={(v) => update((d) => void (d.gear[i].uses!.cur = v))} />
        ))}
        {isNecro && (
          <>
            <Pip name="Command Undead" sub={<><span class="src">Power over Undead</span> — enslave one undead within 30 ft · Will negates</>}
              cur={gt - ch.used.cmd} max={gt} cls="g" help="commandUndead" onSet={(v) => update((d) => void (d.used.cmd = gt - v))} />
            {ch.subschool === 'undead'
              ? <Pip name="Bolster" sub={<><span class="src">Undead subschool</span> — buff one of your undead</>} cur={gt - ch.used.grave} max={gt} cls="g" onSet={(v) => update((d) => void (d.used.grave = gt - v))} />
              : <Pip name="Grave Touch" sub="Melee touch — target is shaken" cur={gt - ch.used.grave} max={gt} cls="g" help="graveTouch" onSet={(v) => update((d) => void (d.used.grave = gt - v))} />}
          </>
        )}
        <Pip name="Bonded amulet" sub={<span class="src">1/day — cast any spell from your book WITHOUT preparing it</span>}
          cur={1 - (ch.used.bond || 0)} max={1} cls="y" help="bonded" onSet={(v) => update((d) => void (d.used.bond = 1 - v))} />
        {ch.tier > 0 && (
          <Pip name="Mythic Power" sub={'Wild Arcana · Surge ' + surgeDie(ch.tier)} cur={mpM - ch.used.mythic} max={mpM} cls="y" help="mythicPower"
            onSet={(v) => update((d) => void (d.used.mythic = mpM - v))} />
        )}
        {isSamsaran && SAMSARAN_SLAS.map(([k, n, hk]) => (
          <Pip name={n} sub={<span class="src">Samsaran racial — 1/day</span>} cur={1 - ch.used[k]} max={1} help={hk} onSet={(v) => update((d) => void (d.used[k] = 1 - v))} />
        ))}
      </div>

      <div class="card">
        <h3>Recent hit point changes</h3>
        {ch.hplog.length ? ch.hplog.map((e) => {
          const dv = e.to - e.from;
          return (
            <div class="hprow">
              <span class="hpd" style={{ color: dv >= 0 ? 'var(--grave)' : 'var(--rust)' }}>{dv >= 0 ? '+' : ''}{dv}</span>
              <span class="hpn2">{e.note}</span>
              <span class="hpt">{e.from} → {e.to}</span>
            </div>
          );
        }) : <div class="empty2">Nothing recorded yet.</div>}
      </div>

      {ch.brug && <Brug ch={ch} />}

      <div class="card">
        <h3 data-help="buffs">Active effects <span class="qm">?</span></h3>
        <div class="rounds">
          <span data-help="round" class="rlbl">Combat round <span class="qm">?</span></span>
          <span class="rn2">{ch.round || 0}</span>
          <button class="go" onClick={() => { let e: string[] = []; update((d) => void (e = nextRound(d))); setEnded(e.length ? 'ended: ' + e.join(', ') : ''); }}>Next round ▸</button>
          <button onClick={() => update((d) => void (d.round = 0))}>End combat</button>
          {ended && <span class="note2">{ended}</span>}
        </div>
        <EffectsManager />
      </div>
    </>
  );
}
