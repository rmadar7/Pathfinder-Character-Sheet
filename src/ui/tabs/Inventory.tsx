// INVENTORY — one list for everything owned, supplies, carrying capacity, money, Scriptorium.
import { useState } from 'preact/hooks';
import { GEARCATS } from '../../data/gear';
import type { Character, GearItem, GearSlot, Mod } from '../../model/types';
import { sgn } from '../../rules/core';
import { CRAFT_DAY, failsOn, minScrollCL, scribable, takeTenMakes } from '../../rules/crafting';
import { derive } from '../../rules/derive';
import { carryCap, catOf, gearWeight, guessCat, loadBand, stockOf, stowedWeight } from '../../rules/gear';
import { skillTotal } from '../../rules/skills';
import { BonusRows, modsValid } from '../components/BonusEditor';
import { scribe, scribeCheck } from '../../rules/actions';
import { roll } from '../components/Dice';
import { ModSummary } from '../components/EffectsManager';
import { PipStrip } from '../components/Pips';
import { update, useCh } from '../store';

const SLOT_TITLE: Record<GearSlot, string> = {
  worn: 'On you and switched on — its bonuses count',
  carried: 'In your pack — weight counts, bonuses do not',
  stowed: 'On the mount or in camp — does not weigh you down',
};

function GearEditor({ g, i, onDone }: { g: GearItem | null; i: number | null; onDone: () => void }) {
  const [f, setF] = useState({
    n: g?.n || '', qty: g?.qty ?? 1, cat: g ? catOf(g) : 'gear', wt: g?.wt || 0, desc: g?.desc || '', got: g?.got || '',
    um: g?.uses ? String(g.uses.max) : '', uc: g?.uses ? String(g.uses.cur) : '', ur: g?.uses?.regain ? String(g.uses.regain) : '',
  });
  const [fx, setFx] = useState<Mod[]>(structuredClone(g?.fx || []));
  const val = (k: keyof typeof f) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const save = () => {
    const n = f.n.trim();
    if (!n || !modsValid(fx)) return;
    const um = parseInt(f.um), uc = parseInt(f.uc), ur = parseInt(f.ur);
    const item: GearItem = {
      id: g?.id || 'g' + Date.now(), n, desc: f.desc.trim(), got: f.got.trim(),
      wt: Math.max(0, +f.wt || 0), qty: Math.max(0, +f.qty || 0), slot: g?.slot || 'carried', cat: f.cat, cls: g?.cls || 'r', help: g?.help,
      uses: um > 0 ? { max: um, cur: isNaN(uc) ? um : Math.min(uc, um), regain: ur > 0 ? ur : 0 } : null,
      fx: fx.filter((m) => m.v).map((m) => (m.when?.trim() ? { ...m, when: m.when.trim() } : { stat: m.stat, type: m.type, v: m.v })),
    };
    update((d) => {
      if (i == null) { if (item.fx!.length) item.slot = 'worn'; d.gear.push(item); }
      else d.gear[i] = item;
    });
    onDone();
  };
  return (
    <div class="gedit">
      <div class="gerow">
        <label class="gil">What is it</label><input value={f.n} onInput={val('n')} placeholder="Ring of the Sophisticated" style="flex:2;min-width:150px" />
        <label class="gil">how many</label><input type="number" class="w3" min={0} value={f.qty} onInput={val('qty')} />
        <label class="gil">group</label><select style="width:120px" value={f.cat} onChange={val('cat')}>{GEARCATS.map(([c, l]) => <option value={c}>{l}</option>)}</select>
        <label class="gil">lb each</label><input type="number" class="w3" min={0} step={0.1} value={f.wt} onInput={val('wt')} />
      </div>
      <div class="gerow"><label class="gil">What it does</label><input value={f.desc} onInput={val('desc')} style="flex:1" /></div>
      <div class="gerow"><label class="gil">Where you got it</label><input value={f.got} onInput={val('got')} placeholder="Looted from the barrow · bought in Absalom · gift from Brug" style="flex:1" /></div>
      <div class="gesec">Uses or charges <span class="note2">— leave blank if it has none</span></div>
      <div class="gerow">
        <label class="gil">has</label><input type="number" class="w3" min={0} value={f.um} placeholder="—" onInput={val('um')} title="Most charges or doses it holds" />
        <label class="gil">left now</label><input type="number" class="w3" min={0} value={f.uc} placeholder="—" onInput={val('uc')} />
        <label class="gil">regains per day</label><input type="number" class="w3" min={0} value={f.ur} placeholder="—" onInput={val('ur')} title="Blank or 0 = it never comes back." />
      </div>
      <div class="gesec">Bonuses it gives while worn <span class="note2">— none is fine</span></div>
      <BonusRows mods={fx} onChange={setFx} />
      <div class="gerow" style="margin-top:10px">
        <button class="go" disabled={!modsValid(fx)} onClick={save}>{i == null ? 'Add to inventory' : 'Save changes'}</button>
        <button onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

function GearRow({ ch, g, i, cat, open, setOpen }: { ch: Character; g: GearItem; i: number; cat: string; open: boolean; setOpen: (id: string | null) => void }) {
  const slot = g.slot || 'carried';
  const qty = Math.max(0, +(g.qty ?? 0) || 0);
  return (
    <div class={'gi ' + slot + (g.uses ? ' usable' : '') + (qty === 0 ? ' empty3' : '')}>
      <div class="gih">
        <span class="ginm">{g.n || 'Item'}{qty !== 1 && <> <span class="giq">×{qty}</span></>}{qty === 0 && <> <span class="giq" style="color:var(--rust)">none left</span></>}</span>
        {cat === 'survival' && qty > 0 && <button class="sm useone" title="Use one" onClick={() => update((d) => void (d.gear[i].qty = Math.max(0, (+(d.gear[i].qty ?? 0) || 0) - 1)))}>use one</button>}
        <span class="gislot">
          {(['worn', 'carried', 'stowed'] as GearSlot[]).map((s) => (
            <button class={'slotb' + (slot === s ? ' on' : '')} title={SLOT_TITLE[s]} onClick={() => update((d) => void (d.gear[i].slot = s))}>{s === 'carried' ? 'pack' : s}</button>
          ))}
        </span>
        <button class="x" title="Edit this item" onClick={() => setOpen(open ? null : g.id)}>✎</button>
        <button class="x" title="Remove" onClick={() => confirm(`Remove ${g.n || 'this item'}?`) && update((d) => void d.gear.splice(i, 1))}>×</button>
      </div>
      {g.desc && <div class="gidesc">{g.desc}</div>}
      {g.fx && g.fx.length > 0 && (
        <div class="gifx">
          {slot === 'worn' ? <span class="gil" style="color:var(--blue)">live</span> : <span class="gil" style="color:var(--faint)">off — not worn</span>}{' '}
          <ModSummary ch={ch} mods={g.fx} />
        </div>
      )}
      {g.uses && (
        <div class="giuserow">
          <PipStrip cur={g.uses.cur} max={g.uses.max} cls={g.cls || 'r'} onSet={(v) => update((d) => void (d.gear[i].uses!.cur = v))} />
          <span class="cnt">{g.uses.cur}/{g.uses.max}</span>
          <span class="note2">{g.uses.regain > 0 ? `back ${g.uses.regain}/day` : 'does not come back on a rest'}</span>
        </div>
      )}
      {(g.wt || g.got) && <div class="gifoot">{[g.wt ? `${+((+g.wt) * Math.max(1, qty)).toFixed(1)} lb` : '', g.got || ''].filter(Boolean).join('  ·  ')}</div>}
      {open && <GearEditor g={g} i={i} onDone={() => setOpen(null)} />}
    </div>
  );
}

function Supplies({ ch }: { ch: Character }) {
  const [days, setDays] = useState(1);
  const [msg, setMsg] = useState<{ bad: boolean; lines: string[] } | null>(null);
  const has = ch.gear.some((g) => catOf(g) === 'survival');
  if (!has) return <div class="empty2">No camp supplies logged.</div>;
  const food = stockOf(ch, /ration|food/i), water = stockOf(ch, /water|drink|ale|wine/i);
  const light = stockOf(ch, /torch|candle|lantern|sunrod/i), beds = stockOf(ch, /bedroll|tent|blanket/i);
  const line = (label: string, n: number, unit: string, warn: number) => (
    <div class="svrow"><span class="svn">{label}</span><span class="svv" style={n <= warn ? 'color:var(--rust)' : ''}>{n}</span><span class="svu">{unit}</span></div>
  );
  return (
    <>
      {line('Food', food, food === 1 ? 'day of rations' : 'days of rations', 1)}
      {line('Water', water, water === 1 ? 'container' : 'containers', 0)}
      {line('Light', light, light === 1 ? 'torch' : 'torches', 2)}
      {line('Shelter', beds, beds === 1 ? 'bedroll' : 'bedrolls', 0)}
      <div class="svdays">
        <input type="number" class="w3" value={days} min={1} title="How many days" onInput={(e) => setDays(Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1))} />
        <button class="go" onClick={() => {
          // Camping for N days: rations come off the pile, and you're told whether you have
          // shelter and water for it.
          let spent = 0, need = days;
          update((d) => {
            for (const g of d.gear.filter((x) => /ration|food/i.test(x.n || ''))) {
              if (need <= 0) break;
              const take = Math.min(need, Math.max(0, +(g.qty ?? 0) || 0));
              g.qty = (+(g.qty ?? 0) || 0) - take; need -= take; spent += take;
            }
          });
          const warn: string[] = [];
          if (need > 0) warn.push(`Short ${need} day${need === 1 ? '' : 's'} of food. You will be starving for ${need} of them.`);
          if (!beds) warn.push('No shelter. No bedroll or tent in your inventory — expect a Fortitude save against the cold.');
          if (!water) warn.push('No water container. Nothing to carry it in.');
          setMsg({ bad: warn.length > 0, lines: [`Spent ${spent} day${spent === 1 ? '' : 's'} of rations.${warn.length ? '' : ' Shelter and water are covered.'}`, ...warn] });
        }}>Spend days</button>
        <button onClick={() => {
          update((d) => {
            const t = d.gear.find((g) => /ration|food/i.test(g.n || ''));
            if (t) t.qty = (+(t.qty ?? 0) || 0) + days;
            else d.gear.push({ id: 'g' + Date.now(), n: 'Trail rations', desc: '', got: '', wt: 1, qty: days, slot: 'stowed', cls: 'r', uses: null, fx: [], cat: 'survival' });
          });
          setMsg({ bad: false, lines: [`Added ${days} day${days === 1 ? '' : 's'} of rations.`] });
        }}>Restock days</button>
      </div>
      {msg && <div class={'svout' + (msg.bad ? ' bad' : '')}>{msg.lines.map((l, k) => <>{k > 0 && <br />}{l}</>)}</div>}
    </>
  );
}

function Scriptorium({ ch }: { ch: Character }) {
  const C = ch.craft;
  const myCL = derive(ch).cl;
  const list = scribable(ch);
  const cur = list.find((x) => x.n === C.pick) || list[0];
  const lo = cur ? minScrollCL(cur.lv) : 1;
  const cl = Math.min(myCL, Math.max(lo, C.cl || myCL));
  const sc = skillTotal(ch, 'Spellcraft');
  const k = cur ? scribeCheck(cur.lv, cl, C.mats, C.hours || 0) : null;
  const left = CRAFT_DAY - (C.hours || 0);
  return (
    <>
      <div class="scrow">
        <label class="bl">Materials on hand<input type="number" class="w4" value={C.mats} min={0} onChange={(e) => update((d) => void (d.craft.mats = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0)))} /> gp</label>
        <label class="bl">Hours worked today<input type="number" class="w3" value={C.hours || 0} min={0} max={CRAFT_DAY} onChange={(e) => update((d) => void (d.craft.hours = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0)))} /> of {CRAFT_DAY}</label>
      </div>
      {!cur || !k ? (
        <div class="flag">Nothing to scribe. A scroll can only be made from a spell you have prepared and have not cast yet, so prepare the spell first.</div>
      ) : (
        <>
          <div class="scrow">
            <select value={cur.n} onChange={(e) => update((d) => { d.craft.pick = (e.target as HTMLSelectElement).value; d.craft.cl = null; })}>
              {list.map((x) => <option value={x.n}>{x.n} · {x.lv === 0 ? 'cantrip' : 'level ' + x.lv}</option>)}
            </select>
            <select value={cl} onChange={(e) => update((d) => void (d.craft.cl = parseInt((e.target as HTMLSelectElement).value) || myCL))}>
              {Array.from({ length: myCL - lo + 1 }, (_, j) => lo + j).map((i) => <option value={i}>CL {i}</option>)}
            </select>
            <button class="go" disabled={!(k.canPay && k.canTime)} onClick={() => {
              const t = roll('Scribe ' + cur.n + ' — Spellcraft', sc);
              update((d) => void scribe(d, cur, cl, t));
            }}>Scribe it</button>
          </div>
          <div class="why">
            <b>{k.base} gp</b> is what the finished scroll is worth — {cur.lv === 0 ? '½ (a cantrip counts as half a level)' : cur.lv} × {cl} caster level × 25 gp.<br />
            It uses <b>{k.cost} gp</b> of your materials, which is half of that.<br />
            Takes <b>{k.hours} hours</b> — {k.base <= 250 ? 'anything worth 250 gp or less takes 2 hours' : '1 day per 1,000 gp of value, and a working day is 8 hours'}.<br />
            Spellcraft <b>DC {k.dc}</b> (5 + caster level). You roll {sgn(sc)}, so {failsOn(k.dc, sc)}.<br />
            {takeTenMakes(k.dc, sc)
              ? <>When nothing is rushing or threatening you, you may <b>take 10</b> instead of rolling: 10 {sgn(sc)} = {10 + sc}, which makes DC {k.dc}.<br /></>
              : <>Taking 10 instead of rolling gives {10 + sc} — short of DC {k.dc}, so roll.<br /></>}
            {cur.lv === 0 ? 'Cantrips cost you no slot at this table.' : <>Your prepared <b>{cur.n}</b> is spent doing this, exactly as if you had cast it.</>}
          </div>
          {!k.canPay && <div class="flag bad">Not enough materials. You need {k.cost} gp and have {C.mats} gp.</div>}
          {!k.canTime && <div class="flag bad">Not enough hours left today. This needs {k.hours} and you have {left}.</div>}
        </>
      )}
      {C.log.length > 0 && <div class="sclog">{C.log.slice(0, 6).map((l) => <div class={l.ok ? 'scok' : 'scbad'}>{l.txt}</div>)}</div>}
    </>
  );
}

export function Inventory() {
  const ch = useCh();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const total = gearWeight(ch), cap = carryCap(ch.ab.Str), stowed = stowedWeight(ch);
  const quickAdd = () => {
    const n = q.trim();
    if (!n) return;
    update((d) => void d.gear.push({ id: 'g' + Date.now(), n, desc: '', got: '', wt: 0, qty: 1, slot: 'carried', cls: 'r', uses: null, fx: [], cat: guessCat(n) }));
    setQ('');
  };
  return (
    <div class="g2">
      <div class="card">
        <h3>Everything you own</h3>
        {!ch.gear.length && <div class="empty2">Nothing yet.</div>}
        {GEARCATS.map(([cat, label, hint]) => {
          const items = ch.gear.map((g, i) => ({ g, i })).filter(({ g }) => catOf(g) === cat);
          if (!items.length) return null;
          return (
            <>
              <div class="gcat">{label}{hint && <span class="gcathint">{hint}</span>}</div>
              {items.map(({ g, i }) => <GearRow ch={ch} g={g} i={i} cat={cat} open={open === g.id} setOpen={setOpen} />)}
            </>
          );
        })}
        <div style="margin-top:12px;padding-top:11px;border-top:1px solid var(--line)">
          {adding ? <GearEditor g={null} i={null} onDone={() => setAdding(false)} /> : (
            <>
              <div class="addrow">
                <input placeholder="Quick add — magic grass, three gems, a strange key…" style="flex:1;min-width:180px" value={q}
                  onInput={(e) => setQ((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} />
                <button class="go" onClick={quickAdd}>Add</button>
                <button onClick={() => { setAdding(true); setOpen(null); }}>Full form…</button>
              </div>
              <div class="note2" style="margin-top:5px">Quick add just records the name. Hit <b>✎</b> on the item any time to give it a description, where you got it, weight, charges, or a bonus it grants.</div>
            </>
          )}
        </div>
      </div>
      <div>
        <div class="card"><h3>Supplies<span class="nt">how long you can stay out</span></h3><Supplies ch={ch} /></div>
        <div class="card">
          <h3>Carrying capacity</h3>
          <div class="mr">
            <div class="top"><span class="lbl">Carried weight</span><span class="tt">{+total.toFixed(1)}</span></div>
            <div class="why">
              <b>{loadBand(total, cap)}</b> load for Strength {ch.ab.Str}<br />
              light ≤ {cap.light} lb &nbsp;·&nbsp; medium ≤ {cap.medium} lb &nbsp;·&nbsp; heavy ≤ {cap.heavy} lb<br />
              {stowed ? <><span class="src">{+stowed.toFixed(1)} lb more is stowed</span> — on the mount or in camp, so it does not weigh you down.</> : 'Everything you own is on you.'}<br />
              <span class="note2">A medium or heavier load costs you speed, AC and Max Dex.</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Money</h3>
          <div class="money">
            {(['gp', 'sp', 'cp'] as const).map((k) => (
              <label>{k.toUpperCase()} <input type="number" value={ch[k]} onChange={(e) => update((d) => void (d[k] = parseInt((e.target as HTMLInputElement).value) || 0))} /></label>
            ))}
          </div>
        </div>
        <div class="card">
          <h3 data-help="scribe">Scriptorium<span class="nt">turn materials into scrolls</span> <span class="qm">?</span></h3>
          <Scriptorium ch={ch} />
        </div>
      </div>
    </div>
  );
}
