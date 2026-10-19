// Static checks on the source and the built files. Run after build:  node build/build.mjs && node build/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'ar'];
const REMOVED = ['es', 'fr']; // removed languages: only redirect stubs to the English page remain
const PAGES = ['', 'pricing/', 'brand-deck/', 'social/', 'in-store/', 'sculptures/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
// old URLs: redirect stubs, not in the sitemap (a target may carry a #hash)
const MOVED = { 'kit/': 'social/', 'physical/': 'in-store/#custom', 'snapshot/': 'social/', 'crier-deck/': 'brand-deck/' };
const SKIP_DIRS = ['.git', 'node_modules', 'templates', 'build', 'tests', 'i18n', 'fonts', 'assets', 'design'];
const PRODUCTS = ['kit', 'visible', 'growing', 'deck'];
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const d = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(rd(`i18n/${l}.json`))]));
// One price list (U1, 2026-10-05): prices and counts come from data/pricing.json (written by the UMA repo's
// portal/scripts/publish-pricing.cjs from portal/lib/pricing.json). The texts carry placeholders, never a price.
const PRICING = JSON.parse(rd('data/pricing.json'));
ok(/^portal\/lib\/pricing\.json sha256 [0-9a-f]{64}$/.test(PRICING.generated_from || ''), 'data/pricing.json was not written by publish-pricing.cjs');
const PRICE_NUMS = [...new Set(PRICING.packages.flatMap((p) => [p.price, p.extra_platform_price].filter(Boolean)))];
const PRICE_RE = new RegExp('\\$\\s?(' + PRICE_NUMS.join('|') + ')(?!\\d)|(?<![\\d.,])(' + PRICE_NUMS.join('|') + ')\\s?\\$');
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(!PRICE_RE.test(v), `a price is written into i18n ${l}:${k} (use {price:<id>})`);
for (const f of fs.readdirSync(path.join(ROOT, 'templates'))) ok(!PRICE_RE.test(rd('templates/' + f)), `a price is written into templates/${f}`);
const en = Object.keys(d.en).sort();
for (const l of LANGS.slice(1)) { const k = Object.keys(d[l]).sort(); ok(JSON.stringify(k) === JSON.stringify(en), `i18n key set differs in ${l}: ${k.filter((x) => !en.includes(x)).concat(en.filter((x) => !k.includes(x))).join(',')}`); }
for (const l of LANGS) for (const [k, v] of Object.entries(d[l])) ok(typeof v === 'string' && v.trim() !== '', `empty ${l}:${k}`);
const urls = [];
for (const l of LANGS) for (const p of PAGES) {
  const rel = (l === 'en' ? '' : l + '/') + p, file = rel + 'index.html', u = 'https://crierstudio.com/' + rel;
  urls.push(u);
  ok(fs.existsSync(path.join(ROOT, file)), 'missing ' + file); if (!fs.existsSync(path.join(ROOT, file))) continue;
  const h = rd(file);
  ok(h.includes(`<link rel="canonical" href="${u}">`), `canonical ${file}`);
  ok(h.includes(`<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">`), `html lang/dir ${file}`);
  ok((h.match(/<link rel="alternate" hreflang="/g) || []).length === LANGS.length + 1, `hreflang ${file}`); // each language + x-default
  ok(/<title>[^<]{8,}<\/title>/.test(h) && /<meta name="description" content="[^"]{40,}">/.test(h), `title/description ${file}`);
  const headerNav = (h.match(/<nav class="main-nav"[\s\S]*?<\/nav>/) || [''])[0];
  // Home v2 (2026-10-18): the header is Social · In-store · Sculptures · Pricing · Client portal; Samples and FAQ are in the footer only
  for (const nav of ['social/', 'in-store/', 'sculptures/', 'pricing/']) ok(headerNav.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `nav link ${nav} in ${file}`);
  { const order = ['social/', 'in-store/', 'sculptures/', 'pricing/'].map((n) => headerNav.indexOf(`href="/${(l === 'en' ? '' : l + '/') + n}"`)); ok(order.every((x, i) => i === 0 || x > order[i - 1]) && order[3] < headerNav.indexOf('href="https://portal.crierstudio.com/"'), `header nav order Social, In-store, Sculptures, Pricing, Client portal in ${file}`); }
  ok((headerNav.match(/aria-current="page"/g) || []).length === (p === 'sculptures/' || p === 'social/' || p === 'in-store/' || p === 'pricing/' ? 1 : 0) && (p !== 'sculptures/' || headerNav.includes(`href="/${l === 'en' ? '' : l + '/'}sculptures/" aria-current="page"`)), `header nav active state in ${file}`);
  for (const nav of ['samples/', 'faq/', 'about/']) ok(!headerNav.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `no header nav link ${nav} in ${file}`);
  ok(headerNav.includes('href="https://portal.crierstudio.com/"'), `portal link ${file}`);
  // the In-store link carries a decorative "Coming soon" chip (aria-hidden) and a visually hidden " (coming soon)"; the footer does not
  { const soon = l === 'ar' ? 'قريبًا' : 'Coming soon', a = (headerNav.match(/<a [^>]*href="\/(?:ar\/)?in-store\/"[^>]*>[\s\S]*?<\/a>/) || [''])[0];
    ok(a.includes(`<span class="sr"> (${soon})</span><span class="nav-soon" aria-hidden="true">${soon}</span>`) && (headerNav.match(/class="nav-soon"/g) || []).length === 1, `In-store "Coming soon" chip in the header nav of ${file}`); }
  // the footer keeps every destination (About and Brand Deck moved there from the header)
  const footNav = (h.match(/<footer>[\s\S]*?<\/footer>/) || [''])[0];
  for (const nav of ['social/', 'in-store/', 'sculptures/', 'samples/', 'pricing/', 'faq/', 'about/', 'brand-deck/']) ok(footNav.includes(`href="/${(l === 'en' ? '' : l + '/') + nav}"`), `footer link ${nav} in ${file}`);
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
  if (p === 'pricing/') for (const pk of PRICING.packages) {
    ok(h.includes(`data-usd="${pk.price}" data-sar="${pk.prices.SAR}"`), `price ${pk.price} USD / ${pk.prices.SAR} SAR (${pk.id}, data/pricing.json) on ${file}`);
    if (pk.extra_platform_price) ok(h.includes(`data-extra="${pk.extra_platform_price}"`), `extra platform ${pk.extra_platform_price} USD (${pk.id}) on ${file}`);
  }
  if (p === 'pricing/') ok((h.match(/data-product="/g) || []).length === 3 && h.includes('disabled data-unavailable="deck"'), `3 buy buttons and unavailable Brand Deck on ${file}`);
  // The Store Kit: a card on pricing with no price, no VAT line and no buy button; its only action is the waitlist
  // (Home v2, 2026-10-18: the home page shows the three Social packages only, no Store Kit card and no In-store teaser)
  if (p === '') {
    ok(!/store-card|is-teaser|id="businesses"|id="seasons"/.test(h), `no Store Kit card, In-store teaser, industries or seasons section on ${file}`);
    ok((h.match(/<div class="inds three">[\s\S]*?<\/div>\s*<p class="more">/) || [''])[0].split('class="price amt"').length === 4, `three Social packages with prices on ${file}`);
    for (const id of ['id="walkthrough"', 'id="dash"', 'id="dash-s"', 'id="plans"', 'id="trust"', 'id="faq"']) ok(h.includes(id), `${id} on ${file}`);
    ok(h.includes(`href="https://portal.crierstudio.com/#/signup?lang=${l}"`), `walkthrough Get started -> portal sign-up (lang=${l}) on ${file}`);
    ok(/<script src="\/assets\/h\/dash\.[0-9a-f]{10}\.js" defer><\/script>/.test(h), `dashboard script (hashed, from 'self') on ${file}`);
    ok(h.indexOf('id="walkthrough"') < h.indexOf('id="plans"') && h.indexOf('id="plans"') < h.indexOf('id="trust"') && h.indexOf('id="trust"') < h.indexOf('id="faq"'), `home section order on ${file}`);
    // Home hero, Direction C (2026-10-18): the kit price from data/pricing.json (localised by site.js), the kit buy button, the
    // example posts labelled as examples, and no place name, clock or count in the phone
    const hero = (h.match(/<section class="hc" id="hero"[\s\S]*?<\/section>/) || [''])[0];
    const kitWant = JSON.parse(rd('payment-links.json')).kit || `/${l === 'en' ? '' : l + '/'}social/?product=kit#request`;
    ok(hero.split('class="price amt"').length === 2 && hero.includes('data-vat') && hero.includes('href="#walkthrough"'), `hero kit price, VAT tag and walkthrough link on ${file}`);
    ok((hero.match(/<a class="btn" href="([^"]*)" data-product="kit">/) || [])[1]?.replace(/&amp;/g, '&') === kitWant, `hero buy button -> ${kitWant} on ${file}`);
    ok(/Example posts|منشورات للمثال/.test(hero) && !/Riyadh|الرياض|\d:\d\d|<img\b/.test(hero), `hero example labelled, no city, clock or image on ${file}`);
  }
  if (p === 'pricing/') {
    const card = (h.match(/<(article|div) class="(plan|ind) cream store-card"[\s\S]*?<\/\1>/) || [''])[0];
    ok(card && !/data-usd|data-product|usdnote/.test(card) && card.includes(`href="/${l === 'en' ? '' : l + '/'}in-store/#waitlist"`), `Store Kit card (waitlist only, no price) on ${file}`);
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
    // In-store v3, Direction A (Adham, 2026-10-18): twice, the Store Kit status pill and the COMING SOON banner
    // (not counting the header nav's In-store "Coming soon" chip, checked on every page above)
    const visNav = headerNav.replace(/<[^>]+>/g, ' ');
    ok((vis.match(/coming soon|قريبًا/gi) || []).length - (visNav.match(/coming soon|قريبًا/gi) || []).length === 2,`"coming soon" exactly twice (status pill + banner) on ${file}`);
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
    ok(vis.includes(l === 'en' ? 'Images are concept renders.' : 'الصور تصاميم مفاهيمية.'), `"concept renders" line on ${file}`);
    ok((h.match(/<li class="sc-card"/g) || []).length === JSON.parse(rd('data/sculptures.json')).items.length, `every catalog piece on ${file}`);
    const quotes = [...h.matchAll(/<a class="btn"[^>]* href="(https:\/\/portal[^"]*)"/g)].map((m) => m[1]);
    ok(quotes.length === 3 && quotes.every((u) => u === `https://portal.crierstudio.com/#/signup?intent=quote&amp;lang=${l}`), `quote buttons -> portal sign-up (lang=${l}) on ${file}`);
    ok(/<script src="\/assets\/h\/sculptures\.[0-9a-f]{10}\.js" defer><\/script>/.test(h), `sculptures script (hashed, from 'self') on ${file}`);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) ok(/ width="\d+" height="\d+"/.test(m[0]) && / alt="[^"]+"/.test(m[0]) || m[0].includes('id="sc-lb-img"'), `img size/alt on ${file}: ${m[0].slice(0, 80)}`);
    for (const m of h.matchAll(/src="(\/assets\/sculptures\/[^"]+)"/g)) ok(fs.existsSync(path.join(ROOT, m[1])), `missing image ${m[1]} in ${file}`);
    ok(/src="\/assets\/sculptures\/concept-example\.webp"/.test(h), `example concept image on ${file}`);
  }
  // no [bracket] placeholders in the visible text of the home, pricing and FAQ pages either
  if (['', 'pricing/', 'faq/'].includes(p)) ok(!/\[[^\]]*\]/.test(vis), `a [bracket] placeholder in the visible text of ${file}`);
  // no Store Kit launch-price promise anywhere (Adham 2026-10-18)
  ok(!/launch price|سعر الإطلاق/i.test(vis), `a Store Kit launch-price promise on ${file}`);
  // no "snapshot" in visible text, meta or JSON-LD (Adham 2026-10-18); URLs and attributes such as the
  // /api/public/snapshot-request endpoint are not visible text and may keep the word
  ok(!/snapshot|سنابشوت|سناب شوت/i.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0].replace(/"(url|@id)":"[^"]*"/g, '') + ' ' + (h.match(/<meta (name|property)="[^"]+" content="[^"]*">/g) || []).filter((m) => !/content="https?:/.test(m)).join(' ')), `"snapshot" wording in ${file}`);
  // retired packages and prices must not come back (Snapshot, Starter/Growth/Pro, Crier Deck + Print Kit, old discounts)
  for (const bad of [/\$(99|199|399|149|249|39)\b/, /Snapshot/, /Starter/, /Growth/, /\bPro\b/, /Print Kit/, /Crier Deck/]) ok(!bad.test(vis + ' ' + (h.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0] + ' ' + (h.match(/<meta[^>]+>/g) || []).join(' ')), `retired wording ${bad} in ${file}`);
  ok(/<meta name="robots" content="noindex">/.test(h) === /const NOINDEX = true/.test(rd('build/build.mjs')), `noindex consistency ${file}`);
  // every internal href resolves to a built page or a file
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) { const t = m[1]; const f = t.endsWith('/') ? t + 'index.html' : t; ok(fs.existsSync(path.join(ROOT, f)), `dead link ${t} in ${file}`); }
}
{
  const h = rd('404.html'), vis = h.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!/snapshot|سنابشوت|سناب شوت/i.test(vis), '"snapshot" wording in 404.html');
}
const sm = rd('sitemap.xml');
ok((sm.match(/<url>/g) || []).length === urls.length, 'sitemap url count');
for (const u of urls) ok(sm.includes(`<loc>${u}</loc>`), 'sitemap missing ' + u);
ok(rd('brand-deck/index.html').includes('"@type":"Service"') && !rd('brand-deck/index.html').includes('"@type":"Offer"'), 'Brand Deck Service is informational, without an active offer');
ok(rd('social/index.html').includes('"@type":"Service"') && rd('social/index.html').includes('"price":"29"'), 'Service JSON-LD with The Social Kit offer');
ok(rd('in-store/index.html').includes('"@type":"Service"') && !rd('in-store/index.html').includes('"offers"'), 'In-store Services are informational, without offers');
ok(rd('pricing/index.html').includes('"name":"The Store Kit"'), 'pricing ItemList lists The Store Kit');
for (const pr of ['"price":"29"', '"price":"45"', '"price":"60"', '"unitCode":"MON"']) ok(rd('pricing/index.html').includes(pr), 'pricing JSON-LD ' + pr);
// renamed pages: every old URL is a noindex redirect stub to the new page in the same language
for (const l of LANGS) for (const [from, to] of Object.entries(MOVED)) {
  const pre = l === 'en' ? '' : l + '/', f = pre + from + 'index.html';
  ok(fs.existsSync(path.join(ROOT, f)), 'missing stub ' + f); if (!fs.existsSync(path.join(ROOT, f))) continue;
  const s = rd(f), [tp, th] = to.split('#');
  ok(s.includes('data-page="redirect"') && s.includes(`data-target="${tp.slice(0, -1)}"`) && s.includes(`data-lang="${l}"`) && s.includes('content="noindex"') && s.includes(`url=/${pre}${to}"`)
    && s.includes(`<link rel="canonical" href="https://crierstudio.com/${pre}${tp}">`) && (th ? s.includes(`data-hash="${th}"`) : !s.includes('data-hash=')), 'stub ' + f);
  ok(!sm.includes(`/${pre}${from}<`), 'stub in sitemap ' + f);
}
ok(rd('pricing/index.html').includes('"@type":"ItemList"') && rd('pricing/index.html').includes('"priceCurrency":"USD"'), 'pricing JSON-LD');
// Buy buttons: every product has one config entry; empty = the request form with the product preselected, filled = the link
{
  const links = JSON.parse(rd('payment-links.json'));
  ok(JSON.stringify(Object.keys(links).sort()) === JSON.stringify([...PRODUCTS].sort()), 'payment-links.json has exactly ' + PRODUCTS.join(', '));
  for (const k of PRODUCTS) {
    ok(typeof links[k] === 'string' && (links[k] === '' || /^https:\/\//.test(links[k])), `payment-links.json entry ${k}`);
    for (const l of LANGS) {
      const hh = rd((l === 'en' ? '' : l + '/') + 'pricing/index.html');
      const m = hh.match(new RegExp(`<a class="btn[^"]*" href="([^"]*)" data-product="${k}"`));
      if (k === 'deck') { ok(!m && hh.includes('disabled data-unavailable="deck"'), `Brand Deck unavailable (${l})`); continue; }
      const want = links[k] || `/${l === 'en' ? '' : l + '/'}social/?product=${k}#request`;
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
  ok(files.length === urls.length + 1 + 3 + LANGS.length * Object.keys(MOVED).length + REMOVED.length * (PAGES.length + Object.keys(MOVED).length), `GA: expected every built HTML file, found ${files.length}`);
  for (const f of files) {
    const h = rd(f), headEnd = h.indexOf('</head>');
    // delayed load (2026-10-11): no blocking/parsed gtag.js <script src> anywhere; the inline head script injects it on the first
    // interaction or 6 s after window load, or at once on a consent-bar / Cookie settings click
    ok(!/<script[^>]*\ssrc="[^"]*googletagmanager\.com/.test(h), `GA: no gtag.js <script src> in the HTML of ${f} (it is injected after load)`);
    const loader = `s.src='https://www.googletagmanager.com/gtag/js?id=${GA}';d.head.appendChild(s);`;
    ok(h.split(loader).length === 2 && h.indexOf(loader) < headEnd, `GA: exactly one delayed gtag.js loader inline in <head> of ${f}`);
    ok((h.match(/googletagmanager\.com\/gtag\/js/g) || []).length === 1, `GA: no second gtag.js loader in ${f}`);
    ok(h.includes("E=['pointerdown','touchstart','keydown','scroll','wheel']") && h.includes('for(var i=0;i<E.length;i++)w.addEventListener(E[i],L,O);') && h.includes("function T(){setTimeout(L,6000);}if(d.readyState==='complete')T();else w.addEventListener('load',T);"), `GA: loader waits for the first interaction, or 6 s after window load, in ${f}`);
    ok(h.includes(`t.closest('#consent-bar,[data-consent-open],a[href$="#cookie-settings"]'))L();},true)`), `GA: loader runs at once on consent-bar interaction in ${f}`);
    const inl = h.slice(0, headEnd).match(/<script>([\s\S]*?)<\/script>/);
    ok(inl && inl[1].indexOf("gtag('consent','default'") > -1 && inl[1].indexOf("gtag('consent','default'") < inl[1].indexOf('d.createElement'), `GA: consent defaults set inline in <head> before the loader in ${f}`);
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
    const f = (l === 'en' ? '' : l + '/') + 'privacy/index.html', h = rd(f);
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
console.log(fail ? `${fail} FAILED` : `all checks passed (${urls.length} pages, ${LANGS.length} languages)`);
process.exit(fail ? 1 : 0);
