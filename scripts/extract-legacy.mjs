// Pulls the two data blobs out of the single-file v36 sheet so the rebuild can
// start from the exact data the player has been using at the table.
//
//   node scripts/extract-legacy.mjs [path/to/Kaldaran_Sheet.html]
//
// Writes:
//   data/characters/kaldaran.json  — the `chardata` JSON, byte-for-byte content
//                                    (only re-indented), never edited here.
//   data/spells.crb.json           — the Core Rulebook spell array (`const CRB=[…]`).
//
// Read-only on the source file. Re-running is safe: the output is a pure
// function of the input, so a diff after re-running means the legacy sheet changed.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.argv[2] ?? `${root}/legacy/Kaldaran_Sheet.html`);
const html = readFileSync(src, 'utf8');

function write(rel, value) {
  const out = resolve(root, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(value, null, 2) + '\n', 'utf8');
  return out;
}

// --- character ---------------------------------------------------------------
const charOpen = '<script type="application/json" id="chardata">';
const cStart = html.indexOf(charOpen);
if (cStart < 0) throw new Error('chardata <script> tag not found');
const cBodyStart = cStart + charOpen.length;
const cEnd = html.indexOf('</script>', cBodyStart);
const character = JSON.parse(html.slice(cBodyStart, cEnd));

// --- spells ------------------------------------------------------------------
// The array sits on one line as `const CRB=[...];`. It is valid JSON, so parse
// it as JSON rather than eval'ing anything out of the HTML.
const crbMarker = 'const CRB=';
const sStart = html.indexOf(crbMarker);
if (sStart < 0) throw new Error('const CRB= not found');
const lineEnd = html.indexOf('\n', sStart);
const crbSrc = html.slice(sStart + crbMarker.length, lineEnd).trim().replace(/;$/, '');
const spells = JSON.parse(crbSrc);

// --- build stamp, for the log --------------------------------------------------
const build = /const BUILD='([^']*)'/.exec(html)?.[1] ?? 'unknown';

const a = write('data/characters/kaldaran.json', character);
const b = write('data/spells.crb.json', spells);
console.log(`source build: ${build}`);
console.log(`character schema ${character.schema}, ${character.book.length} spellbook entries -> ${a}`);
console.log(`${spells.length} CRB spells -> ${b}`);
