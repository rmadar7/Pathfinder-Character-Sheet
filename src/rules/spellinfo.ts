// Full spell details: the character's book entry, layered over the curated fix table, layered
// over the embedded Core Rulebook list — so every spell card shows complete stats even when
// the book entry only has a name.

import crbData from '../../data/spells.crb.json';
import { SPELLFIX } from '../data/spellfix';
import type { BookSpell } from '../model/types';

export interface CrbSpell {
  n: string; lv: number; sc: string; d: string;
  ct?: string; cp?: string; rg?: string; tg?: string; du?: string; sv?: string; sr?: string;
}
export const CRB = crbData as CrbSpell[];

const KEYS = ['ct', 'cp', 'rg', 'tg', 'du', 'sv', 'sr'] as const;

export interface SpellDetails extends BookSpell {
  d: string;
  ct: string; cp: string; rg: string; tg: string; du: string; sv: string; sr: string;
}

export function spellDetails(sp: BookSpell): SpellDetails {
  const key = (sp.n || '').toLowerCase();
  const fix = SPELLFIX[key] || {};
  const crb: Partial<CrbSpell> = CRB.find((x) => x.n.toLowerCase() === key && x.lv === sp.lv) || CRB.find((x) => x.n.toLowerCase() === key) || {};
  const pick = (k: (typeof KEYS)[number]): string => {
    for (const src of [sp, fix, crb] as Record<string, unknown>[]) {
      const v = src[k];
      if (v != null && String(v).trim()) return String(v);
    }
    return '';
  };
  const out = {
    ...sp,
    d: sp.d && sp.d.trim() ? sp.d : fix.d || crb.d || '',
  } as SpellDetails;
  for (const k of KEYS) out[k] = pick(k);
  return out;
}

/** Many CRB entries fold "Spell Resistance X" into the save string; split them. */
export function splitSaveSR(sv: string, sr: string): { save: string; sr: string } {
  sv = (sv || '').trim();
  sr = (sr || '').trim();
  const clean = (s: string) => s.replace(/^[:\s;]+/, '').replace(/[;\s]+$/, '').trim();
  if (!sr) {
    const m = sv.match(/spell\s*resistance:?\s*(.*)$/i);
    if (m) { sr = clean(m[1]); sv = sv.slice(0, m.index); }
  }
  return { save: clean(sv), sr: clean(sr) };
}

/** Plain-language gloss of the components line. */
export function compGloss(cp: string): string[] {
  if (!cp) return [];
  const g: string[] = [];
  if (/\bV\b/.test(cp)) g.push('V — spoken: you must be able to speak');
  if (/\bS\b/.test(cp)) g.push('S — gestures: you need a free hand');
  if (/\bM\b/.test(cp)) g.push('M — a material, from your component pouch');
  if (/\bF\b/.test(cp)) g.push('F — a focus: a reusable item you must hold');
  if (/\bDF\b/.test(cp)) g.push('DF — divine focus');
  if (/\bXP\b/i.test(cp)) g.push('XP — costs experience');
  return g;
}

/** Damage/healing dice named literally in the spell's own text. Nothing is inferred. */
export function spellDice(sp: BookSpell): { n: number; die: number; label: string }[] {
  const full = spellDetails(sp);
  const txt = [sp.d || '', full.d || ''].join(' ');
  const seen = new Set<string>();
  const out: { n: number; die: number; label: string }[] = [];
  const re = /(\d+)d(\d+)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(txt)) !== null) {
    const key = x[1] + 'd' + x[2];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ n: +x[1], die: +x[2], label: key });
    if (out.length >= 3) break;
  }
  return out;
}
