// THE effects manager: one list, toggle a thing and every number that depends on it moves.
// Rendered on Today and on Combat (ARCHITECTURE U7). Port of v36 renderEffects().

import { useState } from 'preact/hooks';
import { CONDITIONS, QUICK_EFFECTS } from '../../data/effects';
import type { Character, Mod } from '../../model/types';
import { sgn } from '../../rules/core';
import { durToRounds, fmtDur } from '../../rules/duration';
import { allEffects, ctxOf, mythicEffectId } from '../../rules/effects';
import { BONUS_TYPES, modValue, STATS } from '../../rules/stacking';
import { update, useCh } from '../store';

const STAT_LABEL = Object.fromEntries(STATS);
const statName = (st: string) => (st.startsWith('skill:') ? st.slice(6) : STAT_LABEL[st] || st);

/** "+5 armor to Armor Class · −2 to Dexterity score" */
export function ModSummary({ ch, mods }: { ch: Character; mods: Mod[] }) {
  if (!mods || !mods.length) return <span class="note2">no mechanical bonus — just a reminder</span>;
  const ctx = ctxOf(ch);
  return (
    <>
      {mods.map((mo, i) => (
        <>
          {i > 0 && <> &nbsp;·&nbsp; </>}
          {sgn(modValue(mo, ctx))} {mo.type && mo.type !== 'untyped' ? mo.type + ' ' : ''}to <b>{statName(mo.stat)}</b>
        </>
      ))}
    </>
  );
}

export const modSummaryText = (ch: Character, mods: Mod[]) =>
  mods.map((mo) => `${sgn(modValue(mo, ctxOf(ch)))} ${mo.type && mo.type !== 'untyped' ? mo.type + ' ' : ''}to ${statName(mo.stat)}`).join(' · ');

export function EffectsManager() {
  const ch = useCh();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ n: '', stat: 'ac', type: 'untyped', v: 2, rds: '' });
  const all = allEffects(ch);

  const toggle = (id: string, on: boolean) =>
    update((d) => {
      const stored = d.effects.find((e) => e.id === id);
      if (stored) { stored.on = !on; return; }
      const my = d.mythic.abilities.find((a) => mythicEffectId(a.name) === id);
      if (my) { my.on = !on; return; }
      if (id.startsWith('sys-cond-')) { d.conditions = d.conditions.filter((c) => 'sys-cond-' + c !== id); return; }
      if (id.startsWith('gear-')) {
        // switching it off = taking it off
        const it = d.gear.find((x) => 'gear-' + x.id === id);
        if (it) it.slot = 'carried';
      }
      // Amazing Initiative isn't optional.
    });

  const quick = (q: (typeof QUICK_EFFECTS)[number]) =>
    update((d) => {
      // These TOGGLE: two copies of a PENALTY stack, so a second Reduce Person would cost
      // another 2 Str.
      const at = d.effects.findIndex((e) => (e.name || '').toLowerCase() === q.name.toLowerCase());
      if (at >= 0) { d.effects.splice(at, 1); return; }
      d.effects.push({
        id: 'fx' + Date.now(), name: q.name, src: q.src, kind: /item/.test(q.src) ? 'item' : 'spell',
        on: true, dur: q.dur || null, left: durToRounds(q.dur, d.lvl), mods: structuredClone(q.mods),
      });
    });

  const addCustom = () => {
    const n = form.n.trim();
    if (!n) return;
    const rds = parseInt(form.rds);
    update((d) => {
      d.effects.push({
        id: 'fx' + Date.now(), name: n, src: 'added by hand', kind: 'manual', on: true,
        dur: isNaN(rds) ? null : { u: 'rd', n: rds }, left: isNaN(rds) ? null : rds,
        mods: [{ stat: form.stat, type: form.type, v: +form.v || 0 }],
      });
    });
    setForm({ ...form, n: '' });
  };

  return (
    <div>
      {!all.length && <div class="empty2">Nothing running.</div>}
      {all.map((e) => {
        const on = e.on !== false;
        const ending = e.left != null && e.left <= 2;
        return (
          <div class={'fx ' + (on ? 'on ' : 'off ') + (e.kind || '') + (ending ? ' ending' : '')}>
            <div class="fxh">
              <button class={'tgl' + (on ? ' on' : '')} title={on ? 'Active — click to switch off' : 'Off — click to switch on'}
                aria-label={(on ? 'Switch off ' : 'Switch on ') + e.name} onClick={() => toggle(e.id, on)} />
              <div class="fxn">
                {e.name}
                {e.src && <span class="fxsrc">{e.src}</span>}
              </div>
              {e.locked && <span class="lockpill">{e.kind === 'condition' ? 'condition' : e.kind === 'item' ? 'worn' : 'mythic'}</span>}
              <span class="fxt">{fmtDur(e.left)}</span>
              {!e.locked && (
                <button class="x" title="Remove this effect entirely" onClick={() => update((d) => void (d.effects = d.effects.filter((x) => x.id !== e.id)))}>
                  ×
                </button>
              )}
            </div>
            <div class="fxm">
              <ModSummary ch={ch} mods={e.mods} />
            </div>
          </div>
        );
      })}

      <button class="sm" style="margin-top:10px" onClick={() => setAdding(!adding)}>
        {adding ? '✕ Close' : '+ Add an effect or condition'}
      </button>
      {adding && (
        <>
          <div class="sechd">Spells and items</div>
          {QUICK_EFFECTS.map((q) => {
            const running = ch.effects.some((e) => (e.name || '').toLowerCase() === q.name.toLowerCase());
            return (
              <button class={'qbtn' + (running ? ' go' : '')} title={(running ? 'Running — click to end it. ' : '') + modSummaryText(ch, q.mods)} onClick={() => quick(q)}>
                {q.name}
              </button>
            );
          })}
          <div class="sechd">Conditions on you</div>
          {Object.entries(CONDITIONS).map(([k, c]) => {
            const has = ch.conditions.includes(k);
            return (
              <button class={'qbtn' + (has ? ' go' : '')} title={c.b}
                onClick={() => update((d) => void (d.conditions = has ? d.conditions.filter((x) => x !== k) : [...d.conditions, k]))}>
                {c.t}
              </button>
            );
          })}
          <div class="sechd">Or build one by hand</div>
          <div class="addrow">
            <input placeholder="Name — e.g. Cat's Grace" style="flex:2;min-width:120px" value={form.n}
              onInput={(e) => setForm({ ...form, n: (e.target as HTMLInputElement).value })}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
            <select style="flex:1;min-width:120px" value={form.stat} onChange={(e) => setForm({ ...form, stat: (e.target as HTMLSelectElement).value })}>
              {STATS.map(([k, l]) => <option value={k}>{l}</option>)}
            </select>
            <select style="width:110px" value={form.type} onChange={(e) => setForm({ ...form, type: (e.target as HTMLSelectElement).value })}>
              {BONUS_TYPES.map((t) => <option>{t}</option>)}
            </select>
            <input type="number" class="w3" value={form.v} title="bonus (negative for a penalty)"
              onInput={(e) => setForm({ ...form, v: parseInt((e.target as HTMLInputElement).value) || 0 })} />
            <input type="number" class="w3" placeholder="rds" value={form.rds} title="rounds — blank for ongoing"
              onInput={(e) => setForm({ ...form, rds: (e.target as HTMLInputElement).value })} />
            <button class="go" onClick={addCustom}>Add</button>
          </div>
        </>
      )}
    </div>
  );
}
