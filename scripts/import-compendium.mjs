// COMPENDIUM IMPORT (PLAN.md §3, Phase 1).
//
// Reads the Foundry VTT Pathfinder 1e system's content packs (game content under the OGL 1.0a)
// and writes our own compact JSON into public/compendium/. The app never reads Foundry's
// format; re-run this to pick up upstream fixes and review the diff it prints.
//
//   git clone --depth 1 --filter=blob:none --sparse \
//     https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1.git pf1
//   (cd pf1 && git sparse-checkout set packs module)
//   node scripts/import-compendium.mjs path/to/pf1
//
// Descriptions are converted to plain text (paragraphs and list items kept as line breaks).
// No HTML from the import ever reaches the page, so nothing in it can run.

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import { fmtDuration, toText } from './compendium-text.mjs';

const root = process.argv[2];
if (!root || !existsSync(join(root, 'packs'))) {
  console.error('usage: node scripts/import-compendium.mjs path/to/foundryvtt-pathfinder1');
  process.exit(1);
}
const OUT = 'public/compendium';
mkdirSync(OUT, { recursive: true });

/* ---------- source books: Foundry's registry, parsed as text (it is a JS module) ---------- */
const BOOKS = {};
{
  const src = readFileSync(join(root, 'module/registry/sources.mjs'), 'utf8');
  for (const m of src.matchAll(/^\s{4}([A-Z0-9_-]+): \{\s*\n([\s\S]*?)\n\s{4}\},/gm)) {
    const name = m[2].match(/name: "([^"]+)"/)?.[1];
    if (name) BOOKS[m[1]] = { n: name, a: m[2].match(/abbr: "([^"]+)"/)?.[1] || null, t: m[2].match(/type: "([^"]+)"/)?.[1] || null };
  }
}

/* ---------- helpers ---------- */
function* yamlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* yamlFiles(p);
    else if (f.endsWith('.yaml')) yield p;
  }
}
const sources = (sys) =>
  (sys.sources || []).filter((s) => s && s.id).map((s) => ({ b: s.id, ...(s.pages ? { p: String(s.pages) } : {}) }));
const changes = (sys) =>
  Object.values(sys.changes || {}).filter((c) => c && c.target).map((c) => ({ f: String(c.formula ?? ''), t: c.target, ...(c.type ? { y: c.type } : {}) }));
const SCHOOLS = { abj: 'Abjuration', con: 'Conjuration', div: 'Divination', enc: 'Enchantment', evo: 'Evocation', ill: 'Illusion', nec: 'Necromancy', trs: 'Transmutation', uni: 'Universal', misc: 'Miscellaneous' };
const RANGE = { personal: 'Personal', touch: 'Touch', close: 'Close (25 ft. + 5 ft./2 levels)', medium: 'Medium (100 ft. + 10 ft./level)', long: 'Long (400 ft. + 40 ft./level)', unlimited: 'Unlimited', seeText: 'See text' };
const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === '' || o[k] === null || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; return o; };

/* ---------- per-kind mappers ---------- */
function spell(d, sys) {
  const a = Object.values(sys.actions || {})[0] || {};
  const comps = sys.components || {};
  const cp = [comps.verbal && 'V', comps.somatic && 'S', comps.thought && 'T', comps.emotion && 'E',
    comps.material && ('M' + (sys.materials?.value ? ` (${sys.materials.value})` : '')),
    comps.focus && ('F' + (sys.materials?.focus ? ` (${sys.materials.focus})` : '')),
    comps.divineFocus && 'DF'].filter(Boolean).join(', ');
  const r = a.range || {};
  const rg = r.units === 'ft' ? `${r.value} ft.` : r.units === 'mi' ? `${r.value} mi.` : RANGE[r.units] || (r.value ?? '');
  const lv = {};
  for (const [k, v] of Object.entries(sys.learnedAt?.class || {})) lv[k] = v;
  const dom = sys.learnedAt?.domain || {}, bl = sys.learnedAt?.bloodline || {};
  return clean({
    lv: sys.level, sc: SCHOOLS[sys.school] || sys.school, sub: (sys.subschool || []).join?.(', ') || sys.subschool,
    desc: (sys.descriptors || []).join?.(', ') || undefined, cls: lv,
    dom: Object.keys(dom).length ? dom : undefined, blood: Object.keys(bl).length ? bl : undefined,
    ct: a.activation?.type ? `1 ${a.activation.type}${a.activation.type === 'round' ? '' : ' action'}` : undefined,
    cp: cp || undefined, rg: rg || undefined,
    ar: a.area || a.target?.value || a.effect || undefined,
    du: fmtDuration(a.duration),
    sv: a.save?.description || undefined, sr: sys.sr === true ? 'yes' : sys.sr === false ? 'no' : undefined,
  });
}
const feat = (d, sys) => {
  const text = toText(sys.description?.value);
  const pre = text.match(/Prerequisites?\s*:\s*([^\n]+)/i)?.[1]?.trim();
  return clean({ ft: sys.subType, tags: sys.tags, pre, fx: changes(sys) });
};
const cls = (d, sys) => clean({
  bab: sys.bab, hd: sys.hd, saves: Object.fromEntries(Object.entries(sys.savingThrows || {}).map(([k, v]) => [k, v.value])),
  skills: sys.classSkills, cast: sys.casting ? clean({ type: sys.casting.type, ability: sys.casting.ability, prog: sys.casting.progression, kind: sys.casting.spells }) : undefined,
  sub: sys.subType,
});
const race = (d, sys) => clean({ size: sys.size, speed: sys.speeds?.land, types: sys.creatureTypes, subtypes: sys.creatureSubtypes, langs: sys.languages, fx: changes(sys) });
const item = (d, sys, cat) => clean({
  cat, ty: d.type, sub: sys.subType || sys.equipmentSubtype, slot: sys.slot,
  gp: sys.price?.base ?? sys.price, lb: sys.weight?.value ?? sys.weight, cl: sys.cl,
  aura: sys.aura?.school ? SCHOOLS[sys.aura.school] || sys.aura.school : undefined, fx: changes(sys),
});
const buff = (d, sys) => clean({ sub: sys.subType, fx: changes(sys) });
const ability = (d, sys) => clean({ sub: sys.subType, fx: changes(sys) });

/** Which packs, as which kind. Monster, macro, table and VTT-only packs are left out (HANDOFF §1). */
const PACKS = [
  ['spells', 'spell', spell], ['feats', 'feat', feat], ['classes', 'class', cls], ['races', 'race', race],
  ['class-abilities', 'ability', ability], ['mythic-paths', 'mythic', ability], ['buffs', 'buff', buff],
  ['items', 'item', item], ['armors-and-shields', 'item', item], ['weapons-and-ammo', 'item', item],
  ['ultimate-equipment', 'item', item], ['technology', 'item', item],
];
const FILE = { spell: 'spells', feat: 'feats', class: 'classes', race: 'races', ability: 'abilities', mythic: 'abilities', buff: 'buffs', item: 'items' };

const out = {};
let skipped = 0;
for (const [pack, kind, map] of PACKS) {
  const dir = join(root, 'packs', pack);
  for (const f of yamlFiles(dir)) {
    const d = parse(readFileSync(f, 'utf8'));
    if (!d || !d.name || String(d._key || '').startsWith('!folders!')) { skipped++; continue; }
    const sys = d.system || {};
    const cat = relative(dir, f).split(sep).slice(0, -1).join('/') || undefined;
    const e = clean({
      id: d._id, n: d.name.trim(), k: kind, src: sources(sys),
      sum: toText(sys.description?.summary) || undefined,
      d: toText(sys.description?.value) || toText(sys.description?.unidentified) || undefined,
      // Upstream has only the short "unidentified" text for most magic items.
      thin: !sys.description?.value && !!sys.description?.unidentified ? true : undefined,
      ...map(d, sys, [pack, cat].filter(Boolean).join('/')),
    });
    (out[FILE[kind]] = out[FILE[kind]] || []).push(e);
  }
}

/* ---------- write, with a diff summary against what was there ---------- */
const upstream = (() => { try { return execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); } catch { return 'unknown'; } })();
const index = { system: 'pf1', edition: 'Pathfinder 1st Edition', upstream: 'https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1', commit: upstream, files: {}, books: BOOKS };
for (const [file, list] of Object.entries(out)) {
  list.sort((a, b) => a.n.localeCompare(b.n) || a.id.localeCompare(b.id));
  const path = join(OUT, file + '.json');
  const before = existsSync(path) ? new Map(JSON.parse(readFileSync(path, 'utf8')).map((e) => [e.id, JSON.stringify(e)])) : new Map();
  const now = new Map(list.map((e) => [e.id, JSON.stringify(e)]));
  const added = [...now.keys()].filter((k) => !before.has(k)).length;
  const removed = [...before.keys()].filter((k) => !now.has(k)).length;
  const changed = [...now.keys()].filter((k) => before.has(k) && before.get(k) !== now.get(k)).length;
  writeFileSync(path, JSON.stringify(list));
  index.files[file] = list.length;
  console.log(`${file.padEnd(10)} ${String(list.length).padStart(5)} entries  (+${added} −${removed} ~${changed})`);
}
// Only the books something actually comes from, for the OGL notice.
const used = new Set(Object.values(out).flatMap((l) => l.flatMap((e) => (e.src || []).map((s) => s.b))));
index.books = Object.fromEntries(Object.entries(BOOKS).filter(([id]) => used.has(id)));
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 1));
writeFileSync(join(OUT, 'OGL.txt'), readFileSync(join(root, 'OGL.txt'), 'utf8'));
console.log(`skipped ${skipped} folder/empty records · ${Object.keys(BOOKS).length} books · upstream ${upstream.slice(0, 10)}`);
