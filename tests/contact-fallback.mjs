// S08 (audit 3, 2026-11-17): the contact links with a valid WhatsApp number, without one, and with an invalid one.
// The site is copied to a temporary folder for each case and built there (the repository's own files are never touched), then:
//   valid   -> every wa.me link names the number from data/contact.json and carries a message in the page language;
//   blank   -> no wa.me link anywhere and no "WhatsApp at +" text; every main button (data-signup) and package card opens the portal
//              sign-up in the page language, a package card with its package (?plan=); Chrome opens each main button with the
//              portal and wa.me intercepted and checks where it went;
//   invalid -> the build stops with an error (nothing is written for publishing).
// Run: node tests/contact-fallback.mjs   (needs playwright-core and Chrome; nothing leaves this machine)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NUMBER = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'contact.json'), 'utf8')).whatsapp;
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const SKIP = new Set(['.git', 'node_modules']);
function copySite(number) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crier-contact-'));
  fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || path.dirname(src) !== ROOT });
  const f = path.join(dir, 'data', 'contact.json'), c = JSON.parse(fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(f, JSON.stringify({ ...c, whatsapp: number }, null, 1) + '\n');
  return dir;
}
const htmlFiles = (dir, d = '') => fs.readdirSync(path.join(dir, d), { withFileTypes: true }).flatMap((e) => {
  const r = d ? d + '/' + e.name : e.name;
  if (e.isDirectory()) return ['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'design', 'assets', 'fonts', '_parked' /* not published (_config.yml) */].includes(e.name) ? [] : htmlFiles(dir, r);
  return e.name.endsWith('.html') ? [r] : [];
});
const LIVE = ['index.html', 'pricing/index.html', 'social/index.html', 'terms/index.html', 'privacy/index.html', 'refund/index.html'];
const pagesOf = (dir) => LIVE.flatMap((p) => [[p, 'ar'], ['en/' + p, 'en']]).map(([p, lang]) => [p, lang, fs.readFileSync(path.join(dir, p), 'utf8')]);
const hrefs = (html, re) => [...html.matchAll(re)].map((m) => m[1].replace(/&amp;/g, '&'));

// 1. valid number
{
  const dir = copySite(NUMBER);
  try {
    const r = spawnSync(process.execPath, ['build/build.mjs'], { cwd: dir, encoding: 'utf8' });
    ok(r.status === 0, 'valid number: the build succeeds');
    for (const [p, lang, html] of pagesOf(dir)) {
      const wa = hrefs(html, /href="(https:\/\/wa\.me\/[^"]*)"/g);
      ok(wa.length > 0 && wa.every((u) => u.startsWith(`https://wa.me/${NUMBER}`)), `valid number: ${p}: ${wa.length} WhatsApp links, all to ${NUMBER}`);
      const msgs = wa.map((u) => new URL(u).searchParams.get('text')).filter(Boolean);
      ok(msgs.every((m) => (lang === 'ar' ? /[؀-ۿ]/.test(m) : !/[؀-ۿ]/.test(m))), `valid number: ${p}: every prefilled message is in ${lang}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// 2. blank number
{
  const dir = copySite('');
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const r = spawnSync(process.execPath, ['build/build.mjs'], { cwd: dir, encoding: 'utf8' });
    ok(r.status === 0, 'blank number: the build succeeds' + (r.status ? ': ' + (r.stderr || r.stdout).slice(-300) : ''));
    const all = htmlFiles(dir).map((p) => [p, fs.readFileSync(path.join(dir, p), 'utf8')]);
    const withWa = all.filter(([, html]) => /wa\.me/.test(html)).map(([p]) => p);
    ok(withWa.length === 0, `blank number: no wa.me link on any of ${all.length} built HTML files${withWa.length ? ': ' + withWa.slice(0, 5).join(', ') : ''}`);
    const broken = all.filter(([, html]) => /WhatsApp at \+|واتساب على \+|واتساب على الرقم \+|\{wa\}/.test(html)).map(([p]) => p);
    ok(broken.length === 0, `blank number: no sentence gives an empty WhatsApp number${broken.length ? ': ' + broken.join(', ') : ''}`);
    for (const [p, lang, html] of pagesOf(dir)) {
      const signups = hrefs(html, /href="(https:\/\/portal\.crierstudio\.com\/#\/signup[^"]*)"/g);
      ok(signups.every((u) => u.endsWith('lang=' + lang)), `blank number: ${p}: ${signups.length} sign-up links, all in ${lang}`);
      const cards = [...html.matchAll(/<a class="btn[^"]*" href="([^"]*)" data-product="(\w+)"/g)].map((m) => [m[1].replace(/&amp;/g, '&'), m[2]]);
      ok(cards.every(([u, id]) => u.includes(`plan=${id}&`)), `blank number: ${p}: ${cards.length} package buttons keep their package`);
    }
    await new Promise((res) => server.listen(0, '127.0.0.1', res));
    const base = `http://127.0.0.1:${server.address().port}`;
    const ctx = await browser.newContext();
    const opened = [];
    await ctx.route(/portal\.crierstudio\.com|wa\.me/, (rt) => { opened.push(rt.request().url()); rt.fulfill({ status: 200, contentType: 'text/html', body: '<title>intercepted</title>' }); });
    await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (rt) => rt.abort());
    for (const [p, lang, where] of [['/', 'ar', 'home_hero'], ['/', 'ar', 'home_close'], ['/', 'ar', 'home_how'], ['/en/', 'en', 'home_hero'], ['/en/', 'en', 'home_close'], ['/social/', 'ar', 'social_hero'], ['/en/social/', 'en', 'social_close'], ['/en/pricing/', 'en', null], ['/pricing/', 'ar', null]]) {
      const pg = await ctx.newPage();
      await pg.goto(base + p + '?lang=' + lang, { waitUntil: 'load' });
      const sel = where ? `a[data-signup="${where}"]` : 'a.btn[data-product="growing"]';
      const a = pg.locator(sel).first();
      const label = (await a.textContent().catch(() => '')) || '';
      ok(await a.count() > 0 && !/whatsapp|واتساب/i.test(label), `blank number: ${p} ${where || 'Gold card'}: a button "${label.trim()}" (no WhatsApp in its label)`);
      opened.length = 0;
      await Promise.all([pg.waitForURL(/portal\.crierstudio\.com/, { timeout: 10000 }).catch(() => null), a.click()]);
      const want = where ? `#/signup?lang=${lang}` : `#/signup?plan=growing&lang=${lang}`;
      ok(pg.url().endsWith(want), `blank number: ${p} ${where || 'Gold card'} opens the portal sign-up ${want}: ${pg.url()}`);
      await pg.close();
    }
    await ctx.close();
  } finally { await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

// 3. invalid number
{
  const dir = copySite('012-345');
  try {
    const before = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const r = spawnSync(process.execPath, ['build/build.mjs'], { cwd: dir, encoding: 'utf8' });
    ok(r.status !== 0 && /contact\.json: whatsapp must be/.test(r.stderr), 'invalid number: the build stops with "data/contact.json: whatsapp must be the number in international format"');
    ok(fs.readFileSync(path.join(dir, 'index.html'), 'utf8') === before, 'invalid number: no page was rewritten');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
console.log(fail ? `${fail} FAILED` : 'contact links: all passed');
process.exit(fail ? 1 : 0);
