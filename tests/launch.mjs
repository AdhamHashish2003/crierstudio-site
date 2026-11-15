// Launch checks (2026-11-15): Arabic first (old URLs, ?lang, the saved choice), the floating WhatsApp button, the GA4 whatsapp_click
// event, and every page in both languages at phone and desktop widths (no sideways scroll, the brand mark, the favicon, RTL).
// Google, wa.me and the portal are blocked: nothing leaves this machine. Run with a static server on the repo root:
//   BASE=http://127.0.0.1:8767 node tests/launch.mjs        (OUTPUT=<dir> also saves a screenshot of every page and width)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const OUT = process.env.OUTPUT || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
async function ctx(opts = {}) {
  const c = await b.newContext(opts);
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  return c;
}
const PAGES = ['', 'pricing/', 'social/', 'in-store/', 'brand-deck/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];

// 1. Arabic first: old URLs, ?lang and the saved choice (query and #hash kept)
{
  const c = await ctx(); const pg = await c.newPage();
  const at = async (u) => { await pg.goto(BASE + u); await pg.waitForLoadState('load'); const l = new URL(pg.url()); return [l.pathname + l.search + l.hash, await pg.evaluate(() => document.documentElement.lang + '/' + document.documentElement.dir)]; };
  let r = await at('/'); ok(r[0] === '/' && r[1] === 'ar/rtl', `/ is Arabic RTL: ${r}`);
  r = await at('/ar/pricing/?plan=seen#plans'); ok(r[0] === '/pricing/?plan=seen#plans' && r[1] === 'ar/rtl', `old /ar/pricing/ -> /pricing/ with query and hash: ${r}`);
  r = await at('/kit/?a=1#b'); ok(r[0] === '/social/?a=1#b', `renamed /kit/ -> /social/ (Arabic): ${r}`);
  r = await at('/en/kit/'); ok(r[0] === '/en/social/' && r[1] === 'en/ltr', `renamed /en/kit/ -> /en/social/: ${r}`);
  r = await at('/terms.html'); ok(r[0] === '/terms/', `/terms.html -> /terms/: ${r}`);
  r = await at('/es/pricing/?x=1'); ok(r[0] === '/en/pricing/?x=1', `/es/ -> /en/: ${r}`);
  r = await at('/pricing/?lang=en&plan=gold#top'); ok(r[0] === '/en/pricing/?plan=gold#top' && await pg.evaluate(() => localStorage.getItem('crier.lang')) === 'en', `?lang=en -> /en/pricing/, saved: ${r}`);
  // a visitor who chose English and comes back from outside the site to an Arabic (root) URL gets the English page
  r = await at('/faq/'); ok(r[0] === '/en/faq/', `saved English + outside entry to /faq/ -> /en/faq/: ${r}`);
  r = await at('/faq/?lang=ar'); ok(r[0] === '/faq/' && await pg.evaluate(() => localStorage.getItem('crier.lang')) === 'ar', `?lang=ar -> /faq/, saved ar: ${r}`);
  await c.close();
}

// 2. the floating WhatsApp button and the whatsapp_click event
for (const [lang, u] of [['ar', '/pricing/'], ['en', '/en/pricing/']]) {
  const c = await ctx({ viewport: { width: 1280, height: 800 } }); const pg = await c.newPage();
  await pg.goto(BASE + u); await pg.waitForLoadState('load');
  const f = await pg.evaluate(() => { const a = document.getElementById('wa-fab'); const r = a.getBoundingClientRect(); return { left: r.left, right: innerWidth - r.right, label: a.getAttribute('aria-label'), href: a.href, w: r.width }; });
  ok(f.label && f.href.startsWith('https://wa.me/201146000101?text=') && f.w >= 56, `${u} floating button: label "${f.label}", wa.me link`);
  ok(lang === 'ar' ? f.left < 40 && f.right > 1000 : f.right < 40 && f.left > 1000, `${u} floating button on the ${lang === 'ar' ? 'left' : 'right'} (${JSON.stringify(f)})`);
  // the GA4 event: a card's WhatsApp order button sends whatsapp_click with the package (queued in dataLayer, Google blocked)
  const pop = c.waitForEvent('page').catch(() => null);
  await pg.click('a.wa-order[data-wa-order="visible"]');
  await pop;
  const ev = await pg.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => [a[1], a[2]]));
  ok(ev.some(([n, p]) => n === 'whatsapp_click' && p.package === 'Silver' && p.wa_location === 'card' && p.page_type === 'pricing'), `${u} whatsapp_click with package Silver: ${JSON.stringify(ev)}`);
  await pg.click('#wa-fab'); await pg.waitForTimeout(200);
  const ev2 = await pg.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event' && a[1] === 'whatsapp_click').map((a) => a[2].wa_location));
  ok(ev2.includes('float'), `${u} floating button click -> whatsapp_click wa_location=float: ${ev2}`);
  // consent: the event only queues through gtag(); before consent no analytics cookie is set
  ok(!(await c.cookies()).some((k) => /^_ga/.test(k.name)), `${u} no _ga cookie before consent`);
  await c.close();
}

// 3. every page, both languages, phone and desktop
for (const [w, h, tag] of [[375, 812, 'phone'], [1280, 800, 'desktop']]) {
  const c = await ctx({ viewport: { width: w, height: h } });
  for (const lang of ['ar', 'en']) for (const p of [...PAGES, '404.html']) {
    if (p === '404.html' && lang === 'en') continue; // one 404 file for both languages
    const u = '/' + (lang === 'en' && p !== '404.html' ? 'en/' : '') + p;
    const pg = await c.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errs.push(m.text()); });
    await pg.goto(BASE + u); await pg.waitForLoadState('load');
    const r = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, lang: document.documentElement.lang, dir: document.documentElement.dir,
      mark: [...document.querySelectorAll('.logo img.mark')].filter((i) => i.complete && i.naturalWidth > 0).length, icon: !!document.querySelector('link[rel=icon][href="/favicon.svg"]'), fab: !!document.getElementById('wa-fab') }));
    ok(r.sw <= r.vw, `${tag} ${u}: no sideways scroll (${r.sw} <= ${r.vw})`);
    ok(r.lang === lang && r.dir === (lang === 'ar' ? 'rtl' : 'ltr'), `${tag} ${u}: lang/dir ${r.lang}/${r.dir}`);
    ok(r.mark >= 2 && r.icon && r.fab, `${tag} ${u}: brand mark in header and footer (${r.mark}), favicon link, floating button`);
    ok(errs.length === 0, `${tag} ${u}: no script or CSP errors ${errs.join(' | ')}`);
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await pg.screenshot({ path: path.join(OUT, `${tag}-${lang}-${(p.replace(/\/$/, '').replace(/\W+/g, '-') || 'home')}.png`), fullPage: true }); }
    await pg.close();
  }
  await c.close();
}
// the favicon files themselves
{
  const c = await ctx(); const pg = await c.newPage();
  for (const f of ['/favicon.ico', '/favicon.svg', '/favicon-32.png', '/favicon-16.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/og.png', '/og-ar.png', '/crier-logo.png', '/site.webmanifest']) {
    const res = await pg.request.get(BASE + f); ok(res.status() === 200, `${f} served (${res.status()})`);
  }
  await c.close();
}
await b.close(); process.exit(fail ? 1 : 0);
