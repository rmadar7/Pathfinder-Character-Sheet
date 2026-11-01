// Building a bonus by hand: a DM gift, a homebrew item, a blessing from a shrine. The player
// picks what it applies to and what kind of bonus it is from lists, never free text, so the
// engine can apply it and stack it correctly. One component, used by the effects manager and
// by the item editor (ARCHITECTURE U7).

import { useState } from 'preact/hooks';
import type { Duration, Effect, Mod } from '../../model/types';
import { durToRounds } from '../../rules/duration';
import { BONUS_TYPES } from '../../rules/stacking';
import { TARGET_GROUPS, typeHint } from '../../rules/targets';
import { ModSummary } from './EffectsManager';
import { useCh } from '../store';

export const blankMod = (): Mod => ({ stat: 'atk', type: 'untyped', v: 1 });

/** The list of bonuses: what it applies to, what type, how much, and (optionally) when. */
export function BonusRows({ mods, onChange }: { mods: Mod[]; onChange: (m: Mod[]) => void }) {
  const ch = useCh();
  const set = (i: number, patch: Partial<Mod>) => onChange(mods.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div class="bonusrows">
      {mods.map((mo, i) => (
        <div class="bonusrow">
          <div class="gerow">
            <label class="gil">gives</label>
            <input type="number" class="w3" value={mo.v ?? 0} title="Use a negative number for a penalty"
              onInput={(e) => set(i, { v: parseInt((e.target as HTMLInputElement).value) || 0 })} />
            <select style="width:118px" value={mo.type || 'untyped'} aria-label="Bonus type"
              onChange={(e) => set(i, { type: (e.target as HTMLSelectElement).value })}>
              {BONUS_TYPES.map((t) => <option value={t}>{t}</option>)}
            </select>
            <label class="gil">to</label>
            <select style="flex:1;min-width:150px" value={mo.stat} aria-label="Applies to"
              onChange={(e) => set(i, { stat: (e.target as HTMLSelectElement).value })}>
              {TARGET_GROUPS.map((g) => (
                <optgroup label={g.g}>{g.items.map(([k, l]) => <option value={k}>{l}</option>)}</optgroup>
              ))}
            </select>
            <button class="x" title="Remove this bonus" onClick={() => onChange(mods.filter((_, j) => j !== i))}>×</button>
          </div>
          <div class="gerow">
            <label class="gil">only when</label>
            <input style="flex:1" value={mo.when || ''} placeholder="blank = always · or vs fear, vs undead…"
              onInput={(e) => { const w = (e.target as HTMLInputElement).value; set(i, { when: w || undefined }); }} />
          </div>
          <div class="note2">
            {typeHint(mo.type || 'untyped')}
            {mo.when?.trim() && ' Because it only applies sometimes, it is listed beside the number rather than added in.'}
          </div>
        </div>
      ))}
      <button class="sm" onClick={() => onChange([...mods, blankMod()])}>+ {mods.length ? 'another bonus' : 'a bonus'}</button>
      {mods.length > 0 && <div class="bonusprev">In play: <ModSummary ch={ch} mods={mods} /></div>}
    </div>
  );
}

type Lasts = 'ongoing' | Duration['u'];

/** A whole custom effect: name, where it came from, how long it lasts, and its bonuses. */
export function CustomEffectForm({ initial, onDone }: { initial?: Effect; onDone: (e: Effect | null) => void }) {
  const ch = useCh();
  const [n, setN] = useState(initial?.name || '');
  const [src, setSrc] = useState(initial?.src && initial.src !== 'added by hand' ? initial.src : '');
  const [lasts, setLasts] = useState<Lasts>(initial?.dur ? initial.dur.u : 'ongoing');
  const [len, setLen] = useState(initial?.dur && initial.dur.n !== 'level' ? String(initial.dur.n) : '');
  const [mods, setMods] = useState<Mod[]>(initial?.mods?.length ? structuredClone(initial.mods) : [blankMod()]);
  const timed = lasts !== 'ongoing';
  const ok = n.trim() && mods.length && (!timed || parseInt(len) > 0);
  const save = () => {
    if (!ok) return;
    const dur: Duration | null = timed ? { u: lasts as Duration['u'], n: parseInt(len) } : null;
    onDone({
      id: initial?.id || 'fx' + Date.now(), name: n.trim(), src: src.trim() || 'added by hand', kind: 'manual',
      on: initial?.on ?? true, dur, left: durToRounds(dur, ch.lvl),
      mods: mods.map((m) => (m.when?.trim() ? { ...m, when: m.when.trim() } : { stat: m.stat, type: m.type, v: m.v })),
    });
  };
  return (
    <div class="gedit">
      <div class="gerow">
        <label class="gil">Name</label>
        <input style="flex:2;min-width:150px" value={n} placeholder="Blessing of Desna · lucky coin · Brug's war cry" onInput={(e) => setN((e.target as HTMLInputElement).value)} />
      </div>
      <div class="gerow">
        <label class="gil">Where from</label>
        <input style="flex:1" value={src} placeholder="the DM, after the barrow fight" onInput={(e) => setSrc((e.target as HTMLInputElement).value)} />
      </div>
      <div class="gerow">
        <label class="gil">Lasts</label>
        <select style="width:130px" value={lasts} onChange={(e) => setLasts((e.target as HTMLSelectElement).value as Lasts)}>
          <option value="ongoing">until removed</option>
          <option value="rd">rounds</option>
          <option value="min">minutes</option>
          <option value="hr">hours</option>
        </select>
        {timed && <input type="number" class="w3" min={1} value={len} placeholder="how many" onInput={(e) => setLen((e.target as HTMLInputElement).value)} />}
        <span class="note2">{timed ? 'Timed effects count down each round and end on a rest.' : 'Stays on through rests until you remove it.'}</span>
      </div>
      <div class="gesec">What it does</div>
      <BonusRows mods={mods} onChange={setMods} />
      <div class="gerow" style="margin-top:10px">
        <button class="go" disabled={!ok} onClick={save}>{initial ? 'Save changes' : 'Add it'}</button>
        <button onClick={() => onDone(null)}>Cancel</button>
      </div>
    </div>
  );
}
