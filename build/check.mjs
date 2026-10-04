// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'es', 'fr', 'ar'];
const PAGES = ['', 'pricing/', 'brand-deck/', 'kit/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
const MOVED = { 'snapshot/': 'kit/', 'crier-deck/': 'brand-deck/' }; // old URLs: redirect stubs, not in the sitemap
const PRODUCTS = ['kit', 'visible', 'growing', 'deck'];
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const d = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(rd(`i18n/${l}.json`))]));
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
  for (const nav of ['pricing/', 'kit/', 'brand-deck/', 'samples/', 'faq/', 'about/']) ok(h.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `nav link ${nav} in ${file}`);
  ok(h.includes('href="https://portal.crierstudio.com/"'), `portal link ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  // no free offers anywhere: the word free (and its es/fr/ar forms) must not appear in visible text
  const vis = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!/\bfree\b|\bgratis\b|gratuit|sin cargo|مجان|بدون مقابل/i.test(vis), `free wording in ${file}`);
  ok(!/Your shop, heard/i.test(h), `tagline in ${file}`);
  if (p === 'pricing/') for (const pr of ['$29', '$45', '$60', '$250']) ok(vis.includes(pr), `price ${pr} on ${file}`);
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === 4, `4 buy buttons on ${file}`);
  // retired packages and prices must not come back (Snapshot, Starter/Growth/Pro, Crier Deck + Print Kit, old discounts)
  for (const bad of [/\$(99|199|399|149|249|39)\b/, /Snapshot/, /Starter/, /Growth/, /\bPro\b/, /Print Kit/, /Crier Deck/]) ok(!bad.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0] + ' ' + (h.match(/<meta[^>]+>/g) || []).join(' ')), `retired wording ${bad} in ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === /const NOINDEX = true/.test(rd('build/build.mjs')), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
ok(rd('brand-deck/index.html').includes('"@type":"Service"') && rd('brand-deck/index.html').includes('"price":"250"'), 'Service JSON-LD with the Brand Deck offer');
ok(rd('kit/index.html').includes('"@type":"Service"') && rd('kit/index.html').includes('"price":"29"'), 'Service JSON-LD with the kit offer');
for (const pr of ['"price":"29"', '"price":"45"', '"price":"60"', '"price":"250"', '"unitCode":"MON"']) ok(rd('pricing/index.html').includes(pr), 'pricing JSON-LD ' + pr);
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
      const want = links[k] || `/${l === 'en' ? '' : l + '/'}kit/?product=${k}#request`;
      ok(m && m[1].replace(/&amp;/g, '&') === want, `buy button ${k} (${l}) href`);
    }
  }
}
ok(rd('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
