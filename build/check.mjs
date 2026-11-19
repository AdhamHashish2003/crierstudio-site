// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'ar'];
const REMOVED = ['es', 'fr']; // removed languages redirect to the English pages (/en/)
const PREFIX = (l) => l === 'ar' ? '' : l + '/'; // Arabic first (2026-11-15): Arabic (the default) at the root, English under /en/
// 2026-11-15 (owner: "anything that is not in the header remove"): the site is the home page, /social/, /pricing/ and the legal pages.
// In-store, Samples, FAQ, About and Brand Deck are parked (built into _parked/, their URLs redirect home).
const PAGES = ['', 'pricing/', 'social/', 'terms/', 'privacy/', 'refund/'];
const GONE = ['in-store/', 'samples/', 'faq/', 'about/', 'brand-deck/'];
// old URLs: redirect stubs, not in the sitemap (a target may carry a #hash; '' is the home page). Since 2026-11-14 the parked
// pages (sculptures, fiberglass, branddeck: outside the offer, kept in _parked/) are stubs too.
const MOVED = { 'kit/': 'social/', 'physical/': '', 'snapshot/': 'social/', 'crier-deck/': '', 'sculptures/': '', 'fiberglass/': '', 'branddeck/': 'pricing/', 'in-store/': '', 'samples/': '', 'faq/': '', 'about/': '', 'brand-deck/': '' };
const SKIP_DIRS = ['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'fonts', 'assets', 'design', '_parked'];
const PRODUCTS = ['seen', 'visible', 'growing', 'diamond', 'deck'];
const SOCIAL = ['seen', 'visible', 'growing', 'diamond']; // the Social packages on sale, tier order (owner 2026-11-15)
// Audit fixes (2026-10-19): every buy / plan / start button opens the client portal's sign-up (AR pages with ?lang=ar)
// (2026-11-14: the portal reads ?lang=en|ar and nothing about a package, so every language passes its own lang)
const SIGNUP = (l, plan) => `https://portal.crierstudio.com/#/signup?${plan ? `plan=${plan}&` : ''}lang=${l}`;
const PORTAL_HOME = (l) => `https://portal.crierstudio.com/?lang=${l}`;
const WA = String(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'contact.json'), 'utf8')).whatsapp || '').replace(/[\s+()-]/g, '');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const d = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(rd(`i18n/${l}.json`))]));
// One price list (U1, 2026-10-05): prices and counts come from data/pricing.json (written by the UMA repo's
// portal/scripts/publish-pricing.cjs from portal/lib/pricing.json). The texts carry placeholders, never a price.
const PRICING = JSON.parse(rd('data/pricing.json'));
ok(/^portal\/lib\/pricing\.json sha256 [0-9a-f]{64}$/.test(PRICING.generated_from || ''), 'data/pricing.json was not written by publish-pricing.cjs');
// Country prices (owner 2026-11-15): FOUR monthly packages, Bronze / Silver / Gold / Diamond (ids seen / visible / growing /
// diamond), Egypt EGP 2,500 / 3,500 / 5,000 / 6,500. No list price, nothing struck through. Pinned here so a republish of
// data/pricing.json that drifts from the decision fails the build. S05 (audit 3, 2026-11-17): this public repository pins and
// shows only the prices of the countries served; the studio's prices for other markets live in its private price list.
// owner 2026-11-19: the USA, Saudi Arabia and the UAE, each in its own currency (pinned only while that country is served)
const LAUNCH = { seen: { EGP: 2500, USD: 250, SAR: 950, AED: 950 }, visible: { EGP: 3500, USD: 500, SAR: 1900, AED: 1850 }, growing: { EGP: 5000, USD: 750, SAR: 2800, AED: 2750 }, diamond: { EGP: 6500, USD: 1000, SAR: 3750, AED: 3700 } };
const NAMES = { seen: ['Bronze', 'البرونزية'], visible: ['Silver', 'الفضية'], growing: ['Gold', 'الذهبية'], diamond: ['Diamond', 'الماسية'] };
// the prices before 2026-11-15 that no package has any more: a page or a text that still shows one is stale (EGP 7,500 was Gold)
const CURRENT = new Set(Object.values(LAUNCH).flatMap((w) => Object.entries(w).map(([c, n]) => c + n)));
const STALE = { EGP: [5000, 7500] }; // the old Silver and Gold prices
const STALE_NOW = Object.entries(STALE).flatMap(([c, ns]) => ns.filter((n) => !CURRENT.has(c + n)).map((n) => [c, n]));
// the currencies shown besides US dollars (data-sar, data-aed, data-egp); the USA is a country in USD, so USD is not repeated
// One country served (owner 2026-11-15, temporary: data/pricing.json funnel.countries, Egypt only): no picker, the pages written in
// that country's currency, Offers and areaServed only there. The other countries' prices stay in data/pricing.json (pinned above).
const SERVED = (Array.isArray(PRICING.funnel?.countries) ? PRICING.funnel.countries : []).filter((c) => c in PRICING.local.countries);
// S05 (audit 3): the public data/pricing.json (schema crier-public-pricing/1) holds only the served countries
const PUBLIC = PRICING.schema === 'crier-public-pricing/1';
const ONLY = SERVED.length && (PUBLIC || SERVED.length < Object.keys(PRICING.local.countries).length) ? SERVED : null;
// several countries served (owner 2026-11-19: EG, US, SA, AE): every price carries every served currency, the texts and WhatsApp
// links carry each country's own version (data-cv-*), no picker, cur-data falls back to the first country (Egypt)
const MULTI = !!ONLY && ONLY.length > 1;
const OFFER_CC = ONLY ? Object.fromEntries(Object.entries(PRICING.local.countries).filter(([cc]) => ONLY.includes(cc))) : PRICING.local.countries;
const DEF_CC = ONLY ? ONLY[0] : 'SA', DEF_CUR = PRICING.local.countries[DEF_CC].currency;
const LOCAL_CURS = [...new Set(Object.values(PRICING.local.countries).map((c) => c.currency))].filter((c) => c !== 'USD');
const HAS_USD = !PUBLIC || Object.values(PRICING.local.countries).some((c) => c.currency === 'USD'); // the public file has US dollars only when the USA is served
ok(PUBLIC ? JSON.stringify(Object.keys(PRICING.local.countries)) === JSON.stringify(SERVED) && LOCAL_CURS.every((c) => ['SAR', 'AED', 'EGP'].includes(c)) : JSON.stringify(LOCAL_CURS) === JSON.stringify(['SAR', 'AED', 'EGP']) && PRICING.local.fallback.currency === 'USD' && PRICING.local.countries.US?.currency === 'USD' && PRICING.local.countries.US.vat_pct === 0, 'local currencies are SAR, AED, EGP; the USA and the fallback are US dollars with no VAT');
ok(JSON.stringify(PRICING.packages.map((p) => p.id)) === JSON.stringify([...SOCIAL, 'deck']), 'packages are seen, visible, growing, diamond and the coming-soon deck (no Social Kit)');
// the four packages have the same items (only the counts differ): posts, a story with every post, reels, the calendar, revision
// rounds, publishing and branding; every one includes all three platforms (owner 2026-11-15)
for (const id of SOCIAL) { const p = PRICING.packages.find((x) => x.id === id); ok(p && p.platforms_included === 3 && p.items.stories === p.items.posts && p.items.publishing === 1 && p.items.branding === 1 && p.items.calendar === 1 && !('campaign_concepts' in p.items) && !('ad_copies' in p.items) && !('competitor_update' in p.items), `${id}: all three platforms, a story with every post, publishing and branding, no campaign / ad copy / competitor update`); }
ok(STALE_NOW.length === 1 && STALE_NOW.some(([c, n]) => c === 'EGP' && n === 7500), 'the old Gold price EGP 7,500 is stale');
for (const [id, want] of Object.entries(LAUNCH)) {
  const p = PRICING.packages.find((x) => x.id === id);
  ok(p && !p.coming_soon && p.billing === 'monthly' && (!HAS_USD || ((p.price ?? p.prices.USD) === want.USD && p.prices.USD === want.USD)) && !('list_price' in p) && !('list_prices' in p), `$${want.USD} a month, no list price (${id})`);
  for (const c of LOCAL_CURS) ok(p && p.prices[c] === want[c], `${c} ${want[c]} a month (${id})`);
  ok(d.en['name.' + id] === NAMES[id][0] && d.ar['name.' + id] === NAMES[id][1], `name of ${id} is ${NAMES[id].join(' / ')}`);
}
for (const p of PRICING.packages) {
  if (HAS_USD) ok(Number.isInteger(p.price ?? p.prices?.USD) && (p.price ?? p.prices.USD) > 0, `US-dollar price (${p.id})`);
  for (const c of LOCAL_CURS) ok(Number.isInteger(p.prices[c]) && p.prices[c] > 0, `${c} price (${p.id})`);
}
// S05 + O02 (audit 3): data/pricing.json is the public allowlist written by uma portal/scripts/publish-pricing.cjs: only these fields
// may appear (a field the studio adds to its private price list never reaches this public repository by default), and
// projection_sha256 must be the sha256 of the rest, so a hand edit or a stale partial copy fails here
{
  const ALLOW = { top: ['schema', 'generated_from', 'funnel', 'local', 'platforms', 'rules', 'packages', 'projection_sha256'], funnel: ['countries'], local: ['countries'], country: ['currency', 'vat_pct'], rules: ['first_month_includes_kit'],
    pkg: ['id', 'tier', 'name', 'name_ar', 'billing', 'coming_soon', 'retired', 'platforms_included', 'items', 'prices', 'extra_platform_prices'],
    items: ['posts', 'stories', 'described_reels', 'calendar', 'revision_rounds', 'publishing', 'branding', 'deck_screen_pdf', 'deck_print_pdf', 'products'] };
  const extra = (o, allowed, where) => Object.keys(o || {}).filter((k) => !allowed.includes(k)).map((k) => where + '.' + k);
  const bad = [...extra(PRICING, ALLOW.top, 'pricing'), ...extra(PRICING.funnel, ALLOW.funnel, 'funnel'), ...extra(PRICING.local, ALLOW.local, 'local'), ...extra(PRICING.rules, ALLOW.rules, 'rules'),
    ...Object.entries(PRICING.local?.countries || {}).flatMap(([cc, c]) => extra(c, ALLOW.country, 'local.countries.' + cc)),
    ...(PRICING.packages || []).flatMap((p) => [...extra(p, ALLOW.pkg, 'packages.' + p.id), ...extra(p.items, ALLOW.items, `packages.${p.id}.items`),
      ...['prices', 'extra_platform_prices'].flatMap((k) => extra(p[k], LOCAL_CURS.concat(HAS_USD ? ['USD'] : []), `packages.${p.id}.${k}`))])];
  ok(PUBLIC, 'data/pricing.json is the public projection (schema crier-public-pricing/1): run uma portal/scripts/publish-pricing.cjs --site <this repo>');
  ok(bad.length === 0, 'data/pricing.json carries fields outside the public allowlist: ' + bad.join(', '));
  ok(!(PRICING.funnel?.countries || []).some((cc) => !(cc in (PRICING.local?.countries || {}))) && Object.keys(PRICING.local?.countries || {}).every((cc) => SERVED.includes(cc)), 'data/pricing.json lists exactly the served countries');
  const canonical = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
  const { projection_sha256: claimed, ...rest } = PRICING;
  ok(/^[0-9a-f]{64}$/.test(claimed || '') && crypto.createHash('sha256').update(canonical(rest)).digest('hex') === claimed, 'data/pricing.json projection_sha256 does not match its content (edited by hand?): republish it with publish-pricing.cjs');
}
const PRICE_NUMS = [...new Set([...PRICING.packages.flatMap((p) => [p.price, p.extra_platform_price, ...Object.values(p.prices || {})].filter(Boolean)), ...Object.values(LAUNCH).flatMap((w) => Object.values(w))])].flatMap((n) => [n, n.toLocaleString('en-US')]); // (S05: every shown price, with and without its comma)
const PRICE_RE = new RegExp('(?:\\$|EGP|ج\\.م)\\s?(' + PRICE_NUMS.join('|') + ')(?![\\d,])|(?<![\\d.,])(' + PRICE_NUMS.join('|') + ')\\s?(?:\\$|EGP|ج\\.م|جنيه)');
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(!PRICE_RE.test(v), `a price is written into i18n ${l}:${k} (use {price:<id>})`);
for (const f of fs.readdirSync(path.join(ROOT, 'templates'))) ok(!PRICE_RE.test(rd('templates/' + f)), `a price is written into templates/${f}`);
const en = Object.keys(d.en).sort();
for (const l of LANGS.slice(1)) { const k = Object.keys(d[l]).sort(); ok(JSON.stringify(k) === JSON.stringify(en), `i18n key set differs in ${l}: ${k.filter((x) => !en.includes(x)).concat(en.filter((x) => !k.includes(x))).join(',')}`); }
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(typeof v === 'string' && v.trim() !== '', `empty ${l}:${k}`);
const SC_NAV = [];
const urls = [], hiddenUrls = [];
for (const l of LANGS) for (const p of PAGES) {
  const rel = PREFIX(l) + p, file = rel + 'index.html', u = 'https://crierstudio.com/' + rel;
  urls.push(u);
  ok(fs.existsSync(path.join(ROOT, file)), 'missing ' + file); if (!fs.existsSync(path.join(ROOT, file))) continue;
  const h = rd(file);
  ok(h.includes(`<link rel="canonical" href="${u}">`), `canonical ${file}`);
  ok(h.includes(`<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">`), `html lang/dir ${file}`);
  ok((h.match(/<link rel="alternate" hreflang="/g) || []).length === LANGS.length + 1, `hreflang ${file}`); // each language + x-default
  ok(/<title>[^<]{8,}<\/title>/.test(h) && /<meta name="description" content="[^"]{40,}">/.test(h), `title/description ${file}`);
  const headerNav = (h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [''])[0];
  // The header is Social · Sculptures · Pricing · Client portal; In-store stays in the footer.
  // (Sculptures only while SHOW_SCULPTURES is true in build/build.mjs; hidden, no page links to it)
  const HEAD_NAV = ['social/', ...SC_NAV, 'pricing/'];
  for (const nav of HEAD_NAV) ok(headerNav.includes(`href="/${PREFIX(l) + nav}"`), `nav link ${nav} in ${file}`);
  ok(!headerNav.includes(`href="/${PREFIX(l)}in-store/"`), `no In-store header tab in ${file}`);
  { const order = HEAD_NAV.map((n) => headerNav.indexOf(`href="/${PREFIX(l) + n}"`)); ok(order.every((x, i) => i === 0 || x > order[i - 1]) && order[order.length - 1] < headerNav.indexOf(`href="${PORTAL_HOME(l)}"`), `header nav order ${HEAD_NAV.join(', ')}, Client portal in ${file}`); }
  ok((headerNav.match(/aria-current="page"/g) || []).length === (HEAD_NAV.includes(p) ? 1 : 0), `header nav active state in ${file}`);
  ok(!/href="\/(?:ar\/)?(?:sculptures|fiberglass|branddeck)\//.test(h), `link to a parked page in ${file}`);
  for (const nav of ['samples/', 'faq/', 'about/']) ok(!headerNav.includes(`href="/${PREFIX(l) + nav}"`), `no header nav link ${nav} in ${file}`);
  ok(headerNav.includes(`href="${PORTAL_HOME(l)}"`), `portal link with ?lang=${l} in ${file}`);
  // the footer keeps every destination (About and Brand Deck moved there from the header)
  const footNav = (h.match(/<footer>[\s\S]*?<\/footer>/) || [''])[0];
  // 2026-11-15 (owner): the footer lists only what the header lists (Social, Pricing, Your account), and no page links to a removed one
  for (const nav of ['social/', 'pricing/']) ok(footNav.includes(`href="/${PREFIX(l) + nav}"`), `footer link ${nav} in ${file}`);
  ok(footNav.includes(`href="${PORTAL_HOME(l)}"`), `footer link to the client portal in ${file}`);
  for (const nav of GONE) ok(!new RegExp(`href="/(?:en/|ar/)?${nav}`).test(h), `a link to the removed page /${nav} in ${file}`);
  // the social line's old name is gone everywhere (EN and AR)
  ok(!/Complete Kit|complete kit|الحزمة الكاملة/.test(h), `old name "Complete Kit" in ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  // no free offers anywhere: the word free (and its ar form) must not appear in visible text
  const vis = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  // the floating WhatsApp button (2026-11-15): once on every page, a label in the page language, the greeting prefilled
  if (WA) {
    const fab = (h.match(/<a class="wa-fab"[^>]*>/g) || []);
    ok(fab.length === 1 && fab[0].includes(`href="https://wa.me/${WA}?text=${encodeURIComponent(d[l]['wa.fab.msg'].replace('{brand}', 'Crier Studio'))}"`) && fab[0].includes(`aria-label="${esc(d[l]['wa.fab.aria'])}"`), `one floating WhatsApp button with its ${l} label and greeting on ${file}`);
  }
  // (one exception, Adham 2026-10-18: "Create a free account and tell us what you need" / the FAQ answer: a client portal account, not an offer)
  ok(!/\bfree\b|مجان|بدون مقابل/i.test(vis.replace(/\bfree account\b|حسابًا مجانيًا/gi, '')), `free wording in ${file}`);
  ok(!/Your shop, heard/i.test(h), `tagline in ${file}`);
  // the HTML is written in the default country's currency (Saudi Arabia, SAR before VAT); every price carries its US-dollar
  // and local prices in data-* for site.js
  // every price span carries the US-dollar price and each local NET price (data-usd, data-sar, data-aed, data-egp), the exact
  // numbers data/pricing.json has, so site.js shows the buyer's currency without converting anything
  // One country served (N35, audit 2): each price is written once in that country's currency and carries no data-* (and the page has
  // no #cur-data), so the page source holds no dormant currency. With several countries every price carries them all.
  const dataAttrs = (usd, loc) => (ONLY && !MULTI ? '' : ` data-usd="${usd}"` + LOCAL_CURS.map((c) => ` data-${c.toLowerCase()}="${loc[c]}"`).join(''));
  const shown = (pk) => d[l]['cur.fmt'].replace('{cur}', d[l]['cur.sym' + DEF_CUR]).replace('{n}', pk.prices[DEF_CUR].toLocaleString('en-US'));
  if (p === 'pricing/') for (const pk of PRICING.packages.filter((x) => !x.coming_soon)) { // the coming-soon Brand Deck left the pricing page (2026-11-15)
    ok(ONLY ? h.includes(`>${shown(pk)}<`) : h.includes(dataAttrs(pk.price ?? pk.prices.USD, pk.prices)), `price ${ONLY ? pk.prices[DEF_CUR] + ' ' + DEF_CUR : pk.price + ' USD / ' + LOCAL_CURS.map((c) => pk.prices[c] + ' ' + c).join(' / ')} (${pk.id}, data/pricing.json) on ${file}`);
    if (!pk.coming_soon) ok(new RegExp(`class="price amt" dir="(ltr|rtl)"${dataAttrs(pk.price ?? pk.prices.USD, pk.prices)}>${ONLY ? shown(pk).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<' : ''}`).test(h) && !h.includes('class="price-list'), `price ${ONLY ? shown(pk) : pk.price + ' USD'}, nothing struck through (${pk.id}) on ${file}`);
    if (pk.extra_platform_price) ok(h.includes(`data-extra="${pk.extra_platform_price}"`), `extra platform ${pk.extra_platform_price} USD (${pk.id}) on ${file}`);
  }
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === SOCIAL.length && !/data-unavailable="deck"|Brand Deck/.test(h), `${SOCIAL.length} buy buttons and no Brand Deck on ${file}`);
  // the pricing page follows the visitor's country like the home page (2026-11-13: the US-dollar price is the USA's own price)
  if (p === 'pricing/' && !ONLY) ok(h.includes('id="cur-select"') && /id="cur-data"/.test(h) && h.includes('<option value="US"'), `country picker (with the USA) and currency data on ${file}`);
  // one country served: no country picker anywhere, the currency data locked to it, no US-dollar or other currency in the text
  if (ONLY) {
    ok(!h.includes('id="cur-select"') && !/<select[^>]*data-cc/.test(h), `no country picker on ${file}`);
    if (/id="cur-data"/.test(h)) ok(MULTI ? h.includes(`"fallback":"${DEF_CC}"`) && !h.includes('"lock"') : h.includes(`"lock":"${DEF_CC}"`), `currency data ${MULTI ? 'falling back' : 'locked'} to ${DEF_CC} on ${file}`);
    const others = ['USD', 'SAR', 'AED', 'EGP'].filter((c) => c !== DEF_CUR); // (S05: every currency the studio prices in, not only those in the public file)
    // (MULTI: the legal pages state each served country's prices on purpose, terms.offer.p3.all)
    for (const c of others) if (!(MULTI && /^(terms|privacy|refund)\/$/.test(p))) ok(!vis.includes(d[l]['cur.sym' + c] ? d[l]['cur.fmt'].replace('{cur}', d[l]['cur.sym' + c]).replace('{n}', '').trim() : c + ' ') && !(c === 'USD' && /\$\s?\d/.test(vis)), `a ${c} price in the text of ${file}`);
    for (const m of h.matchAll(/class="(?:price )?amt" dir="(?:ltr|rtl)"[^>]*>([^<]*)</g)) ok(m[1].includes(d[l]['cur.sym' + DEF_CUR]), `price "${m[1]}" is not in ${DEF_CUR} on ${file}`);
  }
  // Home: Landing A (Adham, 2026-11-06; walkthrough kept 2026-11-07; In-store section removed 2026-11-06): hero (SAHM's real
  // Instagram posts), The Social Kit in numbers, the client-portal walkthrough, the OK rule, the package table, a closing call. No FAQ.
  // The new landing pages (2026-11-15): the home page (hero with the animated example phone, How it works as a video with five steps,
  // what you get, the four package cards, our promises, a short FAQ, a WhatsApp close) and /social/ (offer-first hero, what is
  // included, the four cards, how it works on WhatsApp, examples, FAQ, close). Both say their examples are made up.
  if (p === '' || p === 'social/') {
    const IDS = p === '' ? ['hero', 'walkthrough', 'make', 'pricing', 'trust', 'faq', 'start'] : ['included', 'packages', 'how', 'examples', 'faq', 'start'];
    const at = IDS.map((id) => h.indexOf(`id="${id}"`));
    ok(at.every((x, i) => x > -1 && (i === 0 || x > at[i - 1])), `landing sections ${IDS.join(', ')} in order on ${file}`);
    ok((h.match(/<article class="plan[^"]*" data-plan="/g) || []).length === SOCIAL.length && (ONLY && !MULTI ? !/id="cur-data"/.test(h) : /id="cur-data"/.test(h)), `the four package cards${ONLY && !MULTI ? ', no currency data for other countries,' : ' with their currency data'} on ${file}`);
    const where = p === '' ? ['home_hero', 'home_close'] : ['social_hero', 'social_close'];
    for (const w of where) ok(new RegExp(`<a class="btn wa-order" href="https://wa\\.me/${WA}\\?text=[^"]+" target="_blank" rel="noopener" data-wa="${w}">${esc(d[l]['lp.cta'])}</a>`).test(h), `"${d[l]['lp.cta']}" WhatsApp button (${w}) on ${file}`);
    ok(h.includes('"@type":"FAQPage"') && (h.match(/<details>/g) || []).length >= 5, `a short FAQ with FAQPage data on ${file}`);
    ok(vis.includes(d[l][p === '' ? 'hv.exnote' : 'lp.ex.note']), `the examples are labelled as made up on ${file}`);
    ok(!/portal\.crierstudio\.com\/#\/signup\?lang/.test((h.match(/<section[^>]*(?:id="hero"|class="sp-hero")[\s\S]*?<\/section>/) || [''])[0]), `the hero's main button is WhatsApp, not the sign-up, on ${file}`);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) ok(/ width="\d+" height="\d+"/.test(m[0]) && / alt="/.test(m[0]), `img size/alt on ${file}: ${m[0].slice(0, 80)}`);
    if (p === '') {
      ok(/<video\b[^>]*\bmuted\b[^>]*>/.test(h) && /playsinline/.test(h) && !/<video\b[^>]*\bautoplay\b/.test(h) && /src="\/assets\/video\/how-(ar|en)-1080-poster\.jpg"/.test(h), `the How it works video is muted, inline, has a poster and is started by the script (no autoplay attribute) on ${file}`);
      ok(/<script src="\/assets\/h\/landing\.[0-9a-f]{10}\.js" defer><\/script>/.test(h) && !h.includes('id="dash"'), `landing script (hashed, from 'self'), no old dashboard, on ${file}`);
    }
  }
  if (p === 'pricing/') {
    // The Store Kit card was removed from pricing (owner request, 2026-11-06); the waitlist stays on /in-store/
    ok(!/store-card|soon-price|data-plan="store"|plans four/.test(h), `no Store Kit card on ${file}`);
    ok(![d.en['name.store'], d[l]['name.store']].some((n) => h.includes(n)), `no Store Kit name (visible, meta, JSON-LD) on ${file}`);
  }
  if (p === 'in-store/') {
    ok(!/data-usd|data-product|"@type":"Offer"/.test(h), `no price, buy button or offer on ${file}`);
    for (const id of ['id="kit"', 'id="waitlist"', 'id="custom"', 'id="wl-form"', 'data-form="store_waitlist"']) ok(h.includes(id), `${id} on ${file}`);
    // one form (the waitlist); Custom pieces quotes are asked in the client portal: sign-up and sign-in links with the page language
    ok((h.match(/<form\b/g) || []).length === 1 && !h.includes('id="q-form"') && !h.includes('custom_quote'), `only the waitlist form on ${file}`);
    // 2026-11-15 (owner): the portal quote sign-up is removed; both links open WhatsApp with "I'd like a quote for a custom piece"
    const quoteWa = `https://wa.me/${WA}?text=${encodeURIComponent(d[l]['is.q.wamsg'].replace('{brand}', 'Crier Studio'))}`;
    ok(h.includes(`id="quote-btn" href="${quoteWa}"`), `quote button -> WhatsApp with the quote message (${l}) on ${file}`);
    ok(h.includes(`id="quote-login" href="${quoteWa}"`), `"Already a client?" -> WhatsApp with the quote message (${l}) on ${file}`);
    ok(!/portal\.crierstudio\.com\/#\/(signup|login)\?intent=quote/.test(h), `no portal quote sign-up link on ${file}`);
    ok((h.match(/id="lead-msgs"/g) || []).length === 1, `waitlist messages on ${file}`);
    ok(!/mailto:/.test(h.replace(/<noscript>[\s\S]*?<\/noscript>/g, '').replace(/<footer>[\s\S]*?<\/footer>/, '')), `no mailto outside noscript/footer on ${file}`);
    // In-store v3, Direction A (Adham, 2026-10-18): twice, the Store Kit status pill and the COMING SOON banner.
    ok((vis.match(/coming soon|قريب/gi) || []).length === 2,`"coming soon" exactly twice (status pill + banner) on ${file}`);
    ok(!/<h1[^>]*>[^<]*(coming soon|قريبًا)/i.test(h), `no "coming soon" in the H1 of ${file}`);
    // The Store Kit is a concept (Adham 2026-10-18): no [bracket] placeholders (bundle quantities) and no launch price,
    // launch date or delivery promise; Custom pieces promise no quote, price or reply time
    ok(!/\[[^\]]*\]/.test(vis), `a [bracket] placeholder in the visible text of ${file}`);
    ok(!/launch price|price announced|سعر الإطلاق|نعلن السعر|to your door|we deliver|delivered to|إلى بابك|تصلك|نوصل|quoted per|business days?|أيام عمل/i.test(vis), `a launch-price, delivery, quote or reply-time promise on ${file}`);
  }
  // Sculptures (2026-10-18): concept renders said once in plain words, no price, lead time or quantity, no [bracket] placeholder
  // anywhere in the file (data-* included), every quote link -> the same portal sign-up as In-store's "Request a quote"
  if (p === 'sculptures/') {
    ok(!/\[[A-Z][A-Z _-]+\]/.test(h) && !/\[[^\]]*\]/.test(vis), `a [bracket] placeholder in ${file}`);
    const main = (h.match(/<main[\s\S]*?<\/main>/) || [''])[0];
    ok(!/data-usd|data-product|"@type":"Offer"|"offers"/.test(h) && !/price|lead time|MOQ|minimum order|السعر|أسعار|مدة التنفيذ|الحد الأدنى/i.test(main.replace(/<[^>]+>/g, ' ') + ' ' + (main.match(/<li class="sc-card"[^>]*>/g) || []).join(' ')), `no price, lead time or minimum order on ${file}`);
    ok(vis.includes(d[l]['sc.renders']), `"concept renders" line on ${file}`);
    ok((h.match(/<li class="sc-card"/g) || []).length === JSON.parse(rd('data/sculptures.json')).items.length, `every catalog piece on ${file}`);
    const quotes = [...h.matchAll(/<a class="btn"[^>]* href="(https:\/\/portal[^"]*)"/g)].map((m) => m[1]);
    ok(quotes.length === 3 && quotes.every((u) => u === `https://portal.crierstudio.com/#/signup?intent=quote&amp;lang=${l}`), `quote buttons -> portal sign-up (lang=${l}) on ${file}`);
    ok(/<script src="\/assets\/h\/sculptures\.[0-9a-f]{10}\.js" defer><\/script>/.test(h), `sculptures script (hashed, from 'self') on ${file}`);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) ok(/ width="\d+" height="\d+"/.test(m[0]) && / alt="[^"]+"/.test(m[0]) || m[0].includes('id="sc-lb-img"'), `img size/alt on ${file}: ${m[0].slice(0, 80)}`);
    for (const m of h.matchAll(/src="(\/assets\/sculptures\/[^"]+)"/g)) ok(fs.existsSync(path.join(ROOT, m[1])), `missing image ${m[1]} in ${file}`);
    ok(/src="\/assets\/sculptures\/concept-example\.webp"/.test(h), `example concept image on ${file}`);
  }
  // Audit fixes (2026-10-19): the public order form is gone everywhere (no #snap-form, its script data or consent hooks), and
  // prices and package names appear only on /pricing/ and the legal pages (terms, privacy, refund). In-store keeps its own
  // Store Kit waitlist name. Checked in the visible text, the meta tags and the JSON-LD.
  ok(!/id="snap-|id="form-msgs"|id="request"|f-consent|__snapPayload/.test(h), `the public order form (#snap-form) is gone from ${file}`);
  // (Landing A, 2026-11-06: the home page shows the package table again, so it is allowed prices and package names too)
  if (!['', 'pricing/', 'terms/', 'privacy/', 'refund/', 'social/'].includes(p)) {
    const ld = (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0], meta = (h.match(/<meta[^>]+>|<title>[^<]*<\/title>/g) || []).join(' ');
    const syms = ['SAR', 'AED', 'EGP'].map((c) => d[l]['cur.sym' + c].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const priceRe = new RegExp(`data-usd|class="(price )?amt"|"offers"|"price":|\\$\\s?\\d|(${syms.join('|')})\\s?\\d|\\d\\s?(${syms.join('|')})`);
    ok(!priceRe.test(vis + ' ' + ld + ' ' + meta) && !/data-usd|id="cur-data"/.test(h), `a price on ${file} (prices are on /pricing/ only)`);
    const store = p === 'in-store/' ? [] : ['name.store'];
    const names = ['name.seen', 'name.visible', 'name.growing', 'name.diamond', ...store].flatMap((k) => [d.en[k], d[l][k]]).concat('Social Kit', store.length ? ['Store Kit'] : []);
    for (const n of new Set(names)) ok(!(vis + ' ' + ld + ' ' + meta).includes(n), `package name "${n}" on ${file} (package names are on /pricing/ only)`);
  }
  // no [bracket] placeholders in the visible text of the home, pricing and FAQ pages either
  if (['', 'pricing/', 'faq/'].includes(p)) ok(!/\[[^\]]*\]/.test(vis), `a [bracket] placeholder in the visible text of ${file}`);
  // no Store Kit launch-price promise anywhere (Adham 2026-10-18)
  ok(!/launch price|سعر الإطلاق/i.test(vis), `a Store Kit launch-price promise on ${file}`);
  // no "snapshot" in visible text, meta or JSON-LD (Adham 2026-10-18); URLs and attributes such as the
  // /api/public/snapshot-request endpoint are not visible text and may keep the word
  ok(!/snapshot|سنابشوت|سناب شوت/i.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0].replace(/"(url|@id)":"[^"]*"/g, '') + ' ' + (h.match(/<meta (name|property)="[^"]+" content="[^"]*">/g) || []).filter((m) => !/content="https?:/.test(m)).join(' ')), `"snapshot" wording in ${file}`);
  // retired packages and prices must not come back (Snapshot, Starter/Growth/Pro, Crier Deck + Print Kit, old discounts)
  // since 2026-11-13 also The Social Kit, Stay Visible, Keep Growing and the launch discount
  for (const bad of [/\$(99|199|399|149|249|39)\b/, /Snapshot/, /Starter/, /Growth/, /\bPro\b/, /Print Kit/, /Crier Deck/, /Social Kit|حزمة السوشيال/, /Stay Visible|Keep Growing|حضور دائم|نمو مستمر/, /launch discount|خصم الافتتاح/i]) ok(!bad.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0] + ' ' + (h.match(/<meta[^>]+>/g) || []).join(' ')), `retired wording ${bad} in ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === (/const NOINDEX = true/.test(rd('build/build.mjs')) || (p === 'sculptures/' && !SHOW_SC)), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
{
  const h = rd('404.html'), vis = h.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!/snapshot|سنابشوت|سناب شوت/i.test(vis), '"snapshot" wording in 404.html');
  const headerNav = (h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [''])[0];
  ok(!headerNav.includes('href="/in-store/"'), 'no In-store header tab in 404.html');
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
for (const u of hiddenUrls) ok(!sm.includes(u), 'hidden page in sitemap ' + u);
// parked pages (2026-11-14): the source stays in _parked/ (never published); the public URLs are redirect stubs (MOVED below)
for (const f of ['_parked/fiberglass/index.html', '_parked/branddeck/index.html', '_parked/ar/branddeck/index.html', '_parked/sculptures/index.html', '_parked/ar/sculptures/index.html', '_parked/studio-deck/index.html', '_parked/social-preview.html'])
  ok(fs.existsSync(path.join(ROOT, f)), `parked source kept: ${f}`);
for (const f of ['assets/studio-deck/index.html', 'assets/social-preview.html']) { const h = rd(f); ok(h.includes('data-page="redirect"') && h.includes('data-target="index"') && h.includes('content="noindex"'), `${f} is a redirect stub to the home page`); }
for (const m of ['fiberglass', 'branddeck', 'sculptures', 'studio-deck', 'social-preview']) ok(!sm.includes(m), `parked page ${m} in the sitemap`);
for (const g of GONE) for (const pre of ['', 'en/']) ok(rd(pre + g + 'index.html').includes('data-page="redirect"') && fs.existsSync(path.join(ROOT, '_parked', pre + g, 'index.html')), `/${pre}${g} is a redirect stub and its page is kept in _parked/`);
ok(rd('social/index.html').includes('"@type":"Service"') && !rd('social/index.html').includes('"offers"'), 'Social Service JSON-LD is informational, without offers');
// the pricing page's structured data carries each available package's US-dollar sale price (the international price)
for (const pr of [...Object.values(LAUNCH).map((w) => `"price":"${w[ONLY ? DEF_CUR : 'USD']}"`), '"unitCode":"MON"']) ok(rd('pricing/index.html').includes(pr), 'pricing JSON-LD ' + pr);
// renamed pages: every old URL is a noindex redirect stub to the new page in the same language
for (const l of LANGS) for (const [from, to] of Object.entries(MOVED)) {
  const pre = PREFIX(l), f = pre + from + 'index.html';
  ok(fs.existsSync(path.join(ROOT, f)), 'missing stub ' + f); if (!fs.existsSync(path.join(ROOT, f))) continue;
  const s = rd(f), [tp, th] = to.split('#');
  ok(s.includes('data-page="redirect"') && s.includes(`data-target="${tp ? tp.slice(0, -1) : 'index'}"`) && s.includes(`data-lang="${l}"`) && s.includes('content="noindex"') && s.includes(`url=/${pre}${to}"`)
    && s.includes(`<link rel="canonical" href="https://crierstudio.com/${pre}${tp}">`) && (th ? s.includes(`data-hash="${th}"`) : !s.includes('data-hash=')), 'stub ' + f);
  ok(!sm.includes(`/${pre}${from}<`), 'stub in sitemap ' + f);
}
ok(rd('pricing/index.html').includes('"@type":"ItemList"') && rd('pricing/index.html').includes(`"priceCurrency":"${ONLY ? DEF_CUR : 'USD'}"`), 'pricing JSON-LD');
if (ONLY && !MULTI) for (const l of LANGS) { const ld = (rd(PREFIX(l) + 'pricing/index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || ''; for (const c of ['USD', 'SAR', 'AED', 'EGP'].filter((c) => c !== DEF_CUR)) ok(!ld.includes(`"priceCurrency":"${c}"`), `pricing JSON-LD: no ${c} offer while only ${ONLY.join(', ')} is served (${l})`); }
// Owner 2026-11-15: the packages are subscribed to, not ordered ("we are not a delivery or food business"): «اشترك في البرونزية عبر واتساب»
// / "Subscribe to Bronze on WhatsApp". «اطلب» / "order" stays only where it means a request (a quote, the coming-soon Brand Deck).
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) if (!/^(is\.|sc\.|faq\.25|deck\.|faq\.1[1-6]|pkg\.deck|availability\.deck|meta\.d\.brand-deck|terms\.offer\.p2)/.test(k))
  ok(!/\bOrder (on WhatsApp|Bronze|Silver|Gold|Diamond|your package)|\border (a|the|your) (monthly )?package|اطلب (البرونزية|الفضية|الذهبية|الماسية|باقتك|عبر واتساب)|تطلب (ال)?باقة/i.test(v), `${l}:${k} says order / اطلب for a package (use subscribe / اشترك)`);
for (const id of SOCIAL) ok(d.en[`pkg.${id}.wa`] === `Subscribe to ${NAMES[id][0]} on WhatsApp` && d.ar[`pkg.${id}.wa`] === `اشترك في ${NAMES[id][1]} عبر واتساب`, `the ${id} button is "Subscribe to … on WhatsApp" / «اشترك في … عبر واتساب»`);
// Owner's answers (2026-11-16): "this is an online agency, no hours" and "no refunds". No text may promise working hours, a refund
// window or a refund as an outcome; the refund page states the no-refund policy. (sc.* is the parked sculptures catalogue.)
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) if (!/^sc\./.test(k)) {
  ok(!/working hours|business hours|ساعات العمل|أوقات العمل/i.test(v), `${l}:${k} promises working hours (the studio has none)`);
  ok(!/within \d+ days|\d+-day refund|refund window|money back|a fix or a refund|خلال \d+ أيام|مهلة الاسترداد|تعديل أو استرداد|رد المبلغ/i.test(v), `${l}:${k} promises a refund or a refund window (the policy is no refunds)`);
}
// Owner (2026-11-16): the privacy page names no language or image service and has no line about outside processing of the brief
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(!/language and image services|خدمات خارجية للنصوص والصور|خدمات النصوص والصور/i.test(v), `${l}:${k} mentions outside language and image services (removed by the owner)`);
ok(/do not give refunds/.test(d.en['refund.plan.p.eg']) && /لا نرد المبالغ المدفوعة/.test(d.ar['refund.plan.p.eg']), 'the refund page states the no-refund policy');
// Voice guide v3: no Egyptian dialect in any Arabic text of the site's own, the parked sculptures page included (N39, audit 2)
for (const [k, v] of Object.entries(d.ar)) ok(!/اللي|بتاع|مفيش|إحنا|عايز|دلوقتي|(^|\s)مش(\s|$)|قدّام|أوضة|حيطة|ترابيزة|احكيلنا|سيبنا|اتفرج|(^|\s)دي(\s|$)|كومنتات/.test(v), `ar:${k} has Egyptian dialect wording (the site's Arabic is simple formal Arabic)`);
// N31 (audit 2): every "Subscribe on WhatsApp" button on the home page and /social/ prefills the subscribe message, not the "know more" greeting
for (const l of LANGS) for (const pg of ['', 'social/']) for (const m of rd(PREFIX(l) + pg + 'index.html').matchAll(/<a class="btn wa-order" href="([^"]*)"[^>]*data-wa="(?:home|social)_[a-z]+"/g))
  ok(decodeURIComponent((m[1].split('?text=')[1] || '').replace(/&#39;/g, "'").replace(/&amp;/g, '&')) === d[l]['sp.wamsg'].replace('{brand}', 'Crier Studio'), `a Subscribe on WhatsApp button on /${PREFIX(l)}${pg} prefills the subscribe message (${decodeURIComponent(m[1].split('?text=')[1] || '').slice(0, 40)})`);
// Buy buttons (payment-links.json, always empty, was deleted on 2026-11-16): a package's "or create your account" link is the
// client portal's sign-up with its plan
{
  for (const k of PRODUCTS) {
    for (const l of LANGS) {
      const hh = rd(PREFIX(l) + 'pricing/index.html');
      const m = hh.match(new RegExp(`<a class="btn[^"]*" href="([^"]*)" data-product="${k}"`));
      if (k === 'deck') { ok(!m && !hh.includes('data-unavailable="deck"'), `no Brand Deck button on the pricing page (${l})`); continue; }
      const want = SIGNUP(l, k);
      // 2026-11-15: the main button is the WhatsApp order; the sign-up (or the payment link) is the "or create your account" link
      const acct = hh.match(new RegExp(`<a class="acct-link" href="([^"]*)" data-signup="${k}"`));
      ok(m && (/wa-order/.test(m[0]) ? acct && acct[1].replace(/&amp;/g, '&') === want : m[1].replace(/&amp;/g, '&') === want), `buy button ${k} (${l}) href`);
    }
  }
}
ok(rd('index.html').includes('"@type":"FAQPage"') && rd('social/index.html').includes('"@type":"FAQPage"'), 'FAQPage on the home page and /social/ (the FAQ page itself is parked)');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
// Google Analytics 4 + Consent Mode v2: every built HTML file (40 pages, 404, all redirect stubs) has the inline tag exactly once,
// early in <head>, with consent defaulting to denied before the config call, and gtag.js loaded only on the first interaction or 6 s after page load; ads signals are never granted; the CSP allows Google's hosts
// and every inline script by its sha256 hash (no 'unsafe-inline' for scripts).
{
  const GA = 'G-80D3L78R0G';
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) return SKIP_DIRS.includes(e.name) ? [] : walk(rel);
    return e.name.endsWith('.html') ? [rel] : [];
  });
  const files = walk('');
  ok(files.length === urls.length + 1 + 3 + PAGES.length + LANGS.length * Object.keys(MOVED).length + Object.keys(MOVED).length + REMOVED.length * (PAGES.length + Object.keys(MOVED).length), `GA: expected every built HTML file, found ${files.length}`);
  for (const f of files) {
    const h = rd(f), headEnd = h.indexOf('</head>');
    const nav = (h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [''])[0];
    ok(!nav.includes('href="/in-store/"') && !nav.includes('href="/en/in-store/"'), `no In-store tab in the main header of ${f}`);
    if (!h.includes('data-page="redirect"')) ok(!/href="\/(?:en\/|ar\/)?(?:fiberglass|branddeck|sculptures)\//.test(h), `no page links to a parked page in ${f}`);
    // delayed load (2026-10-11): no blocking/parsed gtag.js <script src> anywhere; the inline head script injects it on the first
    // interaction or 6 s after window load, or at once on a consent-bar / Cookie settings click
    ok(!/<script[^>]*\ssrc="[^"]*googletagmanager\.com/.test(h), `GA: no gtag.js <script src> in the HTML of ${f} (it is injected after load)`);
    const loader = `s.src='https://www.googletagmanager.com/gtag/js?id=${GA}';d.head.appendChild(s);`;
    ok(h.split(loader).length === 2 && h.indexOf(loader) < headEnd, `GA: exactly one delayed gtag.js loader inline in <head> of ${f}`);
    ok((h.match(/googletagmanager\.com\/gtag\/js/g) || []).length === 1, `GA: no second gtag.js loader in ${f}`);
    ok(h.includes("E=['pointerdown','touchstart','keydown','scroll','wheel']") && h.includes('function A(){for(var i=0;i<E.length;i++)w.addEventListener(E[i],L,O);') && h.includes('setTimeout(L,6000)'), `GA: with consent, the loader waits for the first interaction, or 6 s after window load, in ${f}`);
    // S02 (audit 3, owner 2026-11-17: opt-in): gtag.js is requested only with consent: the loader refuses while Google's off switch is set,
    // the switch is set unless crier_consent is 'granted', the delayed loader is armed only then, and Accept (the 'crier:consent' event) loads at once
    ok(h.includes("function L(){if(n||w[K])return;") && h.includes("K='ga-disable-") && h.includes("try{ok=localStorage.getItem('crier_consent')==='granted';}catch(e){}w[K]=!ok;") && h.includes("if(ok){gtag('consent','update',{analytics_storage:'granted'});A();}") && !h.includes("closest('#consent-bar"), `GA: opt-in: gtag.js only after Accept, never on a click of the bar or Decline, in ${f}`);
    ok(h.includes("d.addEventListener('crier:consent',function(e){if(e.detail==='granted'){") && h.includes("else{w[K]=true;if(n)location.reload();}});})();"), `GA: Accept loads it at once; Decline or withdrawal switches it off, in ${f}`);
    const inl = [...h.slice(0, headEnd).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => x.includes("gtag('consent','default'"));
    ok(inl && inl.indexOf("gtag('consent','default'") > -1 && inl.indexOf("gtag('consent','default'") < inl.indexOf('d.createElement'), `GA: consent defaults set inline in <head> before the loader in ${f}`);
    const cfg = `gtag('config','${GA}')`, def = "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500})";
    ok(h.split(cfg).length === 2 && h.split(def).length === 2 && h.indexOf(def) < h.indexOf(cfg) && h.indexOf(cfg) < headEnd, `GA: consent default (all denied) before the one config call in ${f}`);
    ok(h.includes("if(ok){gtag('consent','update',{analytics_storage:'granted'});"), `GA: returning visitor who accepted gets analytics_storage granted in ${f}`);
    ok(!/(ad_storage|ad_user_data|ad_personalization)\s*:\s*['"]granted/.test(h), `GA: ads signals never granted in ${f}`);
    const cspAt = h.indexOf('http-equiv="Content-Security-Policy"');
    ok(cspAt > -1 && cspAt < h.indexOf('<script'), `GA: CSP meta comes before the first script in ${f}`);
    const csp = ((h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1] || '').replace(/&#39;/g, "'");
    const dir = (n) => (csp.split(';').map((x) => x.trim()).find((x) => x.startsWith(n + ' ')) || '');
    ok(/https:\/\/(\*|www)\.googletagmanager\.com/.test(dir('script-src')) && !dir('script-src').includes("'unsafe-inline'"), `GA: script-src allows googletagmanager, no unsafe-inline, in ${f}`);
    for (const host of ['google-analytics.com', 'analytics.google.com', 'googletagmanager.com']) ok(dir('connect-src').includes(host), `GA: connect-src allows ${host} in ${f}`);
    for (const host of ['google-analytics.com', 'googletagmanager.com']) ok(dir('img-src').includes(host), `GA: img-src allows ${host} in ${f}`);
    for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`;
      ok(dir('script-src').includes(hash), `GA: inline script allowed by CSP hash in ${f}`);
    }
    // the consent bar: full pages and 404 (redirect stubs leave at once, so they have only the tag)
    if (!h.includes('data-page="redirect"')) {
      ok((h.match(/<div id="consent-bar" class="consent" role="region" aria-label="[^"]{4,}" hidden>/g) || []).length === 1, `consent bar (region, labelled, hidden until JS) once in ${f}`);
      ok(h.includes('data-consent="granted"') && h.includes('data-consent="denied"'), `consent bar Accept + Decline in ${f}`);
      ok(/<a href="\/(\w\w\/)?privacy\/#cookie-settings" data-consent-open>[^<]+<\/a>/.test(h), `footer Cookie settings link in ${f}`);
    }
  }
  for (const l of LANGS) {
    const f = PREFIX(l) + 'privacy/index.html', h = rd(f);
    ok(h.includes('<h2 id="cookies">') && h.includes('Google LLC') && h.includes('Google Analytics 4') && h.includes('14'), `privacy: Google Analytics section in ${f}`);
  }
}
// Web fonts: the pages use small subset files (build/subset-fonts.py). Every character a page shows inside a font's
// unicode-range must be in that subset, or it would be drawn in a fallback font. Re-run the subset script after text changes.
{
  const cov = JSON.parse(rd('fonts/subset-coverage.json'));
  const ranges = (css, family) => {
    const m = css.match(new RegExp(`font-family:"${family}"[^}]*unicode-range:([^;}]+)`));
    return m[1].split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((x) => parseInt(x, 16))).map(([a, b]) => [a, b ?? a]);
  };
  const inR = (rs, c) => rs.some(([a, b]) => c >= a && c <= b);
  const fonts = [[ranges(rd('templates/fonts.css'), 'Archivo'), new Set(cov.archivo), 'Archivo'], [ranges(rd('templates/fonts.css'), 'Instrument Sans'), new Set(cov.instrument), 'Instrument Sans'],
    [ranges(rd('templates/fonts-ar.css'), 'Noto Sans Arabic'), new Set(cov.arabic400), 'Noto Sans Arabic 400'], [ranges(rd('templates/fonts-ar.css'), 'Noto Sans Arabic'), new Set(cov.arabic700), 'Noto Sans Arabic 700']];
  const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', middot: '·', rarr: '→', larr: '←', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', times: '×' };
  const missing = new Map();
  const files = [];
  const walkHtml = (dir) => { for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) { if (!SKIP_DIRS.includes(e.name)) walkHtml(rel); } else if (e.name.endsWith('.html')) files.push(rel); } };
  walkHtml('');
  for (const f of files) {
    const text = rd(f).replace(/<(style|script|svg)\b[\s\S]*?<\/\1>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(\w+);/g, (m, n) => ent[n] ?? m);
    for (const ch of new Set(text)) { const c = ch.codePointAt(0); if (c < 0x20) continue; for (const [rs, set, name] of fonts) if (inR(rs, c) && !set.has(ch)) missing.set(`${name} U+${c.toString(16).toUpperCase().padStart(4, '0')} (${ch})`, f); }
  }
  for (const [k, f] of missing) ok(false, `font subset lacks ${k}, used in ${f}: run python3 build/subset-fonts.py`);
}
// package buttons (2026-11-14): every "Choose <package>" link on the home page (table + "Start with" block) and the pricing
// cards opens the sign-up with its own card's package id and the page language; generic sign-up links carry no plan
for (const l of LANGS) for (const f of [PREFIX(l) + 'index.html', PREFIX(l) + 'pricing/index.html']) {
  const h = rd(f), btns = [...h.matchAll(/<a class="btn[^"]*" href="([^"]*)" data-product="(\w+)"/g)].map((m) => [m[0], m[1], m[2]]);
  ok(btns.length >= 3, `package buttons on ${f}`);
  // 2026-11-15: a Social package's main button is "Order <package> on WhatsApp" (wa.me, prefilled), followed by "or create your
  // account" (the sign-up with its own package id); the "Start with" block keeps its sign-up button
  for (const [all, href, id] of btns) {
    const u = href.replace(/&amp;/g, '&');
    if (/class="btn wa-order"/.test(all)) ok(u.startsWith('https://wa.me/201146000101?text=') && SOCIAL.includes(id), `button for ${id} on ${f} is its WhatsApp order (${href})`);
    else ok(u === SIGNUP(l, id) && PRICING.packages.some((x) => x.id === id && !x.coming_soon), `button for ${id} on ${f} links to its own package (${href})`);
  }
  for (const m of h.matchAll(/<a class="acct-link" href="([^"]*)" data-signup="(\w+)">/g)) ok(m[1].replace(/&amp;/g, '&') === SIGNUP(l, m[2]), `"or create your account" for ${m[2]} opens the sign-up with plan=${m[2]} on ${f}`);
  for (const m of h.matchAll(/href="(https:\/\/portal\.crierstudio\.com\/#\/signup[^"]*)"(?! data-product| data-signup)/g)) ok(!/plan=/.test(m[1]), `a generic sign-up link carries a plan on ${f}`);
}
// ================= Review fixes (2026-11-14): rules that keep the reviewed problems from coming back =================
// The published set, as GitHub Pages (Jekyll) builds it: every file except paths with a part starting with "_" or ".", and the
// _config.yml exclude list (an exact path, a folder, or a glob where * matches anything, as Jekyll's File.fnmatch does).
const EXCLUDE = (rd('_config.yml').match(/^exclude:\n((?:\s+-.*\n?|\s*#.*\n?)+)/m) || ['', ''])[1].split('\n').map((x) => x.trim()).filter((x) => x.startsWith('-')).map((x) => x.slice(1).trim().replace(/^["']|["']$/g, ''));
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
const excluded = (rel) => EXCLUDE.some((e) => rel === e || rel.startsWith(e + '/') || (/[*?]/.test(e) && globRe(e).test(rel)));
const PUBLISHED = [];
(function walkAll(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? dir + '/' + e.name : e.name;
    if (/^[_.]/.test(e.name) || e.name === 'node_modules' || excluded(rel)) continue;
    if (e.isDirectory()) walkAll(rel); else PUBLISHED.push(rel);
  }
})('');
ok(PUBLISHED.includes('index.html') && PUBLISHED.includes('CNAME') && PUBLISHED.includes('og.png'), 'published set has the site (index.html, CNAME, og.png)');
const INTERNAL = /\.(?:md|py|mjs|cjs|ya?ml)$|^(?:build|templates|i18n|data|tests|design|_parked)\/|^(?:fonts\/subset-coverage\.json)$/i;
for (const f of PUBLISHED) ok(!INTERNAL.test(f), `internal file would be published: ${f} (add it to the exclude list in _config.yml)`);
for (const f of ['ARABIC-REVIEW.md', 'README.md', 'REVIEW-instore.md', 'TRANSLATIONS.md', 'data/pricing.json', 'i18n/en.json', 'build/check.mjs', 'fonts/subset-coverage.json']) ok(!PUBLISHED.includes(f), `${f} would be published`);
const pubText = PUBLISHED.filter((f) => /\.(?:html|js|css|json|xml|txt|webmanifest|svg)$/.test(f));
const htmlVis = (h) => h.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
// no payment provider is named until data/pricing.json says which one (payment_provider)
const PROVIDER = String(PRICING.payment_provider || '');
for (const f of pubText) { const t = rd(f); ok(!/stripe/i.test(PROVIDER ? t.split(PROVIDER).join('') : t), `"Stripe" named in published ${f} (data/pricing.json names no payment_provider)`); }
// no VAT statement while the price data charges VAT nowhere
const VAT_ON = Object.values(PRICING.local.countries).some((c) => Number(c.vat_pct) > 0 && c.vat_charged !== false);
if (!VAT_ON) {
  const VAT_RE = /\bVAT\b|value[- ]added tax|valueAddedTax|ضريبة|القيمة المضافة|tax[- ]free|tax exempt/i;
  for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) {
    const h = rd(f), ld = (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join(' '), meta = (h.match(/<meta[^>]+>|<title>[^<]*<\/title>/g) || []).join(' ');
    ok(!VAT_RE.test(htmlVis(h) + ' ' + ld + ' ' + meta), `VAT statement in ${f} while data/pricing.json charges no VAT`);
  }
  for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) if (!['cur.vatLine', 'cur.plusVat', 'cur.vatAdded'].includes(k)) ok(!VAT_RE.test(v), `VAT statement in i18n ${l}:${k} (VAT wording lives only in cur.vatLine, cur.plusVat and cur.vatAdded, shown when the data charges VAT)`);
}
// 2026-11-15 (owner: "anything that is not in the header remove"): no published page names the Brand Deck, and the privacy page no
// longer describes a form on the site (contact is WhatsApp, email and the client portal)
for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) { const v = rd(f).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' '); ok(!/Brand Deck|الملف التعريفي|fill in a form|تملأ نموذجًا/.test(v + (rd(f).match(/<meta[^>]+>/g) || []).join(' ')), `Brand Deck or site-form wording on ${f}`); }
// N35 (audit 2): while one country is served no published page carries another currency or country in its source
if (ONLY && !MULTI) for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) { const hh = rd(f); ok(!/data-usd|data-sar|data-aed|id="cur-data"|\bSAR\b|\bAED\b|ر\.س|د\.إ|Saudi|السعودية|الإمارات/.test(hh), `a dormant currency or country (USD / SAR / AED, Saudi Arabia, the UAE) in the source of ${f}`); }
// every published page is in the sitemap, except redirect stubs and the 404 page
for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) {
  const h = rd(f); if (h.includes('data-page="redirect"') || f === '404.html') continue;
  const u = 'https://crierstudio.com/' + f.replace(/(^|\/)index\.html$/, '$1');
  ok(sm.includes(`<loc>${u}</loc>`), `published page outside the sitemap: ${f} (add it to the sitemap, park it or make it a redirect)`);
}
// no real brand from the owner's own projects on any published page
for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) ok(!/sahmmena|\bSAHM\b|Sahm Mena|سهم \|/i.test(rd(f)), `the SAHM brand appears in ${f}`);
// every package card has the publishing line and the branding line (2026-11-15), and the pricing JSON-LD has an offer per country
for (const l of LANGS) {
  const h = rd(PREFIX(l) + 'pricing/index.html');
  for (const pk of SOCIAL) { const card = (h.match(new RegExp(`<article class="plan[^"]*" data-plan="${pk}"[\\s\\S]*?</article>`)) || [''])[0]; for (const k of ['f2', 'f6', 'f7']) ok(card.includes(esc(d[l][`pkg.${pk}.${k}`])), `"${d[l][`pkg.${pk}.${k}`]}" on the ${pk} card (${l})`); }
  ok(d.en['pkg.seen.f6'] === 'We publish on your pages and reply to comments and messages' && d.en['pkg.seen.f7'] === 'Brand identity (colours, fonts and post templates) in your first month' && d.en['pkg.seen.f2'] === 'A story with every post'
    && d.ar['pkg.seen.f2'] === 'ستوري مع كل منشور' && d.ar['pkg.seen.f6'] === 'ننشر لك ونرد على التعليقات والرسائل' && d.ar['pkg.seen.f7'] === 'هوية بصرية لعلامتك', 'the owner\'s wording for stories, publishing and branding (the portal\'s plan lines, UMA ec248b3c)');
  const ld = (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '';
  for (const [cc, c] of Object.entries(OFFER_CC)) ok(ld.includes(`"priceCurrency":"${c.currency}"`) && ld.includes(`"eligibleRegion":"${cc}"`), `pricing JSON-LD: an offer in ${c.currency} for ${cc} (${l})`);
  ok(!/"priceCurrency":"[A-Z]{3}"[^}]*"name":"(?:Brand Deck|الملف التعريفي)"|"name":"(?:Brand Deck|الملف التعريفي)","provider":\{[^}]*\},"offers"/.test(ld), `pricing JSON-LD: no Brand Deck offer while it is coming soon (${l})`);
  ok(rd(PREFIX(l) + 'index.html').includes(`"@type":"Country","name":"${d.en['cc.' + DEF_CC]}","identifier":"${DEF_CC}"`), `Organization areaServed uses country names and ISO codes (${l})`);
  if (ONLY) ok(!Object.keys(PRICING.local.countries).filter((c) => !ONLY.includes(c)).some((c) => rd(PREFIX(l) + 'index.html').includes(`"identifier":"${c}"`)), `areaServed is only ${ONLY.join(', ')} (${l})`);
}
// WhatsApp (owner 2026-11-15): data/contact.json has the number; the footer, the home page and About link to it, the contact sentences
// name it, and every Social package on /pricing/ and in the home table has "Pay by InstaPay" with a wa.me link prefilled with its name
{
  const WA = String(JSON.parse(rd('data/contact.json')).whatsapp || '');
  ok(WA === '201146000101', 'data/contact.json whatsapp is 201146000101 (the number the client portal uses)');
  for (const l of LANGS) {
    for (const pg of ['', 'pricing/', 'social/', 'terms/']) ok((rd(PREFIX(l) + pg + 'index.html').match(/<footer>[\s\S]*?<\/footer>/) || [''])[0].includes(`href="https://wa.me/${WA}"`), `WhatsApp link in the footer of /${PREFIX(l)}${pg}`);
    ok(!/by email only|email only|بالبريد الإلكتروني فقط/i.test(d[l]['about.contact.p'] + d[l]['terms.who.p']), `the contact wording is no longer "email only" (${l})`);
    // 2026-11-15: each Social package's MAIN button is the green "Order <package> on WhatsApp" (wa.me, the message prefilled with
    // the package name and its monthly price in the page language), then "or create your account" and one "Pay by InstaPay" line
    const PAT = SOCIAL.join('|');
    for (const [pg, block] of [['pricing/', new RegExp(`<article class="plan[^"]*" data-plan="(${PAT})"[\\s\\S]*?<\\/article>`, 'g')], ...[['', new RegExp(`<article class="plan[^"]*" data-plan="(${PAT})"[\\s\\S]*?<\\/article>`, 'g')], ['social/', new RegExp(`<article class="plan[^"]*" data-plan="(${PAT})"[\\s\\S]*?<\\/article>`, 'g')]]]) {
      const h = rd(PREFIX(l) + pg + 'index.html'), seen = [];
      for (const m of h.matchAll(block)) {
        const btn = m[0].match(/<a class="btn wa-order" href="([^"]*)" data-product="(\w+)" data-wa-order="\w+"[^>]*>([^<]*)<\/a><a class="acct-link" href="[^"]*" data-signup="(\w+)">([^<]*)<\/a>/) || [];
        ok(btn[2] === m[1] && btn[4] === m[1] && btn[3] === esc(d[l][`pkg.${m[1]}.wa`]) && btn[5] === esc(d[l]['plan.orAccount']), `"${d[l][`pkg.${m[1]}.wa`]}" then "${d[l]['plan.orAccount']}" on ${m[1]} (/${PREFIX(l)}${pg})`);
        const href = (btn[1] || '').replace(/&amp;/g, '&'), text = decodeURIComponent((href.split('?text=')[1] || ''));
        const price = (LAUNCH[m[1]].EGP).toLocaleString('en-US');
        ok(href.startsWith(`https://wa.me/${WA}?text=`) && text.includes(d[l]['name.' + m[1]]) && (!ONLY || text.includes(price)), `WhatsApp order prefilled with the ${m[1]} package name and its price (/${PREFIX(l)}${pg}): ${text}`);
        ok((m[0].match(/<p class="wapay fine"/g) || []).length === 1 && m[0].includes(esc(d[l]['pay.wa.line'])), `one "Pay by InstaPay" line on ${m[1]} (/${PREFIX(l)}${pg})`);
        seen.push(m[1]);
      }
      ok(JSON.stringify(seen) === JSON.stringify(SOCIAL), `the WhatsApp order button on all four packages on /${PREFIX(l)}${pg} (${seen})`);
    }
  }
  // Arabic counts (2026-11-15, voice guide): no «{n} تصميمًا» template in i18n, and no rendered "3–10 + singular" on a page
  for (const [k, v] of Object.entries(d.ar)) ok(!/\{n:[\w.]+\}\s*(تصميمًا|منصة|جولة)/.test(v), `ar:${k} writes a count with a fixed noun form: use {c:<id>.<item>:<noun>}`);
  for (const f of PUBLISHED.filter((x) => x.endsWith('.html') && rd(x).includes('<html lang="ar"'))) {
    const vis = rd(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    ok(!/(^|[^\d,.])([3-9]|10)\s+(تصميمًا|منصة|جولة تعديل)/.test(vis), `${f}: a count of 3–10 with a singular noun (Arabic needs the plural)`);
  }
  ok(/(^|\s)4 تصاميم /.test(rd('pricing/index.html').replace(/<[^>]+>/g, ' ')) && /12 تصميمًا/.test(rd('pricing/index.html')) && /4 جولات تعديل/.test(rd('pricing/index.html')), 'ar pricing: «4 تصاميم», «12 تصميمًا», «4 جولات تعديل»');
  // we publish for the client (2026-11-15): no page says the client posts it, or that nothing is published for them
  for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) {
    const h = rd(f);
    ok(!/Nothing is published for you|then you post it|You post it|post them yourself|Posted by you|لا ننشر شيئًا نيابةً عنك|تنشره أنت|تنشره بنفسك|نشرتَه أنت/.test(h), `${f} says the client posts (we publish since 2026-11-15)`);
  }
  ok(d.en['pkg.seen.wa'] === 'Subscribe to Bronze on WhatsApp' && d.ar['pkg.seen.wa'] === 'اشترك في البرونزية عبر واتساب', 'the WhatsApp subscribe button wording');
  ok(/^Pay by InstaPay/.test(d.en['pay.wa.line']) && /InstaPay/.test(d.ar['pay.wa.line']), 'the InstaPay line wording');
  // stale prices: no built page shows an old price that no package has any more (EGP 7,500 was Gold before 2026-11-15)
  for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) {
    const vis = rd(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    const visN = vis.replace(/[\u0660-\u0669]/g, (x) => String(x.charCodeAt(0) - 0x660));
    for (const [c, n] of STALE_NOW) ok(!new RegExp(`data-${c.toLowerCase()}="${n}"`).test(rd(f)) && (c !== DEF_CUR || !new RegExp(`(?<![\\d,.])${n.toLocaleString('en-US')}(?![\\d,])`).test(visN)), `stale price ${c} ${n} on ${f}`);
  }
}
{
}
// the language: the URL wins; the memory is written only by an explicit ?lang= (the EN / AR links)
{ const inl = (rd('index.html').match(/<script>(\(function\(\)\{try\{var k='crier\.lang'[\s\S]*?)<\/script>/) || [])[1] || '';
  ok(inl && (inl.match(/localStorage\.setItem/g) || []).length === 1 && /if\(q\)\{v=q;try\{localStorage\.setItem\(k,q\)/.test(inl), 'language script: only ?lang= writes the remembered language'); }
// every i18n key is read by the build (the record build/build.mjs writes), and that record matches the current i18n files
{
  let rec = null; try { rec = JSON.parse(rd('build/used-keys.json')); } catch { }
  const sum = crypto.createHash('sha256').update(LANGS.map((l) => rd(`i18n/${l}.json`)).join('\n')).digest('hex');
  ok(rec && rec.i18n_sha256 === sum, 'build/used-keys.json is missing or older than the i18n files: run node build/build.mjs first');
  if (rec) for (const k of Object.keys(d.en)) ok(rec.used.includes(k), `unused i18n key ${k} (no page reads it: delete it in every language)`);
}
// S06 (audit 3): the hashed files (assets/h/) are exactly the files of the releases in build/hashed-releases.json, the newest release
// is what the built pages name, and every file's bytes match the hash in its name
{
  let log = null; try { log = JSON.parse(rd('build/hashed-releases.json')); } catch { }
  ok(log && Array.isArray(log.releases) && log.releases.length > 0, 'build/hashed-releases.json is missing: run node build/build.mjs');
  if (log) {
    const onDisk = fs.readdirSync(path.join(ROOT, 'assets', 'h')).sort(), kept = [...new Set(log.releases.flatMap((r) => r.files))].sort();
    ok(JSON.stringify(onDisk) === JSON.stringify(kept), `assets/h/ holds exactly the files of the recorded releases (on disk ${onDisk.length}, recorded ${kept.length})`);
    for (const f of onDisk) { const m = f.match(/\.([0-9a-f]{10})\.\w+$/); ok(m && crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets', 'h', f))).digest('hex').startsWith(m[1]), `assets/h/${f}: bytes match the hash in its name`); }
    const named = new Set(); for (const p of PAGES) for (const l of LANGS) for (const u of rd(PREFIX(l) + p + 'index.html').match(/\/assets\/h\/[\w.-]+/g) || []) named.add(u.slice('/assets/h/'.length));
    ok([...named].every((f) => log.releases[0].files.includes(f)), 'the built pages name only files of the newest release');
  }
}
// O02 (audit 3): /release.json (published) names the build and the price data it was built from
{ let rel = null; try { rel = JSON.parse(rd('release.json')); } catch { }
  ok(rel && /^[0-9a-f]{16}$/.test(rel.release) && rel.pricing?.projection_sha256 === PRICING.projection_sha256 && rel.pricing?.generated_from === PRICING.generated_from, 'release.json is missing or names other price data: run node build/build.mjs'); }
// legal pages: their "last updated" date may not be older than their text. build/legal-stamp.json holds, per legal page and
// language, a fingerprint of the page's text (the date line left out) and the date it carries. Changed text with an unchanged
// stamp fails; after a change, set the date to the day of the change and run: node build/check.mjs --restamp
{
  const MONTHS = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] };
  const dateOf = (l, txt) => { const m = String(txt).match(/(\d{1,2}) (\S+) (\d{4})/); const mo = m ? MONTHS[l].indexOf(m[2]) : -1; return mo < 0 ? null : `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
  const LEGAL_DATE = { 'terms/': 'leg.updated', 'refund/': 'leg.updated', 'privacy/': 'privacy.updated' };
  const now = {};
  for (const [pg, key] of Object.entries(LEGAL_DATE)) {
    now[pg] = { date: dateOf('en', d.en[key]) };
    ok(now[pg].date && LANGS.every((l) => dateOf(l, d[l][key]) === now[pg].date), `legal date ${key} reads the same day in every language`);
    for (const l of LANGS) {
      const main = (rd(PREFIX(l) + pg + 'index.html').match(/<main[\s\S]*?<\/main>/) || [''])[0];
      const txt = htmlVis(main).split(esc(d[l][key])).join(' ').replace(/\s+/g, ' ').trim();
      now[pg][l] = crypto.createHash('sha256').update(txt).digest('hex');
    }
  }
  const STAMP = 'build/legal-stamp.json';
  if (process.argv.includes('--restamp')) {
    const today = new Date().toISOString().slice(0, 10);
    let prev = {}; try { prev = JSON.parse(rd(STAMP)); } catch { }
    // a page whose text did not change keeps its date (2026-11-15: terms and refund changed, the privacy policy did not)
    for (const [pg, v] of Object.entries(now)) ok(v.date === today || (prev[pg] && prev[pg].date === v.date && LANGS.every((l) => prev[pg][l] === v[l])), `--restamp: ${pg} still says ${v.date}; set its "last updated" line to today (${today}) first`);
    if (!fail) { fs.writeFileSync(path.join(ROOT, STAMP), JSON.stringify(now, null, 1) + '\n'); console.log('wrote ' + STAMP); }
  } else {
    let st = null; try { st = JSON.parse(rd(STAMP)); } catch { }
    ok(st, `${STAMP} is missing: run node build/check.mjs --restamp`);
    if (st) for (const [pg, v] of Object.entries(now)) {
      const old = st[pg] || {};
      ok(LANGS.every((l) => old[l] === v[l]) || v.date > (old.date || ''), `the text of /${pg} changed after its "last updated" date (${v.date}): set the date to the day of the change, then run node build/check.mjs --restamp`);
      ok(old.date === v.date && LANGS.every((l) => old[l] === v[l]), `/${pg}: ${STAMP} is out of date (run node build/check.mjs --restamp after updating the date)`);
    }
  }
}
// Several countries (owner 2026-11-19: Egypt, the USA, Saudi Arabia, the UAE). The pages are written for Egypt (also every other
// country); each served country's own text and WhatsApp link ride beside it (data-cv-<cc>, data-cv-href-<cc>); the <head> script
// reads the country from Cloudflare and sends a US visitor on an Arabic page (never a crawler, never one who chose Arabic) to /en/;
// hreflang is plain ar / en; the terms state each country's prices; the pricing JSON-LD has one Offer per served country.
if (MULTI) {
  const others = ONLY.filter((c) => c !== DEF_CC);
  for (const l of LANGS) {
    for (const pg of ['', 'pricing/', 'social/']) {
      const f = PREFIX(l) + pg + 'index.html', h = rd(f);
      ok(/<script>\(function\(\)\{try\{var w=window,d=document\.documentElement,K='crier\.loc'/.test(h) && /id="cur-data"/.test(h) && h.includes(`"fallback":"${DEF_CC}"`), `country script and currency data (falling back to ${DEF_CC}) on ${f}`);
      for (const cc of others) ok(h.includes(`data-cv-${cc.toLowerCase()}="`), `${cc} texts carried on ${f}`);
      for (const pk of SOCIAL) for (const cc of others) {
        const m = h.match(new RegExp(`data-wa-order="${pk}"[^>]*data-cv-href-${cc.toLowerCase()}="([^"]*)"`));
        const cur = PRICING.local.countries[cc].currency, n = LAUNCH[pk][cur];
        const text = m ? decodeURIComponent(m[1].replace(/&amp;/g, '&').split('?text=')[1] || '') : '';
        ok(m && text.includes(n.toLocaleString('en-US')) && text.includes(d[l]['name.' + pk]), `${cc} WhatsApp order for ${pk} names its ${cur} ${n} on ${f}: ${text}`);
      }
      ok(!/cur-select|data-cc|"lock"/.test(h), `no country picker and no lock on ${f}`);
    }
    for (const pg of ['', 'pricing/']) { const h = rd(PREFIX(l) + pg + 'index.html'); for (const c of LANGS) ok(h.includes(`hreflang="${c}" href=`), `plain hreflang ${c} on /${PREFIX(l)}${pg}`); }
    const terms = rd(PREFIX(l) + 'terms/index.html');
    for (const cc of others) { const cur = PRICING.local.countries[cc].currency; for (const pk of SOCIAL) { const n = LAUNCH[pk][cur].toLocaleString('en-US'); ok(terms.includes(cur === 'USD' ? '$' + n : n), `/${PREFIX(l)}terms/ states the ${cc} price of ${pk} (${cur} ${n})`); } }
    ok(!/InstaPay/.test(d[l]['terms.bill.p1.all']) || /البطاقة|card/.test(d[l]['terms.bill.p1.all']), `the terms name every way to pay (${l})`);
    const ld = (rd(PREFIX(l) + 'pricing/index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '';
    for (const cc of ONLY) ok(ld.includes(`"priceCurrency":"${PRICING.local.countries[cc].currency}"`) && ld.includes(`"eligibleRegion":"${cc}"`), `pricing JSON-LD has the ${cc} offer (${l})`);
  }
  // the English pages never redirect; the Arabic ones only for the USA
  const geo = (rd('index.html').match(/<script>(\(function\(\)\{try\{var w=window,d=document\.documentElement,K='crier\.loc'[\s\S]*?)<\/script>/) || [])[1] || '';
  ok(/c!=='US'\|\|d\.lang!=='ar'/.test(geo) && /s==='ar'/.test(geo) && /bot\|crawl\|spider/.test(geo), 'the country script redirects only a US visitor on an Arabic page, never a crawler or one who chose Arabic');
}
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
