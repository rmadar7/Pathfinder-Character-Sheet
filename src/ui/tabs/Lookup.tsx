// LOOKUP — search every spell, feat, class, race, item and class ability (PLAN.md Phase 1).
// Entries come from the imported compendium; the text is plain text, rendered as text.

import { useEffect, useMemo, useState } from 'preact/hooks';
import { toBookSpell, toGear, toMods } from '../../compendium/convert';
import { loadFile, loadIndex } from '../../compendium/load';
import { d20Search, search, sourceLine } from '../../compendium/search';
import { FILES, KIND_LABEL, type CompendiumIndex, type Entry, type FileName, type Kind } from '../../compendium/types';
import type { Character } from '../../model/types';
import { slots } from '../../rules/spells';
import { ModSummary } from '../components/EffectsManager';
import { update, useCh } from '../store';

const CATS: [string, FileName[], Kind[]][] = [
  ['Everything', [...FILES], []],
  ['Spells', ['spells'], ['spell']],
  ['Feats', ['feats'], ['feat']],
  ['Items', ['items'], ['item']],
  ['Classes', ['classes'], ['class']],
  ['Races', ['races'], ['race']],
  ['Class abilities', ['abilities'], ['ability', 'mythic']],
  ['Buffs', ['buffs'], ['buff']],
];

/** The character's class as the compendium keys it ("Wizard" → "wizard"). */
const classKey = (ch: Character) => (ch.identity?.classLabel || '').trim().toLowerCase().replace(/\s+(\w)/g, (_, c) => c.toUpperCase());
/** Highest spell level the character has a slot for right now (cantrips count as 0). */
const maxCastable = (ch: Character) => { let m = 0; for (let l = 1; l <= 9; l++) if (slots(ch, l) > 0) m = l; return m; };

const SIZE: Record<string, string> = { fine: 'Fine', dim: 'Diminutive', tiny: 'Tiny', sm: 'Small', med: 'Medium', lg: 'Large', huge: 'Huge', grg: 'Gargantuan', col: 'Colossal' };
const BAB: Record<string, string> = { high: 'full (+1 per level)', med: '¾ of level', low: '½ of level' };
const SAVE: Record<string, string> = { high: 'good', low: 'poor' };

function meta(e: Entry, ck: string): string {
  if (e.k === 'spell') {
    const at = ck && e.cls?.[ck] !== undefined ? `${ck[0].toUpperCase() + ck.slice(1)} ${e.cls[ck]}` : `level ${e.lv}`;
    return `Spell · ${at} · ${e.sc}${e.desc ? ` [${e.desc}]` : ''}`;
  }
  if (e.k === 'feat') return `Feat${e.tags?.length ? ' · ' + e.tags.join(', ') : ''}`;
  if (e.k === 'item') return `Item${e.gp ? ` · ${e.gp.toLocaleString()} gp` : ''}${e.slot && e.slot !== 'slotless' ? ` · ${e.slot}` : ''}`;
  return KIND_LABEL[e.k];
}

function Detail({ e, ix, ck, ch }: { e: Entry; ix: CompendiumIndex; ck: string; ch: Character }) {
  const row = (k: string, v: unknown) => (v === undefined || v === null || v === '' ? null : <tr><td class="k">{k}</td><td class="v">{String(v)}</td></tr>);
  const book = toBookSpell(e, ck);
  const inBook = ch.book.some((b) => b.n.toLowerCase() === e.n.toLowerCase());
  const hasFeat = ch.feats.some((f) => f.split(' — ')[0].replace(/\s*\(.*\)$/, '').toLowerCase() === e.n.toLowerCase());
  const { mods, skipped } = toMods(e.fx);
  return (
    <div class="lkd">
      <table class="sb2"><tbody>
        {e.k === 'spell' && <>
          {row('Cast', e.ct)}{row('Components', e.cp)}{row('Range', e.rg)}{row('Affects', e.ar)}{row('Lasts', e.du)}{row('Save', e.sv)}{row('Spell resistance', e.sr)}
          {row('Class levels', Object.entries(e.cls || {}).map(([c, l]) => `${c} ${l}`).join(', '))}
          {e.dom && row('Domains', Object.entries(e.dom).map(([c, l]) => `${c} ${l}`).join(', '))}
        </>}
        {e.k === 'feat' && row('Prerequisites', e.pre)}
        {e.k === 'class' && <>
          {row('Hit die', e.hd ? `d${e.hd}` : undefined)}{row('Base attack', e.bab && BAB[e.bab])}
          {row('Saves', e.saves && Object.entries(e.saves).map(([s, v]) => `${s} ${SAVE[v] || v}`).join(', '))}
          {row('Spellcasting', e.cast && [e.cast.kind, e.cast.type, e.cast.ability && `(${e.cast.ability})`].filter(Boolean).join(' '))}
          {row('Class skills', e.skills?.join(', '))}
        </>}
        {e.k === 'race' && <>{row('Size', e.size && SIZE[e.size])}{row('Speed', e.speed ? `${e.speed} ft.` : undefined)}{row('Languages', e.langs?.join(', '))}</>}
        {e.k === 'item' && <>{row('Price', e.gp ? `${e.gp.toLocaleString()} gp` : undefined)}{row('Weight', e.lb ? `${e.lb} lb.` : undefined)}{row('Slot', e.slot)}{row('Caster level', e.cl)}{row('Aura', e.aura)}</>}
        {row('Source', sourceLine(e, ix.books))}
      </tbody></table>
      {mods.length > 0 && <div class="note2">In play: <ModSummary ch={ch} mods={mods} /></div>}
      <div class="lktext">{e.d || e.sum || 'No description in the imported data.'}</div>
      {e.thin && <div class="note2">Only the short description is available for this item. The full text is in the source book above.</div>}
      {skipped > 0 && <div class="note2">{skipped} of its effects depend on level or situation and are described above, not applied automatically.</div>}
      <div class="lkact">
        <a class="sm" href={d20Search(e.n)} target="_blank" rel="noopener">Find on d20pfsrd ↗</a>
        {e.k === 'spell' && (book
          ? <button class={inBook ? 'sm' : 'sm go'} disabled={inBook} onClick={() => update((d) => void d.book.push(book), `learned ${e.n}`)}>{inBook ? 'In your spellbook' : `Add to spellbook (level ${book.lv})`}</button>
          : ck && <span class="note2">Not on the {ck} spell list.</span>)}
        {e.k === 'feat' && <button class={hasFeat ? 'sm' : 'sm go'} disabled={hasFeat} onClick={() => update((d) => void d.feats.push(e.n), `took ${e.n}`)}>{hasFeat ? 'You have this feat' : 'Add to my feats'}</button>}
        {e.k === 'item' && <button class="sm go" onClick={() => update((d) => void d.gear.push(toGear(e).item), `got ${e.n}`)}>Add to inventory</button>}
      </div>
    </div>
  );
}

export function Lookup() {
  const ch = useCh();
  const ck = classKey(ch);
  const [ix, setIx] = useState<CompendiumIndex | null>(null);
  const [data, setData] = useState<Partial<Record<FileName, Entry[]>>>({});
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [cat, setCat] = useState(0);
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);
  const [, files, kinds] = CATS[cat];

  useEffect(() => { loadIndex().then(setIx).catch((e) => setErr(String(e.message || e))); }, []);
  useEffect(() => {
    for (const f of files) if (!data[f]) loadFile(f).then((list) => setData((d) => ({ ...d, [f]: list }))).catch((e) => setErr(String(e.message || e)));
  }, [cat]);

  const ready = files.every((f) => data[f]);
  const entries = useMemo(() => files.flatMap((f) => data[f] || []), [cat, data]);
  const spellsOnly = kinds.length === 1 && kinds[0] === 'spell';
  const res = useMemo(
    () => (ready ? search(entries, { text, kinds, ...(spellsOnly && mine && ck ? { cls: ck, maxLevel: maxCastable(ch) } : {}) }, limit) : { hits: [], total: 0 }),
    [entries, text, cat, mine, limit, ready],
  );

  return (
    <div class="card">
      <h3>Look it up<span class="nt">spells, feats, items, classes, races</span></h3>
      <input class="lksearch" type="search" placeholder="fireball · power attack · ring of protection" value={text}
        onInput={(e) => { setText((e.target as HTMLInputElement).value); setLimit(40); setOpen(null); }} />
      <div class="lkcats">
        {CATS.map(([l], i) => <button class={'qbtn' + (cat === i ? ' go' : '')} onClick={() => { setCat(i); setLimit(40); setOpen(null); }}>{l}</button>)}
      </div>
      {spellsOnly && ck && (
        <label class="lkmine"><input type="checkbox" checked={mine} onChange={(e) => setMine((e.target as HTMLInputElement).checked)} /> Only {ck} spells I can cast now (level {maxCastable(ch)} and below)</label>
      )}
      {err && <div class="flag bad">Couldn't load the reference data ({err}). It loads once with a signal, then works offline.</div>}
      {!ready && !err && <div class="empty2">Loading…</div>}
      {ready && ix && (
        <>
          <div class="note2">{res.total === 0 ? 'Nothing matches.' : `${res.total.toLocaleString()} match${res.total === 1 ? '' : 'es'}${res.total > res.hits.length ? `, showing ${res.hits.length}` : ''}.`}</div>
          {res.hits.map(({ e }) => (
            <div class={'lkr' + (open === e.id ? ' open' : '')}>
              <button class="lkh" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                <span class="lkn">{e.n}</span> <span class="lkm">{meta(e, ck)}</span>
                {e.sum && <span class="lks">{e.sum}</span>}
              </button>
              {open === e.id && <Detail e={e} ix={ix} ck={ck} ch={ch} />}
            </div>
          ))}
          {res.total > res.hits.length && <button class="sm" onClick={() => setLimit(limit + 60)}>Show more</button>}
        </>
      )}
    </div>
  );
}
