// Several countries (owner 2026-11-19): Egypt, the USA, Saudi Arabia and the UAE each see their own currency, payment line and
// WhatsApp order message; every other country (and an unknown one) sees Egypt's page as built. A US visitor on an Arabic page is
// offered the same page under /en/ by a bar (no redirect), unless they chose Arabic (the AR link). The country is faked by answering
// /cdn-cgi/trace the way Cloudflare does. Nothing leaves the machine (Google, WhatsApp and the portal are blocked).
//   BASE=http://127.0.0.1:8767 node tests/countries.mjs        (OUTPUT=<dir> also saves a screenshot of the packages per country)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const BASE = (process.env.BASE || 'http://127.0.0.1:8767').replace(/\/$/, '');
const OUT = process.env.OUTPUT || '';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const d = { en: JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/en.json'), 'utf8')), ar: JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n/ar.json'), 'utf8')) };
const PRICING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/pricing.json'), 'utf8'));
const SERVED = PRICING.funnel.countries, DEF = SERVED[0];
const GOOGLEBOT = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
let fail = 0;
const ok = (c, m) => { if (c) console.log('PASS ' + m); else { fail++; console.log('FAIL ' + m); } };

// what a visitor from cc should read: the money format and the payment line of that country (Egypt's for any other)
const own = (cc) => (SERVED.includes(cc) ? cc : DEF);
function money(lang, cc, n) {
  const cur = PRICING.local.countries[own(cc)].currency, num = n.toLocaleString('en-US');
  return cur === 'USD' ? '$' + num : d[lang]['cur.fmt'].replace('{cur}', d[lang]['cur.sym' + cur]).replace('{n}', num);
}
const priceOf = (cc, id) => PRICING.packages.find((p) => p.id === id).prices[PRICING.local.countries[own(cc)].currency];
const line = (lang, cc) => d[lang][own(cc) === DEF ? 'pay.wa.line' : 'pay.wa.line.' + own(cc).toLowerCase()];

const b = await chromium.launch({ executablePath: CHROME, headless: true });
async function visit(url, { cc, ua, chose, viewport = { width: 1280, height: 900 } } = {}) {
  const c = await b.newContext({ viewport, ...(ua ? { userAgent: ua } : {}) });
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  await c.route('**/cdn-cgi/trace', (r) => (cc ? r.fulfill({ status: 200, contentType: 'text/plain', body: `fl=1\nh=crierstudio.com\nloc=${cc}\n` }) : r.fulfill({ status: 404, body: '' })));
  if (chose) await c.addInitScript((l) => { try { if (!localStorage.getItem('crier.lang')) localStorage.setItem('crier.lang', l); } catch (e) {} }, chose);
  const pg = await c.newPage(), errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(BASE + url); await pg.waitForLoadState('load');
  await pg.waitForTimeout(400); // the trace answer and the redirect, if any
  await pg.waitForLoadState('load');
  return { c, pg, errors };
}

const CASES = [...SERVED, 'KW', null]; // the four served countries, another country, and an unknown one (no Cloudflare answer)
for (const lang of ['ar', 'en']) for (const cc of CASES) {
  const label = `${lang} ${cc || 'unknown'}`;
  const start = (lang === 'ar' ? '' : '/en') + '/pricing/';
  const chose = cc === 'US' && lang === 'ar' ? 'ar' : null; // a US visitor who picked Arabic stays on it
  const { c, pg, errors } = await visit(start, { cc, chose });
  ok(new URL(pg.url()).pathname === start, `${label}: stays on ${start} (${pg.url()})`);
  const shown = await pg.evaluate(() => [...document.querySelectorAll('.price.amt')].map((e) => e.textContent.trim()));
  ok(shown[0] === money(lang, cc, priceOf(cc, 'seen')) && shown[3] === money(lang, cc, priceOf(cc, 'diamond')), `${label}: Bronze ${shown[0]}, Diamond ${shown[3]}`);
  const pay = await pg.evaluate(() => [...document.querySelectorAll('.wapay')].map((e) => e.textContent.trim()));
  ok(pay.length === 4 && pay.every((t) => t === line(lang, cc).replace(/<\/?b>/g, '')), `${label}: payment line "${pay[0]}"`);
  const wa = await pg.evaluate(() => [...document.querySelectorAll('a[data-wa-order]')].map((a) => decodeURIComponent(a.href.split('?text=')[1] || '')));
  ok(wa.length >= 4 && wa[0].includes(priceOf(cc, 'seen').toLocaleString('en-US')) && wa[0].includes(d[lang]['name.seen']), `${label}: WhatsApp order "${wa[0]}"`);
  const note = await pg.evaluate(() => (document.getElementById('vat-note') || {}).textContent || '');
  const cur = PRICING.local.countries[own(cc)].currency;
  ok(note.startsWith((d[lang]['cur.note' + cur + '.all'] || d[lang]['cur.note' + cur]).trim()), `${label}: currency note "${note.trim()}"`);
  ok(!errors.length, `${label}: no script errors ${errors.join(' | ')}`);
  // the How it works video on the home page: Egypt's (InstaPay, EGP) for Egypt and every other country, the neutral one otherwise
  {
    await pg.goto(BASE + (lang === 'ar' ? '/' : '/en/')); await pg.waitForLoadState('load'); await pg.waitForTimeout(300);
    const v = await pg.evaluate(() => { const f = document.getElementById('how-video'); return f ? [f.getAttribute('data-desk'), f.getAttribute('data-phone'), f.querySelector('img.hw-poster').getAttribute('src')] : null; });
    const want = own(cc) === DEF ? `/assets/video/how-${lang}-` : `/assets/video/how-${lang}-neutral-`;
    ok(v && v[0] === want + '1080' && v[1] === want + 'phone' && v[2] === want + '1080-poster.jpg', `${label}: How it works video ${v && v[0]}`);
  }
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    // the packages section: the currency note, the four cards (price, WhatsApp button, payment line)
    await pg.addStyleTag({ content: '#consent-bar{display:none!important}' }); // the cookie bar would cover the cards in a still picture
    const y0 = await pg.evaluate(() => { const n = document.getElementById('vat-note'); return n.getBoundingClientRect().top + scrollY - 150; });
    const y1 = await pg.evaluate(() => { const w = [...document.querySelectorAll('.wapay')].pop(); return w.getBoundingClientRect().bottom + scrollY + 30; });
    await pg.screenshot({ path: path.join(OUT, `pricing-${cc || 'unknown'}-${lang}.png`), clip: { x: 0, y: y0, width: 1280, height: y1 - y0 }, fullPage: true });
  }
  await c.close();
}

// the USA on an Arabic page (SEO round 2, 2026-11-20): no redirect any more; the page stays, and a bar above the header offers the
// same page in English (address and #hash kept). Following it goes there; closing it remembers Arabic.
for (const p of ['/', '/pricing/', '/social/', '/terms/']) {
  const { c, pg } = await visit(p + '?utm_source=test#faq', { cc: 'US' });
  const u = new URL(pg.url());
  const bar = await pg.evaluate(() => { const b = document.getElementById('geo-hint'), a = b && b.querySelector('a'); return b ? { lang: b.lang, href: a.getAttribute('href'), text: b.textContent, before: b.nextElementSibling && b.nextElementSibling.matches('header.top') } : null; });
  ok(u.pathname === p && u.search === '?utm_source=test', `US on ${p}: stays on ${u.pathname}${u.search} (no redirect)`);
  ok(bar && bar.lang === 'en' && bar.href === '/en' + p + '?utm_source=test#faq' && bar.before && bar.text.includes(d.en['geo.go']), `US on ${p}: the English bar links to ${bar && bar.href}`);
  if (p === '/pricing/') {
    await pg.locator('#geo-hint a').click(); await pg.waitForURL((x) => x.pathname === '/en/pricing/', { timeout: 15000 }).catch(() => {});
    const v = new URL(pg.url());
    ok(v.pathname === '/en/pricing/' && v.search === '?utm_source=test' && v.hash === '#faq', `US: following the bar opens ${v.pathname}${v.search}${v.hash}`);
  }
  await c.close();
}
// ... on the next page at once (the country is remembered), and closing it keeps it away
{
  const { c, pg } = await visit('/', { cc: 'US' });
  await pg.goto(BASE + '/pricing/'); await pg.waitForLoadState('load');
  ok(new URL(pg.url()).pathname === '/pricing/' && await pg.locator('#geo-hint').count() === 1, 'US, second page: stays on /pricing/ with the English bar');
  await pg.locator('#geo-hint .geo-x').click();
  ok(await pg.locator('#geo-hint').count() === 0, 'US: the close button removes the bar');
  await pg.goto(BASE + '/social/'); await pg.waitForLoadState('load'); await pg.waitForTimeout(400);
  ok(new URL(pg.url()).pathname === '/social/' && await pg.locator('#geo-hint').count() === 0, 'US after closing the bar: no bar on the next Arabic page');
  await c.close();
}
// no bar on English pages, nor for the other countries
for (const [p, cc] of [['/en/pricing/', 'US'], ['/', 'EG'], ['/', 'SA'], ['/', 'KW']]) { const { c, pg } = await visit(p, { cc }); ok(await pg.locator('#geo-hint').count() === 0, `${cc} on ${p}: no English bar`); await c.close(); }
// a US visitor who taps the Arabic link stays on Arabic, in US dollars
{
  const { c, pg } = await visit('/en/pricing/', { cc: 'US' });
  await pg.locator('.langpick a[lang="ar"]').first().click(); await pg.waitForURL((x) => x.pathname === '/pricing/' && !x.search, { timeout: 15000 }).catch(() => {}); await pg.waitForLoadState('load'); await pg.waitForTimeout(400);
  const price = await pg.evaluate(() => document.querySelector('.price.amt').textContent.trim());
  ok(new URL(pg.url()).pathname === '/pricing/' && price === '$250', `US after tapping AR: stays on /pricing/ with ${price}`);
  await pg.goto(BASE + '/'); await pg.waitForLoadState('load'); await pg.waitForTimeout(400);
  ok(new URL(pg.url()).pathname === '/', 'US after tapping AR: the home page stays Arabic too');
  await c.close();
}
// crawlers: never redirected, never re-priced (they index the Arabic page as built, in Egypt's prices); since nothing redirects by
// country any more, a crawler and a person in the USA end on the same URL and see the same bar
const BINGBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36';
for (const [ua, name] of [[GOOGLEBOT, 'Googlebot'], [BINGBOT, 'Bingbot']]) for (const p of ['/', '/pricing/', '/en/']) {
  const { c, pg } = await visit(p, { cc: 'US', ua });
  const price = /pricing/.test(p) ? await pg.evaluate(() => document.querySelector('.price.amt').textContent.trim()) : null;
  const bar = await pg.locator('#geo-hint').count();
  ok(new URL(pg.url()).pathname === p && (price == null || price === money('ar', DEF, priceOf(DEF, 'seen'))) && bar === (p.startsWith('/en/') ? 0 : 1), `${name} from the USA on ${p}: stays${price ? ', ' + price : ''}, English bar ${bar ? 'shown' : 'not shown'} as for a person`);
  await c.close();
}
// the legal pages are not re-priced: they state all four countries
{
  const { c, pg } = await visit('/en/terms/', { cc: 'SA' });
  const txt = await pg.evaluate(() => document.body.innerText);
  ok(['$250', 'SAR 950', 'AED 950', 'EGP 2,500', 'InstaPay', 'card', 'bank transfer'].every((x) => txt.includes(x)), '/en/terms/ states every country\'s prices and way to pay');
  await c.close();
}
// the US visitor's How it works video really is the neutral one, and it plays
{
  const { c, pg } = await visit('/en/', { cc: 'US' });
  await pg.locator('#how-video').scrollIntoViewIfNeeded(); await pg.waitForTimeout(500);
  await pg.locator('#how-video button').click().catch(() => {});
  const ok1 = await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return v && /how-en-neutral-1080\.(webm|mp4)$/.test(v.currentSrc) && v.readyState >= 2; }, null, { timeout: 15000 }).then(() => true).catch(() => false);
  const src = await pg.evaluate(() => document.querySelector('#how-video video').currentSrc);
  ok(ok1, `US: the How it works video loads the neutral file (${src})`);
  await c.close();
}
// Saudi Arabia and the UAE stay on the Arabic pages
for (const cc of ['SA', 'AE']) { const { c, pg } = await visit('/', { cc }); ok(new URL(pg.url()).pathname === '/', `${cc} on /: stays on Arabic`); await c.close(); }

await b.close();
console.log(fail ? `${fail} FAILED` : 'countries: all passed');
process.exit(fail ? 1 : 0);
