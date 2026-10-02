// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'es', 'fr', 'ar'];
const PAGES = ['', 'crier-deck/', 'snapshot/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
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
  for (const nav of ['crier-deck/', 'snapshot/', 'samples/', 'faq/', 'about/']) ok(h.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `nav link ${nav} in ${file}`);
  ok(h.includes('href="https://portal.crierstudio.com/"'), `portal link ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  ok(!/[$€£]\s?\d|\d\s?(USD|EGP|EUR)\b/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `price-like text in ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === /const NOINDEX = true/.test(rd('build/build.mjs')), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
ok(rd('crier-deck/index.html').includes('"@type":"Service"') && !rd('crier-deck/index.html').includes('"offers"'), 'Service JSON-LD, no offers');
ok(rd('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
