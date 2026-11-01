// THE effects manager: one list, toggle a thing and every number that depends on it moves.
// Rendered on Today and on Combat (ARCHITECTURE U7). Port of v36 renderEffects().

import { useState } from 'preact/hooks';
import { CONDITIONS, QUICK_EFFECTS } from '../../data/effects';
import type { Character, Effect, Mod } from '../../model/types';
import { sgn } from '../../rules/core';
import { durToRounds, fmtDur } from '../../rules/duration';
import { allEffects, ctxOf, mythicEffectId } from '../../rules/effects';
import { modValue } from '../../rules/stacking';
import { targetLabel as statName } from '../../rules/targets';
import { CustomEffectForm } from './BonusEditor';
import { update, useCh } from '../store';


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
          {mo.when && <i> — only {mo.when}</i>}
        </>
      ))}
    </>
  );
}

export const modSummaryText = (ch: Character, mods: Mod[]) =>
  mods.map((mo) => `${sgn(modValue(mo, ctxOf(ch)))} ${mo.type && mo.type !== 'untyped' ? mo.type + ' ' : ''}to ${statName(mo.stat)}${mo.when ? ` (only ${mo.when})` : ''}`).join(' · ');

export function EffectsManager() {
  const ch = useCh();
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
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

  /** Add a new custom effect, or replace the one being edited (same id). */
  const saveCustom = (e: Effect | null) => {
    if (e) update((d) => {
      const at = d.effects.findIndex((x) => x.id === e.id);
      if (at >= 0) d.effects[at] = e; else d.effects.push(e);
    });
    setBuilding(false);
    setEditing(null);
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
              {e.kind === 'manual' && (
                <button class="x" title="Edit this effect" onClick={() => setEditing(editing === e.id ? null : e.id)}>✎</button>
              )}
              {!e.locked && (
                <button class="x" title="Remove this effect entirely" onClick={() => update((d) => void (d.effects = d.effects.filter((x) => x.id !== e.id)))}>
                  ×
                </button>
              )}
            </div>
            <div class="fxm">
              <ModSummary ch={ch} mods={e.mods} />
            </div>
            {editing === e.id && <CustomEffectForm initial={ch.effects.find((x) => x.id === e.id)} onDone={saveCustom} />}
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
          <div class="sechd">Something else — a DM gift, a blessing, a homebrew bonus</div>
          {building
            ? <CustomEffectForm onDone={saveCustom} />
            : <button class="sm" onClick={() => setBuilding(true)}>+ Build a custom bonus</button>}
        </>
      )}
    </div>
  );
}
