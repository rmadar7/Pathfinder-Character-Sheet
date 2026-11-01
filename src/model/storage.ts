// Local-first storage (ARCHITECTURE M5). IndexedDB holds the live document per character id.
//
// The revision guard is what replaces v36's "is the file on disk a different build?" check:
// every save bumps `rev`, and a save only goes through if the stored rev is the one this tab
// last saw. A tab left open since this morning therefore can't overwrite newer data — it is
// told to reload instead. Code is never saved at all (ARCHITECTURE M6).

import type { Character } from './types';

const DB_NAME = 'pf-sheet';
const DB_VERSION = 1;
const CHARS = 'characters';
const BACKUPS = 'backups';
const KEEP_BACKUPS = 12;

export interface Stored {
  id: string;
  rev: number;
  savedAt: number;
  doc: Character;
}

export interface Backup {
  key?: number;
  charId: string;
  t: number;
  label: string;
  lvl: number;
  hp: number;
  doc: Character;
}

export type SaveResult = { ok: true; rev: number } | { ok: false; storedRev: number };

let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains(CHARS)) d.createObjectStore(CHARS, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(BACKUPS)) {
        const b = d.createObjectStore(BACKUPS, { keyPath: 'key', autoIncrement: true });
        b.createIndex('charId', 'charId');
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

/** For tests: forget the cached connection. */
export function _resetDbForTests(): void {
  dbp = null;
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

const done = (t: IDBTransaction): Promise<void> =>
  new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });

export async function loadCharacter(id: string): Promise<Stored | null> {
  const d = await db();
  const r = await req(d.transaction(CHARS, 'readonly').objectStore(CHARS).get(id));
  return (r as Stored) || null;
}

export async function listCharacterIds(): Promise<string[]> {
  const d = await db();
  return (await req(d.transaction(CHARS, 'readonly').objectStore(CHARS).getAllKeys())) as string[];
}

/** Save only if nobody else saved since `expectedRev`. `expectedRev` 0 = first save. */
export async function saveCharacter(doc: Character, expectedRev: number, now = Date.now()): Promise<SaveResult> {
  const d = await db();
  const t = d.transaction(CHARS, 'readwrite');
  const store = t.objectStore(CHARS);
  const cur = (await req(store.get(doc.id))) as Stored | undefined;
  const storedRev = cur?.rev ?? 0;
  if (storedRev !== expectedRev) {
    t.abort();
    return { ok: false, storedRev };
  }
  const rev = storedRev + 1;
  store.put({ id: doc.id, rev, savedAt: now, doc: { ...doc, savedAt: now } } satisfies Stored);
  await done(t);
  return { ok: true, rev };
}

/** A rollback point before a one-way action (New Day, Level Up, import, undo-able deletes). */
export async function pushBackup(doc: Character, label: string, now = Date.now()): Promise<void> {
  const d = await db();
  const t = d.transaction(BACKUPS, 'readwrite');
  const store = t.objectStore(BACKUPS);
  store.add({ charId: doc.id, t: now, label, lvl: doc.lvl, hp: doc.hp, doc: structuredClone(doc) } satisfies Backup);
  await done(t);
  // Trim to the newest KEEP_BACKUPS for this character.
  const all = await listBackups(doc.id);
  if (all.length > KEEP_BACKUPS) {
    const t2 = d.transaction(BACKUPS, 'readwrite');
    for (const b of all.slice(KEEP_BACKUPS)) t2.objectStore(BACKUPS).delete(b.key!);
    await done(t2);
  }
}

/** Newest first. */
export async function listBackups(charId: string): Promise<Backup[]> {
  const d = await db();
  const idx = d.transaction(BACKUPS, 'readonly').objectStore(BACKUPS).index('charId');
  const all = (await req(idx.getAll(charId))) as Backup[];
  return all.sort((a, b) => b.t - a.t || (b.key ?? 0) - (a.key ?? 0));
}

// ---- tab coordination ------------------------------------------------------------------

export interface SavedMsg {
  type: 'saved';
  id: string;
  rev: number;
  tab: string;
}

const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(DB_NAME) : null;

export const announceSave = (m: SavedMsg): void => channel?.postMessage(m);
export function onOtherTabSave(fn: (m: SavedMsg) => void): () => void {
  if (!channel) return () => {};
  const h = (e: MessageEvent) => e.data?.type === 'saved' && fn(e.data as SavedMsg);
  channel.addEventListener('message', h);
  return () => channel.removeEventListener('message', h);
}

// ---- export / import -------------------------------------------------------------------

export interface ExportFile {
  format: 'pf-sheet-character';
  version: 1;
  exportedAt: number;
  character: Character;
}

export const toExport = (doc: Character, now = Date.now()): ExportFile => ({
  format: 'pf-sheet-character', version: 1, exportedAt: now, character: doc,
});

/** Accepts our export wrapper, a bare character document, or v36's embedded chardata JSON.
 *  Returns the raw document; the caller runs migrate() on it. */
export function fromImport(text: string): unknown {
  const o = JSON.parse(text);
  if (o && o.format === 'pf-sheet-character' && o.character) return o.character;
  if (o && typeof o === 'object' && ('lvl' in o || 'ab' in o)) return o;
  throw new Error('This file is not a character sheet export.');
}

/** Pull the character out of a v36 Kaldaran_Sheet.html, so the old file can be imported. */
export function fromLegacyHtml(html: string): unknown {
  const open = '<script type="application/json" id="chardata">';
  const i = html.indexOf(open);
  if (i < 0) throw new Error('No character data found in that HTML file.');
  const j = html.indexOf('</script>', i + open.length);
  return JSON.parse(html.slice(i + open.length, j));
}
