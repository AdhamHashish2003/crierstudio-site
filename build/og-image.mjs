// Renders build/og-image.html to /og.png (English) and /og-ar.png (Arabic), 1200 x 630: the share image each page names in og:image
// and twitter:image, in the page language.
// Run:  node build/og-image.mjs   (needs Playwright; serves the repo on a local port so the page can read the logo and fonts)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [lang, file] of [['en', 'og.png'], ['ar', 'og-ar.png']]) {
    await page.goto(`http://127.0.0.1:${server.address().port}/build/og-image.html?lang=${lang}`);
    await page.waitForSelector('body[data-ready="1"]');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(ROOT, file), clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log('wrote ' + file);
  }
} finally { await browser.close(); server.close(); }
