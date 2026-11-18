// S06 (audit 3, 2026-11-17): an open page keeps working across a release and a rollback. In a temporary copy of the site:
//   release A is built and its home page opened in Chrome; release B (a changed site.js) is built into the same folder; from the
//   still-open A tab every hashed file the A page names (/assets/h/...) is fetched and must answer 200 with bytes whose sha256
//   matches the hash in its name; then a rollback (A's sources built again) and the same from a B tab; then 11 more releases, a build
//   31 days later, and the oldest release's files must be gone while the last 10 releases' files stay.
// Run: node tests/asset-retention.mjs   (needs playwright-core and Chrome; nothing leaves this machine)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crier-assets-'));
fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !(['.git', 'node_modules'].includes(path.basename(src)) && path.dirname(src) === ROOT) });
const build = (date, label) => { const r = spawnSync(process.execPath, ['build/build.mjs'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CRIER_BUILD_DATE: date } }); ok(r.status === 0, `${label}: the build succeeds` + (r.status ? ': ' + r.stderr.slice(-300) : '')); };
const SITE_JS = path.join(dir, 'site.js'), ORIGINAL = fs.readFileSync(SITE_JS, 'utf8');
const release = (n) => fs.writeFileSync(SITE_JS, ORIGINAL + (n ? `\n/* release ${n} */\n` : ''));
const hashedIn = (html) => [...new Set(html.match(/\/assets\/h\/[\w.-]+/g) || [])];
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp' }[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
// from an open tab, fetch every hashed file its own HTML named: 200 and the bytes match the name's hash
async function fromTab(pg, urls, label) {
  const got = await pg.evaluate(async (us) => Promise.all(us.map(async (u) => { const r = await fetch(u, { cache: 'no-store' }); const b = new Uint8Array(await r.arrayBuffer()); const h = await crypto.subtle.digest('SHA-256', b); return [u, r.status, [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')]; })), urls);
  const bad = got.filter(([u, s, h]) => s !== 200 || !u.includes('.' + h.slice(0, 10) + '.'));
  ok(urls.length > 0 && bad.length === 0, `${label}: ${urls.length} hashed files of the open page load with matching bytes${bad.length ? ': ' + bad.map(([u, s]) => u + ' ' + s).join(', ') : ''}`);
}
try {
  const ctx = await browser.newContext();
  await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com/, (r) => r.abort());
  release(1); build('2026-11-01', 'release A');
  const aHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), aUrls = hashedIn(aHtml);
  const tabA = await ctx.newPage(); await tabA.goto(base + '/', { waitUntil: 'load' });
  release(2); build('2026-11-01', 'release B (site.js changed)');
  const bUrls = hashedIn(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'));
  ok(bUrls.some((u) => !aUrls.includes(u)), 'release B names a new hashed site.js');
  await fromTab(tabA, aUrls, 'after B, the tab opened on A');
  const tabB = await ctx.newPage(); await tabB.goto(base + '/', { waitUntil: 'load' });
  release(1); build('2026-11-02', 'rollback to A (A\'s sources built again)');
  ok(fs.readFileSync(path.join(dir, 'index.html'), 'utf8') === aHtml, 'the rollback rebuilds A\'s home page byte for byte');
  const log = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'hashed-releases.json'), 'utf8'));
  ok(log.releases[0].files.every((f) => aUrls.some((u) => u.endsWith('/' + f))) && log.releases.filter((r) => r.files.some((f) => bUrls.some((u) => u.endsWith('/' + f)))).length >= 1, 'the rollback makes A the newest release and keeps B in the record');
  await fromTab(tabB, bUrls, 'after the rollback, the tab opened on B');
  await fromTab(tabA, aUrls, 'after the rollback, the tab opened on A');
  // the window: 11 more releases on one day, then one 31 days later; B (replaced on 2026-11-02, more than 10 releases back) goes
  for (let n = 3; n <= 13; n++) { release(n); build('2026-11-03', `release ${n}`); }
  const before = new Set(fs.readdirSync(path.join(dir, 'assets', 'h')));
  const onlyB = bUrls.map((u) => path.basename(u)).filter((f) => !aUrls.some((u) => u.endsWith('/' + f)));
  ok(onlyB.every((f) => before.has(f)), `inside 30 days every older release's files stay (${before.size} files)`);
  release(14); build('2026-12-10', 'a release 31 days later');
  const after = new Set(fs.readdirSync(path.join(dir, 'assets', 'h')));
  const last = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'hashed-releases.json'), 'utf8')).releases;
  ok(last.length >= 10 && last.slice(10).every((r) => r.replaced >= '2026-11-10'), `the record keeps the last 10 releases and only older ones replaced in the last 30 days (${last.length})`);
  ok(onlyB.every((f) => !after.has(f)), `release B's own files are deleted once it is more than 10 releases and 30 days old (${onlyB.join(', ')})`);
  ok(last.flatMap((r) => r.files).every((f) => after.has(f)), `every file of the 10 kept releases is still there (${after.size} files)`);
  const twice = fs.readFileSync(path.join(dir, 'build', 'hashed-releases.json'), 'utf8'); build('2026-12-11', 'the same sources built again');
  ok(fs.readFileSync(path.join(dir, 'build', 'hashed-releases.json'), 'utf8') === twice && fs.readdirSync(path.join(dir, 'assets', 'h')).length === after.size, 'building the same sources again changes nothing');
  await ctx.close();
} finally { await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(fail ? `${fail} FAILED` : 'asset retention: all passed');
process.exit(fail ? 1 : 0);
