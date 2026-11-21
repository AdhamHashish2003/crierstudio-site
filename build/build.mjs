// Crier Studio static site build. Node only, no dependencies.
// Reads i18n/<lang>.json + templates/*, writes static HTML for en (/) and ar into the repo root.
// Run:  node build/build.mjs        (the built files are committed; GitHub Pages serves it as-is)
// Check: node build/check.mjs       (key sets identical in all 4 languages, no unused keys, no price/internal-name/draft text)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ============================================================================================
// NOINDEX SWITCH: the one place that keeps the whole site out of search results.
// true  = every page carries <meta name="robots" content="noindex">.
// false = the tag is left out. Flip it only when the launch trigger in the SEO plan (section 2.4) is met, then rebuild.
const NOINDEX = false;
// ============================================================================================
// PARKED PAGES (review fix 2026-11-14): pages outside the current offer. They are still built from their source so nothing is
// lost, but into _parked/ (never published: Jekyll skips "_" folders and _config.yml excludes it), and their public URLs are
// redirect stubs to the closest current page (PARKED_TO). /sculptures/ was the "hidden for now" catalogue (2026-10-19). The
// hand-made standalone pages (/fiberglass/, /branddeck/, /ar/branddeck/) live in _parked/ too, and /assets/studio-deck/ and
// /assets/social-preview.html are built into _parked/ with redirect stubs at their old addresses.
// 2026-11-15 (owner: "fix the footer, many pages we already deleted… anything that is not in the header remove"): In-store, Samples,
// FAQ, About and Brand Deck are unpublished too. The site is now the home page, /social/, /pricing/ and the three legal pages.
const PARKED = new Set(['sculptures', 'in-store', 'samples', 'faq', 'about', 'brand-deck']);
const PARKED_DIR = '_parked';
// The landing pages (owner 2026-11-15, published 2026-11-16): the home page and /social/ are templates/home-v2.html and social-v2.html.
// The old landing templates (home.html, social.html, hero.html, the drawn "Example Café" and the mock client page) were deleted on
// 2026-11-16 (audit 2, N44); they are in git history before that date.
const V2 = { index: 'home-v2', social: 'social-v2' };
// SEO batch 2026-11-20: Samples goes to /social/ (its closest live page) and the old /branddeck/ to the home page like every other
// parked page (the Brand Deck left /pricing/ on 2026-11-15), so every old URL reaches its final page in one hop (REDIRECTS below).
const PARKED_TO = { sculptures: 'index', fiberglass: 'index', branddeck: 'index', 'in-store': 'index', samples: 'social', faq: 'index', about: 'index', 'brand-deck': 'index' };
// UNLISTED (SEO batch 2026-11-20): hand-made pages that are published but never listed. /fiberglass/ is the real Fiberglass page
// (restored: commit 212bb12 had moved it to _parked/ and put a redirect stub at its address). The build never writes there (no stub,
// no redirect rule), it is not in the sitemap, no page links to it, and it carries its own <meta name="robots" content="noindex,nofollow">.
// Its old language copies (/ar/, /en/, /es/, /fr/fiberglass/) stay stubs to the home page in their language.
const UNLISTED = new Set(['fiberglass']);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
const EMAIL = 'team@crierstudio.com';
const BRAND = 'Crier Studio';
const PORTAL = 'https://portal.crierstudio.com/';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
// og:locale (SEO batch 2026-11-20): Arabic is ar_AR, Facebook's locale for Arabic everywhere (the site serves the Middle East and North
// Africa, not Egypt alone)
const LANGS = [['en', 'English', 'en_US'], ['ar', 'العربية', 'ar_AR']];
// ARABIC FIRST (owner 2026-11-15): Arabic is the default language at the root (/, /pricing/, ...), English lives under /en/. The old
// Arabic URLs (/ar/...) are redirect stubs to the same page at the root; the old English root URLs are now the Arabic pages, and a
// visitor who chose English (localStorage crier.lang) and arrives from outside the site is sent to /en/ (LANGUAGE_INLINE below).
const DEFAULT_LANG = 'ar';
// removed languages (2026-10-16): their old URLs stay as redirect stubs to the matching English page (/en/...), not in the sitemap
const REMOVED = ['es', 'fr'];
const RTL = new Set(['ar']);
// SEO (2026-11-15): the hreflang codes carry the region while the site serves one country (Egypt: ar-EG, en-EG), so search engines
// see both pages as made for Egypt; x-default (the Arabic root) still covers everyone else. The html lang attribute stays 'ar' / 'en'.
// Several countries (MULTI, owner 2026-11-19): plain language codes again (the English pages are for the USA, the Arabic ones for Egypt,
// Saudi Arabia and the UAE), x-default the Arabic root.
const HREFLANG = (c) => (RESTRICTED && !MULTI ? `${c}-${DEFAULT_CC}` : c);
// every page exists in both languages: / (en), /ar/ and the sub-paths below
// Two product lines (2026-10-18): Social (/social/: The Social Kit + the monthly plans) and In-store (/in-store/: The Store
// Kit waitlist + Custom pieces, whose quotes are asked in the client portal after a free sign-up).
// Sculptures (2026-10-18): the fiberglass catalog (data/sculptures.json), parked since 2026-11-14 (see PARKED above).
// The standalone /fiberglass/ and /branddeck/ pages are parked in _parked/ (2026-11-14); their URLs are redirect stubs.
const PAGES = ['index', 'pricing', 'brand-deck', 'social', 'in-store', 'sculptures', 'samples', 'faq', 'about', 'terms', 'privacy', 'refund'];
// renamed pages: the old URLs stay as redirect stubs in every language (full query kept; the visitor's #hash wins over the
// target's), not in the sitemap. A target may carry a #hash: /physical/ -> /in-store/#custom.
const MOVED = { kit: 'social', physical: 'index', snapshot: 'social', 'crier-deck': 'index', ...PARKED_TO }; // physical was In-store's custom pieces, crier-deck the Brand Deck: both pages are parked, so they go home
const WIDE = new Set(['index', 'pricing', 'brand-deck', 'social', 'in-store', 'sculptures', 'samples', 'about']); // wide layout; the rest use the narrow reading layout
const LEGAL = ['terms', 'privacy', 'refund'];
// Home v2 (2026-10-18): the header shows Social · Sculptures · Pricing · Client portal; Samples and FAQ moved to the footer only
// (In-store remains on the page and in the footer; Sculptures is parked)
const NAV = [['social', 'nav.social'], ['pricing', 'nav.pricing'], [PORTAL, 'nav.portal']];
const NAV_FOOT = NAV; // 2026-11-15 (owner): the footer lists only what the header lists (Social, Pricing, Your account)
// pages built but kept out of search and the sitemap
const HIDDEN = PARKED;
const CRUMB_KEY = { pricing: 'nav.pricing', 'brand-deck': 'nav.deck', social: 'nav.social', 'in-store': 'nav.instore', sculptures: 'nav.sculptures', samples: 'nav.samples', faq: 'nav.faq', about: 'nav.about', terms: 'foot.terms', privacy: 'foot.privacy', refund: 'foot.refund' };
// In-store waitlist "business type": the value is the matching INDUSTRY_VALUES string (the CRM's industry field)
const STORE_TYPES = [['Cafés and dessert shops', 'is.zone.cafe'], ['Restaurants', 'is.zone.restaurant'], ['Salons', 'is.zone.salon'], ['Abayas and fashion', 'is.zone.abaya'], ['Other local business', 'ind.other']];
// MENA (2026-10-14): Gulf and Egyptian business types. The value goes to the intake API as free text (the CRM's industry field).
const INDUSTRY_VALUES = ['Cafés and dessert shops', 'Restaurants', 'Abayas and fashion', 'Perfume and oud', 'Salons', 'Real estate', 'Other local business'];
for (const [v] of STORE_TYPES) if (!INDUSTRY_VALUES.includes(v)) throw new Error('STORE_TYPES: not an INDUSTRY_VALUES string: ' + v);
const IND_N = INDUSTRY_VALUES.length - 1; // ind.1n … ind.<IND_N>n, then ind.other
const IND_NOTE = 6; // clinics carry the "no health claims" note (ind.<IND_NOTE>note)
// the seasons the monthly content follows (keys season.<id>t / season.<id>x)
const SEASONS = ['ramadan', 'eids', 'national', 'white'];

// ---------- products + payment links ----------
// payment-links.json (repo root) holds one entry per product. Empty = the Buy button opens the client portal's sign-up
// (payment happens in the portal). Keep them empty: a Stripe Payment Link has one fixed currency and no VAT line, so it
// cannot follow the country rule below.
// Every price and count comes from data/pricing.json, a copy of the studio's master price list (portal/lib/pricing.json,
// republished by hand on 2026-10-15). Texts use {price:<id>}, {extra:<id>} (extra platform), {plat:<id>}
// (platforms included) and {n:<id>.<item>} (a count). Never write a price or a count into i18n or templates.
const PRICING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pricing.json'), 'utf8'));
const PKG = Object.fromEntries(PRICING.packages.map((p) => [p.id, p]));
const PRICES = Object.fromEntries(PRICING.packages.map((p) => [p.id, p.price ?? p.prices?.USD ?? 0])); // (S05: no USD price in one-country mode, where it is never written) // USD: the international price, in the HTML of every language
// Launch pricing (Adham, 2026-10-15): buyers in Saudi Arabia, the UAE and Egypt pay in SAR / AED / EGP with VAT ADDED
// (local.countries in data/pricing.json; packages[].prices / extra_platform_prices are NET before VAT); every other country
// pays the USD price with no VAT. Every price carries its local net prices; site.js shows the buyer's currency (by country,
// never by page language) with "price + VAT = total" on every page but the legal ones.
const COUNTRIES_ALL = PRICING.local.countries;
// The countries the site serves NOW (owner 2026-11-15, temporary until the payment gateway exists: Egypt only): data/pricing.json
// funnel.countries, republished from the portal's price list. RESTRICTED (a list that leaves a country out) = no country picker, no
// "Another country (US dollars)", every price written in the first served country's currency (legal pages too) and Offers only there.
// Every other country's price stays in data/pricing.json; to undo, the owner changes that one list in the portal's pricing.json and
// republishes (portal/scripts/publish-pricing.cjs).
const FUNNEL_CC = (Array.isArray(PRICING.funnel?.countries) ? PRICING.funnel.countries : []).filter((c) => c in COUNTRIES_ALL);
const COUNTRIES = FUNNEL_CC.length ? Object.fromEntries(Object.entries(COUNTRIES_ALL).filter(([cc]) => FUNNEL_CC.includes(cc))) : COUNTRIES_ALL;
// S05 (audit 3): the public data/pricing.json carries ONLY the served countries, so a funnel list means one-country mode
const RESTRICTED = FUNNEL_CC.length > 0 && (Object.keys(COUNTRIES).length < Object.keys(COUNTRIES_ALL).length || PRICING.schema === 'crier-public-pricing/1');
// VAT (review fix 2026-11-14, owner: not VAT-registered anywhere): a VAT line or "+ VAT" is shown only for a country whose price
// data marks VAT as charged (vat_pct above 0, and vat_charged not false). Otherwise the price shown is the amount due.
const vatOn = (cc) => !!cc && !!COUNTRIES[cc] && Number(COUNTRIES[cc].vat_pct) > 0 && COUNTRIES[cc].vat_charged !== false;
const vatPct = (cc) => (vatOn(cc) ? Number(COUNTRIES[cc].vat_pct) : 0);
const CURS = [...new Set(['USD', ...Object.values(COUNTRIES_ALL).map((c) => c.currency)])]; // every currency stays in data-* (one-country mode shows only its own) // the USA (2026-11-13) is a country in USD: listed once
// MENA landing (2026-10-16): a visitor whose country is unknown is quoted as Saudi Arabia (SAR + VAT), on every language page.
// The HTML is written in this country's prices (no flash of US dollars); site.js then follows the visitor's pick, Cloudflare or
// the time zone. The legal pages keep the US-dollar price list.
// Several countries served (MULTI, owner 2026-11-19: Egypt, the USA, Saudi Arabia and the UAE, each in its own currency): the pages are
// written for the FIRST one (Egypt), which is also what a visitor from any other country sees; every price carries every served
// currency (data-*), and a text that differs by country has <key>.us / .sa / .ae wording carried beside it (data-cv-*), for site.js
// to show the visitor's own country (Cloudflare's /cdn-cgi/trace). No picker. Keys with a ".all" variant hold the four-country wording
// (legal pages, titles), read before the first country's ".eg" variant. Arabic pages send a US visitor (never a crawler) to /en/.
const MULTI = RESTRICTED && FUNNEL_CC.length > 1;
const DEFAULT_CC = RESTRICTED ? FUNNEL_CC[0] : 'SA';
if (!COUNTRIES[DEFAULT_CC]) throw new Error('DEFAULT_CC is not in data/pricing.json local.countries');
let htmlCc = DEFAULT_CC; // the country the page being built is written in (null = US dollars); set per page in the build loop
// the same arithmetic as the checkout server and site.js: VAT on the whole order, in integer cents, rounded half-up
function localQuote(id, cc, extra = 0) {
  const k = PKG[id], L = COUNTRIES[cc];
  const base = k.prices?.[L.currency], each = extra ? k.extra_platform_prices?.[L.currency] : 0;
  if (typeof base !== 'number' || (extra && typeof each !== 'number')) throw new Error(`data/pricing.json: no ${L.currency} price for ${id}`);
  const pct = vatPct(cc), net = Math.round(base * 100) + extra * Math.round((each || 0) * 100), vat = Math.floor((net * pct + 50) / 100);
  return { currency: L.currency, vat_pct: pct, net, vat, total: net + vat }; // minor units (cents)
}
const minorStr = (m) => `${Math.floor(m / 100)}.${String(m % 100).padStart(2, '0')}`;
// the per-package numbers site.js needs for the order form total: { kit: { inc, billing, USD: [price, extra], SAR: [...], ... } }
const PKGDATA = Object.fromEntries(PRICING.packages.filter((p) => !p.coming_soon).map((p) => [p.id, Object.fromEntries([
  ['inc', p.platforms_included || 1], ['billing', p.billing], ['USD', [p.price, p.extra_platform_price || 0]],
  ...CURS.slice(1).map((c) => [c, [p.prices[c], p.extra_platform_prices?.[c] || 0]])])]));
// WhatsApp (M14): data/contact.json. Empty = no WhatsApp link anywhere (never a broken wa.me link). ADHAM supplies the number.
const CONTACT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'contact.json'), 'utf8'));
const WA = String(CONTACT.whatsapp || '').replace(/[\s+()-]/g, '');
if (WA && !/^[1-9]\d{7,14}$/.test(WA)) throw new Error('data/contact.json: whatsapp must be the number in international format, digits only');
// the number as people read it (Egypt: +20 114 600 0101), for the contact sentences ({wa})
const WA_TEXT = WA.startsWith('20') && WA.length === 12 ? `+20 ${WA.slice(2, 5)} ${WA.slice(5, 8)} ${WA.slice(8)}` : '+' + WA;
const MONTHLY = new Set(PRICING.packages.filter((p) => p.billing === 'monthly').map((p) => p.id)); // billed monthly (Bronze, Silver, Gold, Diamond); the deck is one-time
// the Social packages on sale, in tier order (2026-11-15: Bronze, Silver, Gold, Diamond): the cards on /pricing/ and the home table
const SOCIAL = PRICING.packages.filter((p) => p.billing === 'monthly' && !p.coming_soon && !p.retired).sort((a, b) => (a.tier || 0) - (b.tier || 0)).map((p) => p.id);
// product names are i18n keys (name.<id>) so every language shows its own name
const PRODUCTS = Object.keys(PRICES);
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dicts = Object.fromEntries(LANGS.map(([c]) => [c, JSON.parse(rd(`i18n/${c}.json`))]));
const partials = {
  logo: rd('templates/logo.svg.html'), footer: rd('templates/footer.html'), header: rd('templates/header.html'),
  consent: rd('templates/consent.html'), panels: rd('templates/instore-panels.html'), waFloat: rd('templates/wa-float.html'),
  // the new home page (2026-11-15): its "How it works" slot ({{>how}} in templates/home-v2.html) is the video section, and its hero is the
  // animated phone ({{>hero-v2}})
  how: rd('templates/how-video.html'), 'hero-v2': rd('templates/hero-v2.html'),
};
const CSS = {
  fonts: rd('templates/fonts.css'), fontsAr: rd('templates/fonts-ar.css'), common: rd('templates/common.css'),
  home: rd('templates/home.css'), legal: rd('templates/legal.css'), consent: rd('templates/consent.css'), chrome: rd('templates/studio-shared.css'),
  sculpt: rd('templates/sculptures.css'), motion: rd('templates/landing-motion.css'),
};
const faqCss = CSS.home.slice(CSS.home.indexOf('/* faq */'), CSS.home.indexOf('/* closing */'));

// ---------- text helpers ----------
const used = new Set();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// While one country is served (RESTRICTED, Egypt only since 2026-11-15) a key may have a variant `<key>.<cc>` (e.g. home.eyebrow.eg)
// with the wording for that time: Egypt only, payment details on WhatsApp (InstaPay). The variant is used in its place; the
// ordinary text stays and comes back by itself when the switch is undone. Both count as used.
const VARIANTS = RESTRICTED ? [...(MULTI ? ['.all'] : []), '.' + DEFAULT_CC.toLowerCase()] : [];
// cc (MULTI only): the text a visitor from that country reads, <key>.<cc> when there is one, else the page's own text
function raw(lang, key, cc) {
  used.add(key);
  const own = cc && cc !== DEFAULT_CC ? key + '.' + cc.toLowerCase() : null;
  if (own && dicts[lang][own] != null) { used.add(own); key = own; }
  else for (const v of VARIANTS) if (dicts[lang][key + v] != null) { used.add(key + v); key = key + v; break; }
  // S08 (audit 3): a text that gives the WhatsApp number ({wa}) has a "<key>.nowa" twin without it, used when data/contact.json has
  // no number (both count as used); the build fails rather than write "on WhatsApp at +"
  if (dicts[lang][key] != null && dicts[lang][key].includes('{wa}')) {
    if (dicts[lang][key + '.nowa'] == null) throw new Error(`i18n ${key} (${lang}) names {wa} but has no ${key}.nowa text for a site without a WhatsApp number`);
    used.add(key + '.nowa'); if (!WA) key = key + '.nowa';
  }
  const v = dicts[lang][key];
  if (v == null) throw new Error(`missing i18n key ${key} (${lang})`); // strict: no silent fallback to English
  return fillPricing(v, key, lang);
}
// Counts (2026-11-15, voice guide): ONE helper, never «{n} تصميمًا». `{c:<id>.<item>:<noun>}` writes the count with its noun in
// the right form: i18n cnt.<noun> holds the forms by plural category, "one:…|two:…|few:{n} …|many:{n} …|other:{n} …"
// (Intl.PluralRules: Arabic few = 3–10, many = 11–99; English one / other). Digits stay 0–9.
function countText(lang, noun, n) {
  const forms = Object.fromEntries(raw(lang, 'cnt.' + noun).split('|').map((x) => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
  const f = forms[new Intl.PluralRules(lang).select(n)] ?? forms.other;
  if (f == null) throw new Error(`i18n cnt.${noun} (${lang}): no form for ${n}`);
  return f.replace('{n}', String(n));
}
const vars = { brand: BRAND, email: EMAIL, wa: WA_TEXT }; // wa: the WhatsApp number as people read it (a wa.me link in HTML text)
// a `.<cc>` variant of a key is read only while that one country is served; it is not an unused key at other times
const VARIANT_RE = /\.(sa|ae|eg|us|all)$/;
function fillPricing(v, key, lang) {
  const need = (x, what) => { if (x == null) throw new Error(`i18n ${key}: ${what} is not in data/pricing.json`); return x; };
  // a price becomes a marker \u0002<usd>|<SAR>|<AED>|<EGP>\u0002: t() writes it as $<usd>, h() as a <span> site.js can localise
  // S05: the public price data has no US-dollar price while only other countries are served; one-country pages never write it
  const mark = (usd, loc, what) => '\u0002' + [RESTRICTED && usd == null ? '0' : need(usd, what), ...CURS.slice(1).map((c) => need(loc?.[c], what + ' ' + c))].join('|') + '\u0002';
  // {price:<id>@<CC>}: that country's price as plain text, whatever the page's country (the legal pages' list of the four)
  return v.replace(/\{price:(\w+)@([A-Z]{2})\}/g, (m, id, cc) => { if (!COUNTRIES[cc]) throw new Error(`i18n ${key}: ${cc} is not served`); return display(lang, localQuote(id, cc)); })
    .replace(/\{price:(\w+)\}/g, (m, id) => mark(PKG[id]?.price, PKG[id]?.prices, 'price ' + id))
    .replace(/\{extra:(\w+)\}/g, (m, id) => mark(PKG[id]?.extra_platform_price, PKG[id]?.extra_platform_prices, 'extra platform price ' + id))
    .replace(/\{plat:(\w+)\}/g, (m, id) => String(need(PKG[id]?.platforms_included, 'platforms of ' + id)))
    .replace(/\{n:(\w+)\.(\w+)\}/g, (m, id, item) => String(need(PKG[id]?.items?.[item], `count ${id}.${item}`)))
    .replace(/\{c:(\w+)\.(\w+):(\w+)\}/g, (m, id, item, noun) => countText(lang, noun, need(PKG[id]?.items?.[item], `count ${id}.${item}`)));
}
const PRICE_MARK = /\u0002([\d.|]+)\u0002/g;
// money and "price + VAT = total" exactly as site.js writes them (fmtNum, money, display there)
function fmtNum(n) {
  const m = Math.round(n * 100), f = m % 100, i = String((m - f) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return f ? `${i}.${String(f).padStart(2, '0')}` : i;
}
const fmtMoney = (lang, cur, n) => (cur === 'USD' ? '$' + fmtNum(n) : t(lang, 'cur.fmt').replace('{n}', () => fmtNum(n)).replace('{cur}', () => t(lang, 'cur.sym' + cur)));
function display(lang, q) {
  if (!q.vat_pct) return fmtMoney(lang, q.currency, q.total / 100);
  const r = { net: fmtMoney(lang, q.currency, q.net / 100), pct: String(q.vat_pct), vat: fmtMoney(lang, q.currency, q.vat / 100), total: fmtMoney(lang, q.currency, q.total / 100) };
  return t(lang, 'cur.vatLine').replace(/\{(net|pct|vat|total)\}/g, (m, k) => r[k]);
}
const htmlCur = () => (htmlCc ? COUNTRIES[htmlCc].currency : 'USD');
// a price: every currency in data-*, the text in the page's default country (net, "+ VAT" after a price inside a sentence;
// a card's big price is followed by its VAT line instead)
function priceSpan(lang, vals, cls = 'amt') {
  const [usd, ...loc] = String(vals).split('|'), cur = htmlCur();
  const text = cur === 'USD' ? '$' + fmtNum(+usd) : fmtMoney(lang, cur, +loc[CURS.indexOf(cur) - 1]) + (/(^|\s)(?:price|price-list)(\s|$)/.test(cls) || !vatOn(htmlCc) ? '' : ' ' + t(lang, 'cur.plusVat'));
  // One country served (N35, audit 2): the price is written once, in that country's currency, and the page source carries no other
  // currency (no data-usd / data-sar / data-aed, no #cur-data). With several countries each price carries them all for site.js.
  const data = RESTRICTED && !MULTI ? '' : ` data-usd="${usd}"${CURS.slice(1).map((c, i) => ` data-${c.toLowerCase()}="${loc[i]}"`).join('')}`;
  return `<span class="${cls}" dir="${cur !== 'USD' && RTL.has(lang) ? 'rtl' : 'ltr'}"${data}>${esc(text)}</span>`;
}
// plain-text price: US dollars, or (one country served, S05) that country's currency, the same text priceSpan() shows
const priceText = (lang, vals) => { const [usd, ...loc] = String(vals).split('|'), cur = RESTRICTED ? htmlCur() : 'USD'; return cur === 'USD' ? '$' + fmtNum(+usd) : fmtMoney(lang, cur, +loc[CURS.indexOf(cur) - 1]); };
const t = (lang, key) => raw(lang, key).replace(PRICE_MARK, (m, vals) => priceText(lang, vals)).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/<\/?(?:b|a)>/g, '');
// MULTI: a text with a <key>.us / .sa / .ae variant is wrapped in <span class="cv" data-cv-us="…"> with each country's own HTML
function h(lang, key, href) {
  const s = hHtml(lang, raw(lang, key), href);
  const alts = MULTI ? Object.keys(COUNTRIES).filter((cc) => cc !== DEFAULT_CC && dicts[lang][key + '.' + cc.toLowerCase()] != null) : [];
  if (!alts.length) return s;
  return `<span class="cv"${alts.map((cc) => ` data-cv-${cc.toLowerCase()}="${esc(hHtml(lang, raw(lang, key, cc), href))}"`).join('')}>${s}</span>`;
}
function hHtml(lang, text, href) {
  let s = text.replace(/\{(\w+)\}/g, (m, k) => (k === 'email' ? '\u0001E\u0001' : k === 'wa' && WA ? '\u0001W\u0001' : vars[k] ?? m));
  s = esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>')
    .replace(/&lt;a&gt;/g, href ? `<a href="${esc(href)}">` : '<a>').replace(/&lt;\/a&gt;/g, '</a>')
    .replace(/\u0001E\u0001/g, `<a dir="ltr" href="mailto:${EMAIL}">${EMAIL}</a>`).replace(/\u0001W\u0001/g, `<a dir="ltr" href="https://wa.me/${WA}" rel="noopener" target="_blank">${esc(WA_TEXT)}</a>`).replace(PRICE_MARK, (m, vals) => priceSpan(lang, vals));
  return s;
}
const jsonScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// ---------- URLs ----------
const dirFor = (lang, page) => (lang === DEFAULT_LANG ? '' : lang + '/') + (page === 'index' ? '' : page + '/');
const pathFor = (lang, page) => '/' + dirFor(lang, page);
const urlFor = (lang, page) => SITE + pathFor(lang, page);

// ---------- template engine ----------
function render(tpl, ctx) {
  let prev;
  do { prev = tpl; tpl = tpl.replace(/\{\{>([\w-]+)\}\}/g, (_, p) => { if (!(p in partials)) throw new Error('no partial ' + p); return partials[p]; }); } while (tpl !== prev);
  return tpl
    .replace(/\{\{t:([\w.-]+)(?:@([\w-]+)(#[\w-]+)?)?\}\}/g, (_, k, pg, hash) => h(ctx.lang, k, pg ? pathFor(ctx.lang, pg) + (hash || '') : null))
    .replace(/\{\{a:([\w.-]+)\}\}/g, (_, k) => esc(t(ctx.lang, k)))
    .replace(/\{\{=(\w+)\}\}/g, (_, n) => { if (!(n in ctx.v)) throw new Error('no var ' + n); return ctx.v[n]; });
}

// ---------- generated blocks ----------
const syms = [
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="6" y="4" width="32" height="36" fill="none" stroke="currentColor" stroke-width="4"/><rect x="13" y="13" width="18" height="4" fill="currentColor"/><rect x="13" y="22" width="12" height="4" fill="currentColor"/></svg>',
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="8" width="36" height="30" fill="none" stroke="currentColor" stroke-width="4"/><rect x="4" y="8" width="36" height="8" fill="var(--accent)" stroke="currentColor" stroke-width="2"/><rect x="11" y="22" width="6" height="6" fill="currentColor"/><rect x="21" y="22" width="6" height="6" fill="currentColor"/></svg>',
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="4" width="16" height="16" fill="var(--sun)" stroke="currentColor" stroke-width="2"/><rect x="24" y="4" width="16" height="16" fill="var(--coral)"/><rect x="4" y="24" width="16" height="16" fill="currentColor"/><path d="M26 32l5 5 9-11" fill="none" stroke="currentColor" stroke-width="4"/></svg>',
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="10" width="36" height="26" fill="none" stroke="currentColor" stroke-width="4"/><path d="M4 30l10-9 8 7 6-5 12 9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="31" cy="18" r="3" fill="var(--sun)" stroke="currentColor" stroke-width="1.5"/></svg>',
];
const INDCOLORS = [['sun', 'coral'], ['coral', 'accent'], ['accent', 'ink'], ['ink', 'sun'], ['sun', 'accent']];
// FAQ ids (keys faq.<id>q, faq.<id>a1, faq.<id>a2)
const FAQ_ALL = [19, 20, 22, 23, 24, 25, 11, 12, 13, 14, 15, 16, 1, 7, 2, 4, 5, 17, 9];
const FAQ_DECK = [11, 12, 13, 14, 15, 16];

function faqAnswers(lang, i) {
  const out = [];
  for (const j of [1, 2]) { const k = `faq.${i}a${j}`; if (dicts[lang][k] != null) out.push(k); }
  return out;
}
// swap: answer keys replaced by another key on that page (home: faq.1a2 without the stock-photo clause)
function faqItems(lang, ids, openFirst, swap = {}) {
  return ids.map((i, n) => {
    const ans = faqAnswers(lang, i).map((k) => swap[k] || k).map((k) => `<p>${h(lang, k, pathFor(lang, 'privacy'))}</p>`).join('');
    return `<details${openFirst && n === 0 ? ' open' : ''}><summary>${h(lang, `faq.${i}q`)}</summary><div class="ans">${ans}</div></details>`;
  }).join('');
}
// Language links (audit fixes, 2026-10-19): on every page EN always leads to English and AR to Arabic, in that order (the group is
// dir="ltr" so RTL pages do not swap them). The accessible name is the language's own name with the visible code in it
// ("English (EN)", "العربية (AR)"), and only the page's own language carries aria-current.
function langpick(lang, page) {
  const links = LANGS.map(([c, name]) => {
    const label = name + ' (' + c.toUpperCase() + ')';
    const href = pathFor(c, page) + '?lang=' + c;
    return '<a href="' + esc(href) + '" lang="' + c + '" hreflang="' + c + '" dir="' + (RTL.has(c) ? 'rtl' : 'ltr') + '" aria-label="' + esc(label) + '" title="' + esc(name) + '"' + (c === lang ? ' aria-current="true"' : '') + '>' + c.toUpperCase() + '</a>';
  }).join('');
  return '<div class="langpick" role="group" dir="ltr" aria-label="' + esc(t(lang, 'lang.label')) + '">' + links + '</div>';
}
function navLinks(lang, page, mark, list = NAV) {
  return list.map(([target, key]) => {
    const ext = target.startsWith('http');
    return `<a href="${ext ? (target === PORTAL ? portalHome(lang) : target) : pathFor(lang, target)}"${mark && target === page ? ' aria-current="page"' : ''}>${esc(t(lang, key))}</a>`;
  }).join('');
}
function crumbs(lang, page) {
  if (page === 'index' || !CRUMB_KEY[page]) return '';
  return `<nav class="crumbs" aria-label="${esc(t(lang, 'crumb.label'))}"><a href="${pathFor(lang, 'index')}">${esc(t(lang, 'crumb.home'))}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(t(lang, CRUMB_KEY[page]))}</span></nav>`;
}
function hrefs(lang) {
  const o = { homeHref: pathFor(lang, 'index'), deckCtaHref: pathFor(lang, 'brand-deck') + '#availability',
    deckWaitHref: `mailto:${EMAIL}?subject=Brand%20Deck%20waitlist`, storeWaitHref: pathFor(lang, 'in-store') + '#waitlist', storeKitHref: pathFor(lang, 'in-store') + '#kit' };
  const NAME = { index: 'home', 'brand-deck': 'deck', 'in-store': 'instore' };
  for (const p of PAGES) o[(NAME[p] || p) + 'Href'] = pathFor(lang, p);
  return o;
}
// ---- synthetic Crier Deck sample sheets: drawn in HTML/CSS, every one labelled, no real business ----
function sheet(lang, n) {
  const lab = `<span class="lab">${h(lang, 'sample.label')}</span>`;
  const biz = h(lang, 'sample.biz');
  const aria = esc(t(lang, `sample.c${n}`));
  if (n === 1) return `<div class="sheet s-id" role="img" aria-label="${aria}"><div class="id-l"><span class="mark"></span><b>${biz}</b><small>${h(lang, 'sample.tag')}</small></div><div class="id-r"><div class="sw"><i style="background:var(--sun)"></i><i style="background:var(--coral)"></i><i style="background:var(--ink)"></i><i style="background:var(--paper)"></i></div><small>${h(lang, 'sample.colors')}</small></div>${lab}</div>`;
  if (n === 2) return `<div class="sheet s-prod" role="img" aria-label="${aria}"><div class="apron"><span class="mark"></span></div><div class="pt"><b>${h(lang, 'sample.apron')}</b><small>${biz}</small></div>${lab}</div>`;
  if (n === 3) return `<div class="sheet s-prod" role="img" aria-label="${aria}"><div class="menu"><span><i>${h(lang, 'sample.m1')}</i><em></em></span><span><i>${h(lang, 'sample.m2')}</i><em></em></span><span><i>${h(lang, 'sample.m3')}</i><em></em></span></div><div class="pt"><b>${h(lang, 'sample.menu')}</b><small>${biz}</small></div>${lab}</div>`;
  const cells = [['apron', 'sun'], ['menu', 'ink'], ['cup', 'coral'], ['tote', 'accent'], ['sign', 'paper'], ['card', 'sun']]
    .map(([k, c]) => `<span class="c-${c}"><i></i><em>${h(lang, `sample.${k}`)}</em></span>`).join('');
  return `<div class="sheet s-cat" role="img" aria-label="${aria}"><div class="cells">${cells}</div>${lab}</div>`;
}
const fig = (lang, n) => `<figure class="sheetfig">${sheet(lang, n)}<figcaption>${h(lang, `sample.c${n}`)}</figcaption></figure>`;

// 2026-11-13: one price per package and country, no list price (nothing is struck through)
const money = (lang, p) => `<span class="price-pair">${priceSpan(lang, [PRICES[p], ...CURS.slice(1).map((c) => PKG[p].prices[c])].join('|'), 'price amt')}</span>`;
// "Your country" dropdown: Saudi Arabia / UAE / Egypt first, "Another country (US dollars)" last (never free text). Used above
// the prices (home, pricing and kit pages) and in the order form; site.js keeps every one of them on the same country and sends
// that country to the checkout. Selected in the HTML: the default country (Saudi Arabia).
const CC_OPTS = [...Object.keys(COUNTRIES), ...(RESTRICTED ? [] : ['other'])];
const ccOptions = (lang) => CC_OPTS.map((c) => `<option value="${c}"${c === (htmlCc || 'other') ? ' selected' : ''}>${esc(t(lang, 'cc.' + c))}</option>`).join('');
// Country picker + VAT note (home, pricing and kit pages) and the currency data site.js reads. The picker is hidden until
// site.js runs (it needs JavaScript); the prices and the VAT note are already written for the default country.
function curPick(lang) {
  if (RESTRICTED) { // one country served: no picker, just what the prices are in (site.js keeps the page on that country)
    const n = t(lang, 'cur.note' + htmlCur()) + ' ' + (vatOn(htmlCc) ? t(lang, 'cur.vatAdded').replace('{vat}', vatPct(htmlCc)) : t(lang, 'cur.due'));
    return `<div class="curbox" id="curbox"><p class="fine vatnote" id="vat-note" aria-live="polite">${esc(n)}</p></div>`;
  }
  const note = htmlCc ? t(lang, 'cur.note' + htmlCur()) + ' ' + (vatOn(htmlCc) ? t(lang, 'cur.vatAdded').replace('{vat}', vatPct(htmlCc)) : t(lang, 'cur.due')) : '';
  return `<div class="curbox" id="curbox" hidden><label class="curpick"><span>${h(lang, 'cur.label')}</span><select id="cur-select" data-cc>${ccOptions(lang)}</select></label><p class="fine vatnote" id="vat-note" aria-live="polite">${esc(note)}</p></div>`;
}
// the line under a price: "SAR 109 + VAT 15% SAR 16.35 = SAR 125.35" (+ "/mo" for a monthly plan); site.js rewrites it for the
// visitor's country and hides it in US dollars (no VAT)
function vatNote(lang, p, per = '') {
  const q = htmlCc && vatOn(htmlCc) ? localQuote(p, htmlCc) : null;
  return `<p class="usdnote" data-pkg="${p}"${per ? ` data-per="${esc(per)}"` : ''}${q ? '' : ' hidden'}>${q ? esc(display(lang, q) + per) : ''}</p>`;
}
function curData(lang) {
  const countries = Object.fromEntries(Object.entries(COUNTRIES).map(([cc, c]) => [cc, { currency: c.currency, vat_pct: vatPct(cc) }]));
  const o = { countries, def: DEFAULT_CC, ...(RESTRICTED && !MULTI ? { lock: DEFAULT_CC } : {}), ...(MULTI ? { fallback: DEFAULT_CC } : {}), fmt: t(lang, 'cur.fmt'), vatLine: t(lang, 'cur.vatLine'), plusVat: t(lang, 'cur.plusVat'), vatAdded: t(lang, 'cur.vatAdded'), due: t(lang, 'cur.due'), pk: PKGDATA };
  for (const c of CURS) Object.assign(o, { ['sym' + c]: t(lang, 'cur.sym' + c), ['note' + c]: t(lang, 'cur.note' + c) });
  if (RESTRICTED && !MULTI) return ''; // one country served: nothing for site.js to switch (the texts above are still read, so they stay in use)
  return `<script type="application/json" id="cur-data">${jsonScript(o)}</script>`;
}
// M14: a WhatsApp link only when data/contact.json has a number (the label key is always read, so it is never "unused")
// S08 (audit 3, 2026-11-17): THE contact-link resolver, for the generic, package, floating, quote and legal links. With a number in
// data/contact.json: wa.me/<number> with the message in the page language. Without one: the portal sign-up in the page language,
// keeping the chosen package (?plan=), or email when asked (mail: the custom-piece quote). Never a wa.me link without a recipient.
function contactHref(lang, msg, { plan, mail } = {}) {
  if (WA) return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  return mail ? `mailto:${EMAIL}?subject=${encodeURIComponent(msg)}` : signupUrl(lang, plan);
}
// a contact link with a prefilled message (an i18n key, in the page language)
const waHref = (lang, key, opts) => contactHref(lang, t(lang, key), opts);
// the page's main "Subscribe on WhatsApp" button (where: the GA4 wa_location); without a number, "Create your account" to the sign-up
function ctaBtn(lang, key, where) {
  const fallback = h(lang, 'lp.cta.account'), label = h(lang, 'lp.cta'), href = waHref(lang, key); // all read either way: never "unused"
  if (WA) return `<a class="btn wa-order" href="${esc(href)}" target="_blank" rel="noopener" data-wa="${where}">${label}</a>`;
  return `<a class="btn" href="${esc(contactHref(lang, ''))}" data-signup="${where}">${fallback}</a>`;
}
// the floating WhatsApp button (2026-11-15): every page and language, a short greeting in the page language
const waFab = (ctx) => (WA ? render(partials.waFloat, { lang: ctx.lang, v: { ...ctx.v, waFabHref: esc(waHref(ctx.lang, 'wa.fab.msg')) } }) + '\n' : (t(ctx.lang, 'wa.fab.aria'), t(ctx.lang, 'wa.fab.msg'), ''));
function waLink(lang) { const label = esc(t(lang, 'contact.wa')); return WA ? `<a href="https://wa.me/${WA}" rel="noopener" target="_blank" class="wa-link">${label}</a>` : ''; } // the label is a word in the page language (no dir="ltr": that is for the number itself)
// Order on WhatsApp (owner 2026-11-15): each Social package's MAIN button is a green "Order <package> on WhatsApp" that opens
// wa.me with the message prefilled with the package name and its monthly price (the page language, the page's country); under it a
// small "or create your account" link to the portal sign-up (?plan=<id>) and the "Pay by InstaPay" line. Payment details are
// given on WhatsApp until the payment gateway exists.
const waPrice = (lang, p) => (htmlCc ? display(lang, localQuote(p, htmlCc)) : '$' + fmtNum(PKG[p].price));
const waPayHref = (lang, p) => contactHref(lang, t(lang, 'pay.wa.msg').replace('{pkg}', () => pname(lang, p)).replace('{price}', () => waPrice(lang, p)), { plan: p });
function waPay(lang, p) {
  const line = h(lang, 'pay.wa.line'); waPayHref(lang, p); // both read without a number too (S08: the build must not fail on unused keys)
  if (!WA || PKG[p]?.coming_soon) return ''; // the Brand Deck is coming soon: never payable
  return `<p class="wapay fine" data-pkg="${p}">${line}</p>`;
}
const pname = (lang, p) => t(lang, `name.${p}`);
// Audit fixes (2026-10-19): every buy / plan button opens the client portal's sign-up (AR pages with ?lang=ar); the public
// order form is gone. The portal supports no plan intent, so none is sent.
// Review fix (2026-11-14): the portal reads only ?lang=en|ar (hash or query, portal/public/app.js boot) and ?intent=quote; it has
// no plan or package parameter, so the chosen package cannot be passed and only the page language is sent.
// THE one place the portal sign-up link is built (2026-11-14): SIGNUP_PATH is the portal's sign-up route; a package button adds
// plan=<package id from data/pricing.json> (the portal is gaining ?plan=; an older portal ignores it), every link adds lang.
const SIGNUP_PATH = '#/signup';
const signupUrl = (lang, plan) => `${PORTAL}${SIGNUP_PATH}?${plan ? `plan=${encodeURIComponent(plan)}&` : ''}lang=${lang}`;
const portalHome = (lang) => `${PORTAL}?lang=${lang}`;
function buyHref(lang, p) { if (!PKG[p] || PKG[p].coming_soon) throw new Error('no buy link for ' + p); return signupUrl(lang, p); } // (payment-links.json, always empty, was deleted on 2026-11-16)
// MULTI: the same link written for each other served country (data-cv-href-us …), for site.js to use the visitor's own
function cvHrefs(fn) {
  if (!MULTI) return '';
  const keep = htmlCc;
  try { return Object.keys(COUNTRIES).filter((cc) => cc !== DEFAULT_CC).map((cc) => { htmlCc = cc; return ` data-cv-href-${cc.toLowerCase()}="${esc(fn())}"`; }).join(''); } finally { htmlCc = keep; }
}
function buyBtn(lang, p, ghost, noNote) { // noNote: the card carries the "Pay by InstaPay" WhatsApp line instead (waPay)
  if (p === 'deck') return `<button class="btn coming-soon" type="button" disabled data-unavailable="deck">${h(lang, 'pkg.deck.btn')}</button><span class="paynote">${h(lang, 'availability.deck')}</span>`;
  const payNote = h(lang, 'pay.note'); // read even when not shown: it comes back when data/contact.json has no WhatsApp number
  const choose = h(lang, `pkg.${p}.btn`), order = h(lang, `pkg.${p}.wa`), acct = h(lang, 'plan.orAccount'); // all read: the plain button comes back without a number
  if (WA && SOCIAL.includes(p)) return `<a class="btn wa-order" href="${esc(waPayHref(lang, p))}" data-product="${p}" data-wa-order="${p}" rel="noopener" target="_blank"${cvHrefs(() => waPayHref(lang, p))}>${order}</a><a class="acct-link" href="${esc(buyHref(lang, p))}" data-signup="${p}">${acct}</a>`;
  const note = noNote ? '' : `<span class="paynote">${payNote}</span>`;
  return `<a class="btn${ghost ? ' ghost' : ''}" href="${esc(buyHref(lang, p))}" data-product="${p}">${choose}</a>${note}`;
}
function ticks(lang, prefix, cls) {
  const out = [];
  for (let i = 1; dicts[lang][`${prefix}.f${i}`] != null; i++) out.push(`<li>${h(lang, `${prefix}.f${i}`)}</li>`);
  return `<ul class="ticks${cls ? ' ' + cls : ''}">${out.join('')}</ul>`;
}
// one package card: eyebrow, name, one-line pitch, price, billing line, features, small print, Buy button
function planCard(lang, p, hot) {
  const per = MONTHLY.has(p) ? 'plan.per' : 'one.per';
  const bill = MONTHLY.has(p) ? 'plan.bill' : `pkg.${p}.bill`;
  // the VAT line ("SAR 109 + VAT 15% SAR 16.35 = SAR 125.35"), hidden in US dollars (no VAT). The Brand Deck is coming soon
  // and is never payable, so its card has no such line.
  const vatLine = '';
  return `<article class="plan${hot ? ' hot' : ''}" data-plan="${p}"><span class="badge">${h(lang, `pkg.${p}.eye`)}</span><h3>${esc(pname(lang, p))}</h3><p class="pt">${h(lang, `pkg.${p}.tag`)}</p><div class="priceline">${money(lang, p)}<span class="per">${h(lang, per)}</span></div>${vatLine}<p class="billnote">${h(lang, bill)}</p>${platPick(lang, p)}${ticks(lang, `pkg.${p}`)}<p class="pnote">${h(lang, `pkg.${p}.note`)}</p><div class="buyrow">${buyBtn(lang, p, !hot, !!waPay(lang, p))}</div>${waPay(lang, p)}</article>`;
}
// ---- home: Landing A "Billboard" (Adham, 2026-11-06) ----
// Hero headline + the Instagram-ready phone (a made-up example café, labelled as an example), the smallest package in
// numbers, the client-portal walkthrough (kept, Adham 2026-11-07), the OK rule, the package table, the cream In-store teaser and
// a closing call. No FAQ on the home page.
// the headline's second sentence carries the lime highlight: split after the first sentence ("." in English, "…" in Arabic)
function heroH1(lang) {
  const m = t(lang, 'home.h1').match(/^(.+?[.…])\s*(\S.*)$/);
  if (!m) throw new Error(`home.h1 (${lang}): no sentence break to split the hero headline`);
  return `${esc(m[1])} <span class="hl">${esc(m[2])}</span>`;
}
// the OK rule: four promises, the last one links the refund policy
function homeTrust(lang) {
  const li = [['la.ok.1', 'home.trust.approve'], ['la.ok.2', 'home.trust.own'], ['la.ok.3', 'home.trust.f2']].map(([b, k]) => `<li><b>${h(lang, b)}</b>${h(lang, k)}</li>`).join('');
  return `<ul class="la-oklist">${li}<li><b>${h(lang, 'la.ok.4')}</b>${h(lang, 'home.trust.f5')} <a href="${pathFor(lang, 'refund')}">${h(lang, 'home.trust.refund')}</a></li></ul>`;
}
// P1: a monthly package picks its platforms on the card; the live line ("Keep Growing · Instagram + Facebook · $90/mo") is computed in
// the browser from the numbers below (data/pricing.json: price + (platforms - included) × extra_platform_price), never typed.
// The first platform is ticked; the server-side line is the one-platform price so the page reads right without JavaScript.
function platPick(lang, p) {
  const k = PKG[p]; if (!MONTHLY.has(p) || !k.extra_platform_price) return '';
  const first = PRICING.platforms[0];
  const cur = htmlCur(), shown = cur === 'USD' ? '$' + k.price : fmtMoney(lang, cur, k.prices[cur]) + (vatOn(htmlCc) ? ' ' + t(lang, 'cur.plusVat') : '');
  const line = t(lang, 'plan.live').replace('{name}', () => pname(lang, p)).replace('{platforms}', () => t(lang, 'plat.' + first)).replace('{price}', () => shown).replace('{per}', () => t(lang, 'plan.perShort'));
  const boxes = PRICING.platforms.map((id) => `<label class="opt"><input type="checkbox" name="pp-${p}" value="${esc(id)}"${id === first ? ' checked' : ''}><span>${h(lang, 'plat.' + id)}</span></label>`).join('');
  // local NET prices (before VAT) for the live line: { SAR: [price, extra platform], AED: …, EGP: … }
  const local = Object.fromEntries(CURS.slice(1).map((c) => [c, [k.prices[c], k.extra_platform_prices[c]]]));
  return `<fieldset class="platpick" data-pkg="${p}" data-price="${k.price}" data-extra="${k.extra_platform_price}" data-local="${esc(JSON.stringify(local))}" data-included="${k.platforms_included || 1}" data-name="${esc(pname(lang, p))}" data-tpl="${esc(t(lang, 'plan.live'))}" data-per="${esc(t(lang, 'plan.perShort'))}"><legend>${h(lang, 'plan.pickPlatforms')}</legend><div class="opts">${boxes}</div><p class="liveprice" aria-live="polite" dir="auto">${esc(line)}</p><p class="fine">${h(lang, 'plan.extraNote')}</p></fieldset>`;
}
const planCards = (lang) => SOCIAL.map((p) => planCard(lang, p, p === 'seen')).join('');
const deckCards = (lang) => planCard(lang, 'deck', false);
const billItems = (lang) => { const out = []; for (let i = 1; dicts[lang][`bill.${i}`] != null; i++) out.push(`<li>${h(lang, `bill.${i}`)}</li>`); return out.join(''); };

function pageVars(lang, page) {
  const v = {
    ...hrefs(lang), langpick: langpick(lang, page), nav: navLinks(lang, page, true), navFoot: navLinks(lang, page, false, NAV_FOOT),
    crumbs: crumbs(lang, page), portalHref: portalHome(lang), signupHref: esc(signupUrl(lang)), emailLink: `<a href="mailto:${EMAIL}" dir="ltr">${EMAIL}</a>`,
    buyDeck: buyBtn(lang, 'deck', false), conv: lang === 'en' ? '' : `<p class="conv">${h(lang, 'leg.conv')}</p>`,
    waFoot: waLink(lang), waAbout: WA ? `<p>${waLink(lang)}</p>` : '',
  };
  if (page === 'in-store') Object.assign(v, storeVars(lang));
  if (page === 'sculptures') Object.assign(v, sculptVars(lang));
  // the month-1 kit (owner, keep): one plain line, only while the price list says the first month includes it
  if (page === 'pricing') { const kit = `<p class="lead kitline">${h(lang, 'pricing.kit')}</p>`; Object.assign(v, { planCards: planCards(lang), deckCards: deckCards(lang), billItems: billItems(lang), curPick: curPick(lang), kitLine: PRICING.rules?.first_month_includes_kit ? kit : '' }); }
  if (page === 'brand-deck') Object.assign(v, { deckFlow: flow(lang, 4, 'deck.how'), faqItems: faqItems(lang, FAQ_DECK, true), sheets: [1, 2, 4].map((n) => fig(lang, n)).join('') });
  if (page === 'samples') v.sheets = [1, 2, 3, 4].map((n) => fig(lang, n)).join('');
  if (page === 'faq') v.faqItems = faqItems(lang, FAQ_ALL, false);
  return v;
}
// ---- the new landing pages (home v2, /social/ v2) ----
const EXS = JSON.parse(rd('data/examples.json')).items;
for (const id of Object.keys(EXS)) if (!fs.existsSync(path.join(ROOT, 'assets', 'ex', id + '.webp'))) throw new Error('missing example image assets/ex/' + id + '.webp');
// one example post per made-up business, in the page language (each image carries its own «مثال / Example» label)
const EX_PICKS = { ar: ['cafe-01-offer-ar', 'perfume-03-bakhoor-ar', 'physio-01-tips-ar', 'abaya-02-detail-ar', 'bakery-01-photo-ar', 'cafe-05-tips-ar'],
  en: ['perfume-01-photo-en', 'cafe-04-carousel-en', 'physio-04-photo-en', 'abaya-03-carousel-en', 'bakery-03-carousel-en', 'abaya-05-tips-en'] };
const SP_STACK = { ar: ['cafe-01-offer-ar', 'abaya-04-offer-ar', 'bakery-07-story-ar'], en: ['cafe-02-photo-en', 'physio-08-poll-en', 'perfume-07-story-en'] };
const exImg = (lang, id, extra = ' loading="lazy" decoding="async"', cls = '') => { const x = EXS[id]; return `<img${cls ? ` class="${cls}"` : ''} src="/assets/ex/${id}.webp" width="${x.w}" height="${x.h}"${extra} alt="${esc(x.alt[lang])}">`; };
const exGallery = (lang) => EX_PICKS[lang].map((id) => `<li><figure>${exImg(lang, id)}<figcaption>${h(lang, 'lp.ind.' + EXS[id].business)}</figcaption></figure></li>`).join('');
const MK_ICONS = ['M4 4h16v16H4zM4 15l4-4 4 4 3-3 5 5', 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2', 'M4 5h16v14H4zM10 9l5 3-5 3z', 'M4 5h16v15H4zM8 3v4M16 3v4M4 10h16', 'M4 5h16v11H9l-5 4zM8 10h8', 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.6-1.4-.6-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.7-4-8.6-9-8.6zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01'];
const makeItems = (lang) => MK_ICONS.map((d, i) => `<li><span class="lp-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span><h3>${h(lang, `lp.mk.${i + 1}t`)}</h3><p>${h(lang, `lp.mk.${i + 1}x`)}</p></li>`).join('');
const qa = (lang, base) => `<details><summary>${h(lang, base + 'q')}</summary><div class="ans"><p>${h(lang, base + 'a', pathFor(lang, 'refund'))}</p></div></details>`;
const LP_FAQ = ['lp.faq.1', 'lp.faq.2', 'lp.faq.3', 'lp.faq.4', 'lp.faq.5'];
const SP_FAQ = ['sp.faq.1', 'lp.faq.1', 'lp.faq.3', 'sp.faq.4', 'sp.faq.5', 'sp.faq.6'];
// ---- the new home page's hero phone and "How it works" video (2026-11-15; templates/hero-v2.html, how-video.html, landing-motion.css,
// assets/landing.js). The phone's grid is the example posts as small tiles (assets/ex/s/<id>.webp, 240 px: cwebp -q 74 -resize 240 0
// from inputs/example-content); the first nine show, the next three drop in one by one. The video files are rendered by
// build/render-walkthrough.mjs, which also writes the step times to data/how-video.json.
const HV_GRID = { ar: ['cafe-01-offer-ar', 'perfume-03-bakhoor-ar', 'physio-01-tips-ar', 'abaya-02-detail-ar', 'bakery-01-photo-ar', 'cafe-05-tips-ar', 'perfume-01-photo-en', 'physio-04-photo-en', 'abaya-03-carousel-en', 'abaya-04-offer-ar', 'cafe-04-carousel-en', 'bakery-03-carousel-en'],
  en: ['perfume-01-photo-en', 'cafe-04-carousel-en', 'physio-04-photo-en', 'abaya-03-carousel-en', 'bakery-03-carousel-en', 'abaya-05-tips-en', 'cafe-01-offer-ar', 'perfume-03-bakhoor-ar', 'bakery-01-photo-ar', 'cafe-02-photo-en', 'physio-01-tips-ar', 'abaya-02-detail-ar'] };
const HV_STORY = { ar: 'perfume-08-poll-ar', en: 'cafe-08-poll-en' }; // story polls (no button text in them)
const HV_CAL = 'p..r.s.p..s.rp.s..p.r.sp..r.'; // one month: p post, r reel, s story
const hvSrc = (id) => { const u = `/assets/ex/s/${id}.webp`; if (!fs.existsSync(path.join(ROOT, u.slice(1)))) throw new Error('hero phone: missing example tile ' + u); return u; };
const HOW = JSON.parse(rd('data/how-video.json'));
const HW_STEPS = HOW.steps.length;
function motionVars(lang) {
  const tile = (id) => `<span class="hv-cell"><img src="${hvSrc(id)}" width="240" height="300" decoding="async" alt=""></span>`;
  const base = (size, v = '') => { const b = `/assets/video/how-${lang}${v}-${size}`; for (const ext of ['.mp4', '.webm', '-poster.jpg']) if (!fs.existsSync(path.join(ROOT, b.slice(1) + ext))) throw new Error('how-it-works video: missing ' + b + ext + ' (run node build/render-walkthrough.mjs)'); return b; };
  const two = (i) => String(i).padStart(2, '0');
  // the still state: step 1 is the one the poster shows
  const hwSteps = HOW.steps.map((_, k) => { const i = k + 1; return `<li class="wt-step${k ? '' : ' is-active'}" data-step="${i}"><button type="button" class="wt-btn" aria-controls="how-video" aria-current="${k ? 'false' : 'step'}"><span class="wt-num" aria-hidden="true">${two(i)}</span><span class="wt-text"><span class="wt-label">${h(lang, `hw.${i}l`)}</span><span class="wt-title">${h(lang, `hw.${i}t`)}</span></span></button><span class="wt-bar" aria-hidden="true"><i></i></span></li>`; }).join('');
  return {
    hvGrid: HV_GRID[lang].slice(0, 9).map(tile).join(''), hvNext: HV_GRID[lang].slice(9).map(hvSrc).join(','),
    hvStory: `<img src="${hvSrc(HV_STORY[lang])}" width="240" height="427" decoding="async" alt="">`,
    hvCal: [...HV_CAL].map((c) => (c === '.' ? '<i></i>' : `<i class="${c}"></i>`)).join(''), hvFol: esc(t(lang, 'hv.k').replace('{n}', '1.2')),
    hwSteps, hwTotal: two(HW_STEPS), hwTimes: HOW.steps.join(','), hwDur: String(HOW.duration), hwDesk: base('1080'), hwPhone: base('phone'),
    // MULTI (owner 2026-11-19): visitors from the other served countries (the USA, Saudi Arabia, the UAE) get the country-neutral
    // video (no InstaPay, no prices: render-walkthrough.mjs --v neutral); site.js switches to it. Egypt keeps the one above.
    hwNeutral: MULTI ? ` data-cv-video="${base('1080', '-neutral').replace(/-1080$/, '')}"` : '',
  };
}
const waBtn = ctaBtn; // (the home hero)
function landingVars(lang, page) {
  // S01 (audit 3, owner 2026-11-17): the second way to start, under the WhatsApp steps on the home page and /social/: set up first, then
  // pay on WhatsApp (the same two paths, in the same order, as the pricing, terms and refund pages)
  const common = { makeItems: makeItems(lang), exGallery: exGallery(lang), curPick: curPick(lang), planCards: planCards(lang), howAlt: `<p class="fine how-alt">${h(lang, 'how.alt', signupUrl(lang))}</p>` };
  // N31 (audit 2): the home page's "Subscribe on WhatsApp" buttons prefill the subscribe message (sp.wamsg), like /social/; only the
  // floating button keeps the "I would like to know more" greeting
  if (page === 'index') return { heroH1: heroH1(lang), trust: homeTrust(lang), ...common, ...motionVars(lang), heroBtn: waBtn(lang, 'sp.wamsg', 'home_hero'), ctaHomeClose: ctaBtn(lang, 'sp.wamsg', 'home_close'), ctaHomeHow: ctaBtn(lang, 'sp.wamsg', 'home_how'), lpFaq: LP_FAQ.map((k) => qa(lang, k)).join('') };
  return { ...common, ctaSocialHero: ctaBtn(lang, 'sp.wamsg', 'social_hero'), ctaSocialClose: ctaBtn(lang, 'sp.wamsg', 'social_close'), spFaq: SP_FAQ.map((k) => qa(lang, k)).join(''),
    spStack: SP_STACK[lang].map((id, i) => exImg(lang, id, ' decoding="async"', 's' + (i + 1))).join('') };
}
const LANDING_FAQ = { index: LP_FAQ, social: SP_FAQ };
function flow(lang, n, prefix) {
  return Array.from({ length: n }, (_, i) => i + 1).map((i) => `<div class="stage">${syms[i - 1]}<h3>${h(lang, `${prefix}.${i}t`)}</h3><p>${h(lang, `${prefix}.${i}x`)}</p></div>`).join('');
}
function inds(lang) {
  return Array.from({ length: IND_N }, (_, i) => i + 1).map((i) => {
    const sw = INDCOLORS[(i - 1) % INDCOLORS.length].map((c) => `<i style="background:var(--${c})"></i>`).join('');
    return `<div class="ind"><div class="swatch" aria-hidden="true">${sw}</div><h3>${h(lang, `ind.${i}n`)}</h3><p>${h(lang, `ind.${i}x`)}</p>${i === IND_NOTE ? `<p class="note">${h(lang, `ind.${IND_NOTE}note`)}</p>` : ''}</div>`;
  }).join('');
}
// "Seasons we cover": drawn cards (colour swatches only, no photos)
function seasons(lang) {
  return SEASONS.map((id, i) => {
    const sw = INDCOLORS[i % INDCOLORS.length].map((c) => `<i style="background:var(--${c})"></i>`).join('');
    return `<div class="ind season"><div class="swatch" aria-hidden="true">${sw}</div><h3>${h(lang, `season.${id}t`)}</h3><p>${h(lang, `season.${id}x`)}</p></div>`;
  }).join('');
}

// /in-store/ (v3, Direction A, 2026-10-18): the Karak House flat-lay (templates/instore-panels.html), the ink COMING SOON
// banner holding the Store Kit waitlist form (posts to the Launchpad intake, ENDPOINT, from site.js) and the Custom pieces links.
// The Store Kit is a concept: no price, date, quantity, reply time or buy button, and one plain note ("Pieces shown are examples.").
// Quotes are asked in the client portal (Adham, 2026-10-18): "Request a quote" opens the portal's sign-up with intent=quote and
// the page language; "Already a client? Log in" its sign-in with the same intent (portal PORTAL-API.md, "Custom pieces quotes").
// 2026-11-15 (owner): the portal quote sign-up is being removed; "Request a quote" and "Already a client?" open WhatsApp with
// "I'd like a quote for a custom piece" in the page language (is.q.wamsg). Without a WhatsApp number they fall back to email.
const quoteHref = (lang) => waHref(lang, 'is.q.wamsg', { mail: true });
function storeVars(lang) {
  const choose = `<option value="">${esc(t(lang, 'f.choose'))}</option>`;
  const typeOptions = choose + STORE_TYPES.map(([v, k]) => `<option value="${esc(v)}">${esc(t(lang, k))}</option>`).join('');
  const leadCountryOptions = choose + CC_OPTS.map((c) => `<option value="${c}">${esc(t(lang, c === 'other' ? 'is.cc.other' : 'cc.' + c))}</option>`).join('');
  const msgKeys = ['f.sending', 'f.failed', 'f.tooMany', 'f.consentErr', 'is.wl.ok', 'v.web', 'v.webBad', 'v.email', 'v.emailBad', 'v.type', 'v.country', 'v.tooLong', 'v.angle'];
  return { typeOptions, leadCountryOptions, endpoint: ENDPOINT, leadMsgs: jsonScript(Object.fromEntries(msgKeys.map((k) => [k, t(lang, k)]))),
    quoteHref: esc(quoteHref(lang)), quoteLoginHref: esc(quoteHref(lang)) };
}

// /sculptures/ (2026-10-18, the approved Sculptures mockup): 24 fiberglass pieces in two collections (data/sculptures.json, EN +
// AR) and "send us your website" custom pieces. The images are concept renders (one plain line says so); no price, lead time
// or quantity. A size is shown only when the catalog gives one. Quotes go to the same portal sign-up as In-store's "Request a
// quote" (portalAuth). Images live in assets/sculptures/ (<id>-<front|side|back|scene|thumb>.webp, loaded lazily; the lightbox
// views load when it opens, from assets/sculptures.js); width/height come from each file's own header.
const SCULPT = JSON.parse(rd('data/sculptures.json')).items;
const SC_DIR = '/assets/sculptures/';
const SC_VIEWS = ['front', 'side', 'back', 'scene'];
const SC_COLS = { origami: 'sc.col.origami', animal: 'sc.col.animal' };
// the real pixel size of a .webp (VP8, VP8L or VP8X header)
function webpSize(url) {
  const b = fs.readFileSync(path.join(ROOT, url.slice(1))), kind = b.toString('ascii', 12, 16);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a webp: ' + url);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  throw new Error('unknown webp header: ' + url);
}
const scImg = (file, alt, extra = ' loading="lazy" decoding="async"') => { const u = SC_DIR + file + '.webp', [w, h] = webpSize(u); return `<img src="${u}" width="${w}" height="${h}"${extra} alt="${esc(alt)}">`; };
for (const it of SCULPT) {
  if (!SC_COLS[it.collection] || !['furniture', 'decor', 'lighting'].includes(it.category)) throw new Error('data/sculptures.json: bad collection/category ' + it.id);
  for (const v of [...SC_VIEWS, 'thumb']) webpSize(`${SC_DIR}${it.id}-${v}.webp`); // every view exists
  if (/\[[^\]]*\]/.test(JSON.stringify(it))) throw new Error('data/sculptures.json: a [bracket] placeholder in ' + it.id);
}
function sculptVars(lang) {
  const byId = Object.fromEntries(SCULPT.map((it) => [it.id, it]));
  const ph = (cls, file, altKey, extra, tagId) => `<div class="sc-ph ${cls}">${scImg(file, t(lang, altKey), extra)}${tagId ? `<span class="sc-tag">${esc(byId[tagId].name[lang])}</span>` : ''}</div>`;
  // hero collage (the mockup's four pieces); the large scene is the first thing seen, so it loads at once
  const scCollage = ph('a', 'o-10-pleat-fold-floor-lamp-scene', 'sc.alt.a', ' fetchpriority="high" decoding="async"', 'o-10-pleat-fold-floor-lamp')
    + ph('b', 'a-07-geometric-bear-stool-front', 'sc.alt.b', ' decoding="async"') + ph('c', 'o-03-facet-column-vase-front', 'sc.alt.c', ' decoding="async"')
    + ph('d', 'a-02-rounded-seal-side-table-scene', 'sc.alt.d');
  const scCards = SCULPT.map((it) => {
    const col = t(lang, SC_COLS[it.collection]), cat = t(lang, 'sc.cat.' + it.category), size = it.size ? it.size[lang] : '';
    const dims = SC_VIEWS.map((v) => webpSize(`${SC_DIR}${it.id}-${v}.webp`).join('x')).join(' ');
    const data = { id: it.id, col: it.collection, cat: it.category, collabel: col, catlabel: cat, ...(size ? { size } : {}), finish: it.finish[lang], material: it.material[lang], desc: it.desc[lang], dims };
    const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    const meta = esc(cat) + (size ? ' · ' + (lang === 'ar' ? `<bdi>${esc(size)}</bdi>` : esc(size)) : '');
    return `<li class="sc-card"${attrs}><button type="button" class="sc-card-btn" aria-haspopup="dialog"><span class="sc-card-img">${scImg(it.id + '-thumb', t(lang, 'sc.altFront').replace('{name}', () => it.name[lang]))}<span class="sc-card-tag">${esc(col)}</span></span><span class="sc-card-name">${esc(it.name[lang])}</span><span class="sc-card-meta">${meta}</span></button></li>`;
  }).join('\n');
  // the "send us your website" example: a catalog scene render, shown and labelled as an example concept (not a client project)
  const scConcept = scImg('concept-example', t(lang, 'sc.concept.alt'));
  return { scCollage, scCards, scConcept, scImgDir: SC_DIR, quoteHref: esc(quoteHref(lang)), quoteLoginHref: esc(quoteHref(lang)) };
}

// ---------- head ----------
// Structured data (review fix 2026-11-14): one Offer per country in that country's own currency (eligibleRegion = its ISO
// 3166-1 code), priced at the amount due; VAT is named only where the price data marks it as charged. The last Offer is the
// US-dollar price for every other country. The Brand Deck (coming soon) has no offer.
const COUNTRY_LD = (cc) => ({ '@type': 'Country', name: dicts.en['cc.' + cc], identifier: cc });
// areaServed (SEO batch 2026-11-20): each served country (its own price and currency: data/pricing.json funnel, EG, SA, AE, US), plus
// the region the site speaks to, the Middle East and North Africa (any other country buys at the US-dollar price). Names in English on
// both languages, like the countries; the Arabic page adds the region's Arabic name as alternateName.
const MENA_LD = (lang) => ({ '@type': 'Place', name: 'Middle East and North Africa', ...(lang === 'ar' ? { alternateName: 'الشرق الأوسط وشمال أفريقيا' } : {}) });
const AREA_LD = (lang) => [...Object.keys(COUNTRIES).map(COUNTRY_LD), MENA_LD(lang)];
// SEO (2026-11-15): every social-media Service says what kind of service it is (the phrase people search: «إدارة صفحات السوشيال ميديا»
// / "Social media management") and where it is sold
const SERVICE_LD = (lang) => ({ serviceType: t(lang, 'ld.servicetype'), areaServed: AREA_LD(lang) });
// The home page's How it works video (templates/how-video.html) as a VideoObject. HOW_VIDEO_DATE is the day the video files were
// published (git log -- assets/video/); change it when the video is re-rendered and republished. A full ISO 8601 date-time with the
// Cairo offset (Google wants a time zone): the current files are commit f763107, 2026-11-15 21:50 PST = 2026-11-16 07:50 in Cairo.
const HOW_VIDEO_DATE = '2026-11-16T07:50:02+02:00';
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(HOW_VIDEO_DATE)) throw new Error('HOW_VIDEO_DATE must be a full ISO 8601 date-time with an offset');
const isoDur = (s) => `PT${Math.floor(s / 60) ? Math.floor(s / 60) + 'M' : ''}${Math.round(s % 60)}S`;
function videoLd(lang) {
  const b = `${SITE}/assets/video/how-${lang}-1080`;
  return { '@type': 'VideoObject', name: t(lang, 'wt.h2'), description: `${t(lang, 'hw.sub')} ${t(lang, 'hw.note')}`, inLanguage: lang, thumbnailUrl: b + '-poster.jpg',
    contentUrl: b + '.mp4', uploadDate: HOW_VIDEO_DATE, duration: isoDur(HOW.duration), publisher: { '@id': SITE + '/#organization' } };
}
function offerNode(lang, p) {
  const monthly = MONTHLY.has(p), url = urlFor(lang, 'pricing');
  const one = (price, currency, extra) => {
    const o = { '@type': 'Offer', name: pname(lang, p), price: String(price), priceCurrency: currency, url, ...extra };
    if (monthly) o.priceSpecification = { '@type': 'UnitPriceSpecification', price: String(price), priceCurrency: currency, unitCode: 'MON', ...(extra.priceSpecificationVat || {}) };
    delete o.priceSpecificationVat;
    return o;
  };
  const local = Object.keys(COUNTRIES).map((cc) => {
    const q = localQuote(p, cc), vat = q.vat_pct ? { valueAddedTaxIncluded: true } : {};
    return one(minorStr(q.total).replace(/\.00$/, ''), q.currency, { eligibleRegion: cc, ...vat, priceSpecificationVat: vat });
  });
  return RESTRICTED ? local : [...local, one(PRICES[p], 'USD', { description: t(lang, 'ld.intl') })];
}
function jsonLd(lang, page, landing = false) {
  const orgId = SITE + '/#organization';
  const nodes = [];
  if (page === 'index') {
    nodes.push({ '@type': 'Organization', '@id': orgId, name: BRAND, url: SITE + '/', logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 }, image: LOGO_URL, email: EMAIL, description: t(lang, 'ld.org'),
      // the public WhatsApp business number (data/contact.json, shown on every page), as the customer-service contact
      ...(WA ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+' + WA, email: EMAIL, url: 'https://wa.me/' + WA, areaServed: Object.keys(COUNTRIES), availableLanguage: ['ar', 'en'] } } : {}),
      areaServed: AREA_LD(lang) });
    // Egypt-only (2026-11-15): the studio as a ProfessionalService serving Egypt, with the package offers in EGP (no street address is
    // published, so no LocalBusiness address)
    nodes.push({ '@type': 'ProfessionalService', '@id': SITE + '/#service', name: BRAND, url: urlFor(lang, 'index'), image: LOGO_URL, logo: LOGO_URL, email: EMAIL, ...(WA ? { telephone: '+' + WA } : {}),
      description: t(lang, 'meta.d.index'), areaServed: AREA_LD(lang), availableLanguage: ['ar', 'en'], parentOrganization: { '@id': orgId },
      priceRange: [Math.min(...SOCIAL.map((p) => localQuote(p, DEFAULT_CC).total)), Math.max(...SOCIAL.map((p) => localQuote(p, DEFAULT_CC).total))].map((m) => fmtNum(m / 100)).join('–') + ' ' + COUNTRIES[DEFAULT_CC].currency,
      hasOfferCatalog: { '@type': 'OfferCatalog', name: t(lang, 'pricing.h1'), itemListElement: SOCIAL.flatMap((p) => offerNode(lang, p)) } });
    if (landing && LANDING_FAQ[page]) nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: LANDING_FAQ[page].map((k) => ({ '@type': 'Question', name: t(lang, k + 'q'), acceptedAnswer: { '@type': 'Answer', text: t(lang, k + 'a') } })) });
    if (landing) nodes.push(videoLd(lang));
    nodes.push({ '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, alternateName: 'Crier', url: SITE + '/', inLanguage: lang, publisher: { '@id': orgId } });
  } else {
    // BreadcrumbList (SEO batch 2026-11-20, Search Console "Unnamed item"): the list carries a name too, and every ListItem a position,
    // a name and an absolute URL (tests/jsonld.mjs checks every page)
    nodes.push({ '@type': 'BreadcrumbList', name: `${t(lang, 'crumb.label')}: ${t(lang, CRUMB_KEY[page])}`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(lang, 'crumb.home'), item: urlFor(lang, 'index') },
      { '@type': 'ListItem', position: 2, name: t(lang, CRUMB_KEY[page]), item: urlFor(lang, page) }] });
    const provider = { '@type': 'Organization', name: BRAND, url: SITE + '/' };
    // informational Services without offers (audit fixes, 2026-10-19: offers and prices are on /pricing/ only)
    if (landing && LANDING_FAQ[page]) nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: LANDING_FAQ[page].map((k) => ({ '@type': 'Question', name: t(lang, k + 'q'), acceptedAnswer: { '@type': 'Answer', text: t(lang, k + 'a') } })) });
    if (page === 'brand-deck' || page === 'social') {
      nodes.push({ '@type': 'Service', name: page === 'social' ? t(lang, 'kit.title') : pname(lang, 'deck'), ...(page === 'social' ? SERVICE_LD(lang) : {}), description: t(lang, `meta.d.${page}`), url: urlFor(lang, page), provider, availableLanguage: ['en', 'ar'] });
    }
    // In-store: The Store Kit (waitlist) and Custom pieces (requests through the client portal), informational, with no offers
    if (page === 'in-store') {
      nodes.push({ '@type': 'Service', name: t(lang, 'name.store'), description: t(lang, 'is.kit.line'), url: urlFor(lang, page) + '#kit', provider, areaServed: AREA_LD(lang) });
      nodes.push({ '@type': 'Service', name: t(lang, 'is.c.name'), description: t(lang, 'is.c.intro'), url: urlFor(lang, page) + '#custom', provider });
    }
    // Sculptures: informational, with no offers (pieces are quoted in the client portal)
    if (page === 'sculptures') nodes.push({ '@type': 'Service', name: t(lang, 'nav.sculptures'), description: t(lang, 'meta.d.sculptures'), url: urlFor(lang, page), provider });
    if (page === 'pricing') {
      const items = SOCIAL.map((p) => ({ '@type': 'Service', name: pname(lang, p), provider, ...SERVICE_LD(lang), offers: offerNode(lang, p) })); // the Brand Deck left the pricing page with its own page (2026-11-15)
      nodes.push({ '@type': 'ItemList', name: t(lang, 'pricing.h1'), itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item })) });
    }
    if (page === 'faq') {
      nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: FAQ_ALL.map((i) => ({ '@type': 'Question', name: t(lang, `faq.${i}q`),
        acceptedAnswer: { '@type': 'Answer', text: faqAnswers(lang, i).map((k) => t(lang, k)).join(' ') } })) });
    }
  }
  return `<script type="application/ld+json">${jsonScript({ '@context': 'https://schema.org', '@graph': nodes })}</script>`;
}
// ---------- Google Analytics 4 + Consent Mode v2 ----------
// Every page (all languages, 404, redirect stubs) carries this once, right after the CSP meta.
// S02 (audit 3, owner 2026-11-17: opt-in): Google Analytics loads ONLY after the visitor presses Accept in the consent bar
// (templates/consent.html, localStorage 'crier_consent' = 'granted'). With no choice, or after Decline, gtag.js is never requested:
// nothing about the visit reaches Google and no analytics cookie is set. gtag() is always defined, so site.js's events (whatsapp_click,
// sign_up_click, choose_plan) only queue in dataLayer; at Accept the queue keeps only the consent, js and config entries, so an
// event from before the choice is never sent. Withdrawal (Decline in Cookie settings) sets Google's own off switch
// (window['ga-disable-<id>']), deletes the _ga cookies and, when gtag.js was already running on the page, reloads it: gtag.js's own
// automatic events (scroll, engagement) do not all obey the off switch, and a fresh page never loads it again (no consent update
// either: gtag.js would send that change to Google as one more ping), so
// gtag.js is not loaded on later pages. Consent defaults stay denied for everything; ads signals are always denied.
// The consent bar announces each choice with a 'crier:consent' event on document (detail 'granted' or 'denied').
// Speed (2026-10-11): with consent already given, gtag.js is still injected late: on the first interaction (pointerdown,
// touchstart, keydown, scroll or wheel) or 6 s after 'load', and at once when the visitor presses Accept.
const GA_ID = 'G-80D3L78R0G';
const GA_INLINE = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.CRIER_GA='${GA_ID}';gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('js',new Date());gtag('config','${GA_ID}');` +
  `(function(){var w=window,d=document,n=0,E=['pointerdown','touchstart','keydown','scroll','wheel'],O={passive:true,capture:true},K='ga-disable-${GA_ID}',ok=0;` +
  `try{ok=localStorage.getItem('crier_consent')==='granted';}catch(e){}w[K]=!ok;` +
  `function L(){if(n||w[K])return;n=1;for(var i=0;i<E.length;i++)w.removeEventListener(E[i],L,O);var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';d.head.appendChild(s);}` +
  `function A(){for(var i=0;i<E.length;i++)w.addEventListener(E[i],L,O);if(d.readyState==='complete')setTimeout(L,6000);else w.addEventListener('load',function(){setTimeout(L,6000);});}` +
  `if(ok){gtag('consent','update',{analytics_storage:'granted'});A();}` +
  `d.addEventListener('crier:consent',function(e){if(e.detail==='granted'){if(!n){var q=w.dataLayer,k=[];for(var i=0;i<q.length;i++){var c=q[i]&&q[i][0];if(c==='consent'||c==='js'||c==='config')k.push(q[i]);}q.length=0;for(i=0;i<k.length;i++)q.push(k[i]);}w[K]=false;gtag('consent','update',{analytics_storage:'granted'});L();}else{w[K]=true;if(n)location.reload();}});})();`;
const GA_HEAD = `<script>${GA_INLINE}</script>`;
const CONSENT_JS = (partials.consent.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!CONSENT_JS || CONSENT_JS.includes('{{')) throw new Error('templates/consent.html: one inline <script> without template tags expected');
// the site allows no 'unsafe-inline' scripts: each inline script is allowed by its sha256 hash (recomputed on every build)
const sha = (js) => `'sha256-${crypto.createHash('sha256').update(js, 'utf8').digest('base64')}'`;
// The language (Arabic first, 2026-11-15): the URL's language wins (/en/… is English, /es/ and /fr/ stubs go to English, the root
// and the old /ar/… stubs are Arabic). ?lang=xx (the EN / AR links) switches and is remembered in localStorage 'crier.lang'. The
// memory is used only on a root (Arabic) URL reached from outside the site (no same-site referrer): a visitor who chose English
// gets the same page under /en/. The browser's language is not used (Arabic is the default for everyone). Query and #hash are kept.
const LANGUAGE_INLINE = "(function(){try{var k='crier.lang',L=/^(en|ar)$/,p=location.pathname,q=new URLSearchParams(location.search).get('lang');if(!L.test(q||''))q=null;var m=p.match(/^\\/(en|ar|es|fr)(?=\\/|$)/),tail=m?p.slice(m[0].length):p;if(!tail)tail='/';if(tail.charAt(0)!=='/')tail='/'+tail;if(/^\\/(?:terms|privacy|refund)\\.html$/.test(tail))tail=tail.slice(0,-5)+'/';var v=m&&m[1]!=='ar'?'en':'ar';if(q){v=q;try{localStorage.setItem(k,q);}catch(e){}}else if(!m){var r='';try{r=document.referrer?new URL(document.referrer).origin:'';}catch(e){}if(r!==location.origin){var s=null;try{s=localStorage.getItem(k);}catch(e){}if(s==='en')v='en';}}var target=(v==='en'?'/en':'')+tail;if(target!==p||q){document.documentElement.style.visibility='hidden';var u=new URL(location.href);u.pathname=target;u.searchParams.delete('lang');location.replace(u.pathname+u.search+u.hash);}}catch(e){}})();";
const LANGUAGE_HEAD = `<script>${LANGUAGE_INLINE}</script>`;
// The visitor's country (MULTI, owner 2026-11-19), before paint: Cloudflare's /cdn-cgi/trace (loc=XX), remembered in localStorage
// 'crier.loc' so the next page knows it at once; window.__crierLoc is the promise site.js reads for the prices and texts.
// A visitor in the USA on an Arabic page is OFFERED the same page in English (SEO round 2, 2026-11-20): a bar above the header,
// in English, with a link to the same page under /en/ (query and #hash kept; following it remembers English, as the EN link does)
// and a close button (remembers Arabic, so the bar stays away). It used to send them there at once with location.replace; that
// automatic redirect ran for people but not for crawlers (by user agent), so the same URL ended on a different page for Bingbot
// and for a person in the USA, which is what search engines call a sneaky redirect / cloaking. The bar is shown to every user agent
// alike; nothing on the site redirects by country any more. Not shown to a visitor who chose Arabic (the AR link: ?lang=ar,
// 'crier.lang') or already on /en/. Crawlers (by user agent) are still never re-priced: they read the page as built (Egypt), which
// every visitor outside the USA, Saudi Arabia and the UAE also gets (window.__crierBot); the Arabic and English URLs stay separate,
// self-canonical and tied by hreflang, so both are indexed.
const GEO_TXT = JSON.stringify({ t: t('en', 'geo.hint'), a: t('en', 'geo.go'), x: t('en', 'geo.close'), l: t('en', 'geo.label') });
const GEO_INLINE = "(function(){try{var w=window,d=document.documentElement,K='crier.loc',ua=navigator.userAgent||'',T=" + GEO_TXT + ",on=false;if(/bot|crawl|spider|slurp|mediapartners|lighthouse|inspectiontool|facebookexternalhit|bingpreview|embedly|whatsapp|telegram|skypeuripreview|preview/i.test(ua))w.__crierBot=true;function mem(v){try{localStorage.setItem('crier.lang',v);}catch(e){}}function put(){if(document.getElementById('geo-hint'))return;var b=document.createElement('div'),s=document.createElement('span'),a=document.createElement('a'),x=document.createElement('button'),h=document.querySelector('header.top');b.id='geo-hint';b.className='geo-hint';b.lang='en';b.dir='ltr';b.setAttribute('role','region');b.setAttribute('aria-label',T.l);s.textContent=T.t+' ';a.href='/en'+location.pathname+location.search+location.hash;a.hreflang='en';a.textContent=T.a;a.addEventListener('click',function(){mem('en');});x.type='button';x.className='geo-x';x.setAttribute('aria-label',T.x);x.textContent='\u00d7';x.addEventListener('click',function(){mem('ar');b.parentNode.removeChild(b);});s.appendChild(a);b.appendChild(s);b.appendChild(x);if(h)h.parentNode.insertBefore(b,h);else document.body.insertBefore(b,document.body.firstChild);}function go(c){if(on||c!=='US'||d.lang!=='ar'||/^\\/en(\\/|$)/.test(location.pathname))return;var s=null;try{s=localStorage.getItem('crier.lang');}catch(e){}if(s==='ar'||/[?&]lang=/.test(location.search))return;on=true;if(document.body)put();else document.addEventListener('DOMContentLoaded',put);}var c=null;try{c=localStorage.getItem(K);}catch(e){}if(c&&!/^[A-Z]{2}$/.test(c))c=null;if(c)go(c);if(w.fetch)w.__crierLoc=fetch('/cdn-cgi/trace',{cache:'no-store'}).then(function(r){return r.ok?r.text():'';}).then(function(t){var m=/(?:^|\\n)loc=([A-Z]{2})(?:\\n|$)/.exec(t||''),l=m&&m[1]!=='XX'&&m[1]!=='T1'?m[1]:null;if(l){try{localStorage.setItem(K,l);}catch(e){}if(l!==c)go(l);}return l||c;}).catch(function(){return c;});}catch(e){}})();";
const GEO_HEAD = MULTI ? `<script>${GEO_INLINE}</script>` : '';
const SCRIPT_HASHES = [sha(GA_INLINE), sha(LANGUAGE_INLINE), sha(CONSENT_JS), ...(MULTI ? [sha(GEO_INLINE)] : [])];
const CSP = "default-src 'self'; script-src 'self' " + SCRIPT_HASHES.join(' ') + " https://static.cloudflareinsights.com https://*.googletagmanager.com; connect-src 'self' https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'";
// Brand (2026-11-15, the glossy blob logo; the kit is in ~/Projects/crier/inputs/brand/kit/): the favicons are the blob alone on a lime
// tile (no wordmark, so it reads at 16-32 px); the app icons and the apple-touch icon are the glossy blob; the share image is
// rendered per language from build/og-image.html (node build/og-image.mjs).
const OG_IMAGE = { en: 'og.png', ar: 'og-ar.png' };
const ICON_LINKS = `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0E0F0C">`;
const LOGO_URL = SITE + '/crier-logo.png'; // the full logo (blob + wordmark on lime), 512 x 512, for structured data
function head(lang, page, css, landing = false) {
  const title = t(lang, `meta.t.${page}`), desc = t(lang, `meta.d.${page}`), url = urlFor(lang, page);
  const alt = LANGS.map(([c]) => `<link rel="alternate" hreflang="${HREFLANG(c)}" href="${urlFor(c, page)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, page)}">`;
  const ogAlt = LANGS.filter(([c]) => c !== lang).map(([, , loc]) => `<meta property="og:locale:alternate" content="${loc}">`).join('\n');
  const loc = LANGS.find(([c]) => c === lang)[2];
  const pl = (f) => `<link rel="preload" href="/fonts/${f}.subset.woff2" as="font" type="font/woff2" crossorigin>`;
  // Speed (mobile PageSpeed, 2026-10-11): every font file the page uses is preloaded, so none is discovered late at top priority.
  // The Latin fonts are two files (Archivo + one variable Instrument Sans for all four weights), and Arabic pages preload their
  // two Arabic files plus those two (Latin words such as the brand name use them). Since the MENA landing (2026-10-16) the
  // homepage has no hero image: its H1 is the LCP element.
  const latin = ['archivo-latin-wght-normal', 'instrument-sans-latin-var'];
  const preload = (lang === 'ar' ? ['noto-sans-arabic-arabic-400-normal', 'noto-sans-arabic-arabic-700-normal', ...latin] : latin).map(pl).join('\n');
  return `<!doctype html>
<html lang="${lang}" dir="${RTL.has(lang) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${NOINDEX || HIDDEN.has(page) ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${LANGUAGE_HEAD}
${GEO_HEAD ? GEO_HEAD + '\n' : ''}${GA_HEAD}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${loc}">
${ogAlt}
<meta property="og:image" content="${SITE}/${OG_IMAGE[lang]}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t(lang, 'og.alt'))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/${OG_IMAGE[lang]}">
${ICON_LINKS}
${preload}
<style>
${css}
</style>
${jsonLd(lang, page, landing)}
</head>`;
}
// Inline CSS is minified at build time (comments and spare whitespace only; strings and calc() spacing kept). Sources in templates/ stay readable.
const minCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').split(/("[^"\n]*"|'[^'\n]*')/).map((part, i) => i % 2 ? part
  : part.replace(/\s+/g, ' ').replace(/\s*([{};,])\s*/g, '$1').replace(/;}/g, '}')).join('').trim();
// Each page inlines only the CSS rules it can use: a rule is dropped when every selector in it needs a class or id that is
// neither in the page's HTML nor a word in the site's JavaScript (scripts that add classes keep their rules). Selectors
// inside :not()/:is()/:where()/:has() and [attribute] tests are not checked, so those rules stay. @font-face, @keyframes
// and the like are kept as they are; @media/@supports blocks are filtered inside and dropped when empty.
const JS_WORDS = new Set([rd('site.js'), rd('assets/studio.js'), rd('assets/deck.js'), CONSENT_JS, MULTI ? GEO_INLINE : ''].join('\n').match(/[A-Za-z_][\w-]*/g));
// assets/sculptures.js (catalog filters + lightbox) only runs on /sculptures/ (#sc-grid)
const SC_WORDS = rd('assets/sculptures.js').match(/[A-Za-z_][\w-]*/g);
// assets/landing.js (the new home page's hero phone and video) only runs on pages with #hv or #how-video
const LANDING_WORDS = rd('assets/landing.js').match(/[A-Za-z_][\w-]*/g);
function cssBlocks(css) {
  const out = []; let start = 0, depth = 0, q = null, pre = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '{') { if (depth++ === 0) { pre = css.slice(start, i).trim(); start = i + 1; } }
    else if (c === '}') { if (--depth === 0) { out.push({ pre, body: css.slice(start, i) }); start = i + 1; } }
    else if (c === ';' && depth === 0) { out.push({ stmt: css.slice(start, i + 1) }); start = i + 1; }
  }
  if (depth || q) throw new Error('purgeCss: unbalanced CSS');
  return out;
}
function purgeCss(css, html) {
  const have = new Set(JS_WORDS);
  if (html.includes('id="sc-grid"')) for (const w of SC_WORDS) have.add(w);
  if (html.includes('id="hv"') || html.includes('id="how-video"')) for (const w of LANDING_WORDS) have.add(w);
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) have.add(c);
  for (const m of html.matchAll(/\sid="([^"]*)"/g)) have.add(m[1]);
  const split = (s) => { const r = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (c === ',' && !d) { r.push(s.slice(st, i)); st = i + 1; } } r.push(s.slice(st)); return r; };
  const outer = (sel) => { let o = '', d = 0; for (const c of sel) { if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; else if (!d) o += c; } return o; };
  const keep = (sel) => [...outer(sel).matchAll(/[.#](-?[_a-zA-Z][\w-]*)/g)].every((m) => have.has(m[1]));
  const walk = (css) => cssBlocks(css).map((b) => {
    if (b.stmt) return b.stmt;
    if (/^@(media|supports|container|layer)\b/.test(b.pre)) { const inner = walk(b.body); return inner ? `${b.pre}{${inner}}` : ''; }
    if (b.pre.startsWith('@')) return `${b.pre}{${b.body}}`;
    const sels = split(b.pre).filter(keep);
    return sels.length ? `${sels.join(',')}{${b.body}}` : '';
  }).join('');
  return walk(css);
}
// Template indentation is dropped from the page body (a line break renders the same as the spaces that followed it);
// <script>, <style>, <pre> and <textarea> contents are left exactly as they are (inline scripts are allowed by hash).
const trimIndent = (html) => html.split(/(<(script|style|pre|textarea)\b[\s\S]*?<\/\2>)/).map((part, i) => i % 3 === 0 ? part.replace(/\n[ \t]+/g, '\n') : i % 3 === 1 ? part : '').join('');
// the English In-store page loads the Arabic faces too: its menu board and QR stand carry Arabic item names (the unicode-range
// means the files download only for those glyphs)
const cssFor = (lang, page, landing) => minCss([CSS.fonts, lang === 'ar' || page === 'in-store' || page === 'index' ? CSS.fontsAr : '', WIDE.has(page) ? CSS.home : CSS.legal + (page === 'faq' ? '\n' + faqCss : ''), CSS.common, CSS.consent, CSS.chrome, page === 'sculptures' ? CSS.sculpt : '', landing && page === 'index' ? CSS.motion : ''].join('\n'));

// ---------- content-hashed asset copies (long browser cache) ----------
// GitHub Pages sends every file with max-age=600. The pages therefore reference copies of the fonts, the hero images and
// site.js whose names carry a hash of their content: /assets/h/<name>.<sha256:10>.<ext>. A changed file gets a new name, so a
// Cloudflare Cache Rule can let browsers keep everything under /assets/h/ for a year (the rule is in README.md). The folder is
// original files stay where they are for anything else that links to them.
// S06 (audit 3, 2026-11-17): the folder is no longer wiped. A page that is already open, or a copy of an older page in a browser
// or Cloudflare cache, can ask for one of its hashed files minutes or days after the next release. Each distinct set of hashed
// files the pages use is a release in build/hashed-releases.json (not published); the files of the last HASHED_KEEP releases,
// and of every release replaced less than HASHED_DAYS days ago, stay in assets/h/. Older ones are deleted only when a new release
// is recorded, so building the same sources twice changes nothing. Rolling back = restoring the old sources and building: the
// old set becomes the newest release again and the newer files stay for the same window.
const HASHED_DIR = 'assets/h', HASHED_LOG = path.join(ROOT, 'build', 'hashed-releases.json'), HASHED_KEEP = 10, HASHED_DAYS = 30;
const hashedUrls = new Map();
function hashed(url) {
  if (hashedUrls.has(url)) return hashedUrls.get(url);
  const src = path.join(ROOT, url.slice(1)), buf = fs.readFileSync(src);
  const ext = path.extname(url), out = `/${HASHED_DIR}/${path.basename(url, ext)}.${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)}${ext}`;
  fs.mkdirSync(path.join(ROOT, HASHED_DIR), { recursive: true });
  const dest = path.join(ROOT, out.slice(1));
  if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf)) fs.writeFileSync(dest, buf);
  hashedUrls.set(url, out);
  return out;
}
// (the sculpture images in assets/sculptures/ keep their names: the lightbox builds their URLs from the piece id)
const hashUrls = (html) => html.replace(/\/(?:fonts|assets)\/[\w.-]+\.(?:woff2|avif|webp|png)\b|\/site\.js\b|\/assets\/(?:sculptures|landing)\.js\b/g, hashed);

// ---------- build ----------
const writtenSha = new Map(); // O02: every file this build writes, for the release identity (release.json)
function write(rel, content) {
  writtenSha.set(rel, crypto.createHash('sha256').update(content).digest('hex'));
  // every inline script that runs must be allowed by a CSP hash, or the browser blocks it
  if (rel.endsWith('.html')) for (const m of content.matchAll(/<script>([\s\S]*?)<\/script>/g)) if (!SCRIPT_HASHES.includes(sha(m[1]))) throw new Error('inline script without a CSP hash in ' + rel);
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
const built = [];
// sitemap <lastmod> (SEO, 2026-11-15): build/lastmod.json (not published) keeps each sitemap URL's page hash and the date that hash
// first appeared. A page whose built HTML is unchanged keeps its date; a changed page gets the build day (Cairo time). So a date
// moves only when the page really changed.
const pageSha = new Map();
const LASTMOD_FILE = path.join(ROOT, 'build', 'lastmod.json');
const LASTMOD_OLD = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')) : {};
const TODAY = process.env.CRIER_BUILD_DATE /* tests only (tests/asset-retention.mjs) */ || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
for (const [lang] of LANGS) {
  for (const page of PAGES) {
    htmlCc = LEGAL.includes(page) && !RESTRICTED ? null : DEFAULT_CC; // the legal pages keep the US-dollar price list, except while one country is served (they are in its currency then)
    const landing = !!V2[page];
    const ctx = { lang, v: landing ? { ...pageVars(lang, page), ...landingVars(lang, page) } : pageVars(lang, page) };
    const body = render(rd(`templates/${V2[page] || page}.html`), ctx);
    const bodyHtml = `<body data-page="${page}" class="studio-inner">\n${render(partials.consent, ctx)}\n<div class="wrap">\n${render(partials.header, ctx)}\n${body}\n${render(partials.footer, ctx)}\n</div>\n${waFab(ctx)}${!LEGAL.includes(page) && /class="(price )?amt"/.test(body) ? curData(lang) + '\n' : ''}<script src="/site.js" defer></script>\n${body.includes('id="hv"') || body.includes('id="how-video"') ? '<script src="/assets/landing.js" defer></script>\n' : ''}${page === 'sculptures' ? '<script src="/assets/sculptures.js" defer></script>\n' : ''}</body>\n</html>\n`;
    const html = `${head(lang, page, purgeCss(cssFor(lang, page, landing), bodyHtml), landing)}\n${trimIndent(bodyHtml)}`;
    if (PARKED.has(page)) { write(`${PARKED_DIR}/${dirFor(lang, page)}index.html`, html); continue; } // kept, never published
    write(dirFor(lang, page) + 'index.html', hashUrls(html));
    pageSha.set(urlFor(lang, page), crypto.createHash('sha256').update(hashUrls(html)).digest('hex'));
    built.push([lang, page]);
  }
}

// The old studio introduction and the old share-image page (the retired branding offer): kept in _parked/, never published;
// their old addresses redirect home (stubs below).
write(`${PARKED_DIR}/studio-deck/index.html`, rd('templates/studio-deck.html'));
write(`${PARKED_DIR}/social-preview.html`, rd('templates/social-preview.html'));

// the unlisted hand-made pages (UNLISTED): published as committed, never written by the build; each must exist and carry noindex
for (const p of UNLISTED) { const f = path.join(ROOT, p, 'index.html'); if (!fs.existsSync(f) || !/<meta name="robots" content="noindex[",]/.test(fs.readFileSync(f, 'utf8'))) throw new Error(`UNLISTED: ${p}/index.html is missing or has no robots noindex`); }

// ---------- IndexNow (SEO batch 2026-11-20) ----------
// ONE config spot: build/indexnow.json {key, host, keyLocation}. The build publishes the key file /<key>.txt (content = the key) and
// deletes any other 32-hex .txt key file at the site root, so rotating the key = change it in build/indexnow.json and rebuild.
// scripts/indexnow-ping.mjs sends the sitemap's URLs after a deploy (dry run unless --send).
{
  const cfg = JSON.parse(rd('build/indexnow.json'));
  if (!/^[0-9a-f]{32}$/.test(cfg.key || '') || cfg.host !== new URL(SITE).host || cfg.keyLocation !== `${SITE}/${cfg.key}.txt`) throw new Error('build/indexnow.json: key (32 hex), host crierstudio.com and keyLocation https://crierstudio.com/<key>.txt');
  for (const f of fs.readdirSync(ROOT)) if (/^[0-9a-f]{32}\.txt$/.test(f) && f !== cfg.key + '.txt') fs.rmSync(path.join(ROOT, f));
  write(cfg.key + '.txt', cfg.key);
}

// ---------- REDIRECTS: every old URL -> its final page (SEO batch 2026-11-20) ----------
// THE one map of the site's old URLs (single source of truth). Each entry is an old URL path and the published page it ends on, in ONE
// hop (never a stub or another redirect). The build writes it three ways, so they always agree:
//   1. a stub page at the old address (GitHub Pages cannot send a 301): noindex, canonical = the final page, a meta refresh to it, and
//      site.js, which keeps the query string and the visitor's #hash;
//   2. build/redirects.json (not published), read by tests/redirect-map.mjs and build/check.mjs;
//   3. ops/cloudflare/redirect-rules.json, the Cloudflare Single Redirect rules (real 301s), prepared, not applied (ops/cloudflare/README.md).
// The map: a renamed or parked page (MOVED) goes to its new page in the same language: Arabic at the root, English under /en/; the old
// /ar/<page>/ URLs to the Arabic page they now are (or where that page went); /es/ and /fr/ to the English one; the old legal .html
// URLs to the Arabic legal pages (site.js applies a saved language); the retired studio deck and share-image page to the English home.
const LIVE = new Set(PAGES.filter((p) => !PARKED.has(p))); // the published pages
const LIVE_PAGES = [...LIVE].map((p) => [p, p]); // parked pages are in MOVED
const finalPage = (page) => { const to = LIVE.has(page) ? page : MOVED[page]; if (!LIVE.has(String(to).split('#')[0])) throw new Error(`REDIRECTS: ${page} does not end on a published page (${to})`); return to; };
const REDIRECTS = new Map(); // old path -> { lang (the stub's language, null = the visitor's), to (page[#hash]), href (the final path) }
function addRedirect(from, lang, page, own = true) {
  const to = finalPage(page), [pg, hash = ''] = to.split('#'), href = pathFor(lang, pg) + (hash ? '#' + hash : '');
  if (REDIRECTS.has(from)) throw new Error('REDIRECTS: two entries for ' + from);
  REDIRECTS.set(from, { lang: own ? lang : null, page: lang, to, href });
}
const oldPath = (dir, from) => '/' + (dir ? dir + '/' : '') + (from === 'index' ? '' : from + '/');
// renamed and parked pages, in each language's own folder (the unlisted /fiberglass/ itself is a real page, not a redirect)
for (const [from, to] of Object.entries(MOVED)) { if (!UNLISTED.has(from)) addRedirect(oldPath('', from), 'ar', to); addRedirect(oldPath('en', from), 'en', to); }
// Arabic lived under /ar/ until 2026-11-15: every old /ar/… URL goes to the Arabic page at the root (or where it went)
for (const [from, to] of [...LIVE_PAGES, ...Object.entries(MOVED)]) addRedirect(oldPath('ar', from), 'ar', to);
// removed languages (2026-10-16): /es/… and /fr/… go to the English page (or where it went)
for (const lang of REMOVED) for (const [from, to] of [...LIVE_PAGES, ...Object.entries(MOVED)]) addRedirect(oldPath(lang, from), 'en', to);
// the old legal URLs (/terms.html …): the Arabic legal page, or the English one for a visitor who chose English (no own language)
for (const page of LEGAL) addRedirect(`/${page}.html`, DEFAULT_LANG, page, false);
// the retired studio deck and share-image page (2026-11-14): their old addresses go to the English home page
addRedirect('/assets/studio-deck/', 'en', 'index');
addRedirect('/assets/social-preview.html', 'en', 'index');
for (const p of UNLISTED) for (const [from] of REDIRECTS) if (from === `/${p}/`) throw new Error(`REDIRECTS: the unlisted /${p}/ page must not be redirected`);

// the stub page: noindex, canonical and a meta refresh to the final page, so it works without JavaScript and for crawlers; site.js
// (with JavaScript) goes there at once and keeps the full query string and the visitor's own #hash (else the target's). No language
// script here (the old one sent /ar/kit/ to /kit/ first: a second hop); site.js applies a saved English choice on a root stub instead.
function stubHtml(from, r) {
  const [pg, hash = ''] = r.to.split('#');
  return hashUrls(`<!doctype html>
<html lang="${r.page}" dir="${RTL.has(r.page) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
<title>${BRAND}</title>
<link rel="canonical" href="${SITE}${r.href.split('#')[0]}">
<meta http-equiv="refresh" content="0; url=${r.href}">
</head>
<body data-page="redirect" data-target="${pg}"${hash ? ` data-hash="${hash}"` : ''}${r.lang ? ` data-lang="${r.lang}"` : ''}>
<p><a href="${r.href}">${BRAND}</a></p>
<script src="/site.js"></script>
</body>
</html>
`);
}
for (const [from, r] of REDIRECTS) write(from.endsWith('/') ? from.slice(1) + 'index.html' : from.slice(1), stubHtml(from, r));
fs.writeFileSync(path.join(ROOT, 'build', 'redirects.json'), JSON.stringify({ about: 'SEO batch 2026-11-20: every old URL and the published page it ends on in one hop. Written by build/build.mjs (REDIRECTS); the stub pages and ops/cloudflare/redirect-rules.json are written from the same map. Do not edit.', redirects: Object.fromEntries([...REDIRECTS].map(([f, r]) => [f, r.href])) }, null, 1) + '\n');

// Cloudflare Single Redirects (prepared, not applied): the same map as rules for the zone's http_request_dynamic_redirect phase. The Free
// plan allows 10 rules, so old URLs that go to the same page share a rule (`in {…}`), and the /ar/, /es/ + /fr/ and legal .html URLs
// that keep their page name are one dynamic rule each. Rules 2-5 keep the names of the zone's four existing rules (their targets are
// fixed here: /ar/social/ and In-store are themselves redirects now). A rule's paths are listed with and without the slash and with
// index.html (static rules only: a dynamic target is computed from the path, so it lists the slash form).
{
  const CF = SITE, PATH = 'http.request.uri.path';
  const variants = (p) => (p.endsWith('/') && p !== '/' ? [p.slice(0, -1), p, p + 'index.html'] : [p]);
  const inSet = (paths) => `(${PATH} in {${paths.map((p) => JSON.stringify(p)).join(' ')}})`;
  const rule = (description, paths, target) => ({ description, expression: inSet(paths), action: 'redirect', action_parameters: { from_value: { status_code: 301, target_url: target, preserve_query_string: true } }, enabled: true });
  const groups = { kit: [], kitAr: [], home: [], homeAr: [], en: [], enSocial: [], ar: [], esfr: [], legal: [] };
  for (const [from, r] of REDIRECTS) {
    const pg = r.to.split('#')[0], m = from.match(/^\/(ar|en|es|fr|assets)\//), dir = m ? m[1] : '', name = from.slice(dir ? dir.length + 2 : 1).replace(/\/$/, '');
    if (r.href.includes('#')) throw new Error('Cloudflare rules: no #hash targets expected (' + from + ')');
    if (/^\/\w+\.html$/.test(from) && LEGAL.includes(from.slice(1, -5)) && r.href === pathFor('ar', from.slice(1, -5))) groups.legal.push(from);
    else if (dir === 'ar' && LIVE.has(name) && name !== 'index' && r.href === '/' + name + '/') groups.ar.push(from);
    else if ((dir === 'es' || dir === 'fr') && LIVE.has(name) && name !== 'index' && r.href === '/en/' + name + '/') groups.esfr.push(from);
    else if (r.href === pathFor('ar', 'social')) groups[dir === 'ar' ? 'kitAr' : 'kit'].push(...variants(from));
    else if (r.href === pathFor('ar', 'index')) groups[dir === 'ar' ? 'homeAr' : 'home'].push(...variants(from));
    else if (r.href === pathFor('en', 'index')) groups.en.push(...variants(from));
    else if (r.href === pathFor('en', 'social')) groups.enSocial.push(...variants(from));
    else throw new Error(`Cloudflare rules: no rule for ${from} -> ${r.href}`);
  }
  const rules = [
    { description: 'www to apex', expression: '(http.host eq "www.crierstudio.com")', action: 'redirect', action_parameters: { from_value: { status_code: 301, target_url: { expression: `concat("${CF}", ${PATH})` }, preserve_query_string: true } }, enabled: true },
    rule('Social Kit: kit + snapshot', groups.kit, { value: CF + pathFor('ar', 'social') }),
    rule('Social Kit AR', groups.kitAr, { value: CF + pathFor('ar', 'social') }),
    rule('Physical to Custom pieces', groups.home, { value: CF + pathFor('ar', 'index') }),
    rule('Physical to Custom pieces AR', groups.homeAr, { value: CF + pathFor('ar', 'index') }),
    rule('English: parked pages to the English home page', groups.en, { value: CF + pathFor('en', 'index') }),
    rule('English: samples, kit and snapshot to /en/social/', groups.enSocial, { value: CF + pathFor('en', 'social') }),
    rule('Old /ar/ pages to the Arabic pages at the root', groups.ar, { expression: `concat("${CF}", substring(${PATH}, 3))` }),
    rule('Spanish and French pages to English', groups.esfr, { expression: `concat("${CF}/en", substring(${PATH}, 3))` }),
    rule('Old legal .html URLs', groups.legal, { expression: `concat("${CF}", substring(${PATH}, 0, -5), "/")` }),
  ];
  if (rules.length > 10) throw new Error('Cloudflare rules: the Free plan allows 10 Single Redirect rules');
  for (const r of rules) { if (r.expression.length >= 4096) throw new Error(`Cloudflare rule "${r.description}": expression over 4,096 characters`); if (r.expression.includes('{}')) throw new Error(`Cloudflare rule "${r.description}": no paths`); }
  fs.mkdirSync(path.join(ROOT, 'ops', 'cloudflare'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'ops', 'cloudflare', 'redirect-rules.json'), JSON.stringify({ rules }, null, 1) + '\n');
}

// 404 (one file, two languages; header and footer in Arabic, the default, then one block per language, Arabic first)
{
  htmlCc = null;
  const ctx = { lang: DEFAULT_LANG, v: { ...pageVars(DEFAULT_LANG, '404'), langpick: langpick(DEFAULT_LANG, 'index'), crumbs: '' } };
  const sections = [...LANGS].sort(([a]) => (a === DEFAULT_LANG ? -1 : 1)).map(([c]) => {
    const links = [['index', 'crumb.home'], ['social', 'nav.social'], ['pricing', 'nav.pricing']].map(([p, k]) => `<a href="${pathFor(c, p)}">${esc(t(c, k))}</a>`).join(' · ');
    return `<section lang="${c}" dir="${RTL.has(c) ? 'rtl' : 'ltr'}"><h2>${esc(t(c, 'e404.title'))}</h2><p>${esc(t(c, 'e404.p'))} <a href="${pathFor(c, 'index')}">${esc(t(c, 'e404.home'))}</a></p><p>${esc(t(c, 'e404.nav'))} ${links}</p></section>`;
  }).join('\n');
  ctx.v.sections = sections;
  const css404 = minCss([CSS.fonts, CSS.fontsAr, CSS.legal, CSS.common, CSS.consent, CSS.chrome, 'section{padding-block:18px;border-top:2px solid var(--line)}section h2{margin-top:0}html[lang=ar] body,section[lang=ar]{line-height:1.75}'].join('\n'));
  const body404 = `<body data-page="404">
${render(partials.consent, ctx)}
<div class="wrap">
${render(partials.header, ctx)}
${render(rd('templates/404.html'), ctx)}
${render(partials.footer, ctx)}
</div>
${waFab(ctx)}<script src="/site.js" defer></script>
</body>
</html>
`;
  write('404.html', hashUrls(`<!doctype html>
<html lang="${DEFAULT_LANG}" dir="${RTL.has(DEFAULT_LANG) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${LANGUAGE_HEAD}
${GA_HEAD}
<title>404 | ${BRAND}</title>
${ICON_LINKS}
<style>
${purgeCss(css404, body404)}
</style>
</head>
${trimIndent(body404)}`));
}

// robots.txt, sitemap.xml, webmanifest
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const lastmod = {};
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for (const page of PAGES.filter((p) => !HIDDEN.has(p))) {
  for (const [lang] of LANGS) {
    const u = urlFor(lang, page), old = LASTMOD_OLD[u], sha = pageSha.get(u);
    if (!sha) throw new Error('sitemap: no built page for ' + u);
    lastmod[u] = old && old.sha === sha ? old : { sha, date: TODAY };
    sm.push('<url>', `<loc>${u}</loc>`, `<lastmod>${lastmod[u].date}</lastmod>`);
    for (const [c] of LANGS) sm.push(`<xhtml:link rel="alternate" hreflang="${HREFLANG(c)}" href="${urlFor(c, page)}"/>`);
    sm.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, page)}"/>`, '</url>');
  }
}
sm.push('</urlset>', '');
write('sitemap.xml', sm.join('\n'));
fs.writeFileSync(LASTMOD_FILE, JSON.stringify(lastmod, null, 1) + '\n');
write('site.webmanifest', JSON.stringify({ name: BRAND, short_name: BRAND, lang: DEFAULT_LANG, dir: 'auto', start_url: '/', display: 'browser', background_color: '#F6F8EF', theme_color: '#0E0F0C',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }, null, 2) + '\n');

// S06: record this build's hashed files as a release and delete only files outside the support window (see HASHED_DIR)
{
  const files = [...new Set([...hashedUrls.values()].map((u) => path.basename(u)))].sort();
  const id = crypto.createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
  let log = { releases: [] }; try { log = JSON.parse(fs.readFileSync(HASHED_LOG, 'utf8')); } catch { }
  if (log.releases[0]?.id !== id) {
    const rest = log.releases.filter((r) => r.id !== id); // an older set built again (a rollback) becomes the newest release
    if (rest[0] && !rest[0].replaced) rest[0] = { ...rest[0], replaced: TODAY };
    const cutoff = Date.parse(TODAY) - HASHED_DAYS * 86400e3;
    log = { about: 'S06 (audit 3): the hashed asset sets of recent releases, newest first; build/build.mjs keeps their files in assets/h/ (see HASHED_DIR).', keep_releases: HASHED_KEEP, keep_days: HASHED_DAYS,
      releases: [{ id, files }, ...rest].filter((r, i) => i < HASHED_KEEP || !r.replaced || Date.parse(r.replaced) >= cutoff) };
    fs.writeFileSync(HASHED_LOG, JSON.stringify(log, null, 1) + '\n');
  }
  const keep = new Set(log.releases.flatMap((r) => r.files));
  for (const f of fs.readdirSync(path.join(ROOT, HASHED_DIR))) if (!keep.has(f)) fs.rmSync(path.join(ROOT, HASHED_DIR, f));
  const missing = [...keep].filter((f) => !fs.existsSync(path.join(ROOT, HASHED_DIR, f)));
  if (missing.length) console.warn('hashed files of a recent release are missing (restore them from git): ' + missing.join(', '));
  // O02 (audit 3): /release.json names this build: one id over every file the build wrote and the hashed files the pages use, and
  // the price data it was built from. The Pages workflow reads it back from crierstudio.com after a deploy; the same sources always
  // give the same id (no dates or times in it).
  const parts = [...writtenSha].sort(([a], [b]) => (a < b ? -1 : 1)).map(([f, h]) => f + ' ' + h).concat(files.map((f) => HASHED_DIR + '/' + f));
  const rel = { release: crypto.createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16), assets: id, pricing: { projection_sha256: PRICING.projection_sha256 || null, generated_from: PRICING.generated_from || null } };
  fs.writeFileSync(path.join(ROOT, 'release.json'), JSON.stringify(rel, null, 1) + '\n');
}

// keys in the JSON that no page used (review fix 2026-11-14: an honest check). The build records every key it read in
// build/used-keys.json (not published) and fails on an unused one; build/check.mjs fails too if that record is missing or
// does not match the i18n files.
// one country served: the texts only the other countries and the picker read (country names, currency symbols and notes, the
// picker's label, "Another country", the US-dollar offer) are kept for the undo and count as used
if (RESTRICTED) for (const k of Object.keys(dicts.en)) if (/^(cc\.|is\.cc\.other$|cur\.(label|sym|note)|ld\.intl$)/.test(k)) used.add(k);
for (const k of Object.keys(dicts.en)) if (VARIANT_RE.test(k) && used.has(k.replace(VARIANT_RE, ''))) used.add(k); // the base key's one-country variant
const unused = Object.keys(dicts.en).filter((k) => !used.has(k));
fs.writeFileSync(path.join(ROOT, 'build', 'used-keys.json'), JSON.stringify({ i18n_sha256: crypto.createHash('sha256').update(LANGS.map(([c]) => rd(`i18n/${c}.json`)).join('\n')).digest('hex'), used: [...used].sort() }, null, 1) + '\n');
if (unused.length) { console.error('UNUSED i18n keys (delete them from every language): ' + unused.join(', ')); process.exitCode = 1; }
console.log(`built ${built.length} pages + ${REDIRECTS.size} stubs + 404 + robots/sitemap/manifest (noindex ${NOINDEX ? 'ON' : 'off'})`);
