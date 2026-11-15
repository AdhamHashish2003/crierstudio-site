// Every link and asset on every published HTML page (2026-11-15): internal paths must exist in the repo (a file, or a folder with
// index.html; query and #hash ignored; #hash targets on the same page must exist), external http(s) links must answer (GET only).
// Run: node tests/links.mjs   (EXTERNAL=0 skips the network)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'design', '_parked', 'data', 'fonts']);
const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => { const r = d ? d + '/' + e.name : e.name; return e.isDirectory() ? (SKIP.has(e.name) || r.startsWith('assets/') && !r.startsWith('assets/h') ? [] : walk(r)) : e.name.endsWith('.html') ? [r] : []; });
const files = walk('').filter((f) => !/^assets\/(studio-deck|social-preview)/.test(f));
let fail = 0; const bad = (m) => { fail++; console.log('FAIL', m); };
const ext = new Map();
for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('src=') ? m : ''));
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of h.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (/^(mailto:|tel:|data:|javascript:)/.test(u)) continue;
    if (/^https?:\/\//.test(u)) { if (u.startsWith('https://crierstudio.com/')) u = u.slice('https://crierstudio.com'.length); else { ext.set(u.split('#')[0], f); continue; } }
    if (u.startsWith('#')) { if (u.length > 1 && !ids.has(u.slice(1))) bad(`${f}: #${u.slice(1)} has no target`); continue; }
    const p = u.split(/[?#]/)[0]; if (!p) continue;
    const abs = p.startsWith('/') ? p.slice(1) : path.posix.join(path.posix.dirname(f), p);
    const fp = path.join(ROOT, abs);
    if (!(fs.existsSync(fp) && (fs.statSync(fp).isFile() || fs.existsSync(path.join(fp, 'index.html'))))) bad(`${f}: ${u} not found`);
  }
}
for (const m of fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/crierstudio\.com\/([^<]*)<\/loc>/g)) if (!fs.existsSync(path.join(ROOT, m[1], 'index.html'))) bad(`sitemap: /${m[1]} not found`);
console.log(`${files.length} HTML files checked, ${ext.size} external URLs`);
if (process.env.EXTERNAL !== '0') {
  for (const [u, f] of ext) {
    if (/googletagmanager|google-analytics/.test(u)) continue;
    try { const r = await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' } }); if (r.status >= 400) bad(`${u} answered ${r.status} (from ${f})`); else console.log('OK', r.status, u.slice(0, 90)); }
    catch (e) { bad(`${u} failed: ${e.message} (from ${f})`); }
  }
}
console.log(fail ? `${fail} FAILED` : 'all links OK'); process.exit(fail ? 1 : 0);
