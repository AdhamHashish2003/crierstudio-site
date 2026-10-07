// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'es', 'fr', 'ar'];
const PAGES = ['', 'pricing/', 'brand-deck/', 'kit/', 'samples/', 'faq/', 'about/', 'physical/', 'terms/', 'privacy/', 'refund/'];
const MOVED = { 'snapshot/': 'kit/', 'crier-deck/': 'brand-deck/' }; // old URLs: redirect stubs, not in the sitemap
const PRODUCTS = ['kit', 'visible', 'growing', 'deck'];
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const d = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(rd(`i18n/${l}.json`))]));
// One price list (U1, 2026-10-05): prices and counts come from data/pricing.json (written by the UMA repo's
// portal/scripts/publish-pricing.cjs from portal/lib/pricing.json). The texts carry placeholders, never a price.
const PRICING = JSON.parse(rd('data/pricing.json'));
ok(/^portal\/lib\/pricing\.json sha256 [0-9a-f]{64}$/.test(PRICING.generated_from || ''), 'data/pricing.json was not written by publish-pricing.cjs');
const PRICE_NUMS = [...new Set(PRICING.packages.flatMap((p) => [p.price, p.extra_platform_price].filter(Boolean)))];
const PRICE_RE = new RegExp('\\$\\s?(' + PRICE_NUMS.join('|') + ')(?!\\d)|(?<![\\d.,])(' + PRICE_NUMS.join('|') + ')\\s?\\$');
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(!PRICE_RE.test(v), `a price is written into i18n ${l}:${k} (use {price:<id>})`);
for (const f of fs.readdirSync(path.join(ROOT, 'templates'))) ok(!PRICE_RE.test(rd('templates/' + f)), `a price is written into templates/${f}`);
const en = Object.keys(d.en).sort();
for (const l of LANGS.slice(1)) { const k = Object.keys(d[l]).sort(); ok(JSON.stringify(k) === JSON.stringify(en), `i18n key set differs in ${l}: ${k.filter((x) => !en.includes(x)).concat(en.filter((x) => !k.includes(x))).join(',')}`); }
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(typeof v === 'string' && v.trim() !== '', `empty ${l}:${k}`);
const urls = [];
for (const l of LANGS) for (const p of PAGES) {
  const rel = (l === 'en' ? '' : l + '/') + p, file = rel + 'index.html', u = 'https://crierstudio.com/' + rel;
  urls.push(u);
  ok(fs.existsSync(path.join(ROOT, file)), 'missing ' + file); if (!fs.existsSync(path.join(ROOT, file))) continue;
  const h = rd(file);
  ok(h.includes(`<link rel="canonical" href="${u}">`), `canonical ${file}`);
  ok(h.includes(`<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">`), `html lang/dir ${file}`);
  ok((h.match(/<link rel="alternate" hreflang="/g) || []).length === 5, `hreflang ${file}`);
  ok(/<title>[^<]{8,}<\/title>/.test(h) && /<meta name="description" content="[^"]{40,}">/.test(h), `title/description ${file}`);
  const headerNav = (h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [''])[0];
  for (const nav of ['pricing/', 'kit/', 'brand-deck/', 'samples/', 'faq/', 'about/', 'physical/']) ok(headerNav.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `nav link ${nav} in ${file}`);
  ok(headerNav.includes('href="https://portal.crierstudio.com/"'), `portal link ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  // no free offers anywhere: the word free (and its es/fr/ar forms) must not appear in visible text
  const vis = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!/\bfree\b|\bgratis\b|gratuit|sin cargo|مجان|بدون مقابل/i.test(vis), `free wording in ${file}`);
  ok(!/Your shop, heard/i.test(h), `tagline in ${file}`);
  if (p === 'pricing/') for (const pk of PRICING.packages) {
    ok(vis.includes('$' + pk.price), `price $${pk.price} (${pk.id}, data/pricing.json) on ${file}`);
    if (pk.extra_platform_price) ok(vis.includes('$' + pk.extra_platform_price), `extra platform $${pk.extra_platform_price} (${pk.id}) on ${file}`);
  }
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === 3 && h.includes('disabled data-unavailable="deck"'), `3 buy buttons and unavailable Brand Deck on ${file}`);
  // retired packages and prices must not come back (Snapshot, Starter/Growth/Pro, Crier Deck + Print Kit, old discounts)
  for (const bad of [/\$(99|199|399|149|249|39)\b/, /Snapshot/, /Starter/, /Growth/, /\bPro\b/, /Print Kit/, /Crier Deck/]) ok(!bad.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0] + ' ' + (h.match(/<meta[^>]+>/g) || []).join(' ')), `retired wording ${bad} in ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === /const NOINDEX = true/.test(rd('build/build.mjs')), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
ok(rd('brand-deck/index.html').includes('"@type":"Service"') && !rd('brand-deck/index.html').includes('"@type":"Offer"'), 'Brand Deck Service is informational, without an active offer');
ok(rd('kit/index.html').includes('"@type":"Service"') && rd('kit/index.html').includes('"price":"29"'), 'Service JSON-LD with the kit offer');
for (const pr of ['"price":"29"', '"price":"45"', '"price":"60"', '"unitCode":"MON"']) ok(rd('pricing/index.html').includes(pr), 'pricing JSON-LD ' + pr);
// renamed pages: every old URL is a noindex redirect stub to the new page in the same language
for (const l of LANGS) for (const [from, to] of Object.entries(MOVED)) {
  const pre = l === 'en' ? '' : l + '/', f = pre + from + 'index.html';
  ok(fs.existsSync(path.join(ROOT, f)), 'missing stub ' + f); if (!fs.existsSync(path.join(ROOT, f))) continue;
  const s = rd(f);
  ok(s.includes('data-page="redirect"') && s.includes(`data-target="${to.slice(0, -1)}"`) && s.includes(`data-lang="${l}"`) && s.includes('content="noindex"') && s.includes(`url=/${pre}${to}"`), 'stub ' + f);
  ok(!sm.includes(`/${pre}${from}<`), 'stub in sitemap ' + f);
}
ok(rd('pricing/index.html').includes('"@type":"ItemList"') && rd('pricing/index.html').includes('"priceCurrency":"USD"'), 'pricing JSON-LD');
// Buy buttons: every product has one config entry; empty = the request form with the product preselected, filled = the link
{
  const links = JSON.parse(rd('payment-links.json'));
  ok(JSON.stringify(Object.keys(links).sort()) === JSON.stringify([...PRODUCTS].sort()), 'payment-links.json has exactly ' + PRODUCTS.join(', '));
  for (const k of PRODUCTS) {
    ok(typeof links[k] === 'string' && (links[k] === '' || /^https:\/\//.test(links[k])), `payment-links.json entry ${k}`);
    for (const l of LANGS) {
      const hh = rd((l === 'en' ? '' : l + '/') + 'pricing/index.html');
      const m = hh.match(new RegExp(`<a class="btn[^"]*" href="([^"]*)" data-product="${k}"`));
      if (k === 'deck') { ok(!m && hh.includes('disabled data-unavailable="deck"'), `Brand Deck unavailable (${l})`); continue; }
      const want = links[k] || `/${l === 'en' ? '' : l + '/'}kit/?product=${k}#request`;
      ok(m && m[1].replace(/&amp;/g, '&') === want, `buy button ${k} (${l}) href`);
    }
  }
}
ok(rd('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
// Google Analytics 4 + Consent Mode v2: every built HTML file (40 pages, 404, all redirect stubs) has the tag exactly once, early in
// <head>, with consent defaulting to denied before the config call; ads signals are never granted; the CSP allows Google's hosts
// and every inline script by its sha256 hash (no 'unsafe-inline' for scripts).
{
  const GA = 'G-QLQ443CQ8E';
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) return ['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'fonts', 'assets'].includes(e.name) ? [] : walk(rel);
    return e.name.endsWith('.html') ? [rel] : [];
  });
  const files = walk('');
  ok(files.length === urls.length + 1 + 3 + LANGS.length * Object.keys(MOVED).length, `GA: expected every built HTML file, found ${files.length}`);
  for (const f of files) {
    const h = rd(f), headEnd = h.indexOf('</head>');
    const tag = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>`;
    ok(h.split(tag).length === 2 && h.indexOf(tag) < headEnd, `GA: exactly one gtag.js tag in <head> of ${f}`);
    ok((h.match(/googletagmanager\.com\/gtag\/js/g) || []).length === 1, `GA: no second gtag.js loader in ${f}`);
    const cfg = `gtag('config','${GA}')`, def = "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500})";
    ok(h.split(cfg).length === 2 && h.split(def).length === 2 && h.indexOf(def) < h.indexOf(cfg) && h.indexOf(cfg) < headEnd, `GA: consent default (all denied) before the one config call in ${f}`);
    ok(h.includes("if(localStorage.getItem('crier_consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}"), `GA: returning visitor who accepted gets analytics_storage granted in ${f}`);
    ok(!/(ad_storage|ad_user_data|ad_personalization)\s*:\s*['"]granted/.test(h), `GA: ads signals never granted in ${f}`);
    const cspAt = h.indexOf('http-equiv="Content-Security-Policy"');
    ok(cspAt > -1 && cspAt < h.indexOf('<script'), `GA: CSP meta comes before the first script in ${f}`);
    const csp = ((h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1] || '').replace(/&#39;/g, "'");
    const dir = (n) => (csp.split(';').map((x) => x.trim()).find((x) => x.startsWith(n + ' ')) || '');
    ok(/https:\/\/(\*|www)\.googletagmanager\.com/.test(dir('script-src')) && !dir('script-src').includes("'unsafe-inline'"), `GA: script-src allows googletagmanager, no unsafe-inline, in ${f}`);
    for (const host of ['google-analytics.com', 'analytics.google.com', 'googletagmanager.com']) ok(dir('connect-src').includes(host), `GA: connect-src allows ${host} in ${f}`);
    for (const host of ['google-analytics.com', 'googletagmanager.com']) ok(dir('img-src').includes(host), `GA: img-src allows ${host} in ${f}`);
    for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`;
      ok(dir('script-src').includes(hash), `GA: inline script allowed by CSP hash in ${f}`);
    }
    // the consent bar: full pages and 404 (redirect stubs leave at once, so they have only the tag)
    if (!h.includes('data-page="redirect"')) {
      ok((h.match(/<div id="consent-bar" class="consent" role="region" aria-label="[^"]{4,}" hidden>/g) || []).length === 1, `consent bar (region, labelled, hidden until JS) once in ${f}`);
      ok(h.includes('data-consent="granted"') && h.includes('data-consent="denied"'), `consent bar Accept + Decline in ${f}`);
      ok(/<a href="\/(\w\w\/)?privacy\/#cookie-settings" data-consent-open>[^<]+<\/a>/.test(h), `footer Cookie settings link in ${f}`);
    }
  }
  for (const l of LANGS) {
    const f = (l === 'en' ? '' : l + '/') + 'privacy/index.html', h = rd(f);
    ok(h.includes('<h2 id="cookies">') && h.includes('Google LLC') && h.includes('Google Analytics 4') && h.includes('14'), `privacy: Google Analytics section in ${f}`);
  }
}
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
