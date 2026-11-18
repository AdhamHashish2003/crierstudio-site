// O02 (audit 3, 2026-11-17): after a Pages deploy, read the release back from the live site (GET only) through Cloudflare:
// /release.json must name this build, and the pricing pages (Arabic and English) and the home page must be byte for byte the files
// that were tested. Retries for a few minutes while Pages and Cloudflare's 10-minute cache catch up (a ?v= query skips the cache).
// Run: node build/verify-live.mjs   (SITE=https://crierstudio.com by default; TRIES and WAIT_S change the patience)
import fs from 'node:fs';
import crypto from 'node:crypto';
const SITE = process.env.SITE || 'https://crierstudio.com', TRIES = +process.env.TRIES || 20, WAIT = (+process.env.WAIT_S || 30) * 1000;
const local = (f) => fs.readFileSync(new URL('../' + f, import.meta.url));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const want = JSON.parse(local('release.json'));
const FILES = [['release.json', '/release.json'], ['pricing/index.html', '/pricing/'], ['en/pricing/index.html', '/en/pricing/'], ['index.html', '/'], ['en/index.html', '/en/']];
for (let i = 1; i <= TRIES; i++) {
  const bad = [];
  for (const [f, u] of FILES) {
    const r = await fetch(`${SITE}${u}?v=${want.release}-${i}`, { headers: { 'user-agent': 'crier-site-pages-check' } }).catch((e) => ({ ok: false, status: String(e) }));
    const body = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    if (!body || sha(body) !== sha(local(f))) bad.push(`${u} (${r.ok ? 'other bytes' : 'HTTP ' + r.status})`);
  }
  if (!bad.length) { console.log(`live: release ${want.release} (assets ${want.assets}, price data ${want.pricing.projection_sha256.slice(0, 8)}) is what ${SITE} serves`); process.exit(0); }
  console.log(`try ${i}/${TRIES}: not yet: ${bad.join(', ')}`);
  if (i < TRIES) await new Promise((r) => setTimeout(r, WAIT));
}
console.error(`${SITE} does not serve release ${want.release}`); process.exit(1);
