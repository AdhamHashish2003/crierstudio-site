// Several countries (owner 2026-11-19): Egypt, the USA, Saudi Arabia and the UAE each see their own currency, payment line and
// WhatsApp order message; every other country (and an unknown one) sees Egypt's page as built. A US visitor on an Arabic page goes
// to the same page under /en/, unless they chose Arabic (the AR link) or are a crawler. The country is faked by answering
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

// the USA on an Arabic page: sent to the English page (every published page), the address and the #hash kept
for (const p of ['/', '/pricing/', '/social/', '/terms/']) {
  const { c, pg } = await visit(p + '?utm_source=test#faq', { cc: 'US' });
  const u = new URL(pg.url());
  ok(u.pathname === '/en' + p && u.search === '?utm_source=test' && u.hash === '#faq', `US on ${p}: sent to ${u.pathname}${u.search}${u.hash}`);
  await c.close();
}
// ... and on the next visit at once (the country is remembered), with no Arabic shown first
{
  const { c, pg } = await visit('/', { cc: 'US' });
  await pg.goto(BASE + '/pricing/'); await pg.waitForLoadState('load');
  ok(new URL(pg.url()).pathname === '/en/pricing/', 'US, second page: sent to /en/pricing/ from the remembered country');
  await c.close();
}
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
// crawlers: never redirected, never re-priced (they index the Arabic page as built, in Egypt's prices)
for (const p of ['/', '/pricing/']) {
  const { c, pg } = await visit(p, { cc: 'US', ua: GOOGLEBOT });
  const price = p === '/pricing/' ? await pg.evaluate(() => document.querySelector('.price.amt').textContent.trim()) : null;
  ok(new URL(pg.url()).pathname === p && (price == null || price === money('ar', DEF, priceOf(DEF, 'seen'))), `Googlebot from the USA on ${p}: stays${price ? ', ' + price : ''}`);
  await c.close();
}
// the legal pages are not re-priced: they state all four countries
{
  const { c, pg } = await visit('/en/terms/', { cc: 'SA' });
  const txt = await pg.evaluate(() => document.body.innerText);
  ok(['$250', 'SAR 950', 'AED 950', 'EGP 2,500', 'InstaPay', 'card', 'bank transfer'].every((x) => txt.includes(x)), '/en/terms/ states every country\'s prices and way to pay');
  await c.close();
}
// Saudi Arabia and the UAE stay on the Arabic pages
for (const cc of ['SA', 'AE']) { const { c, pg } = await visit('/', { cc }); ok(new URL(pg.url()).pathname === '/', `${cc} on /: stays on Arabic`); await c.close(); }

await b.close();
console.log(fail ? `${fail} FAILED` : 'countries: all passed');
process.exit(fail ? 1 : 0);
