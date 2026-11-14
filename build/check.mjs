// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'ar'];
const REMOVED = ['es', 'fr']; // removed languages redirect to the English default
const PREFIX = (l) => l === 'en' ? '' : l + '/'; // English (the default) at the root, Arabic under /ar/
const PAGES = ['', 'pricing/', 'brand-deck/', 'social/', 'in-store/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
// old URLs: redirect stubs, not in the sitemap (a target may carry a #hash; '' is the home page). Since 2026-11-14 the parked
// pages (sculptures, fiberglass, branddeck: outside the offer, kept in _parked/) are stubs too.
const MOVED = { 'kit/': 'social/', 'physical/': 'in-store/#custom', 'snapshot/': 'social/', 'crier-deck/': 'brand-deck/', 'sculptures/': '', 'fiberglass/': '', 'branddeck/': 'pricing/' };
const SKIP_DIRS = ['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'fonts', 'assets', 'design', '_parked'];
const PRODUCTS = ['seen', 'visible', 'growing', 'deck'];
// Audit fixes (2026-10-19): every buy / plan / start button opens the client portal's sign-up (AR pages with ?lang=ar)
// (2026-11-14: the portal reads ?lang=en|ar and nothing about a package, so every language passes its own lang)
const SIGNUP = (l) => `https://portal.crierstudio.com/#/signup?lang=${l}`;
const PORTAL_HOME = (l) => `https://portal.crierstudio.com/?lang=${l}`;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const d = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(rd(`i18n/${l}.json`))]));
// One price list (U1, 2026-10-05): prices and counts come from data/pricing.json (written by the UMA repo's
// portal/scripts/publish-pricing.cjs from portal/lib/pricing.json). The texts carry placeholders, never a price.
const PRICING = JSON.parse(rd('data/pricing.json'));
ok(/^portal\/lib\/pricing\.json sha256 [0-9a-f]{64}$/.test(PRICING.generated_from || ''), 'data/pricing.json was not written by publish-pricing.cjs');
// Country prices (owner 2026-11-13): Bronze / Silver / Gold (ids seen / visible / growing), all monthly, NET before VAT, one
// price per country and package (EGP = Egypt, SAR = Saudi Arabia, AED = the UAE, USD = the USA and every other country). No
// list price, nothing struck through. The Social Kit is retired and is not in the file. These numbers are pinned here so a
// republish of data/pricing.json that drifts from the decision fails the build.
const LAUNCH = { seen: { USD: 750, SAR: 350, AED: 340, EGP: 2500 }, visible: { USD: 1100, SAR: 695, AED: 680, EGP: 5000 }, growing: { USD: 1500, SAR: 1045, AED: 1020, EGP: 7500 } };
const NAMES = { seen: ['Bronze', 'البرونزية'], visible: ['Silver', 'الفضية'], growing: ['Gold', 'الذهبية'] };
// the currencies shown besides US dollars (data-sar, data-aed, data-egp); the USA is a country in USD, so USD is not repeated
const LOCAL_CURS = [...new Set(Object.values(PRICING.local.countries).map((c) => c.currency))].filter((c) => c !== 'USD');
ok(JSON.stringify(LOCAL_CURS) === JSON.stringify(['SAR', 'AED', 'EGP']) && PRICING.local.fallback.currency === 'USD' && PRICING.local.countries.US?.currency === 'USD' && PRICING.local.countries.US.vat_pct === 0, 'local currencies are SAR, AED, EGP; the USA and the fallback are US dollars with no VAT');
ok(JSON.stringify(PRICING.packages.map((p) => p.id)) === JSON.stringify(['seen', 'visible', 'growing', 'deck']), 'packages are seen, visible, growing and the coming-soon deck (no Social Kit)');
for (const [id, want] of Object.entries(LAUNCH)) {
  const p = PRICING.packages.find((x) => x.id === id);
  ok(p && !p.coming_soon && p.billing === 'monthly' && p.price === want.USD && p.prices.USD === want.USD && !('list_price' in p) && !('list_prices' in p), `$${want.USD} a month, no list price (${id})`);
  for (const c of LOCAL_CURS) ok(p && p.prices[c] === want[c], `${c} ${want[c]} a month (${id})`);
  ok(d.en['name.' + id] === NAMES[id][0] && d.ar['name.' + id] === NAMES[id][1], `name of ${id} is ${NAMES[id].join(' / ')}`);
}
for (const p of PRICING.packages) {
  ok(Number.isInteger(p.price) && p.price > 0, `US-dollar price (${p.id})`);
  for (const c of LOCAL_CURS) ok(Number.isInteger(p.prices[c]) && p.prices[c] > 0, `${c} price (${p.id})`);
}
const PRICE_NUMS = [...new Set(PRICING.packages.flatMap((p) => [p.price, p.extra_platform_price].filter(Boolean)))];
const PRICE_RE = new RegExp('\\$\\s?(' + PRICE_NUMS.join('|') + ')(?!\\d)|(?<![\\d.,])(' + PRICE_NUMS.join('|') + ')\\s?\\$');
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
  for (const nav of ['social/', 'in-store/', ...SC_NAV, 'samples/', 'pricing/', 'faq/', 'about/', 'brand-deck/']) ok(footNav.includes(`href="/${PREFIX(l) + nav}"`), `footer link ${nav} in ${file}`);
  // the social line's old name is gone everywhere (EN and AR)
  ok(!/Complete Kit|complete kit|الحزمة الكاملة/.test(h), `old name "Complete Kit" in ${file}`);
  ok(h.includes('team@crierstudio.com'), `email in ${file}`);
  for (const lp of LANGS.filter((x) => x !== 'en')) { /* sibling links exist */ }
  ok(!/\bUMA\b/i.test(h), `UMA in ${file}`);
  ok(!/draft|\(DRAFT\)/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `draft text in ${file}`);
  // no free offers anywhere: the word free (and its ar form) must not appear in visible text
  const vis = h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  // (one exception, Adham 2026-10-18: "Create a free account and tell us what you need" / the FAQ answer: a client portal account, not an offer)
  ok(!/\bfree\b|مجان|بدون مقابل/i.test(vis.replace(/\bfree account\b|حسابًا مجانيًا/gi, '')), `free wording in ${file}`);
  ok(!/Your shop, heard/i.test(h), `tagline in ${file}`);
  // the HTML is written in the default country's currency (Saudi Arabia, SAR before VAT); every price carries its US-dollar
  // and local prices in data-* for site.js
  // every price span carries the US-dollar price and each local NET price (data-usd, data-sar, data-aed, data-egp), the exact
  // numbers data/pricing.json has, so site.js shows the buyer's currency without converting anything
  const dataAttrs = (usd, loc) => `data-usd="${usd}"` + LOCAL_CURS.map((c) => ` data-${c.toLowerCase()}="${loc[c]}"`).join('');
  if (p === 'pricing/') for (const pk of PRICING.packages) {
    ok(h.includes(dataAttrs(pk.price, pk.prices)), `price ${pk.price} USD / ${LOCAL_CURS.map((c) => pk.prices[c] + ' ' + c).join(' / ')} (${pk.id}, data/pricing.json) on ${file}`);
    if (!pk.coming_soon) ok(new RegExp(`class="price amt" dir="(ltr|rtl)" ${dataAttrs(pk.price, pk.prices)}`).test(h) && !h.includes('class="price-list'), `price ${pk.price} USD, nothing struck through (${pk.id}) on ${file}`);
    if (pk.extra_platform_price) ok(h.includes(`data-extra="${pk.extra_platform_price}"`), `extra platform ${pk.extra_platform_price} USD (${pk.id}) on ${file}`);
  }
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === 3 && h.includes('disabled data-unavailable="deck"'), `3 buy buttons and unavailable Brand Deck on ${file}`);
  // the pricing page follows the visitor's country like the home page (2026-11-13: the US-dollar price is the USA's own price)
  if (p === 'pricing/') ok(h.includes('id="cur-select"') && /id="cur-data"/.test(h) && h.includes('<option value="US"'), `country picker (with the USA) and currency data on ${file}`);
  // Home: Landing A (Adham, 2026-11-06; walkthrough kept 2026-11-07; In-store section removed 2026-11-06): hero (SAHM's real
  // Instagram posts), The Social Kit in numbers, the client-portal walkthrough, the OK rule, the package table, a closing call. No FAQ.
  if (p === '') {
    ok(!/store-card|is-teaser|id="businesses"|id="seasons"|id="plans"|id="in-store"|la-store/.test(h), `no package cards, Store Kit card, In-store section, industries or seasons section on ${file}`);
    const HOME_IDS = ['hero', 'kit', 'walkthrough', 'trust', 'pricing', 'start'];
    const at = HOME_IDS.map((id) => h.indexOf(`id="${id}"`));
    ok(at.every((x, i) => x > -1 && (i === 0 || x > at[i - 1])), `home sections ${HOME_IDS.join(', ')} in order on ${file}`);
    ok(!/id="faq"/.test(h) && h.includes('id="dash"') && h.includes('id="dash-s"'), `walkthrough and dashboard data, no FAQ, on ${file}`);
    ok(/<script src="\/assets\/h\/dash\.[0-9a-f]{10}\.js" defer><\/script>/.test(h), `dashboard script (hashed, from 'self') on ${file}`);
    const hero = (h.match(/<section class="hc la-hero" id="hero"[\s\S]*?<\/section>/) || [''])[0];
    ok((hero.match(/<div class="la-cta">\s*<a class="btn" href="([^"]*)"/) || [])[1] === SIGNUP(l), `hero button -> ${SIGNUP(l)} on ${file}`);
    ok(hero.includes('href="#walkthrough"') && hero.includes('href="#pricing"'), `hero links to #walkthrough and #pricing on ${file}`);
    // review fix 2026-11-14: the phone shows a made-up example café, labelled as an example; no real brand, handle, logo or post
    ok(hero.includes(esc(d[l]['hero.exnote'])) && !/data-usd|data-product/.test(hero), `hero labelled as an example, no price in it, on ${file}`);
    ok(!/<img\b/.test(hero) && (hero.match(/class="ex-cell"/g) || []).length === 6 && hero.includes('xp-story'), `hero: six drawn example posts and a story, no images, on ${file}`);
    // the walkthrough: no delivery time, no clock, no reel count above the smallest package
    const wt = (h.match(/<section id="walkthrough"[\s\S]*?<\/section>/) || [''])[0], wtVis = wt.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    ok(!/\b\d+\s*(?:-\s*)?hours?\b|\d+\s*ساعة|\d+\s*ساعات|[١٢٣٤٥٦٧٨٩٠]+\s*ساعة|d-clock(?![\w-])|d-time-later/i.test(wt) && !/<img\b/.test(wt), `walkthrough: no hours, no clock, no photos, on ${file}`);
    const smallest = Math.min(...PRICING.packages.filter((x) => !x.coming_soon).map((x) => x.items.posts));
    let dashPosts = Infinity; try { dashPosts = JSON.parse((h.match(/<script type="application\/json" id="dash-s">([\s\S]*?)<\/script>/) || [])[1]).posts; } catch { }
    ok(dashPosts <= smallest && !/\breels?\b|ريلز|ريل\b/i.test(wtVis), `walkthrough: ${dashPosts} posts (no more than the smallest package's ${smallest}), no reels, on ${file}`);
    // the package table: every Social package at its list and sale price from data/pricing.json, with its sign-up button
    for (const pk of PRICING.packages.filter((x) => ['seen', 'visible', 'growing'].includes(x.id))) {
      ok(new RegExp(`class="price amt" dir="(ltr|rtl)" ${dataAttrs(pk.price, pk.prices)}`).test(h) && !h.includes('class="price-list'), `table price ${pk.price} USD (${pk.id}) on ${file}`);
      // the default country's text (Saudi Arabia, SAR before VAT) is the SAR number itself: nothing converted, nothing rounded
      ok(h.includes(`${dataAttrs(pk.price, pk.prices)}>${d[l]['cur.fmt'].replace('{cur}', d[l]['cur.symSAR']).replace('{n}', pk.prices.SAR.toLocaleString('en-US'))}<`), `table shows SAR ${pk.prices.SAR} for ${pk.id} on ${file}`);
    }
    ok((h.match(/<table class="la-table">/g) || []).length === 1 && /id="cur-data"/.test(h), `one package table with its currency data on ${file}`);
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
    ok(h.includes(`id="quote-btn" href="https://portal.crierstudio.com/#/signup?intent=quote&amp;lang=${l}"`), `quote button -> portal sign-up (lang=${l}) on ${file}`);
    ok(h.includes(`id="quote-login" href="https://portal.crierstudio.com/#/login?intent=quote&amp;lang=${l}"`), `quote log-in link -> portal sign-in (lang=${l}) on ${file}`);
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
  if (!['', 'pricing/', 'terms/', 'privacy/', 'refund/'].includes(p)) {
    const ld = (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0], meta = (h.match(/<meta[^>]+>|<title>[^<]*<\/title>/g) || []).join(' ');
    const syms = ['SAR', 'AED', 'EGP'].map((c) => d[l]['cur.sym' + c].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const priceRe = new RegExp(`data-usd|class="(price )?amt"|"offers"|"price":|\\$\\s?\\d|(${syms.join('|')})\\s?\\d|\\d\\s?(${syms.join('|')})`);
    ok(!priceRe.test(vis + ' ' + ld + ' ' + meta) && !/data-usd|id="cur-data"/.test(h), `a price on ${file} (prices are on /pricing/ only)`);
    const store = p === 'in-store/' ? [] : ['name.store'];
    const names = ['name.seen', 'name.visible', 'name.growing', ...store].flatMap((k) => [d.en[k], d[l][k]]).concat('Social Kit', store.length ? ['Store Kit'] : []);
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
ok(rd('brand-deck/index.html').includes('"@type":"Service"') && !rd('brand-deck/index.html').includes('"@type":"Offer"'), 'Brand Deck Service is informational, without an active offer');
ok(rd('social/index.html').includes('"@type":"Service"') && !rd('social/index.html').includes('"offers"'), 'Social Service JSON-LD is informational, without offers');
ok(rd('in-store/index.html').includes('"@type":"Service"') && !rd('in-store/index.html').includes('"offers"'), 'In-store Services are informational, without offers');
// the pricing page's structured data carries each available package's US-dollar sale price (the international price)
for (const pr of [...Object.values(LAUNCH).map((w) => `"price":"${w.USD}"`), '"unitCode":"MON"']) ok(rd('pricing/index.html').includes(pr), 'pricing JSON-LD ' + pr);
// renamed pages: every old URL is a noindex redirect stub to the new page in the same language
for (const l of LANGS) for (const [from, to] of Object.entries(MOVED)) {
  const pre = PREFIX(l), f = pre + from + 'index.html';
  ok(fs.existsSync(path.join(ROOT, f)), 'missing stub ' + f); if (!fs.existsSync(path.join(ROOT, f))) continue;
  const s = rd(f), [tp, th] = to.split('#');
  ok(s.includes('data-page="redirect"') && s.includes(`data-target="${tp ? tp.slice(0, -1) : 'index'}"`) && s.includes(`data-lang="${l}"`) && s.includes('content="noindex"') && s.includes(`url=/${pre}${to}"`)
    && s.includes(`<link rel="canonical" href="https://crierstudio.com/${pre}${tp}">`) && (th ? s.includes(`data-hash="${th}"`) : !s.includes('data-hash=')), 'stub ' + f);
  ok(!sm.includes(`/${pre}${from}<`), 'stub in sitemap ' + f);
}
ok(rd('pricing/index.html').includes('"@type":"ItemList"') && rd('pricing/index.html').includes('"priceCurrency":"USD"'), 'pricing JSON-LD');
// Buy buttons: every product has one config entry; empty = the client portal's sign-up, filled = the link
{
  const links = JSON.parse(rd('payment-links.json'));
  ok(JSON.stringify(Object.keys(links).sort()) === JSON.stringify([...PRODUCTS].sort()), 'payment-links.json has exactly ' + PRODUCTS.join(', '));
  for (const k of PRODUCTS) {
    ok(typeof links[k] === 'string' && (links[k] === '' || /^https:\/\//.test(links[k])), `payment-links.json entry ${k}`);
    for (const l of LANGS) {
      const hh = rd(PREFIX(l) + 'pricing/index.html');
      const m = hh.match(new RegExp(`<a class="btn[^"]*" href="([^"]*)" data-product="${k}"`));
      if (k === 'deck') { ok(!m && hh.includes('disabled data-unavailable="deck"'), `Brand Deck unavailable (${l})`); continue; }
      const want = links[k] || SIGNUP(l);
      ok(m && m[1].replace(/&amp;/g, '&') === want, `buy button ${k} (${l}) href`);
    }
  }
}
ok(rd('faq/index.html').includes('"@type":"FAQPage"'), 'FAQPage');
ok(rd('index.html').includes('"alternateName":"Crier"') && rd('index.html').includes('"@type":"Organization"'), 'Organization + WebSite');
// Google Analytics 4 + Consent Mode v2: every built HTML file (40 pages, 404, all redirect stubs) has the inline tag exactly once,
// early in <head>, with consent defaulting to denied before the config call, and gtag.js loaded only on the first interaction or 6 s after page load; ads signals are never granted; the CSP allows Google's hosts
// and every inline script by its sha256 hash (no 'unsafe-inline' for scripts).
{
  const GA = 'G-QLQ443CQ8E';
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
    ok(h.includes("E=['pointerdown','touchstart','keydown','scroll','wheel']") && h.includes('for(var i=0;i<E.length;i++)w.addEventListener(E[i],L,O);') && h.includes("function T(){setTimeout(L,6000);}if(d.readyState==='complete')T();else w.addEventListener('load',T);"), `GA: loader waits for the first interaction, or 6 s after window load, in ${f}`);
    ok(h.includes(`t.closest('#consent-bar,[data-consent-open],a[href$="#cookie-settings"]'))L();},true)`), `GA: loader runs at once on consent-bar interaction in ${f}`);
    const inl = [...h.slice(0, headEnd).matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => x.includes("gtag('consent','default'"));
    ok(inl && inl.indexOf("gtag('consent','default'") > -1 && inl.indexOf("gtag('consent','default'") < inl.indexOf('d.createElement'), `GA: consent defaults set inline in <head> before the loader in ${f}`);
    const cfg = `gtag('config','${GA}')`, def = "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500})";
    ok(h.split(cfg).length === 2 && h.split(def).length === 2 && h.indexOf(def) < h.indexOf(cfg) && h.indexOf(cfg) < headEnd, `GA: consent default (all denied) before the one config call in ${f}`);
    ok(h.includes("if(localStorage.getItem('crier_consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}"), `GA: returning visitor who accepted gets analytics_storage granted in ${f}`);
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
const INTERNAL = /\.(?:md|py|mjs|cjs|ya?ml)$|^(?:build|templates|i18n|data|tests|design|_parked)\/|^(?:checkout\.json|payment-links\.json|fonts\/subset-coverage\.json)$/i;
for (const f of PUBLISHED) ok(!INTERNAL.test(f), `internal file would be published: ${f} (add it to the exclude list in _config.yml)`);
for (const f of ['ARABIC-REVIEW.md', 'README.md', 'REVIEW-instore.md', 'TRANSLATIONS.md', 'data/pricing.json', 'i18n/en.json', 'build/check.mjs', 'fonts/subset-coverage.json', 'checkout.json', 'payment-links.json']) ok(!PUBLISHED.includes(f), `${f} would be published`);
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
// every published page is in the sitemap, except redirect stubs and the 404 page
for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) {
  const h = rd(f); if (h.includes('data-page="redirect"') || f === '404.html') continue;
  const u = 'https://crierstudio.com/' + f.replace(/(^|\/)index\.html$/, '$1');
  ok(sm.includes(`<loc>${u}</loc>`), `published page outside the sitemap: ${f} (add it to the sitemap, park it or make it a redirect)`);
}
// no real brand from the owner's own projects on any published page
for (const f of PUBLISHED.filter((x) => x.endsWith('.html'))) ok(!/sahmmena|\bSAHM\b|Sahm Mena|سهم \|/i.test(rd(f)), `the SAHM brand appears in ${f}`);
// every package card has the "files ready to publish" line (Gold lacked it), and the pricing JSON-LD has an offer per country
for (const l of LANGS) {
  const h = rd(PREFIX(l) + 'pricing/index.html');
  for (const pk of ['seen', 'visible', 'growing']) { const card = (h.match(new RegExp(`<article class="plan[^"]*" data-plan="${pk}"[\\s\\S]*?</article>`)) || [''])[0]; ok(card.includes(esc(d[l]['pkg.seen.f7'])), `"${d[l]['pkg.seen.f7']}" on the ${pk} card (${l})`); }
  const ld = (h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '';
  for (const [cc, c] of Object.entries(PRICING.local.countries)) ok(ld.includes(`"priceCurrency":"${c.currency}"`) && ld.includes(`"eligibleRegion":"${cc}"`), `pricing JSON-LD: an offer in ${c.currency} for ${cc} (${l})`);
  ok(!/"priceCurrency":"[A-Z]{3}"[^}]*"name":"(?:Brand Deck|الملف التعريفي)"|"name":"(?:Brand Deck|الملف التعريفي)","provider":\{[^}]*\},"offers"/.test(ld), `pricing JSON-LD: no Brand Deck offer while it is coming soon (${l})`);
  ok(rd(PREFIX(l) + 'index.html').includes(`"@type":"Country","name":"${d.en['cc.SA']}","identifier":"SA"`), `Organization areaServed uses country names and ISO codes (${l})`);
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
    for (const [pg, v] of Object.entries(now)) ok(v.date === today, `--restamp: ${pg} still says ${v.date}; set its "last updated" line to today (${today}) first`);
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
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
