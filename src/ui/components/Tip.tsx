// The one explanation mechanism (ARCHITECTURE U4). Delegated from the sheet root so it works
// on hover (desktop), tap (tablet at the table) and keyboard:
//   data-help="key"            → plain-language help from ui/help.ts
//   data-calc="…" data-calc-title="…"  → how a number was calculated
//   data-spell="lv|name"       → the full spell card
//   data-roll="n" data-roll-label="…"  → click rolls d20 + n
// A tapped tip is "pinned": it ignores mouseout and closes on Escape or a click elsewhere.

import { useEffect, useRef, useState } from 'preact/hooks';
import { esc, sgn } from '../../rules/core';
import { derive } from '../../rules/derive';
import { dcFx, saveDC, spellFocusBonus } from '../../rules/spells';
import { CRB, compGloss, spellDetails, splitSaveSR } from '../../rules/spellinfo';
import type { BookSpell, Character } from '../../model/types';
import { helpFor } from '../help';
import { getState } from '../store';
import { roll } from './Dice';

interface TipContent {
  cls: string;
  html: string;
}

function spellFromAttr(ch: Character, v: string): BookSpell | null {
  const i = v.indexOf('|');
  const lv = +v.slice(0, i), n = v.slice(i + 1);
  return ch.book.find((b) => b.n === n && b.lv === lv) || (CRB.find((b) => b.n === n && b.lv === lv) as BookSpell | undefined) || null;
}

function spellHTML(ch: Character, sp0: BookSpell): TipContent {
  const sp = spellDetails(sp0);
  const m = derive(ch).m;
  const dc = saveDC(ch, sp.lv, sp.sc, m.Int);
  const fb = spellFocusBonus(ch, sp.sc);
  const row = (k: string, v: string) => (v ? `<tr><td class="k">${k}</td><td class="v">${esc(v)}</td></tr>` : '');
  const costly = /worth at least|gp\b/i.test(sp.cp || '');
  const { save, sr } = splitSaveSR(sp.sv, sp.sr);
  const gloss = compGloss(sp.cp);
  return {
    cls: 'tip' + (sp.sc === 'Necromancy' ? ' necro' : '') + (sp.gm ? ' gm' : ''),
    html:
      `<h5>${esc(sp.n)}</h5>` +
      `<div class="meta">${sp.lv === 0 ? 'Cantrip' : 'Level ' + sp.lv} &middot; ${esc(sp.sc)}${sp.gm ? ' &middot; DM ruling' : ''}${sp.unsourced ? ' &middot; unsourced' : ''}</div>` +
      `<div class="dcbig">Save DC ${dc} = 10 + ${sp.lv} spell level + ${m.Int} Int${fb ? ` <span class="src">+${fb} Spell Focus (${esc(sp.sc)})</span>` : ''}` +
      `${dcFx(ch).applied.map((r) => ` <span class="src">${sgn(r.v)} ${esc(r.name)}</span>`).join('')}</div>` +
      `<div class="body">${esc(sp.d || 'No description recorded.')}</div>` +
      `<table class="sb2">${row('Cast', sp.ct)}${sp.cp ? `<tr><td class="k">Needs</td><td class="v">${esc(sp.cp)}${costly ? ' <span class="warn">costs money</span>' : ''}</td></tr>` : ''}` +
      `${row('Range', sp.rg)}${row('Affects', sp.tg)}${row('Lasts', sp.du)}${row('Save', save)}${row('Spell resistance', sr)}</table>` +
      (gloss.length ? `<div class="gloss">${gloss.map(esc).join('<br>')}</div>` : '') +
      `<div class="foot2">Caster level ${ch.lvl}${sp.lv === 0 ? ' &middot; unlimited, cast at will' : ''}` +
      `${sp.url && /^https:\/\/www\.d20pfsrd\.com\//.test(sp.url) ? ` &middot; <a href="${esc(sp.url)}" target="_blank" rel="noopener">d20pfsrd</a>` : ''}</div>`,
  };
}

function contentFor(el: HTMLElement, ch: Character): TipContent | null {
  if (el.dataset.help) {
    const h = helpFor(ch, el.dataset.help);
    if (!h) return null;
    return { cls: 'tip help2', html: `<h5>${esc(h.t)}</h5>${h.b ? `<div class="body">${esc(h.b)}</div>` : ''}${h.m ? `<div class="foot2">${esc(h.m)}</div>` : ''}` };
  }
  if (el.dataset.spell) {
    const sp = spellFromAttr(ch, el.dataset.spell);
    return sp ? spellHTML(ch, sp) : null;
  }
  if (el.dataset.calc !== undefined) {
    // data-calc bodies are built by our own code; any player text in them was escaped there.
    return {
      cls: 'tip help2',
      html: `<h5>${esc(el.dataset.calcTitle || 'How this is calculated')}</h5><div class="body" style="font-size:12.5px;line-height:1.7">${el.dataset.calc}</div>`,
    };
  }
  return null;
}

const SEL = '[data-help],[data-spell],[data-calc]';
const isControl = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.('button,input,select,textarea,a');

/** Attach the delegated listeners to the sheet root and render the floating tip. */
export function TipLayer({ root }: { root: { current: HTMLElement | null } }) {
  const [tip, setTip] = useState<(TipContent & { x: number; y: number }) | null>(null);
  const pinned = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const target = (ev: Event) => (ev.target as HTMLElement).closest?.(SEL) as HTMLElement | null;
    const show = (el: HTMLElement, x: number, y: number) => {
      const ch = getState().ch;
      const c = ch && contentFor(el, ch);
      setTip(c ? { ...c, x, y } : null);
    };
    const over = (ev: MouseEvent) => {
      if (pinned.current) return;
      const el = target(ev);
      if (el) show(el, ev.clientX + 16, ev.clientY + 16);
    };
    const move = (ev: MouseEvent) => {
      if (pinned.current || !target(ev)) return;
      setTip((t) => (t ? { ...t, x: ev.clientX + 16, y: ev.clientY + 16 } : t));
    };
    const out = (ev: MouseEvent) => {
      if (pinned.current) return;
      if (target(ev) && !target({ target: ev.relatedTarget } as unknown as Event)) setTip(null);
    };
    const click = (ev: MouseEvent) => {
      const rollEl = (ev.target as HTMLElement).closest?.('[data-roll]') as HTMLElement | null;
      if (rollEl && !isControl(ev.target)) {
        ev.preventDefault();
        roll(rollEl.dataset.rollLabel || 'Roll', parseInt(rollEl.dataset.roll || '0') || 0);
        return;
      }
      if (isControl(ev.target)) return;
      const el = target(ev);
      if (!el) return;
      ev.stopPropagation();
      pinned.current = el;
      const b = el.getBoundingClientRect();
      show(el, b.left, b.bottom + 8);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const t = ev.target as HTMLElement;
      if (!t.matches?.('[data-roll],' + SEL) || isControl(t)) return;
      ev.preventDefault();
      t.click();
    };
    r.addEventListener('mouseover', over);
    r.addEventListener('mousemove', move);
    r.addEventListener('mouseout', out);
    r.addEventListener('click', click);
    r.addEventListener('keydown', key);
    const close = (ev: Event) => {
      if (pinned.current && !(ev.target as HTMLElement).closest?.('#tip')) { pinned.current = null; setTip(null); }
    };
    const esc_ = (ev: KeyboardEvent) => ev.key === 'Escape' && (pinned.current = null, setTip(null));
    const hide = () => !pinned.current && setTip(null);
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc_);
    addEventListener('scroll', hide, true);
    return () => {
      r.removeEventListener('mouseover', over);
      r.removeEventListener('mousemove', move);
      r.removeEventListener('mouseout', out);
      r.removeEventListener('click', click);
      r.removeEventListener('keydown', key);
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', esc_);
      removeEventListener('scroll', hide, true);
    };
  }, [root.current]);

  // Keep the tip on screen.
  useEffect(() => {
    const t = box.current;
    if (!t || !tip) return;
    const w = t.offsetWidth, h = t.offsetHeight;
    let { x, y } = tip;
    if (x + w > innerWidth - 10) x = Math.max(10, innerWidth - w - 10);
    if (y + h > innerHeight - 10) y = Math.max(10, y - h - 32);
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  });

  if (!tip) return null;
  return <div id="tip" ref={box} class={tip.cls} style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: tip.html }} />;
}
