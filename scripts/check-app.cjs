// Opens the built app headlessly, visits every tab, and reports errors, the diagnostics
// headline, and the key numbers. Usage: node scripts/check-app.cjs [url] [screenshot-dir]
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:4173/';
  const shots = process.argv[3];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  await page.goto(url);
  await page.waitForSelector('.tabs');
  const tabs = await page.$$eval('.tab', (ts) => ts.map((t) => t.textContent.replace(/\d+$/, '').trim()));
  for (let i = 0; i < tabs.length; i++) {
    await page.click(`.tab >> nth=${i}`);
    await page.waitForTimeout(150);
    const len = await page.$eval('.pane.on', (p) => p.innerText.length);
    console.log(`${tabs[i].padEnd(10)} ${len} chars`);
    if (shots) await page.screenshot({ path: `${shots}/tab-${i + 1}-${tabs[i].toLowerCase()}.png`, fullPage: true });
  }
  await page.click('.tab:has-text("Combat")');
  const big = await page.$$eval('.big .c', (cs) => cs.map((c) => c.querySelector('.l').textContent + ' ' + c.querySelector('.v').textContent).join(' | '));
  console.log('Combat: ' + big);
  await page.click('.tab:has-text("Notes")');
  const diag = await page.$$eval('.pane.on .tiny', (ts) => ts.map((t) => t.textContent.trim()).filter((t) => /RULES ENGINE|YOUR CHARACTER/.test(t)));
  console.log(diag.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
