// Consent bar + Google Analytics Consent Mode test. Google requests are recorded and aborted: never reaches the live GA property.
// Run: node tests/consent.mjs   (same setup as tests/form.mjs: playwright-core, a static server on :8765 serving the repo root, Chrome)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
async function page(viewport) {
  const ctx = await b.newContext(viewport ? { viewport } : {});
  const google = [];
  await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (r) => { google.push(r.request().url()); r.abort(); });
  const pg = await ctx.newPage();
  const csp = [];
  pg.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  return { pg, google, csp };
}
const consentCalls = (pg) => pg.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'consent').map((a) => [a[1], a[2]]));
for (const [l, p] of [['en', '/'], ['es', '/es/pricing/'], ['fr', '/fr/kit/'], ['ar', '/ar/'], ['en', '/404.html'], ['ar', '/ar/privacy/']]) {
  const { pg, google, csp } = await page();
  await pg.goto(BASE + p);
  ok(await pg.isVisible('#consent-bar'), `${p} bar shown on first visit`);
  ok(google.some((u) => u.includes('gtag/js?id=G-QLQ443CQ8E')), `${p} gtag.js requested`);
  const c0 = await consentCalls(pg);
  ok(c0.length === 1 && c0[0][0] === 'default' && c0[0][1].analytics_storage === 'denied' && c0[0][1].ad_storage === 'denied' && c0[0][1].ad_user_data === 'denied' && c0[0][1].ad_personalization === 'denied', `${p} consent default all denied: ${JSON.stringify(c0)}`);
  ok(await pg.evaluate(() => document.getElementById('consent-bar').getAttribute('role') === 'region' && /\S/.test(document.getElementById('consent-bar').getAttribute('aria-label'))), `${p} bar is a labelled region`);
  if (l === 'ar') ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#consent-bar p')).direction) === 'rtl', `${p} bar is RTL`);
  // keyboard: Tab reaches Accept (the bar comes first in the page)
  let reached = false;
  for (let i = 0; i < 4 && !reached; i++) { await pg.keyboard.press('Tab'); reached = await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-consent') === 'granted'); }
  ok(reached, `${p} Accept reachable by keyboard`);
  const sizes = await pg.$$eval('#consent-bar button', (bs) => bs.map((x) => x.getBoundingClientRect().height));
  ok(sizes.length === 2 && sizes.every((hgt) => hgt >= 44), `${p} buttons at least 44px tall: ${sizes}`);
  await pg.keyboard.press('Enter');
  ok(!(await pg.isVisible('#consent-bar')) && await pg.evaluate(() => localStorage.getItem('crier_consent')) === 'granted', `${p} Accept hides the bar and stores granted`);
  const c1 = await consentCalls(pg);
  ok(c1.length === 2 && c1[1][0] === 'update' && c1[1][1].analytics_storage === 'granted' && Object.keys(c1[1][1]).length === 1, `${p} Accept -> consent update analytics_storage granted only`);
  await pg.reload();
  const c2 = await consentCalls(pg);
  ok(!(await pg.isVisible('#consent-bar')) && c2.length === 2 && c2[0][0] === 'default' && c2[1][1].analytics_storage === 'granted', `${p} returning visitor: no bar, default then granted update`);
  // Cookie settings link in the footer reopens the bar with focus on Accept; Decline stores denied
  await pg.click('footer [data-consent-open]');
  ok(await pg.isVisible('#consent-bar') && await pg.evaluate(() => document.activeElement.getAttribute('data-consent') === 'granted'), `${p} Cookie settings reopens the bar, focus on Accept`);
  await pg.click('#consent-bar [data-consent=denied]');
  const c3 = await consentCalls(pg);
  ok(!(await pg.isVisible('#consent-bar')) && await pg.evaluate(() => localStorage.getItem('crier_consent')) === 'denied' && c3[c3.length - 1][1].analytics_storage === 'denied', `${p} Decline hides the bar, stores denied, updates to denied`);
  await pg.reload();
  const c4 = await consentCalls(pg);
  ok(!(await pg.isVisible('#consent-bar')) && c4.length === 1, `${p} after Decline: no bar, no granted update on reload`);
  ok(csp.length === 0, `${p} no CSP violations ${csp.join(' | ')}`);
  await pg.context().close();
}
// phones: the bar never hides the last Buy button (the page gets bottom padding equal to the bar height)
for (const p of ['/pricing/', '/ar/pricing/', '/es/brand-deck/']) {
  const { pg } = await page({ width: 360, height: 740 });
  await pg.goto(BASE + p);
  const r = await pg.evaluate(async () => {
    const bar = document.getElementById('consent-bar');
    const btns = [...document.querySelectorAll('[data-product]')].filter((x) => x.offsetParent);
    const last = btns[btns.length - 1];
    // worst case: the last Buy button sits at the very bottom of the screen when the page is scrolled to its end
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const foot = document.querySelector('footer').getBoundingClientRect(), bb = bar.getBoundingClientRect();
    last.scrollIntoView({ block: 'end', behavior: 'instant' });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const lb = last.getBoundingClientRect();
    return { barH: Math.round(bb.height), footBottom: Math.round(foot.bottom), lastBottom: Math.round(lb.bottom), barTop: Math.round(bb.top), pad: document.body.style.paddingBottom, sw: document.documentElement.scrollWidth, vw: innerWidth, n: btns.length };
  });
  ok(r.barH < 200 && r.pad === r.barH + 'px', `${p} phone: bar ${r.barH}px tall, body padded ${r.pad}`);
  ok(r.footBottom <= r.barTop + 1, `${p} phone: at the end of the page the footer (bottom ${r.footBottom}) ends above the bar (top ${r.barTop})`);
  ok(r.n > 0 && r.lastBottom <= r.barTop + 1, `${p} phone: last Buy button scrolled into view stops above the bar (scroll-padding): bottom ${r.lastBottom}, bar top ${r.barTop}`);
  ok(r.sw <= r.vw, `${p} phone: no horizontal scroll (${r.sw} <= ${r.vw})`);
  await pg.context().close();
}
// redirect stubs carry the tag but no bar and still redirect
{
  const { pg, google } = await page();
  await pg.goto(BASE + '/es/snapshot/'); await pg.waitForFunction(() => location.pathname === '/es/kit/', null, { timeout: 5000 }).catch(() => {});
  ok(new URL(pg.url()).pathname === '/es/kit/' && google.length > 0, '/es/snapshot/ stub still redirects, tag loaded');
}
await b.close(); process.exit(fail ? 1 : 0);
