// Consent bar + Google Analytics, opt-in (S02, audit 3, owner 2026-11-17): Google Analytics loads only after Accept; with no choice
// or after Decline nothing is sent to Google; withdrawal stops it. Real browser requests, Arabic and English:
//   - gtag.js is the REAL tag, fetched from googletagmanager.com, so what it would send is what Google would receive;
//   - every collection request (google-analytics.com, analytics.google.com, the /g/collect beacons) is recorded and ABORTED, so
//     nothing reaches the live property (set GA_TEST_PROPERTY=G-XXXX to also let hits go to a dedicated test property instead);
//   - states: no choice, Decline, Accept, withdrawal (Cookie settings > Decline), revisit after each; navigation and the WhatsApp
//     button keep working with consent declined; cookies and localStorage are read after each step.
// Run: BASE=http://127.0.0.1:8767 node tests/consent.mjs   (playwright-core, Chrome, a static server on the repo root)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const TEST_ID = process.env.GA_TEST_PROPERTY || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com\/(ccm|g)\//;
async function context(viewport) {
  const ctx = await b.newContext(viewport ? { viewport } : {});
  const log = { tag: [], hits: [] };
  await ctx.route(GOOGLE, async (r) => {
    const u = r.request().url();
    if (/googletagmanager\.com\/gtag\/js/.test(u)) { log.tag.push(u); return TEST_ID ? r.continue({ url: u.replace(/id=G-[A-Z0-9]+/, 'id=' + TEST_ID) }) : r.continue(); }
    log.hits.push(u + (r.request().postData() ? '\n' + r.request().postData() : ''));
    return TEST_ID && u.includes('tid=' + TEST_ID) ? r.continue() : r.abort();
  });
  await ctx.route(/wa\.me|portal\.crierstudio\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>intercepted</title>' }));
  const csp = [];
  ctx.on('page', (pg) => pg.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); }));
  return { ctx, log, csp };
}
const gaCookies = async (ctx) => (await ctx.cookies()).filter((c) => /^_ga/.test(c.name)).map((c) => c.name);
const events = (log) => log.hits.flatMap((h) => [...h.matchAll(/(?:^|[?&\n])en=([\w]+)/g)].map((m) => m[1]));
const interact = async (pg) => { await pg.mouse.wheel(0, 200); await pg.mouse.move(50, 50); await pg.keyboard.press('Shift'); await pg.waitForTimeout(300); };
const idle = (pg, ms) => pg.waitForTimeout(ms);

for (const [lang, home, other] of [['ar', '/', '/pricing/'], ['en', '/en/', '/en/pricing/']]) {
  // 1. no choice: the bar shows, and however long the visitor stays and whatever they do, nothing goes to Google
  {
    const { ctx, log, csp } = await context();
    const pg = await ctx.newPage();
    await pg.goto(BASE + home, { waitUntil: 'load' });
    ok(await pg.isVisible('#consent-bar'), `${lang} no choice: the bar shows`);
    await interact(pg); await idle(pg, 7000); await interact(pg);
    await pg.evaluate(() => window.gtag('event', 'probe_no_choice'));
    await pg.goto(BASE + other, { waitUntil: 'load' }); await interact(pg); await idle(pg, 6500);
    ok(log.tag.length === 0 && log.hits.length === 0, `${lang} no choice: no request to Google in 14 s on two pages with scrolling and keys (${log.tag.length} tag, ${log.hits.length} hits)`);
    ok((await gaCookies(ctx)).length === 0, `${lang} no choice: no _ga cookie`);
    ok(await pg.evaluate(() => typeof window.gtag === 'function' && window['ga-disable-' + window.CRIER_GA] === true), `${lang} no choice: gtag() queues only, Google's off switch is set`);
    ok(csp.length === 0, `${lang} no choice: no CSP violation ${csp.slice(0, 2).join(' | ')}`);
    // accessibility of the bar
    ok(await pg.evaluate(() => document.getElementById('consent-bar').getAttribute('role') === 'region' && /\S/.test(document.getElementById('consent-bar').getAttribute('aria-label'))), `${lang} the bar is a labelled region`);
    if (lang === 'ar') ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#consent-bar p')).direction) === 'rtl', 'ar the bar is right to left');
    const sizes = await pg.$$eval('#consent-bar button', (bs) => bs.map((x) => x.getBoundingClientRect().height));
    ok(sizes.length === 2 && sizes.every((hgt) => hgt >= 44), `${lang} the bar's buttons are at least 44 px tall: ${sizes}`);
    await ctx.close();
  }
  // 2. Decline: nothing goes to Google, then or later; navigation and the WhatsApp button still work
  {
    const { ctx, log } = await context();
    const pg = await ctx.newPage();
    await pg.goto(BASE + home, { waitUntil: 'load' });
    let reached = false; // keyboard: Tab reaches Accept, then Decline
    for (let i = 0; i < 5 && !reached; i++) { await pg.keyboard.press('Tab'); reached = await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-consent') === 'granted'); }
    ok(reached, `${lang} Accept is reachable by keyboard`);
    await pg.click('#consent-bar [data-consent=denied]');
    ok(!(await pg.isVisible('#consent-bar')) && await pg.evaluate(() => localStorage.getItem('crier_consent')) === 'denied', `${lang} Decline: the bar closes and the choice is saved`);
    await interact(pg); await idle(pg, 7000);
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), pg.locator('a.wa-order').first().click()]);
    if (pop) await pop.waitForURL(/wa\.me/, { timeout: 5000 }).catch(() => {});
    ok(pop && /wa\.me\/\d+\?text=/.test(pop.url()), `${lang} Decline: the WhatsApp button opens WhatsApp (${pop && pop.url().slice(0, 40)})`);
    if (pop) await pop.close();
    await Promise.all([pg.waitForURL(/pricing/), pg.locator(`a[href="${other}"]`).first().click()]);
    ok(new URL(pg.url()).pathname === other, `${lang} Decline: the menu link to ${other} works`);
    await interact(pg); await idle(pg, 6500);
    ok(!(await pg.isVisible('#consent-bar')), `${lang} Decline: the next page does not ask again`);
    ok(log.tag.length === 0 && log.hits.length === 0, `${lang} Decline: no request to Google after Decline, a WhatsApp click and a second page (${log.tag.length} tag, ${log.hits.length} hits)`);
    ok((await gaCookies(ctx)).length === 0, `${lang} Decline: no _ga cookie`);
    await ctx.close();
  }
  // 3. Accept, 4. withdrawal, 5. revisit
  {
    const { ctx, log } = await context();
    const pg = await ctx.newPage();
    await pg.goto(BASE + home, { waitUntil: 'load' });
    await pg.evaluate(() => window.gtag('event', 'probe_before_accept')); // an event from before the choice must never be sent
    await pg.click('#consent-bar [data-consent=granted]');
    await pg.waitForFunction(() => !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'), null, { timeout: 3000 }).catch(() => {});
    await idle(pg, 4000);
    ok(log.tag.length === 1, `${lang} Accept: the real gtag.js is requested at once (${log.tag.length})`);
    ok(events(log).includes('page_view'), `${lang} Accept: Google receives the page_view (${events(log).join(',') || 'nothing'})`);
    ok(!events(log).includes('probe_before_accept'), `${lang} Accept: an event queued before the choice is not sent`);
    ok((await gaCookies(ctx)).length > 0, `${lang} Accept: the _ga cookies are set (${(await gaCookies(ctx)).join(',')})`);
    const n0 = log.hits.length;
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), pg.locator('a.wa-order').first().click()]);
    if (pop) await pop.close();
    await idle(pg, 2500);
    ok(events(log).includes('whatsapp_click') && log.hits.length > n0, `${lang} Accept: the WhatsApp click is measured (whatsapp_click)`);
    // revisit with consent: the tag comes back (after the first interaction) and counts the page
    await pg.goto(BASE + other, { waitUntil: 'load' }); await interact(pg);
    for (let i = 0; i < 20 && events(log).filter((e) => e === 'page_view').length < 2; i++) await idle(pg, 500);
    ok(log.tag.length === 2 && events(log).filter((e) => e === 'page_view').length >= 2, `${lang} Accept, next page: measured again (${log.tag.length} tag loads; events ${events(log).join(',')}; ${log.hits.length} hits: ${log.hits.slice(-2).map((x) => x.slice(0, 200)).join(' || ')})`);
    // withdrawal: Cookie settings > Decline. From that moment nothing more is sent and the cookies are deleted
    await pg.click('footer [data-consent-open]');
    ok(await pg.isVisible('#consent-bar'), `${lang} Cookie settings reopens the bar`);
    await Promise.all([pg.waitForNavigation({ timeout: 5000 }).catch(() => null), pg.click('#consent-bar [data-consent=denied]')]); // the page reloads without the tag
    await pg.waitForLoadState('load'); await idle(pg, 500);
    const n1 = log.hits.length;
    ok(!(await pg.evaluate(() => !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'))), `${lang} withdrawal: the page reloads without gtag.js`);
    const [pop2] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), pg.locator('a.wa-order, a[data-wa-order]').first().click()]);
    if (pop2) await pop2.close();
    await pg.evaluate(() => window.gtag('event', 'probe_after_withdrawal')); await interact(pg); await idle(pg, 4000);
    ok(log.hits.length === n1, `${lang} withdrawal: nothing more is sent after Decline (a WhatsApp click and an event: ${log.hits.length - n1} hits: ${log.hits.slice(n1).map((x) => (x.match(/[?&]en=[^&\n]*/g) || ['(no en)']).join('') + ' ' + (x.split('\n')[1] || '').slice(0, 200)).join(' || ')})`);
    ok((await gaCookies(ctx)).length === 0, `${lang} withdrawal: the _ga cookies are deleted`);
    const t1 = log.tag.length;
    await pg.goto(BASE + home, { waitUntil: 'load' }); await interact(pg); await idle(pg, 7000);
    ok(log.tag.length === t1 && log.hits.length === n1, `${lang} withdrawal, revisit: gtag.js is not loaded again and nothing is sent (tag ${log.tag.length - t1}, hits ${log.hits.length - n1})`);
    await ctx.close();
  }
}
// phones: the bar never hides the last package action (the page gets bottom padding equal to the bar height)
for (const p of ['/pricing/', '/en/pricing/']) {
  const { ctx } = await context({ width: 360, height: 740 });
  const pg = await ctx.newPage();
  await pg.goto(BASE + p);
  await pg.waitForFunction(() => document.body.style.paddingBottom !== '', null, { timeout: 5000 }).catch(() => {});
  const r = await pg.evaluate(async () => {
    const bar = document.getElementById('consent-bar');
    const btns = [...document.querySelectorAll('[data-product], [data-unavailable], [data-wa-order]')].filter((x) => x.offsetParent);
    const last = btns[btns.length - 1];
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const foot = document.querySelector('footer').getBoundingClientRect(), bb = bar.getBoundingClientRect();
    last.scrollIntoView({ block: 'end', behavior: 'instant' });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const lb = last.getBoundingClientRect();
    return { barH: Math.round(bb.height), footBottom: Math.round(foot.bottom), lastBottom: Math.round(lb.bottom), barTop: Math.round(bb.top), pad: document.body.style.paddingBottom, sw: document.documentElement.scrollWidth, vw: innerWidth, n: btns.length };
  });
  ok(r.barH < 200 && r.pad === r.barH + 'px', `${p} phone: bar ${r.barH}px tall, body padded ${r.pad}`);
  ok(r.footBottom <= r.barTop + 1, `${p} phone: at the end of the page the footer ends above the bar`);
  ok(r.n > 0 && r.lastBottom <= r.barTop + 1, `${p} phone: the last package action scrolled into view stops above the bar`);
  ok(r.sw <= r.vw, `${p} phone: no sideways scroll`);
  await ctx.close();
}
await b.close();
console.log(fail ? `${fail} FAILED` : 'consent: all passed');
process.exit(fail ? 1 : 0);
