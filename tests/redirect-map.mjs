// Redirect map (SEO batch 2026-11-20): the Cloudflare Single Redirect rules (ops/cloudflare/redirect-rules.json) and the in-repo stub
// pages agree, and every old URL reaches a real published page in ONE hop.
//   1. every stub page in the built site (data-page="redirect") is enumerated, with its URL path;
//   2. the rules are evaluated in JS the way Cloudflare does (first match wins; www rule first) for each stub path and its variants;
//   3. the target must be a page in sitemap.xml whose built file is a real page (not a stub), and equal the stub's own
//      meta refresh / canonical / data-target (both fallbacks agree);
//   4. no rule matches a live page, the restored /fiberglass/ page or the IndexNow key; the rule set fits the Free plan (10 rules,
//      expressions under 4,096 characters) and keeps the zone's four existing rules by name;
//   5. build/redirects.json (the build's one map) is exactly what the stubs and the rules say.
// Run: node tests/redirect-map.mjs   (no network, no browser)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };

const RULES = JSON.parse(rd('ops/cloudflare/redirect-rules.json')).rules;
const MAP = JSON.parse(rd('build/redirects.json')).redirects; // { "/old/": "/target/" }
const SITEMAP = new Set([...rd('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

// ---- a small evaluator for the expressions the rule file uses ----
function parseSet(s) { return [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]); }
function matches(expr, req) {
  let m = expr.match(/^\(http\.host eq "([^"]+)"\)$/); if (m) return req.host === m[1];
  m = expr.match(/^\(http\.request\.uri\.path in \{([^}]*)\}\)$/); if (m) return req.host === 'crierstudio.com' && parseSet(m[1]).includes(req.path);
  throw new Error('expression the test cannot evaluate: ' + expr);
}
function substring(s, start, end) { // Cloudflare: byte indexes, negative counts from the end
  const len = s.length, a = start < 0 ? Math.max(0, len + start) : Math.min(start, len), b = end == null ? len : end < 0 ? Math.max(0, len + end) : Math.min(end, len);
  return a < b ? s.slice(a, b) : '';
}
function evalTarget(expr, req) {
  const args = (inner) => { const out = []; let d = 0, q = false, st = 0; for (let i = 0; i < inner.length; i++) { const c = inner[i]; if (q) { if (c === '\\') i++; else if (c === '"') q = false; continue; } if (c === '"') q = true; else if (c === '(') d++; else if (c === ')') d--; else if (c === ',' && !d) { out.push(inner.slice(st, i).trim()); st = i + 1; } } out.push(inner.slice(st).trim()); return out; };
  const ev = (e) => {
    if (/^"/.test(e)) return JSON.parse(e);
    if (e === 'http.request.uri.path') return req.path;
    if (/^-?\d+$/.test(e)) return Number(e);
    let m = e.match(/^concat\(([\s\S]*)\)$/); if (m) return args(m[1]).map(ev).join('');
    m = e.match(/^substring\(([\s\S]*)\)$/); if (m) { const [f, s, t] = args(m[1]).map(ev); return substring(f, s, t); }
    throw new Error('target expression the test cannot evaluate: ' + e);
  };
  return ev(expr.trim());
}
// Cloudflare's answer to a request: the first enabled rule that matches; [status, location] or null
function cloudflare(req) {
  for (const r of RULES) {
    if (r.enabled === false || !matches(r.expression, req)) continue;
    const fv = r.action_parameters.from_value, t = fv.target_url;
    let loc = t.value != null ? t.value : evalTarget(t.expression, req);
    if (fv.preserve_query_string && req.query) loc += (loc.includes('?') ? '&' : '?') + req.query;
    return [fv.status_code, loc, r.description];
  }
  return null;
}
const req = (u) => { const x = new URL(u); return { host: x.host, path: x.pathname, query: x.search.slice(1) }; };
const fileFor = (p) => (p.endsWith('/') ? p + 'index.html' : p).slice(1);
const isStub = (f) => fs.existsSync(path.join(ROOT, f)) && rd(f).includes('data-page="redirect"');
const isLive = (u) => { const p = new URL(u).pathname; return SITEMAP.has(SITE + p) && fs.existsSync(path.join(ROOT, fileFor(p))) && !isStub(fileFor(p)); };

// ---- the rule set itself ----
ok(Array.isArray(RULES) && RULES.length <= 10, `at most 10 Single Redirect rules (Free plan): ${RULES.length}`);
ok(RULES[0]?.description === 'www to apex' && RULES[0].expression === '(http.host eq "www.crierstudio.com")' && RULES[0].action_parameters?.from_value?.target_url?.expression === 'concat("https://crierstudio.com", http.request.uri.path)' && RULES[0].action_parameters.from_value.status_code === 301 && RULES[0].action_parameters.from_value.preserve_query_string === true, 'the first rule is "www to apex"');
for (const name of ['Social Kit: kit + snapshot', 'Social Kit AR', 'Physical to Custom pieces', 'Physical to Custom pieces AR']) ok(RULES.some((r) => r.description === name), `the existing zone rule "${name}" is kept`);
for (const r of RULES) {
  ok(r.action === 'redirect' && r.action_parameters?.from_value?.status_code === 301 && r.action_parameters.from_value.preserve_query_string === true, `"${r.description}": a 301 that keeps the query string`);
  ok(r.expression.length < 4096, `"${r.description}": expression under 4,096 characters (${r.expression.length})`);
  const t = r.action_parameters.from_value.target_url; ok((t.value != null) !== (t.expression != null), `"${r.description}": one target (value or expression)`);
  if (t.value != null) ok(isLive(t.value), `"${r.description}": static target ${t.value} is a published page`);
}
// the www rule: any path on www goes to the same path on the apex, query kept
{ const r = cloudflare(req('https://www.crierstudio.com/pricing/?a=1')); ok(r && r[0] === 301 && r[1] === SITE + '/pricing/?a=1', `www -> apex: ${r}`); }

// ---- every stub in the built site ----
const SKIP = new Set(['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'design', '_parked', 'data', 'fonts', 'ops', 'scripts', 'proposals']);
const stubs = [];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !(rel.startsWith('assets/') && !/^assets\/(studio-deck)$/.test(rel))) walk(rel); continue; }
    if (rel.endsWith('.html') && rd(rel).includes('data-page="redirect"')) stubs.push(rel);
  }
})('');
ok(stubs.length > 50, `stub pages found: ${stubs.length}`);
const seen = new Set();
for (const f of stubs) {
  const p = '/' + f.replace(/(^|\/)index\.html$/, '$1');
  seen.add(p);
  const h = rd(f);
  const refresh = (h.match(/<meta http-equiv="refresh" content="0; url=([^"]+)">/) || [])[1];
  const canon = (h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
  ok(/<meta name="robots" content="noindex">/.test(h), `${p}: noindex`);
  ok(refresh && !/<noscript><meta http-equiv="refresh"/.test(h), `${p}: a plain meta refresh (not only inside <noscript>)`);
  ok(canon && refresh && canon === SITE + refresh.split('#')[0], `${p}: canonical ${canon} is the refresh target ${refresh}`);
  ok(MAP[p] === refresh, `${p}: build/redirects.json says ${MAP[p]}, the stub says ${refresh}`);
  ok(refresh && isLive(SITE + refresh.split('#')[0]), `${p}: the stub target ${refresh} is a published page (in the sitemap, not a stub)`);
  // Cloudflare, for the stub's own URL: one 301 to the same final page
  const cf = cloudflare(req(SITE + p + '?utm_source=x'));
  ok(cf && cf[0] === 301, `${p}: a Cloudflare rule answers it (${cf ? cf[2] : 'none'})`);
  if (!cf) continue;
  const loc = new URL(cf[1]);
  ok(loc.origin === SITE && loc.pathname === (refresh || '').split('#')[0] && loc.search === '?utm_source=x', `${p}: Cloudflare -> ${cf[1]} (${cf[2]}), the stub -> ${refresh}`);
  ok(isLive(loc.origin + loc.pathname) && !cloudflare(req(loc.origin + loc.pathname)), `${p}: ${loc.pathname} is final (a published page that no rule redirects again): one hop`);
  // the no-slash and index.html forms of a stub URL, where a static rule lists them, go to the same page
  if (p.endsWith('/') && p !== '/') for (const v of [p.slice(0, -1), p + 'index.html']) { const c2 = cloudflare(req(SITE + v)); if (c2) ok(new URL(c2[1]).pathname === loc.pathname && isLive(new URL(c2[1]).origin + new URL(c2[1]).pathname), `${v}: same target as ${p}`); }
}
for (const p of Object.keys(MAP)) ok(seen.has(p), `build/redirects.json lists ${p}, which has no stub page`);
// the kept rules' own path lists (e.g. /kit, /snapshot/index.html): every path a rule names reaches a published page in one hop
for (const r of RULES.slice(1)) { const m = r.expression.match(/in \{([^}]*)\}/); if (!m) continue; for (const p of parseSet(m[1])) { const cf = cloudflare(req(SITE + p)); ok(cf && cf[2] === r.description && isLive(cf[1].split('?')[0]), `${p} (${r.description}) -> ${cf && cf[1]}`); } }
// no rule touches a published page, the unlisted /fiberglass/ page, the IndexNow key file or robots/sitemap
const keep = [...SITEMAP].map((u) => new URL(u).pathname).concat(['/fiberglass/', '/fiberglass', '/fiberglass/index.html', '/robots.txt', '/sitemap.xml', '/404.html']);
try { keep.push('/' + JSON.parse(rd('build/indexnow.json')).key + '.txt'); } catch { }
for (const p of keep) { const cf = cloudflare(req(SITE + p)); ok(!cf, `${p} must not be redirected (${cf && cf[2]})`); }
console.log(`${stubs.length} stub pages, ${RULES.length} rules, ${n} checks: ${fail ? fail + ' FAILED' : 'all passed'}`);
process.exit(fail ? 1 : 0);
