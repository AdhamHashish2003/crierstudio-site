// O02 (audit 3, 2026-11-17): the price data this site was built from is the studio's CURRENT price list. data/pricing.json says
// which bytes of uma portal/lib/pricing.json it came from (generated_from: their sha256); this reads that file from the private uma
// repository's main branch and fails when its sha256 is different (the site is stale: republish with publish-pricing.cjs and build).
// Run in the Pages workflow on main only, with UMA_PRICING_TOKEN (a read-only token for the uma repository's contents). Pull
// requests, forks included, never get the token and do not run this. Run by hand: UMA_PRICING_TOKEN=... node build/verify-upstream.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
const TOKEN = process.env.UMA_PRICING_TOKEN, REPO = process.env.UMA_REPO || 'AdhamHashish2003/uma', REF = process.env.UMA_REF || 'main';
const want = (JSON.parse(fs.readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')).generated_from || '').replace(/^portal\/lib\/pricing\.json sha256 /, '');
if (!TOKEN) { console.error('UMA_PRICING_TOKEN is not set: the upstream price list cannot be checked, so this release is not verified'); process.exit(1); }
const r = await fetch(`https://api.github.com/repos/${REPO}/contents/portal/lib/pricing.json?ref=${encodeURIComponent(REF)}`, { headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github.raw', 'user-agent': 'crier-site-pages-check' } });
if (!r.ok) { console.error(`reading the upstream price list failed: HTTP ${r.status}`); process.exit(1); }
const have = crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
if (have !== want) { console.error(`data/pricing.json is stale: built from ${want.slice(0, 8)}, the price list on ${REPO}@${REF} is ${have.slice(0, 8)}. Run node portal/scripts/publish-pricing.cjs --site <this repo>, build, commit.`); process.exit(1); }
console.log(`price data is current (${have.slice(0, 8)}, ${REPO}@${REF})`);
