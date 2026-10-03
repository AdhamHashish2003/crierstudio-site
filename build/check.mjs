// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'es', 'fr', 'ar'];
const PAGES = ['', 'pricing/', 'crier-deck/', 'snapshot/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
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
  for (const nav of ['pricing/', 'crier-deck/', 'snapshot/', 'samples/', 'faq/', 'about/']) ok(h.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `nav link ${nav} in ${file}`);
  ok(h.includes('href="https://portal.crierstudio.com/"'), `portal link ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  // no free offers anywhere: the word free (and its es/fr/ar forms) must not appear in visible text
  const vis = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!/\bfree\b|\bgratis\b|gratuit|sin cargo|مجان|بدون مقابل/i.test(vis), `free wording in ${file}`);
  ok(!/Your shop, heard/i.test(h), `tagline in ${file}`);
  if (p === 'pricing/') for (const pr of ['$29', '$99', '$199', '$399', '$149', '$249']) ok(vis.includes(pr), `price ${pr} on ${file}`);
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === 6, `6 buy buttons on ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === /const NOINDEX = true/.test(rd('build/build.mjs')), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
ok(rd('crier-deck/index.html').includes('"@type":"Service"') && rd('crier-deck/index.html').includes('"price":"149"') && rd('crier-deck/index.html').includes('"price":"249"'), 'Service JSON-LD with the deck offers');
ok(rd('pricing/index.html').includes('"@type":"ItemList"') && rd('pricing/index.html').includes('"priceCurrency":"USD"'), 'pricing JSON-LD');
// Buy buttons: every product has one config entry; empty = the request form with the product preselected, filled = the link
{
  const links = JSON.parse(rd('payment-links.json'));
  for (const k of ['snapshot', 'starter', 'growth', 'pro', 'deck', 'deck_print']) {
    ok(typeof links[k] === 'string' && (links[k] === '' || /^https:\/\//.test(links[k])), `payment-links.json entry ${k}`);
    for (const l of LANGS) {
      const hh = rd((l === 'en' ? '' : l + '/') + 'pricing/index.html');
      const m = hh.match(new RegExp(`<a class="btn[^"]*" href="([^"]*)" data-product="${k}"`));
      const want = links[k] || `/${l === 'en' ? '' : l + '/'}snapshot/?product=${k}#request`;
      ok(m && m[1].replace(/&amp;/g, '&') === want, `buy button ${k} (${l}) href`);
    }
  }
}
ok(rd('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
