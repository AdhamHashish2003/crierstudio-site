// IndexNow ping (post-deploy step, SEO batch 2026-11-20). Reads the one config spot, build/indexnow.json ({key, host, keyLocation}),
// and the URLs of sitemap.xml, and tells IndexNow (https://api.indexnow.org/indexnow, shared by Bing, Yandex, Seznam, Naver and
// others) that those URLs changed.
//   node scripts/indexnow-ping.mjs            dry run (the default): prints the payload, sends nothing
//   node scripts/indexnow-ping.mjs --send     sends it (only after the deploy is live: the key file must answer at keyLocation)
// Options: --url <url> (repeatable) pings only those URLs (each must be in the sitemap).
// Rotating the key: change "key" (and keyLocation) in build/indexnow.json, run node build/build.mjs (it writes /<key>.txt and deletes
// the old key file), deploy, then ping.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const argv = process.argv.slice(2);
const SEND = argv.includes('--send');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'indexnow.json'), 'utf8'));
const die = (m) => { console.error('indexnow-ping: ' + m); process.exit(1); };
if (!/^[0-9a-f]{32}$/.test(cfg.key || '')) die('build/indexnow.json: key must be 32 hex characters');
if (cfg.host !== 'crierstudio.com') die('build/indexnow.json: host must be crierstudio.com');
if (cfg.keyLocation !== `https://${cfg.host}/${cfg.key}.txt`) die('build/indexnow.json: keyLocation must be https://<host>/<key>.txt');
const keyFile = path.join(ROOT, cfg.key + '.txt');
if (!fs.existsSync(keyFile) || fs.readFileSync(keyFile, 'utf8').trim() !== cfg.key) die(`${cfg.key}.txt is missing or wrong: run node build/build.mjs`);
const all = [...fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const pick = argv.flatMap((a, i) => (a === '--url' ? [argv[i + 1]] : []));
for (const u of pick) if (!all.includes(u)) die('not in sitemap.xml: ' + u);
const urlList = pick.length ? pick : all;
if (!urlList.length || urlList.length > 10000) die('urlList must have 1 to 10,000 URLs');
for (const u of urlList) if (new URL(u).host !== cfg.host) die('URL on another host: ' + u);
const payload = { host: cfg.host, key: cfg.key, keyLocation: cfg.keyLocation, urlList };
if (!SEND) {
  console.log(`DRY RUN (nothing sent). With --send this is POSTed to ${ENDPOINT}:`);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}
const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
// 200 OK and 202 Accepted are success; 403 = key not valid (the key file is not live yet), 422 = URLs not on the host, 429 = too many
console.log(`IndexNow answered ${res.status} ${res.statusText} for ${urlList.length} URLs`);
const body = await res.text(); if (body) console.log(body.slice(0, 500));
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
