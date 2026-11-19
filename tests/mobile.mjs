// Mobile pass (2026-11-15, owner: "make sure this is ready for mobile layout too"). Touch-phone emulation at 360x740 (small Android),
// 375x667 (iPhone SE), 393x852 (iPhone 15), 412x915 (Pixel 7) and 844x390 (a phone on its side), on the home page, /social/ and
// /pricing/ in Arabic and English. Fails when:
//   - the page scrolls sideways;
//   - a tap target is smaller than 44 px (buttons, menu, language links, package buttons, FAQ rows, the WhatsApp button, the video's
//     button and steps); links inside a sentence and footer links need 24 px (WCAG 2.5.8);
//   - visible text is smaller than 12 px;
//   - a package card is squeezed (narrower than 260 px) or its button is cut off or leaves the card;
//   - a table is wider than the screen without its own sideways-scrolling box;
//   - the menu does not open and close by tap, or the language link does not switch language by tap.
// Covered buttons (the floating WhatsApp button) and overlaps are tests/overlap.mjs with WIDTHS=360x740,...
// Run: BASE=http://127.0.0.1:8767 node tests/mobile.mjs      (OUTPUT=<dir> saves a full-page screenshot per page and device)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

// COUNTRY=US|SA|AE|EG|KW (owner 2026-11-19, several countries): the visitor's country as Cloudflare would report it, so the page is
// checked in that country's currency and texts. A US visitor is kept on the Arabic pages too (as if they chose Arabic), to check them.
const COUNTRY = /^[A-Z]{2}$/.test(process.env.COUNTRY || '') ? process.env.COUNTRY : null;
async function asCountry(c) {
  if (!COUNTRY) return;
  await c.route('**/cdn-cgi/trace', (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: `fl=1\nh=crierstudio.com\nloc=${COUNTRY}\n` }));
  await c.addInitScript((cc) => { try { localStorage.setItem('crier.loc', cc); if (cc === 'US' && !localStorage.getItem('crier.lang')) localStorage.setItem('crier.lang', 'ar'); } catch (e) {} }, COUNTRY);
}
const BASE = process.env.BASE || 'http://localhost:8765';
const OUT = process.env.OUTPUT || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const bad = (m) => { fail++; console.log('FAIL', m); };
const DEVICES = [['android-360', 360, 740], ['iphone-se-375', 375, 667], ['iphone-15-393', 393, 852], ['pixel-7-412', 412, 915], ['landscape-844', 844, 390]];
const PAGES = [['ar', '/'], ['en', '/en/'], ['ar', '/social/'], ['en', '/en/social/'], ['ar', '/pricing/'], ['en', '/en/pricing/']];
function audit() {
  const DECOR = '[aria-hidden="true"],[role="img"],script,style,noscript,option,.skip-link';
  const name = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const pathOf = (el) => { const a = []; for (let e = el; e && e !== document.body && a.length < 3; e = e.parentElement) a.unshift(name(e)); return a.join(' > '); };
  const vis = (el) => !el.closest(DECOR) && (!el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  const out = [], seen = new Set(); const add = (m) => { if (!seen.has(m)) { seen.add(m); out.push(m); } };
  if (document.documentElement.scrollWidth > innerWidth) add(`the page scrolls sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);
  // tap targets
  for (const el of document.querySelectorAll('a, button, summary, select, input:not([type=hidden]), [role=button]')) {
    if (!vis(el) || el.closest('#consent-bar')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    const control = el.matches('button, summary, select, input, .btn, .acct-link, .wa-fab, .langpick a, .main-nav a, .la-link, [role=button]');
    const inline = !control && cs.display === 'inline'; // a link inside a sentence
    const need = control ? 44 : 24, h = Math.round(r.height), w = Math.round(r.width);
    if (h < need - 0.5 || (control && w < 44 - 0.5 && !el.matches('.main-nav a')) ) add(`tap target ${w}x${h}px (needs ${need}): ${pathOf(el)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"${inline ? ' (inline link)' : ''}`);
  }
  // text size
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!/\S/.test(n.nodeValue)) continue; const el = n.parentElement; if (!el || !vis(el) || el.closest('#consent-bar')) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) add(`text ${fs}px (under 12): ${pathOf(el)} "${n.nodeValue.trim().slice(0, 30)}"`);
  }
  // package cards
  for (const card of document.querySelectorAll('.plan')) {
    if (!vis(card)) continue; const c = card.getBoundingClientRect();
    if (c.width < 260) add(`package card ${card.getAttribute('data-plan')} is ${Math.round(c.width)}px wide (squeezed)`);
    for (const btn of card.querySelectorAll('a.btn, button')) { const r = btn.getBoundingClientRect(); if (r.left < c.left - 1 || r.right > c.right + 1 || btn.scrollWidth > btn.clientWidth + 1) add(`package card ${card.getAttribute('data-plan')}: its button is cut off or leaves the card ("${btn.textContent.trim().slice(0, 30)}")`); }
  }
  // tables
  for (const t of document.querySelectorAll('table')) {
    if (!vis(t)) continue; const r = t.getBoundingClientRect(); if (r.width <= innerWidth + 1) continue;
    let ok = false; for (let e = t.parentElement; e && e !== document.body; e = e.parentElement) if (/auto|scroll/.test(getComputedStyle(e).overflowX)) { ok = e.getBoundingClientRect().width <= innerWidth + 1; break; }
    if (!ok) add(`a table is ${Math.round(r.width)}px wide with no sideways-scrolling box of its own`);
  }
  return out;
}
for (const [dev, w, h] of DEVICES) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await asCountry(c);
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  await c.addInitScript(() => { try { localStorage.setItem('crier_consent', 'denied'); } catch (e) {} });
  for (const [lang, u] of PAGES) {
    const pg = await c.newPage();
    await pg.goto(BASE + u); await pg.waitForLoadState('load'); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 25)); } scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 80)); });
    const issues = await pg.evaluate(audit);
    // the menu opens and closes by tap (where the menu button shows), and its links are then visible and tappable
    const toggle = pg.locator('.menu-toggle');
    if (await toggle.isVisible()) {
      await toggle.tap(); const open = await pg.evaluate(() => { const t = document.querySelector('.menu-toggle'), n = document.getElementById('main-nav'); const a = n.querySelector('a'); const r = a.getBoundingClientRect(); return t.getAttribute('aria-expanded') === 'true' && r.height >= 44 && r.width > 40 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === a; });
      if (!open) issues.push('the menu does not open by tap, or its first link is not tappable (44 px)');
      await toggle.tap(); if (await pg.evaluate(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded')) !== 'false') issues.push('the menu does not close by tap');
    } else if (!(await pg.locator('.main-nav a').first().isVisible())) issues.push('neither the menu button nor the menu links show');
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await pg.screenshot({ path: path.join(OUT, `${dev}-${lang}-${u.replace(/^\/(en\/)?/, '').replace(/\/$/, '') || 'home'}.png`), fullPage: true }); }
    // the language link switches language by tap and remembers it
    const other = lang === 'ar' ? 'en' : 'ar';
    await pg.locator(`.langpick a[lang="${other}"]`).tap();
    await pg.waitForURL((x) => !x.search.includes('lang=') && (other === 'en') === x.pathname.startsWith('/en/'), { timeout: 15000 }).catch(() => {}); await pg.waitForLoadState('load');
    const now = await pg.evaluate(() => [document.documentElement.lang, localStorage.getItem('crier.lang'), location.pathname]);
    if (now[0] !== other || now[1] !== other) issues.push(`tapping ${other.toUpperCase()} does not switch the language (${now})`);
    for (const m of issues) bad(`${dev} ${u}: ${m}`);
    if (!issues.length) console.log('PASS', dev, u);
    await pg.close();
  }
  await c.close();
}
await b.close();
console.log(fail ? `${fail} mobile problems` : 'mobile pass: no problems'); process.exit(fail ? 1 : 0);
