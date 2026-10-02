// Form test with a MOCKED endpoint (page.route): never hits the live API.
// Run: node tests/form.mjs   (needs: npm i playwright-core, a local static server on :8765 serving the repo root, Chrome)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
for (const p of ['/', '/es/', '/fr/', '/ar/']) {
  const pg = await (await b.newContext()).newPage();
  const hits = [];
  await pg.route(ENDPOINT, (r) => { hits.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); });
  await pg.goto(BASE + p);
  await pg.click('#snap-submit');
  ok(hits.length === 0 && await pg.isVisible('#e-business'), p + ' empty submit blocked, errors shown');
  await pg.fill('#f-business', 'Test Cafe'); await pg.fill('#f-web', 'testcafe.example'); await pg.fill('#f-email', 'a@b.co'); await pg.fill('#f-city', 'Cairo');
  await pg.selectOption('#f-industry', 'Cafés and dessert shops'); await pg.check('#f-consent');
  await pg.click('#snap-submit'); await pg.waitForFunction(() => /\S/.test(document.getElementById('snap-status').textContent) && !document.getElementById('snap-submit').disabled);
  ok(hits.length === 1, p + ' one POST to mocked endpoint');
  const keys = Object.keys(hits[0]).sort().join(',');
  ok(keys === 'business,city,company_website,consent,email,industry,web', p + ' payload keys exactly: ' + keys);
  ok(hits[0].industry === 'Cafés and dessert shops' && hits[0].consent === true && hits[0].company_website === '', p + ' industry stays English, consent true, honeypot empty');
}
await b.close(); process.exit(fail ? 1 : 0);
