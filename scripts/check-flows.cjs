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
  // The theme attribute is set in an effect after the re-render; reading it straight after the
  // click raced it and failed intermittently.
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { timeout: 3000 }).catch(() => {});
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

  // 10. A DM gift built by hand: +2 luck to Stealth, and +2 morale to Will only vs fear.
  await tab('Skills');
  const stealth = async () => parseInt((await page.$eval('tr:has-text("Stealth")', (r) => r.innerText)).match(/[+−-]\d+\s*$/)[0].replace('−', '-'));
  const st0 = await stealth();
  await tab('Combat');
  const will = async () => (await page.$$eval('.big .c', (cs) => cs.map((c) => c.innerText))).find((t) => /WILL/i.test(t));
  const will0 = await will();
  await page.click('button:has-text("Add an effect or condition")');
  await page.click('button:has-text("Build a custom bonus")');
  const form = page.locator('.gedit').last();
  await form.locator('input').nth(0).fill('Lucky coin');
  await form.locator('input').nth(1).fill('the DM');
  const row = (i) => form.locator('.bonusrow').nth(i);
  await row(0).locator('input[type=number]').fill('2');
  await row(0).locator('select').nth(0).selectOption('luck');
  await row(0).locator('select').nth(1).selectOption('skill:Stealth');
  await form.locator('button:has-text("another bonus")').click();
  await row(1).locator('input[type=number]').fill('2');
  await row(1).locator('select').nth(0).selectOption('morale');
  await row(1).locator('select').nth(1).selectOption('will');
  await row(1).locator('input').nth(1).fill('vs fear');
  await form.locator('button:has-text("Add it")').click();
  assert(await will() === will0, 'situational bonus (vs fear) is not added to Will');
  await tab('Skills');
  assert(await stealth() === st0 + 2, `custom +2 luck to Stealth applies (${st0} → ${await stealth()})`);

  // 11. Lookup: search the imported compendium and add things to the character.
  await tab('Lookup');
  const lk = page.locator('.lksearch');
  await page.click('.lkcats button:has-text("Spells")');
  await page.waitForSelector('.lkr');
  await lk.fill('fireball');
  await page.waitForFunction(() => document.querySelector('.lkr .lkn')?.textContent === 'Fireball');
  await page.click('.lkr >> nth=0');
  assert(await page.isVisible('button:has-text("Add to spellbook (level 3)")'), 'Lookup: Fireball is a level 3 wizard spell');
  await page.check('.lkmine input');
  await page.waitForTimeout(200);
  assert(!(await page.$$eval('.lkr .lkn', (ns) => ns.map((n) => n.textContent))).includes('Fireball'), 'Lookup: "only spells I can cast" hides 3rd-level Fireball at wizard 4');
  await page.click('.lkcats button:has-text("Feats")');
  await lk.fill('power attack');
  await page.waitForFunction(() => document.querySelector('.lkr .lkn')?.textContent === 'Power Attack');
  await page.click('.lkr >> nth=0');
  await page.click('button:has-text("Add to my feats")');
  const acOf = async () => { await tab('Combat'); const t = (await page.$$eval('.big .c', (cs) => cs.map((c) => c.innerText))).find((x) => /^AC/.test(x)); await tab('Lookup'); return parseInt(t.replace(/\D+/, '')); };
  const ac0 = await acOf();
  await page.click('.lkcats button:has-text("Items")');
  await lk.fill('ring of protection +2');
  await page.waitForFunction(() => document.querySelector('.lkr .lkn')?.textContent === 'Ring of Protection +2');
  await page.click('.lkr >> nth=0');
  await page.click('button:has-text("Add to inventory")');
  const ac1 = await acOf();
  assert(ac1 === ac0 + 2, `Lookup: Ring of Protection +2, added worn, gives +2 deflection AC (${ac0} → ${ac1})`);
  await tab('Character');
  assert((await page.$eval('.pane.on', (p) => p.innerText)).includes('Power Attack'), 'Lookup: Power Attack added to feats');

  // 12. Save to a file, then load it back.
  page.on('dialog', (d) => d.accept());
  await tab('Inventory');
  assert(/not saved to a file yet/.test(await page.textContent('.foot .sv')), 'footer says the character has not been saved to a file');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.foot button:has-text("Save file")')]);
  const saved = await dl.path();
  assert(/\.json$/.test(dl.suggestedFilename()), `Save file downloads ${dl.suggestedFilename()}`);
  assert(/file saved today/.test(await page.textContent('.foot .sv')), 'footer then says "file saved today"');
  const gpBefore = await page.$eval(".money input >> nth=0", (e) => e.value);
  await page.fill('.money input >> nth=0', '1');
  await page.press('.money input >> nth=0', 'Tab');
  await page.setInputFiles('.foot input[type=file]', saved);
  await page.waitForFunction(() => /Loaded /.test(document.body.innerText), null, { timeout: 10000 });
  await page.click('.rcpt button').catch(() => {});
  assert((await page.$eval('.money input >> nth=0', (e) => e.value)) === gpBefore, `Load file restores the saved character (gp ${gpBefore})`);

  assert(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  await browser.close();
})();
