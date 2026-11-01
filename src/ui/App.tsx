import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ABILITIES } from '../model/types';
import { mod, sgn } from '../rules/core';
import { deathLine } from '../rules/mythic-math';
import { characterIssues } from '../rules/issues';
import { hasRecuperation, restHeal } from '../rules/powers';
import { logHp, newDay } from '../rules/actions';
import { Dice } from './components/Dice';
import { LevelUp } from './components/LevelUp';
import { TipLayer } from './components/Tip';
import { Character } from './tabs/Character';
import { Combat } from './tabs/Combat';
import { Inventory } from './tabs/Inventory';
import { Mythic } from './tabs/Mythic';
import { Lookup } from './tabs/Lookup';
import { Notes } from './tabs/Notes';
import { Skills } from './tabs/Skills';
import { sbView, Spellbook } from './tabs/Spellbook';
import { Today } from './tabs/Today';
import { backup, reloadFromStorage, undoLast, update, useStore } from './store';
import { esc } from '../rules/core';

const TABS = [
  ['t', 'Today', Today], ['sb', 'Spellbook', Spellbook], ['c', 'Combat', Combat], ['y', 'Mythic', Mythic],
  ['p', 'Character', Character], ['k', 'Skills', Skills], ['g', 'Inventory', Inventory], ['lk', 'Lookup', Lookup], ['n', 'Notes', Notes],
] as const;
type TabId = (typeof TABS)[number][0];

const intOf = (e: Event) => parseInt((e.target as HTMLInputElement).value);

export function App() {
  const st = useStore();
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>(() => {
    try { return (localStorage.getItem('pf-tab') as TabId) || 't'; } catch { return 't'; }
  });
  const [amt, setAmt] = useState(1);
  const [receipt, setReceipt] = useState<{ title: string; lines: ComponentChildren[] } | null>(null);
  const [leveling, setLeveling] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => { try { localStorage.setItem('pf-tab', tab); } catch { /* private mode */ } }, [tab]);
  useEffect(() => { if (st.ch) document.documentElement.setAttribute('data-theme', st.ch.theme === 'dark' ? 'dark' : 'parchment'); }, [st.ch?.theme]);
  // Everything that explains itself should be reachable by keyboard.
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('[data-help],[data-calc],[data-spell],[data-roll]').forEach((e) => {
      if (/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(e.tagName) || e.tabIndex >= 0) return;
      e.tabIndex = 0;
      e.setAttribute('role', 'button');
    });
  });
  // 1–8 jump to a tab; Ctrl/Cmd+Z undoes — not while typing.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLast(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= 8) { e.preventDefault(); setTab(TABS[i - 1][0]); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);
  // Print shows every pane, and the spellbook widened to every level.
  useEffect(() => {
    if (!printing) return;
    const wasAll = sbView.all;
    sbView.set(true);
    const restore = () => { sbView.set(wasAll); setPrinting(false); };
    addEventListener('afterprint', restore, { once: true });
    setTimeout(() => print(), 50);
  }, [printing]);

  if (st.error) return <div id="ks"><div class="wrap"><div class="flag bad">{st.error}</div></div></div>;
  const ch = st.ch;
  if (!ch) return <div id="ks"><div class="wrap"><div class="empty2">Loading…</div></div></div>;

  const T = ch.tier | 0, L = ch.lvl;
  const idn = ch.identity;
  const look = [idn.hair && `${idn.hair} hair`, idn.eyes && `${idn.eyes.toLowerCase()} eyes`].filter(Boolean).join(', ');
  const pct = Math.max(0, Math.min(100, (ch.hp / ch.hpmax) * 100));
  const name = idn.name || 'Character';
  // v36 set the first three letters plain and the rest in accent ("Kal·daran").
  const split = Math.max(1, Math.floor((name.length * 3) / 8));

  const issues = characterIssues(ch).filter((x) => !x.ok);
  const isSpell = (x: { name: string }) => /slot|prepared|spell/i.test(x.name);
  const badges: Partial<Record<TabId, typeof issues>> = { t: issues.filter(isSpell), sb: issues.filter(isSpell), n: issues.filter((x) => !isSpell(x)) };

  const rest = async () => {
    await backup('before rest');
    let r: ReturnType<typeof newDay> | null = null;
    update((d) => void (r = newDay(d)), "8 hours' rest");
    const x = r!;
    setReceipt({
      title: "New day — here's what changed",
      lines: [
        <><b>{x.slotsBack}</b> spent spell slot{x.slotsBack === 1 ? '' : 's'} refilled — <b>the same spells are still prepared</b></>,
        T > 0 && <>Mythic Power → <b>{x.mythic}</b></>,
        ch.specialist === 'Necromancy' && <>Command Undead and {ch.subschool === 'undead' ? 'Bolster' : 'Grave Touch'} → <b>{x.schoolUses}</b> each</>,
        idn.race === 'Samsaran' && <>Samsaran spell-likes → <b>1 each</b></>,
        <>Bonded amulet free cast → <b>available</b></>,
        <>Timed spell effects cleared — permanent gear and mythic abilities stay on</>,
        <>Conditions cleared</>,
        ch.undead.length > 0 && <span class="no">Your undead do NOT go away — they stay raised</span>,
        ...x.items.map((i) => <>{i.n}: {i.before} → <b>{i.after}</b> (+{i.regain}/day, capped at {i.max})</>),
        <>HP: {x.hpBefore} → <b>{x.hpAfter}</b> ({x.recuperated ? 'Recuperation: 8 hours’ rest restores you to full' : `8 hours' rest restores ${x.healed} hp — twice your level, table ruling 5`})</>,
        x.anyNoRefresh && <span class="no">Items with no daily refresh are unchanged</span>,
      ].filter(Boolean),
    });
  };

  return (
    <div id="ks" ref={root} class={printing ? 'printing' : ''}>
      <div class="wrap">
        {st.conflict && (
          <div class="banner">
            <span class="bt"><b>This tab is out of date.</b> Another tab saved a newer version of {name}. Nothing here will be saved until you load it.</span>
            <button class="go" onClick={() => void reloadFromStorage()}>Load the newer version</button>
          </div>
        )}
        <div class="hdr">
          <div>
            <h1 class="nm">{name.slice(0, split)}<em>{name.slice(split)}</em></h1>
            <div class="sub">{[idn.race, `${idn.classLabel || 'Wizard'} ${L}`, idn.role, idn.alignment, look].filter(Boolean).join(' · ')}</div>
            <div class="myth">{T > 0 ? `${ch.mythic.path}, Mythic Tier ${T}${ch.mythic.abilities.some((a) => a.name === 'Harmonious Mage') ? ' — no opposition schools' : ''}` : ''}</div>
          </div>
          <div class="lv">
            <span>Wizard lvl</span>
            <input type="number" class="w3" min={1} max={20} value={L} onChange={(e) => update((d) => void (d.lvl = Math.min(20, Math.max(1, intOf(e) || 1))))} />
            <span>Mythic tier</span>
            <input type="number" class="w3" min={0} max={10} value={T} onChange={(e) => update((d) => void (d.tier = Math.min(10, Math.max(0, intOf(e) || 0))))} />
          </div>
        </div>

        <div class="abils">
          {ABILITIES.map((k) => (
            <div class="ab">
              <div class="l">{k}</div>
              <input type="number" value={ch.ab[k]} aria-label={k} onChange={(e) => update((d) => void (d.ab[k] = intOf(e) || 10))} />
              <div class="m" data-calc-title={`${k} modifier`} data-calc={esc(`${sgn(mod(ch.ab[k]))} = (${ch.ab[k]} − 10) ÷ 2, rounded down`)}>{sgn(mod(ch.ab[k]))}</div>
            </div>
          ))}
        </div>

        <div class="hpbox">
          <div class="hpn" data-help="hp">
            <input type="number" aria-label="Current hit points" value={ch.hp} onChange={(e) => { const v = intOf(e) || 0; update((d) => { logHp(d, d.hp, v, 'set by hand'); d.hp = v; }); }} />
            <span class="sl">/</span>
            <input class="mx" type="number" aria-label="Maximum hit points" value={ch.hpmax} onChange={(e) => update((d) => void (d.hpmax = Math.max(1, intOf(e) || 1)))} />
          </div>
          <div class="hpbar"><div class={'hpf' + (pct <= 25 ? ' low' : pct <= 50 ? ' mid' : '')} style={{ width: pct + '%' }} /></div>
          <span class="hpw">{ch.hp <= 0 ? (T > 0 ? `Hard to Kill — auto-stable but unconscious · dead at ${deathLine(ch.ab.Con)}` : 'DYING') : pct <= 50 ? 'bloodied' : ''}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="number" class="w4" value={amt} min={1} aria-label="Amount" onInput={(e) => setAmt(Math.max(1, intOf(e) || 1))} />
            <button class="red" onClick={() => update((d) => { const f = d.hp; d.hp -= amt; logHp(d, f, d.hp, 'damage'); })}>Take damage</button>
            <button onClick={() => update((d) => { const f = d.hp; d.hp = Math.min(d.hpmax, d.hp + amt); logHp(d, f, d.hp, 'healed'); })}>Heal</button>
          </div>
        </div>

        <div class="tabs" role="tablist">
          {TABS.map(([id, label]) => {
            const list = badges[id] || [];
            return (
              <button class={'tab' + (tab === id ? ' on' : '')} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {label}
                {list.length > 0 && (
                  <span class="tbadge" data-calc-title={`${list.length} thing${list.length === 1 ? '' : 's'} to look at`}
                    data-calc={list.map((x) => `<b>${esc(x.name)}</b>${x.detail ? ` — ${esc(x.detail)}` : ''}${x.fix ? `<br><span style="opacity:.75">${esc(x.fix)}</span>` : ''}`).join('<br><br>')}>
                    {list.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {TABS.map(([id, , Comp]) => (
          <div class={'pane' + (tab === id || printing ? ' on' : '')} id={'p-' + id}>{(tab === id || printing) && <Comp />}</div>
        ))}

        <div class="foot">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button title="Step back one change" disabled={!st.undoDepth} onClick={undoLast}>↶ Undo</button>
            <button class="go" title="8 hours' rest. Restores every spell slot, daily power and item charge." onClick={() => void rest()}>☾ Rest · {hasRecuperation(T) ? 'full hp' : `+${restHeal(L)} hp`}</button>
            <button class="go" disabled={L >= 20} onClick={() => setLeveling(true)}>▲ Level Up</button>
            <button title="Switch between parchment and dark" onClick={() => update((d) => void (d.theme = d.theme === 'dark' ? 'parchment' : 'dark'))}>◐ {ch.theme === 'dark' ? 'Parchment' : 'Dark'}</button>
            <button title="Print or save a clean copy" onClick={() => setPrinting(true)}>🖨 Print</button>
          </div>
          <span class="sv">{st.dirty ? '● saving… ' : '✓ saved on this device · '}{st.status}</span>
        </div>
      </div>

      <TipLayer root={root} />
      <Dice />
      {receipt && (
        <div class="rcpt on">
          <h4>{receipt.title}</h4>
          <ul>{receipt.lines.map((l) => <li>{l}</li>)}</ul>
          <button onClick={() => setReceipt(null)}>Got it</button>
        </div>
      )}
      {leveling && <LevelUp ch={ch} onClose={() => setLeveling(false)} onDone={(lines) => { setLeveling(false); setReceipt({ title: 'Level up — done', lines }); }} />}
    </div>
  );
}
