// The one place the character document changes (ARCHITECTURE U2). Components call
// update(fn); the store clones, applies, records undo and schedules a save.

import { useEffect, useState } from 'preact/hooks';
import seed from '../../data/characters/kaldaran.json';
import { migrate } from '../model/migrate';
import {
  announceSave, loadCharacter, onOtherTabSave, pushBackup, saveCharacter,
} from '../model/storage';
import type { Character } from '../model/types';
import { normalizePrep } from '../rules/spells';

const CHAR_ID = 'kaldaran'; // CHARACTER-SPECIFIC: one character until a picker exists (G3).
const TAB = Math.random().toString(36).slice(2);
const UNDO_DEPTH = 25;

export interface State {
  ch: Character | null;
  rev: number;
  /** Short status line for the footer. */
  status: string;
  /** Another tab saved newer data; this tab must reload before it can save. */
  conflict: boolean;
  dirty: boolean;
  undoDepth: number;
  error: string | null;
}

let state: State = { ch: null, rev: 0, status: 'loading…', conflict: false, dirty: false, undoDepth: 0, error: null };
const listeners = new Set<() => void>();
const undo: Character[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function set(p: Partial<State>): void {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

export const getState = (): State => state;

export function useStore(): State {
  const [, force] = useState(0);
  const seen = state;
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    // The store may have changed between render and subscribing (IndexedDB answering
    // before effects run, on a fast reload). Without this check that change was lost
    // and the sheet sat on "Loading…".
    if (state !== seen) l();
    return () => void listeners.delete(l);
  }, []);
  return state;
}

/** Shorthand for components that only need the character (always loaded once the app renders). */
export const useCh = (): Character => useStore().ch!;

export async function init(): Promise<void> {
  try {
    const stored = await loadCharacter(CHAR_ID);
    if (stored) {
      const ch = migrate(stored.doc);
      normalizePrep(ch);
      const upgraded = stored.doc.schema !== ch.schema;
      set({ ch, rev: stored.rev, status: upgraded ? 'upgraded your data to the new format' : 'loaded' });
      if (upgraded) {
        await pushBackup(stored.doc as Character, 'before format upgrade');
        await flush(true);
      }
    } else {
      // First run: start from Kaldaran as v36 last saved him.
      const ch = migrate(seed);
      normalizePrep(ch);
      set({ ch, rev: 0, status: 'first run — loaded Kaldaran from the v36 sheet' });
      await flush(true);
    }
  } catch (e) {
    set({ error: 'Could not open browser storage: ' + (e as Error).message });
  }
  onOtherTabSave((m) => {
    if (m.id === state.ch?.id && m.tab !== TAB && m.rev > state.rev)
      set({ conflict: true, status: 'Saved in another tab' });
  });
  // Don't lose the last few hundred ms of edits when the tab is hidden or closed.
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush());
  addEventListener('pagehide', () => void flush());
}

let lastKey: string | null = null;
let lastAt = 0;

/** Apply a change. `fn` mutates a fresh copy; the previous version goes on the undo stack.
 *  `coalesce` merges a burst of edits to the same field (typing in notes) into one undo step. */
export function update(fn: (ch: Character) => void, status?: string, coalesce?: string): void {
  if (!state.ch) return;
  if (state.conflict) {
    set({ status: 'Not saved: this tab is out of date. Reload to see the newer version.' });
    return;
  }
  const prev = state.ch;
  const next = structuredClone(prev);
  fn(next);
  const now = Date.now();
  const merge = !!coalesce && coalesce === lastKey && now - lastAt < 2000;
  lastKey = coalesce ?? null;
  lastAt = now;
  if (!merge) {
    undo.push(prev);
    if (undo.length > UNDO_DEPTH) undo.shift();
  }
  set({ ch: next, dirty: true, undoDepth: undo.length, ...(status ? { status } : {}) });
  scheduleSave();
}

export function undoLast(): void {
  const prev = undo.pop();
  if (!prev || state.conflict) return;
  set({ ch: prev, dirty: true, undoDepth: undo.length, status: `undone · ${undo.length} step${undo.length === 1 ? '' : 's'} left` });
  scheduleSave();
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), 300);
}

/** Save now. Only when there are unsaved changes (or `force`): a tab that merely hides or
 *  closes must not write, or it would mark every other open tab out of date. */
export async function flush(force = false): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const ch = state.ch;
  if (!ch || state.conflict || (!state.dirty && !force)) return;
  try {
    const r = await saveCharacter(ch, state.rev);
    if (r.ok) {
      announceSave({ type: 'saved', id: ch.id, rev: r.rev, tab: TAB });
      // Only clear dirty if nothing changed while the save was in flight.
      set({ rev: r.rev, dirty: state.ch !== ch });
    } else {
      set({ conflict: true, status: 'Not saved: another tab saved a newer version.' });
    }
  } catch (e) {
    set({ status: 'Save failed: ' + (e as Error).message });
  }
}

/** Throw away this tab's copy and load what's stored (used after a conflict). */
export async function reloadFromStorage(): Promise<void> {
  const stored = await loadCharacter(CHAR_ID);
  if (!stored) return;
  undo.length = 0;
  const ch = migrate(stored.doc);
  normalizePrep(ch);
  set({ ch, rev: stored.rev, conflict: false, dirty: false, undoDepth: 0, status: 'reloaded the newest version' });
}

/** Take a rollback point before a one-way action. */
export async function backup(label: string): Promise<void> {
  if (state.ch) await pushBackup(state.ch, label);
}

/** Replace the whole document (import, restore a backup). Backs up the current one first. */
export async function replaceCharacter(raw: unknown, label: string): Promise<void> {
  if (!state.ch) return;
  await backup('before ' + label);
  const ch = migrate(raw);
  normalizePrep(ch);
  ch.id = state.ch.id; // stays in this character's slot
  update((d) => Object.assign(d, ch), label);
}
