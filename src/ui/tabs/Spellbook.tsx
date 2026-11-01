// SPELLBOOK — known spells by level, preparation, the CRB browser. Port of v36 spellbook().
import { useState } from 'preact/hooks';
import type { BookSpell, Character } from '../../model/types';
import { bonusSp, spellsPerDay } from '../../rules/core';
import { mods } from '../../rules/derive';
import {
  castCount, isSchoolSpell, prepareSpell, preparedCount, preparedIdx, saveDC, schoolPrepared, schoolSlot, slots, specIndex, spellFocusBonus, unprepareAt,
} from '../../rules/spells';
import { CRB, spellDetails, spellDice } from '../../rules/spellinfo';
import { setCast } from '../../rules/actions';
import { roll } from '../components/Dice';
import { update, useCh } from '../store';

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Universal'];

/** Shared with App's print handler: the spellbook shows one level at a time, so printing has
 *  to widen the view first or the other levels aren't on the page at all. */
export const sbView = { all: false, set: (_v: boolean) => {} };

interface Removed {
  sp: BookSpell;
  idx: number;
  lv: number;
  slots: number[];
  wasCast: boolean[];
}

function SpellRow({ ch, s, edit, onRemoved }: { ch: Character; s: BookSpell; edit: boolean; onRemoved: (r: Removed) => void }) {
  const m = mods(ch);
  const lv = s.lv;
  // A spell can occupy several slots — preparing Mage Armor three times is ordinary play.
  const idxs = lv > 0 ? preparedIdx(ch, lv, s.n) : [];
  const nprep = idxs.length, ncast = idxs.filter((i) => ch.cast[lv]?.[i]).length;
  const nready = nprep - ncast, isP = nprep > 0, spent = isP && nready === 0;
  const n = lv > 0 ? slots(ch, lv, m.Int) : 0;
  const full = lv > 0 && preparedCount(ch, lv) >= n;
  const dc = saveDC(ch, lv, s.sc, m.Int);
  const fb = spellFocusBonus(ch, s.sc);
  const fillsSpec = lv > 0 && ch.specialist && s.sc === ch.specialist && schoolSlot(ch, lv) && schoolPrepared(ch, lv) < schoolSlot(ch, lv);
  const desc = s.d || spellDetails(s).d; // falls back to the Core Rulebook text, as v36's tooltip did

  return (
    <div class={'sp' + (s.sc === 'Necromancy' ? ' necro' : '') + (s.gm ? ' gm' : '') + (isP ? ' prepped' : '') + (spent ? ' spent' : '')} data-spell={`${s.lv}|${s.n}`}>
      <div class="sph">
        <div style="flex:1;min-width:150px">
          <div class="spn">{s.n}</div>
          <div class="spm">
            {lv === 0 ? 'Cantrip' : 'Level ' + lv} · {s.sc}
            {nprep > 1 && <> · <span style="color:var(--blue)">×{nprep} prepared, {nready} ready</span></>}
          </div>
          <div class="dcline">Save DC {dc} &nbsp;=&nbsp; 10 + {lv} spell level + {m.Int} Int{fb > 0 && <span class="src"> +{fb} Spell Focus ({s.sc})</span>}</div>
        </div>
        {!!s.gm && <span class="badge gm">DM ruling</span>}
        {s.unsourced && <span class="unsrc" title="Not found on d20pfsrd; source book unknown. Description written by hand.">unsourced</span>}
        {fillsSpec && <span class="badge">fills your specialist slot</span>}
        {lv === 0 ? <span class="badge on">Unlimited</span>
          : n === 0 ? <span class="tiny">no slots yet</span>
          : isP ? (
            <>
              {nready > 0 && <button class="go" onClick={() => update((d) => { const i = idxs.find((k) => !d.cast[lv][k]); if (i !== undefined) setCast(d, lv, i, true); })}>
                {nprep > 1 ? `Cast one · ${nready} ready` : 'Cast it'}</button>}
              {ncast > 0 && <button onClick={() => update((d) => { const i = [...idxs].reverse().find((k) => d.cast[lv][k]); if (i !== undefined) setCast(d, lv, i, false); })}>
                {nprep > 1 ? 'Restore one' : 'Restore slot'}</button>}
              {!full && <button class="sm" title={'Fill a second slot with ' + s.n} onClick={() => update((d) => prepareSpell(d, lv, s.n))}>Prepare another</button>}
              <button class="sm" onClick={() => update((d) => unprepareAt(d, lv, idxs[idxs.length - 1]))}>{nprep > 1 ? 'Unprepare one' : 'Unprepare'}</button>
            </>
          ) : (
            <button disabled={full} style={full ? 'opacity:.4' : ''} onClick={() => update((d) => prepareSpell(d, lv, s.n))}>{full ? 'Slots full' : 'Prepare'}</button>
          )}
        {spellDice(s).map((dd) => (
          <button class="sm" title={`Roll ${dd.label} for ${s.n}`} onClick={() => roll(`${s.n} — ${dd.label}`, 0, { die: dd.die, n: dd.n })}>{dd.label}</button>
        ))}
        {edit && (
          <button class="x" style="border-color:var(--rust);color:var(--rust);font-size:9px;padding:3px 8px"
            onClick={() => {
              // Removing a spell pulls it out of every slot it is prepared in, and Undo puts
              // those back. (v36 once threw here and silently did nothing.)
              const idx = ch.book.indexOf(s);
              const removed = [...idxs].sort((a, b) => b - a);
              const r: Removed = { sp: structuredClone(s), idx, lv, slots: removed, wasCast: removed.map((i) => !!ch.cast[lv]?.[i]) };
              update((d) => { removed.forEach((i) => unprepareAt(d, lv, i)); d.book.splice(idx, 1); }, `removed ${s.n}`);
              onRemoved(r);
            }}>Remove</button>
        )}
      </div>
      {desc && <div class="spd">{desc}</div>}
    </div>
  );
}

function LearnSpell({ ch, view }: { ch: Character; view: number }) {
  const [q, setQ] = useState('');
  const [lv, setLv] = useState('');
  const [sc, setSc] = useState('');
  const [hand, setHand] = useState({ n: '', lv: view, sc: 'Necromancy', d: '' });
  const qq = q.toLowerCase().trim();
  const any = qq || lv !== '' || sc;
  const r = any ? CRB.filter((s) => (lv === '' || s.lv === +lv) && (!sc || s.sc === sc) && (!qq || s.n.toLowerCase().includes(qq) || s.d.toLowerCase().includes(qq))) : [];
  const m = mods(ch);
  const addHand = () => {
    const n = hand.n.trim();
    if (!n) return;
    update((d) => void d.book.push({ n, lv: +hand.lv, sc: hand.sc, d: hand.d.trim() }));
    setHand({ ...hand, n: '', d: '' });
  };
  return (
    <div class="card" style="margin-top:14px">
      <h3>Learn a new spell<span class="nt">{CRB.length} sorcerer/wizard spells, levels 0–9</span></h3>
      <div class="addrow">
        <input placeholder="Search the wizard spell list…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        <select style="width:110px" value={lv} onChange={(e) => setLv((e.target as HTMLSelectElement).value)}>
          <option value="">Any level</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <option value={String(i)}>{i === 0 ? 'Cantrips' : 'Level ' + i}</option>)}
        </select>
        <select style="width:140px" value={sc} onChange={(e) => setSc((e.target as HTMLSelectElement).value)}>
          <option value="">Any school</option>
          {SCHOOLS.map((s) => <option>{s}</option>)}
        </select>
      </div>
      {!any ? <div class="empty2" style="margin-top:9px">Search, or pick a level or school, to browse the spell list.</div>
        : !r.length ? <div class="empty2" style="margin-top:9px">Nothing matches.</div>
        : (
          <>
            <div class="crbwrap">
              {r.slice(0, 120).map((sp) => {
                const have = ch.book.some((b) => b.n.toLowerCase() === sp.n.toLowerCase() && b.lv === sp.lv);
                const castable = sp.lv === 0 || slots(ch, sp.lv, m.Int) > 0;
                return (
                  <div class={'crbrow' + (have ? ' have' : '') + (sp.sc === 'Necromancy' ? ' nec' : '')} data-spell={`${sp.lv}|${sp.n}`}>
                    <div class="cn"><div class="t2">{sp.n}</div><div class="d3">{sp.d}</div></div>
                    <div class="cl2">{sp.lv === 0 ? 'Cantrip' : 'Level ' + sp.lv}<br />{sp.sc}{!castable && <><br /><span style="color:var(--gold)">can't cast yet</span></>}</div>
                    <button class={have ? '' : 'go'} disabled={have} onClick={() => update((d) => void d.book.push({ ...sp }), `learned ${sp.n}`)}>{have ? 'In your book' : 'Learn'}</button>
                  </div>
                );
              })}
            </div>
            {r.length > 120 && <div class="tiny" style="padding:7px">{r.length} matches — showing 120. Narrow it down.</div>}
          </>
        )}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
        <div class="tiny" style="text-transform:uppercase;margin-bottom:7px">Not in the list? Add it by hand</div>
        <div class="addrow">
          <input placeholder="Spell name" value={hand.n} onInput={(e) => setHand({ ...hand, n: (e.target as HTMLInputElement).value })} onKeyDown={(e) => e.key === 'Enter' && addHand()} />
          <select style="width:96px" value={hand.lv} onChange={(e) => setHand({ ...hand, lv: +(e.target as HTMLSelectElement).value })}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <option value={i}>{i === 0 ? 'Cantrip' : 'Level ' + i}</option>)}
          </select>
          <select style="width:136px" value={hand.sc} onChange={(e) => setHand({ ...hand, sc: (e.target as HTMLSelectElement).value })}>
            {SCHOOLS.map((s) => <option>{s}</option>)}
          </select>
          <button onClick={addHand}>Add</button>
        </div>
        <div class="addrow"><input placeholder="What it does (optional)" value={hand.d} onInput={(e) => setHand({ ...hand, d: (e.target as HTMLInputElement).value })} /></div>
      </div>
    </div>
  );
}

export function Spellbook() {
  const ch = useCh();
  const m = mods(ch);
  const L = ch.lvl;
  const [view, setView] = useState(1);
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(false);
  const [lastDel, setLastDel] = useState<Removed | null>(null);
  sbView.all = all;
  sbView.set = setAll;

  const spec = ch.specialist;
  const fbN = spellFocusBonus(ch, spec);
  const levelsShown = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((lv) => lv === 0 || slots(ch, lv, m.Int) > 0 || ch.book.some((s) => s.lv === lv));
  const q = search.toLowerCase().trim();
  const list = ch.book
    .filter((s) => all || s.lv === view)
    .filter((s) => !q || s.n.toLowerCase().includes(q) || (s.d || '').toLowerCase().includes(q))
    .sort((a, b) => a.lv - b.lv || a.n.localeCompare(b.n));

  const strip = () => {
    if (all) return null;
    if (view === 0)
      return (
        <div class="strip">
          <span class="lb">Cantrips</span>
          <span style="font-size:14px">
            Unlimited{' '}
            <span style="color:var(--gold);font-family:var(--mono);font-size:11px">
              · table ruling 2: all {ch.book.filter((x) => x.lv === 0).length} in your book are available. By the book you prepare {spellsPerDay(L)[0]} a day and cast those at will.
            </span>
          </span>
          <span class="strn">Save DC {saveDC(ch, 0, null, m.Int)}{fbN ? ` · ${saveDC(ch, 0, spec, m.Int)} for ${spec.toLowerCase()}` : ''}<br />10 + spell level + Int ({m.Int}){fbN ? ` · ${spec.toLowerCase()} +${fbN} from Spell Focus` : ''}</span>
        </div>
      );
    const n = slots(ch, view, m.Int);
    if (!n) return null;
    const base = spellsPerDay(L)[view], bon = bonusSp(m.Int, view), ss = schoolSlot(ch, view), si = specIndex(ch, view);
    const necN = schoolPrepared(ch, view);
    const sq = [];
    for (let i = 0; i < n; i++) {
      const nm = ch.prep[view]?.[i];
      if (!nm) sq.push(<button class={'sq empty' + (i === si ? ' spec' : '')} title={i === si ? `${spec} specialist slot — empty` : 'Empty slot'} aria-label="Empty slot" />);
      else {
        const spent = !!ch.cast[view]?.[i];
        sq.push(
          <button class={'sq' + (spent ? ' out' : '') + (isSchoolSpell(ch, nm, view) ? ' nec' : '') + (i === si ? ' spec' : '')} data-spell={`${view}|${nm}`}
            aria-label={nm + (spent ? ' (cast)' : '')} onClick={() => update((d) => setCast(d, view, i, !spent))} />,
        );
      }
    }
    return (
      <div class="strip">
        <span class="lb">Slots</span>
        {sq}
        {ss > 0 && <span class={'sqtag' + (necN >= ss ? ' ok' : '')}>{necN >= ss ? `${spec} slot filled` : `1 of these must be ${spec}`}</span>}
        <span class="strn">
          {n - castCount(ch, view)} of {n} left today<br />
          <b style="color:var(--dim);font-weight:400">{base} from the wizard table (level {L}) + {bon} bonus from Int {ch.ab.Int}{ss > 0 && <span style="color:var(--grave)"> + {ss} {spec} specialist slot</span>}</b><br />
          {ss > 0 && <><span style="color:var(--grave)">One of these must hold a {spec} spell.</span><br /></>}
          Save DC {saveDC(ch, view, null, m.Int)}{fbN > 0 && <> · <span style="color:var(--grave)">{saveDC(ch, view, spec, m.Int)} for {spec.toLowerCase()}</span></>}
        </span>
      </div>
    );
  };

  return (
    <>
      <div class="lvlbar">
        {levelsShown.map((lv) => {
          const n = lv === 0 ? 0 : slots(ch, lv, m.Int);
          return (
            <button class={view === lv && !all ? 'on' : ''} onClick={() => { setView(lv); setAll(false); setSearch(''); }}>
              {lv === 0 ? 'Cantrips' : 'Level ' + lv}
              <span class="c2">{lv === 0 ? '∞' : `${n - castCount(ch, lv)} / ${n}`}</span>
            </button>
          );
        })}
      </div>
      {strip()}
      <div class="sbtop">
        <input placeholder="Search spells…" value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
        <button class="sm" onClick={() => setAll(!all)}>{all ? 'Back to one level' : 'Show every level'}</button>
        <button class="sm" onClick={() => {
          if (!ch.lastPrep) { alert('Nothing to copy yet.'); return; }
          update((d) => { d.prep = structuredClone(d.lastPrep!); for (let lv = 1; lv <= 9; lv++) { d.cast[lv] = (d.prep[lv] || []).map(() => false); d.prepMeta[lv] = (d.prep[lv] || []).map(() => []); } });
        }}>Prepare same as last time</button>
        <button class={'sm' + (edit ? ' unlocked' : '')} id="editmode" onClick={() => setEdit(!edit)}>{edit ? '🔓 Editing unlocked' : '🔒 Editing locked'}</button>
      </div>
      {lastDel && (
        <div class="undo">
          <span class="u1">Removed <b>{lastDel.sp.n}</b> from your spellbook.</span>
          <button onClick={() => {
            const r = lastDel;
            update((d) => {
              d.book.splice(r.idx, 0, r.sp);
              // put it back in the slots it was occupying, in the order it left them
              [...r.slots].reverse().forEach((slot, k) => {
                const c = r.wasCast[r.slots.length - 1 - k];
                d.prep[r.lv].splice(slot, 0, r.sp.n);
                d.cast[r.lv].splice(slot, 0, !!c);
                d.prepMeta[r.lv].splice(slot, 0, []);
              });
            });
            setLastDel(null);
          }}>Undo</button>
          <button class="x" onClick={() => setLastDel(null)}>×</button>
        </div>
      )}
      <div class="spkey">
        <span class="kk k-nec">Necromancy</span><span class="kk k-gm">DM ruling</span><span class="kk k-prep">Prepared</span><span class="kk k-spent">Cast today</span>
      </div>
      <div>
        {list.length ? list.map((s) => <SpellRow ch={ch} s={s} edit={edit} onRemoved={setLastDel} />)
          : <div style="color:var(--faint);font-style:italic;padding:10px">Nothing here.</div>}
      </div>
      <LearnSpell ch={ch} view={view} />
    </>
  );
}
