// SWITCH-OVER CHECK (ARCHITECTURE T4). Opens a v36 sheet file and the built app side by side,
// imports that same v36 file into the app (through the real Import button), then compares
// every number shown on every tab. A number that appears on one side only is a difference.
//
// Differences already explained in docs/DECISIONS.md are listed in EXPECTED below with the
// reason; anything else fails the check and must be fixed or explained there first.
//
// Usage:  npx vite preview &   then
//         node scripts/check-parity.cjs [path/to/Kaldaran_Sheet.html] [app-url]
// Run it on the newest v36 file Ryan has saved before switching him over.
const { chromium } = require('playwright');
const path = require('path');

// [tab, number, 'v36' | 'new', why]. The number is matched as it appears in the text.
const EXPECTED = [
  ['Today', 'DC 16', 'v36', 'Concentration box default: v36 used a flat 15 + spell level; now "hit while casting", 10 + 0 + 1 (DECISIONS: concentration DC)'],
  ['Today', 'DC 11', 'new', 'same as above'],
  ['Combat', 'DC 15', 'v36', 'v36 concentration help quoted "DC 15 + spell level"; corrected per Magic → Concentration'],
  ['Mythic', '3', 'v36', 'wording only: Arch-Mage bonus HP line now reads "tiers 2, 4…" instead of "3 per tier"'],
  ['Mythic', '+4', 'v36', 'wording only: Undead Master (Mythic) sentence reworded'],
  ['Mythic', '10', 'new', 'wording only: table ruling 10 now named in the bonus HP line'],
  ['Character', '4', 'v36', 'wording only: "(table ruling 9)" added to the caster level line'],
  ['Character', '9', 'new', 'Command Undead feat cap line, new in the port'],
  ['Character', 'DC 19', 'new', 'command undead SPELL note (save DC 19), new in the port'],
  ['Inventory', '6', 'new', 'Ring of Sustenance text reworded to table ruling 6 (DECISIONS: data clean-up 1)'],
  ['Inventory', 'DC 9', 'new', 'Scriptorium take-10 line (DECISIONS: natural 1 on skill checks)'],
  ['Inventory', '+13', 'new', 'same as above'],
  ['Inventory', '23', 'new', 'same as above'],
  ['Inventory', '10', 'new', 'same as above'],
];
// Notes holds diagnostics, backups and timestamps, which differ by design.
const SKIP_TABS = new Set(['Notes']);

const norm = (s) => s.replace(/[–−]/g, '-');
const tokens = (text) => {
  const c = new Map();
  for (const t of norm(text).match(/DC \d+|[+-]?\d+/g) || []) c.set(t, (c.get(t) || 0) + 1);
  return c;
};
const minus = (a, b) => [...a].filter(([k, n]) => n > (b.get(k) || 0)).map(([k]) => k);

(async () => {
  const file = path.resolve(process.argv[2] || 'legacy/Kaldaran_Sheet.html');
  const url = process.argv[3] || 'http://localhost:4173/';
  const browser = await chromium.launch();
  const errors = [];

  // v36: each tab button has data-p; read the visible pane.
  const old = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  old.on('pageerror', (e) => errors.push('v36: ' + e.message));
  await old.goto('file://' + file);
  const oldTabs = await old.$$eval('[data-p]', (ts) => ts.map((t) => [t.getAttribute('data-p'), t.textContent.trim()]));
  const v36 = {};
  for (const [k, n] of oldTabs) {
    await old.click(`[data-p="${k}"]`);
    await old.waitForTimeout(100);
    v36[n] = await old.evaluate(() => {
      const v = [...document.querySelectorAll('section,.pane,.panel')].find((e) => e.offsetParent !== null && e.innerText.length > 200);
      return v ? v.innerText : document.body.innerText;
    });
  }

  // New app, fresh storage, then import the same v36 file through the Notes tab.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await ctx.newPage();
  app.on('pageerror', (e) => errors.push('app: ' + e.message));
  app.on('dialog', (d) => d.accept());
  await app.goto(url);
  await app.waitForSelector('.tabs');
  const names = await app.$$eval('.tab', (ts) => ts.map((t) => t.textContent.replace(/\d+$/, '').trim()));
  await app.click(`.tab >> nth=${names.indexOf('Notes')}`);
  await app.setInputFiles('input[type=file]', file);
  await app.waitForFunction(() => /Imported /.test(document.body.innerText), null, { timeout: 10000 });
  const now = {};
  for (let i = 0; i < names.length; i++) {
    await app.click(`.tab >> nth=${i}`);
    await app.waitForTimeout(150);
    now[names[i]] = await app.$eval('.pane.on', (p) => p.innerText);
  }
  await browser.close();

  let bad = 0;
  for (const tab of Object.keys(v36)) {
    if (SKIP_TABS.has(tab)) continue;
    if (!(tab in now)) { console.log(`MISSING TAB  ${tab}`); bad++; continue; }
    const a = tokens(v36[tab]), b = tokens(now[tab]);
    const diffs = [...minus(a, b).map((k) => [k, 'v36']), ...minus(b, a).map((k) => [k, 'new'])];
    const unexplained = diffs.filter(([k, side]) => !EXPECTED.some(([t, n, s]) => t === tab && n === k && s === side));
    const explained = diffs.length - unexplained.length;
    console.log(`${unexplained.length ? 'DIFF' : 'ok  '}  ${tab.padEnd(10)} ${explained} explained difference${explained === 1 ? '' : 's'}`);
    for (const [k, side] of unexplained) {
      const text = side === 'v36' ? v36[tab] : now[tab];
      const line = norm(text).split('\n').find((l) => l.includes(k)) || '';
      console.log(`        ${side === 'v36' ? 'only in v36' : 'only in new'}: ${k}   «${line.trim().slice(0, 110)}»`);
      bad++;
    }
  }
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); bad++; }
  console.log(bad ? `\n${bad} unexplained difference(s): fix them, or explain them in DECISIONS.md and EXPECTED.` : '\nParity: every number v36 shows, the new sheet shows.');
  process.exit(bad ? 1 : 0);
})();
