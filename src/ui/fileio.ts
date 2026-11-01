// Saving the character to a file and loading one back. The sheet also keeps the character in
// this browser on its own (IndexedDB); the file is the copy the player owns: a backup, or a way
// to move to another device. Used by the bottom bar and by Notes (ARCHITECTURE U7).

import type { Character } from '../model/types';
import { fromImport, fromLegacyHtml, toExport } from '../model/storage';
import { replaceCharacter } from './store';

const KEY = (id: string) => 'pf-file-saved:' + id;

/** When this character was last saved to a file from this browser (per-viewer convenience). */
export function lastFileSave(id: string): number | null {
  try { const v = localStorage.getItem(KEY(id)); return v ? +v : null; } catch { return null; }
}

/** Download the character as a .json file named after it and today's date. */
export function saveToFile(ch: Character, now = Date.now()): string {
  const blob = new Blob([JSON.stringify(toExport(ch), null, 2)], { type: 'application/json' });
  const name = `${(ch.identity.name || ch.id).replace(/\W+/g, '_')}_${new Date(now).toISOString().slice(0, 10)}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  try { localStorage.setItem(KEY(ch.id), String(now)); } catch { /* private mode: nothing to remember */ }
  return name;
}

/** Load a saved .json (or an old Kaldaran_Sheet.html). Asks first; the current character is
 *  backed up before it is replaced. Returns a message for the player. */
export async function loadFromFile(f: File): Promise<string> {
  try {
    const text = await f.text();
    const raw = /\.html?$/i.test(f.name) ? fromLegacyHtml(text) : fromImport(text);
    if (!confirm(`Load the character in ${f.name}? It replaces the one on this sheet, which is backed up first (Notes → Backups).`)) return '';
    await replaceCharacter(raw, `load of ${f.name}`);
    return `Loaded ${f.name}. The previous version is in Notes → Backups.`;
  } catch (e) {
    return 'Could not load that file: ' + (e as Error).message;
  }
}

/** "today", "yesterday", "3 days ago" */
export function ago(t: number, now = Date.now()): string {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}
