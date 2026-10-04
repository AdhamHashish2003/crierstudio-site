// Form + old-URL test with a MOCKED endpoint (page.route): never hits the live API.
// Run: node tests/form.mjs   (needs: npm i --no-save playwright-core, a local static server on :8765 serving the repo root, Chrome)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
// Google Analytics requests are blocked in every test context, so test runs never reach the live GA property
const newCtx = b.newContext.bind(b);
b.newContext = async (o) => { const c = await newCtx(o); await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (r) => r.abort()); return c; };
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const fillBase = async (pg) => {
  await pg.fill('#f-business', 'Test Cafe'); await pg.fill('#f-web', 'testcafe.example'); await pg.fill('#f-email', 'a@b.co'); await pg.fill('#f-city', 'Cairo');
  await pg.selectOption('#f-industry', 'Cafés and dessert shops'); await pg.check('#f-consent');
};
const done = (pg) => pg.waitForFunction(() => /\S/.test(document.getElementById('snap-status').textContent) && !document.getElementById('snap-submit').disabled);
for (const l of ['en', 'es', 'fr', 'ar']) {
  const p = '/' + (l === 'en' ? '' : l + '/') + 'kit/';
  const pg = await (await b.newContext()).newPage();
  const hits = [];
  await pg.route(ENDPOINT, (r) => { hits.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); });
  await pg.goto(BASE + p);
  await pg.click('#snap-submit');
  ok(hits.length === 0 && await pg.isVisible('#e-business'), p + ' empty submit blocked, errors shown');
  await fillBase(pg); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 1, p + ' one POST to mocked endpoint (kit)');
  ok(Object.keys(hits[0]).sort().join(',') === 'business,city,company_website,consent,email,industry,lang,product,web', p + ' kit payload keys: ' + Object.keys(hits[0]).sort().join(','));
  ok(hits[0].product === 'snapshot' && hits[0].business === 'Test Cafe [The Complete Kit]' && hits[0].lang === l && hits[0].consent === true && hits[0].company_website === '' && hits[0].industry === 'Cafés and dessert shops', p + ' kit -> API product=snapshot, tagged, lang=' + l);
  // Brand Deck via the old link name
  await pg.goto(BASE + p + '?product=crier_deck');
  ok(await pg.isChecked('input[value=deck]') && await pg.isVisible('#f-address'), p + ' ?product=crier_deck (old name) preselects Brand Deck and shows address');
  ok(await pg.inputValue('#f-decklang') === l, p + ' deck language defaults to page language');
  await fillBase(pg); await pg.click('#snap-submit');
  ok(hits.length === 1 && await pg.isVisible('#e-address'), p + ' address required for Brand Deck');
  await pg.fill('#f-address', '1 Example Street, Cairo'); await pg.selectOption('#f-decklang', 'ar-en'); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 2 && hits[1].product === 'crier_deck' && hits[1].business === 'Test Cafe [Brand Deck]' && hits[1].address === '1 Example Street, Cairo' && hits[1].deck_lang === 'ar-en' && hits[1].lang === l, p + ' crier_deck payload: ' + JSON.stringify(hits[1]));
}
// monthly plans and the Brand Deck: Buy buttons open the form with the product selected; the payload stays inside what the intake API accepts
for (const l of ['en', 'ar']) {
  const base = '/' + (l === 'en' ? '' : l + '/');
  const pg = await (await b.newContext()).newPage();
  const hits = [];
  await pg.route(ENDPOINT, (r) => { hits.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }); });
  await pg.goto(BASE + base + 'pricing/');
  ok(await pg.locator('[data-product]').count() === 4 && await pg.locator('.plan.hot[data-plan=kit]').count() === 1 && /\$29/.test(await pg.textContent('[data-plan=kit]')) && /\$45/.test(await pg.textContent('[data-plan=visible]')) && /\$60/.test(await pg.textContent('[data-plan=growing]')) && /\$250/.test(await pg.textContent('[data-plan=deck]')), base + 'pricing/ has 4 Buy buttons with $29/$45/$60/$250, kit highlighted');
  await pg.click('[data-product=growing]');
  await pg.waitForSelector('#snap-form');
  ok(pg.url().includes('/kit/?product=growing') && await pg.isChecked('input[value=growing]') && !(await pg.isVisible('#f-address')), base + 'Keep Growing Buy -> form with Keep Growing selected');
  await fillBase(pg); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 1 && hits[0].product === 'snapshot' && hits[0].business === 'Test Cafe [Keep Growing plan]' && Object.keys(hits[0]).sort().join(',') === 'business,city,company_website,consent,email,industry,lang,product,web', base + 'plan payload: ' + JSON.stringify(hits[0]));
  await pg.goto(BASE + base + 'pricing/'); await pg.click('[data-product=deck]');
  await pg.waitForSelector('#snap-form');
  ok(await pg.isChecked('input[value=deck]') && await pg.isVisible('#f-address'), base + 'Brand Deck Buy -> form with address field');
  await fillBase(pg); await pg.fill('#f-address', '1 Example Street, Cairo'); await pg.click('#snap-submit'); await done(pg);
  ok(hits.length === 2 && hits[1].product === 'crier_deck' && hits[1].business === 'Test Cafe [Brand Deck]' && hits[1].address === '1 Example Street, Cairo', base + 'deck payload: ' + JSON.stringify(hits[1]));
}
// the Brand Deck page CTA opens the form with product=deck
{
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE + '/brand-deck/'); await pg.click('.phead a[data-product=deck]');
  await pg.waitForSelector('#snap-form');
  ok(pg.url().includes('/kit/?product=deck') && await pg.isChecked('input[value=deck]'), 'Brand Deck CTA -> /kit/?product=deck');
}
// old URLs
for (const [from, to] of [['/?lang=es', '/es/'], ['/?lang=ar', '/ar/'], ['/?lang=fr', '/fr/'], ['/terms.html', '/terms/'], ['/privacy.html?lang=fr', '/fr/privacy/'], ['/refund.html?lang=ar', '/ar/refund/'],
  ['/snapshot/', '/kit/'], ['/es/snapshot/', '/es/kit/'], ['/ar/crier-deck/', '/ar/brand-deck/'], ['/fr/crier-deck/', '/fr/brand-deck/']]) {
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE + from); await pg.waitForFunction((t) => location.pathname === t, to, { timeout: 5000 }).catch(() => {});
  ok(new URL(pg.url()).pathname === to, `old URL ${from} -> ${to}`);
}
// old links with old product ids still land on the right package
for (const [from, want] of [['/snapshot/?product=growth#request', 'growing'], ['/es/snapshot/?product=starter', 'visible'], ['/ar/snapshot/?product=deck_print', 'deck'], ['/fr/snapshot/', 'kit']]) {
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE + from); await pg.waitForSelector('#snap-form');
  ok(new URL(pg.url()).pathname.endsWith('/kit/') && await pg.isChecked(`input[value=${want}]`), `old link ${from} -> kit form with ${want}`);
}
await b.close(); process.exit(fail ? 1 : 0);
