// End-to-end flows in a real browser against the built app.
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) { console.log('FAIL: ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
(async () => {
  const url = process.argv[2] || 'http://localhost:4173/';
  const shots = process.argv[3];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector('.tabs');
  const tab = (n) => page.click(`.tab:has-text("${n}")`);
  const acOnCombat = async () => { await tab('Combat'); return page.$eval('.big .c >> nth=0', (c) => c.querySelector('.v').textContent); };

  // 1. Mage Armor on top of Enduring Armor: AC unchanged, Mage Armor shown suppressed.
  await tab('Combat');
  await page.click('.fx:has-text("Mage Armor") .tgl');
  assert((await acOnCombat()) === '17', 'Mage Armor on: AC stays 17');
  const supp = await page.$eval('.mr >> nth=0', (m) => m.innerText);
  assert(/Mage Armor — SUPPRESSED/.test(supp), 'Mage Armor shown as suppressed in the AC receipt');
  // Shield (different type) does stack.
  await page.click('.fx:has-text("Shield") .tgl >> nth=0');
  assert((await acOnCombat()) === '21', 'Shield on: AC 21 (shield bonus stacks with armor)');

  // 2. Cast a spell on Today: slot count drops.
  await tab('Today');
  const before = await page.$eval('.rgroup .rghd .c >> nth=0', (e) => e.textContent);
  await page.click('.rc:has-text("Reduce Person") button:has-text("Cast")');
  const after = await page.$eval('.rgroup .rghd .c >> nth=0', (e) => e.textContent);
  assert(/^6 of 6/.test(before) && /^5 of 6/.test(after), 'casting Reduce Person: 6 → 5 left');
  // Reduce Person is a known quick effect: casting it applies its size bonus.
  // +1 size to AC, and its +2 Dex raises the Dex modifier by 1: 10 + 3 + 5 armor + 4 shield + 1 = 23.
  assert((await acOnCombat()) === '23', 'Reduce Person running: AC 23 (+1 size, +1 Dex)');
  const cmd = await page.$eval('.big .c >> nth=3', (c) => c.querySelector('.v').textContent);
  assert(cmd === '13', 'Reduce Person: CMD 14 → 13 (special size modifier is the mirror)');

  // 3. Persistence across reload.
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForSelector('.tabs');
  assert((await acOnCombat()) === '23', 'state survives a reload');

  // 4. Rest: slots back, timed spell gone, receipt shown.
  await page.click('button:has-text("Rest")');
  await page.waitForSelector('.rcpt.on');
  const rc = await page.$eval('.rcpt', (e) => e.innerText);
  assert(/1 spent spell slot refilled/.test(rc), 'rest receipt: 1 slot refilled');
  await page.click('.rcpt button');
  assert((await acOnCombat()) === '21', 'after rest: Reduce Person (timed) cleared, AC 21');

  // 5. Stale tab cannot overwrite. Let tab 1's last save land before tab 2 loads.
  await page.waitForTimeout(600);
  const page2 = await ctx.newPage();
  await page2.goto(url);
  await page2.waitForSelector('.tabs');
  await page2.click('.tab:has-text("Inventory")');
  await page2.fill('.money input >> nth=0', '777');
  await page2.press('.money input >> nth=0', 'Tab');
  await page2.waitForTimeout(700);
  await page.waitForTimeout(300);
  const banner = await page.$('.banner');
  assert(!!banner, 'first tab is told another tab saved newer data');
  await tab('Inventory');
  await page.fill('.money input >> nth=0', '1');
  await page.press('.money input >> nth=0', 'Tab');
  await page.waitForTimeout(600);
  await page.click('.banner button');
  await page.waitForTimeout(300);
  const gp = await page.$eval('.money input >> nth=0', (e) => e.value);
  assert(gp === '777', 'stale tab did not overwrite: gp stays 777 after reload');
  await page2.close();

  // 6. Undo.
  await page.fill('.money input >> nth=0', '5');
  await page.press('.money input >> nth=0', 'Tab');
  await page.click('button:has-text("Undo")');
  assert((await page.$eval('.money input >> nth=0', (e) => e.value)) === '777', 'undo puts gp back');

  // 7. Level up modal opens and lists steps.
  await page.click('button:has-text("Level Up")');
  const steps = await page.$$eval('.step .sn', (s) => s.map((x) => x.textContent));
  assert(steps.some((s) => /Level 3 spells unlock/.test(s)), 'level-up to 5 unlocks 3rd-level spells');
  assert(steps.some((s) => /Wizard bonus feat/.test(s)), 'level-up to 5 lists the wizard bonus feat');
  if (shots) await page.screenshot({ path: `${shots}/levelup.png`, fullPage: false });
  await page.click('.mfoot button:has-text("Cancel")');

  // 8. Dark theme.
  await page.click('button:has-text("Dark")');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const hair = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hair').trim());
  assert(theme === 'dark' && hair !== '' && !hair.includes('var('), 'dark theme on, hairline token resolves (v36 had it self-referential)');
  await tab('Today');
  if (shots) await page.screenshot({ path: `${shots}/dark-today.png`, fullPage: false });
  await page.click('button:has-text("Parchment")');

  // 9. Spell tooltip on tap.
  await tab('Spellbook');
  await page.click('.sp .spn >> nth=0');
  assert(await page.$('#tip h5'), 'tapping a spell pins its card');

  assert(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  await browser.close();
})();
