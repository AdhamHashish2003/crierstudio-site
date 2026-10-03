// Form + old-URL test with a MOCKED endpoint (page.route): never hits the live API.
// Run: node tests/form.mjs   (needs: npm i --no-save playwright-core, a local static server on :8765 serving the repo root, Chrome)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const fillBase = async (pg) => {
  await pg.fill('#f-business', 'Test Cafe'); await pg.fill('#f-web', 'testcafe.example'); await pg.fill('#f-email', 'a@b.co'); await pg.fill('#f-city', 'Cairo');
  await pg.selectOption('#f-industry', 'Cafés and dessert shops'); await pg.check('#f-consent');
};
const done = (pg) => pg.waitForFunction(() => /\S/.test(document.getElementById('snap-status').textContent) && !document.getElementById('snap-submit').disabled);
for (const l of ['en', 'es', 'fr', 'ar']) {
  const p = '/' + (l === 'en' ? '' : l + '/') + 'snapshot/';
  const pg = await (await b.newContext()).newPage();
  const hits = [];
  await pg.route(ENDPOINT, (r) => { hits.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); });
  await pg.goto(BASE + p);
  await pg.click('#snap-submit');
  ok(hits.length === 0 && await pg.isVisible('#e-business'), p + ' empty submit blocked, errors shown');
  await fillBase(pg); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 1, p + ' one POST to mocked endpoint (snapshot)');
  ok(Object.keys(hits[0]).sort().join(',') === 'business,city,company_website,consent,email,industry,lang,product,web', p + ' snapshot payload keys: ' + Object.keys(hits[0]).sort().join(','));
  ok(hits[0].product === 'snapshot' && hits[0].lang === l && hits[0].consent === true && hits[0].company_website === '' && hits[0].industry === 'Cafés and dessert shops', p + ' product=snapshot lang=' + l);
  // Crier Deck via the old link name
  await pg.goto(BASE + p + '?product=crier_deck');
  ok(await pg.isChecked('input[value=deck]') && await pg.isVisible('#f-address'), p + ' ?product=crier_deck (old name) preselects Crier Deck and shows address');
  ok(await pg.inputValue('#f-decklang') === l, p + ' deck language defaults to page language');
  await fillBase(pg); await pg.click('#snap-submit');
  ok(hits.length === 1 && await pg.isVisible('#e-address'), p + ' address required for Crier Deck');
  await pg.fill('#f-address', '1 Example Street, Cairo'); await pg.selectOption('#f-decklang', 'ar-en'); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 2 && hits[1].product === 'crier_deck' && hits[1].address === '1 Example Street, Cairo' && hits[1].deck_lang === 'ar-en' && hits[1].lang === l, p + ' crier_deck payload: ' + JSON.stringify(hits[1]));
}
// plans and the Print Kit: Buy buttons open the form with the product selected; the payload stays inside what the intake API accepts
for (const l of ['en', 'ar']) {
  const base = '/' + (l === 'en' ? '' : l + '/');
  const pg = await (await b.newContext()).newPage();
  const hits = [];
  await pg.route(ENDPOINT, (r) => { hits.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); });
  await pg.goto(BASE + base + 'pricing/');
  ok(await pg.locator('[data-product]').count() === 6 && await pg.locator('.plan.hot[data-plan=growth] .badge').count() === 1, base + 'pricing/ has 6 Buy buttons, Growth highlighted');
  await pg.click('[data-product=growth]');
  await pg.waitForSelector('#snap-form');
  ok(pg.url().includes('/snapshot/?product=growth') && await pg.isChecked('input[value=growth]') && !(await pg.isVisible('#f-address')), base + 'Growth Buy -> form with Growth selected');
  await fillBase(pg); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 1 && hits[0].product === 'snapshot' && hits[0].business === 'Test Cafe [Growth plan]' && Object.keys(hits[0]).sort().join(',') === 'business,city,company_website,consent,email,industry,lang,product,web', base + 'plan payload: ' + JSON.stringify(hits[0]));
  await pg.goto(BASE + base + 'pricing/'); await pg.click('[data-product=deck_print]');
  await pg.waitForSelector('#snap-form');
  ok(await pg.isChecked('input[value=deck_print]') && await pg.isVisible('#f-address'), base + 'Print Kit Buy -> form with address field');
  await fillBase(pg); await pg.fill('#f-address', '1 Example Street, Cairo'); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 2 && hits[1].product === 'crier_deck' && hits[1].business === 'Test Cafe [Crier Deck + Print Kit]' && hits[1].address === '1 Example Street, Cairo', base + 'print kit payload: ' + JSON.stringify(hits[1]));
}
// the Crier Deck page CTA opens the form with product=crier_deck
{
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE + '/crier-deck/'); await pg.click('.phead a[data-product=deck]');
  await pg.waitForSelector('#snap-form');
  ok(pg.url().includes('/snapshot/?product=deck') && await pg.isChecked('input[value=deck]'), 'Crier Deck CTA -> /snapshot/?product=deck');
}
// old URLs
for (const [from, to] of [['/?lang=es', '/es/'], ['/?lang=ar', '/ar/'], ['/?lang=fr', '/fr/'], ['/terms.html', '/terms/'], ['/privacy.html?lang=fr', '/fr/privacy/'], ['/refund.html?lang=ar', '/ar/refund/']]) {
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE + from); await pg.waitForFunction((t) => location.pathname === t, to, { timeout: 5000 }).catch(() => {});
  ok(new URL(pg.url()).pathname === to, `old URL ${from} -> ${to}`);
}
await b.close(); process.exit(fail ? 1 : 0);
