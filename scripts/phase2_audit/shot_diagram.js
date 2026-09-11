// Screenshot helper for diagram HTML -> PNG at 2x device scale (300dpi print quality)
// Per SKILL.md "Diagram Generation Strategy": page.screenshot at 2x for embedding as Image()
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [,, htmlFile, outPng, widthArg] = process.argv;
  if (!htmlFile || !outPng) {
    console.error('usage: node shot_diagram.js <input.html> <output.png> [width]');
    process.exit(2);
  }
  const width = parseInt(widthArg || '1100', 10);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height: 800 },
    deviceScaleFactor: 2,
  });
  await page.goto('file://' + path.resolve(htmlFile), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const el = await page.$('.diagram');
  if (!el) { console.error('no .diagram element'); process.exit(1); }
  await el.screenshot({ path: outPng });
  await browser.close();
  console.log('saved', outPng);
})();
