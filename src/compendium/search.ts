// Search over the compendium. Pure functions of the loaded entries, so they're unit-tested
// without a browser.

import type { Book, Entry, Kind } from './types';

/** Lower-case, accents and punctuation folded, so "Bull's Strength" matches "bulls strength". */
export const fold = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim();

export interface Query {
  text: string;
  kinds?: Kind[];
  /** Spells only: on this class's list (Foundry class key, e.g. "wizard"). */
  cls?: string;
  /** Spells only: at or below this level for `cls`. */
  maxLevel?: number;
}

export interface Hit { e: Entry; score: number }

const nameCache = new WeakMap<Entry, string>();
const foldedName = (e: Entry) => {
  let v = nameCache.get(e);
  if (v === undefined) nameCache.set(e, (v = fold(e.n)));
  return v;
};

/** Ranked matches: exact name, then name starting with the query, then every word in the name,
 *  then every word somewhere in the name or summary. Ties go alphabetically. */
export function search(entries: Entry[], q: Query, limit = 60): { hits: Hit[]; total: number } {
  const text = fold(q.text);
  const words = text ? text.split(' ') : [];
  const hits: Hit[] = [];
  for (const e of entries) {
    if (q.kinds && q.kinds.length && !q.kinds.includes(e.k)) continue;
    if (q.cls) {
      const lv = e.cls?.[q.cls];
      if (lv === undefined) continue;
      if (q.maxLevel !== undefined && lv > q.maxLevel) continue;
    }
    let score = 1;
    if (words.length) {
      const n = foldedName(e);
      if (n === text) score = 100;
      else if (n.startsWith(text)) score = 60;
      else if (words.every((w) => n.includes(w))) score = 40;
      else {
        const hay = n + ' ' + fold(e.sum || '');
        if (!words.every((w) => hay.includes(w))) continue;
        score = 10;
      }
    }
    hits.push({ e, score });
  }
  hits.sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n));
  return { hits: hits.slice(0, limit), total: hits.length };
}

/** "Core Rulebook p. 283 · Advanced Player's Guide p. 12" */
export function sourceLine(e: Entry, books: Record<string, Book>): string {
  return (e.src || [])
    .map((s) => `${books[s.b]?.n || s.b}${s.p ? ` p. ${s.p}` : ''}`)
    .join(' · ');
}

/** d20pfsrd has no stable URL pattern for most entries ("Bull's Strength, Mass" and "Summon
 *  Monster I" don't follow the obvious one), so link its search instead of guessing a page. */
export const d20Search = (name: string): string => 'https://www.d20pfsrd.com/?s=' + encodeURIComponent(name);
