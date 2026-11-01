import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { _resetDbForTests, fromImport, fromLegacyHtml, listBackups, loadCharacter, pushBackup, saveCharacter, toExport } from '../src/model/storage';
import { readFileSync } from 'node:fs';
import { kaldaran, rawKaldaran } from './helpers';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  _resetDbForTests();
});

describe('storage', () => {
  it('saves, loads and bumps the revision', async () => {
    const ch = kaldaran();
    expect(await saveCharacter(ch, 0)).toEqual({ ok: true, rev: 1 });
    expect(await saveCharacter(ch, 1)).toEqual({ ok: true, rev: 2 });
    const s = await loadCharacter('kaldaran');
    expect(s!.rev).toBe(2);
    expect(s!.doc.gp).toBe(521);
  });

  it('a stale tab cannot overwrite newer data (the v36 autosave hazard)', async () => {
    const ch = kaldaran();
    await saveCharacter(ch, 0); // both tabs load rev 1
    const tabB = { ...ch, gp: 999 };
    expect((await saveCharacter(tabB, 1)).ok).toBe(true); // tab B saves → rev 2
    const tabA = { ...ch, gp: 1 };
    expect(await saveCharacter(tabA, 1)).toEqual({ ok: false, storedRev: 2 }); // tab A is behind
    expect((await loadCharacter('kaldaran'))!.doc.gp).toBe(999);
  });

  it('keeps backups newest first, trimmed to 12', async () => {
    const ch = kaldaran();
    for (let i = 0; i < 15; i++) await pushBackup({ ...ch, hp: i }, 'b' + i, 1000 + i);
    const b = await listBackups('kaldaran');
    expect(b).toHaveLength(12);
    expect(b[0].label).toBe('b14');
  });

  it('round-trips an export, and imports a bare doc and the v36 HTML', () => {
    const ch = kaldaran();
    expect(fromImport(JSON.stringify(toExport(ch, 5)))).toEqual(ch);
    expect(fromImport(JSON.stringify(rawKaldaran()))).toEqual(rawKaldaran());
    expect(fromLegacyHtml(readFileSync('legacy/Kaldaran_Sheet.html', 'utf8'))).toEqual(rawKaldaran());
    expect(() => fromImport('{"hello":1}')).toThrow();
  });
});
