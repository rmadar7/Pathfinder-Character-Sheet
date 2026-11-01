// Opens the legacy single-file sheet headlessly, switches to the Notes tab
// (which runs runSelfTests()), and reports the diagnostics headline.
// A blank page with no console error means a JS parse error, so the first
// thing checked is that the script ran at all.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = path.resolve(process.argv[2] || 'legacy/Kaldaran_Sheet.html');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);
  await page.click('[data-p="n"]');
  const text = await page.$eval('#selftest', el => el.innerText);
  const lines = text.split('\n').filter(l => /RULES ENGINE|YOUR CHARACTER|FAIL/.test(l));
  console.log(lines.join('\n'));
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
  await browser.close();
  process.exit(errors.length || /FAILED/.test(text) ? 1 : 0);
})();
