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
const PARKED = new Set(['sculptures']);
const PARKED_DIR = '_parked';
// THE NEW LANDING PAGES (owner 2026-11-15): the home page and /social/ redesigned as landing pages (templates/home-v2.html and
// social-v2.html). Held until Adham approves them: while false the live pages keep their current templates and the new ones are built
// only into _parked/preview/ (never published) for review screenshots. Set true and rebuild to publish them.
const SHOW_NEW_LANDING = false;
const V2 = { index: 'home-v2', social: 'social-v2' };
const PARKED_TO = { sculptures: 'index', fiberglass: 'index', branddeck: 'pricing' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
const EMAIL = 'team@crierstudio.com';
const BRAND = 'Crier Studio';
const PORTAL = 'https://portal.crierstudio.com/';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const LANGS = [['en', 'English', 'en_US'], ['ar', 'العربية', 'ar_EG']];
// ARABIC FIRST (owner 2026-11-15): Arabic is the default language at the root (/, /pricing/, ...), English lives under /en/. The old
// Arabic URLs (/ar/...) are redirect stubs to the same page at the root; the old English root URLs are now the Arabic pages, and a
// visitor who chose English (localStorage crier.lang) and arrives from outside the site is sent to /en/ (LANGUAGE_INLINE below).
const DEFAULT_LANG = 'ar';
// removed languages (2026-10-16): their old URLs stay as redirect stubs to the matching English page (/en/...), not in the sitemap
const REMOVED = ['es', 'fr'];
const RTL = new Set(['ar']);
// every page exists in both languages: / (en), /ar/ and the sub-paths below
// Two product lines (2026-10-18): Social (/social/: The Social Kit + the monthly plans) and In-store (/in-store/: The Store
// Kit waitlist + Custom pieces, whose quotes are asked in the client portal after a free sign-up).
// Sculptures (2026-10-18): the fiberglass catalog (data/sculptures.json), parked since 2026-11-14 (see PARKED above).
// The standalone /fiberglass/ and /branddeck/ pages are parked in _parked/ (2026-11-14); their URLs are redirect stubs.
const PAGES = ['index', 'pricing', 'brand-deck', 'social', 'in-store', 'sculptures', 'samples', 'faq', 'about', 'terms', 'privacy', 'refund'];
// renamed pages: the old URLs stay as redirect stubs in every language (full query kept; the visitor's #hash wins over the
// target's), not in the sitemap. A target may carry a #hash: /physical/ -> /in-store/#custom.
const MOVED = { kit: 'social', physical: 'in-store#custom', snapshot: 'social', 'crier-deck': 'brand-deck', ...PARKED_TO };
const WIDE = new Set(['index', 'pricing', 'brand-deck', 'social', 'in-store', 'sculptures', 'samples', 'about']); // wide layout; the rest use the narrow reading layout
const LEGAL = ['terms', 'privacy', 'refund'];
// Home v2 (2026-10-18): the header shows Social · Sculptures · Pricing · Client portal; Samples and FAQ moved to the footer only
// (In-store remains on the page and in the footer; Sculptures is parked)
const NAV = [['social', 'nav.social'], ['pricing', 'nav.pricing'], [PORTAL, 'nav.portal']];
// the footer keeps every destination: the header nav plus Samples, FAQ, About and Brand Deck
const NAV_FOOT = [['social', 'nav.social'], ['in-store', 'nav.instore'], ['samples', 'nav.samples'], ['pricing', 'nav.pricing'], ['faq', 'nav.faq'], ['about', 'nav.about'], ['brand-deck', 'nav.deck'], [PORTAL, 'nav.portal']];
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
const PRICES = Object.fromEntries(PRICING.packages.map((p) => [p.id, p.price])); // USD: the international price, in the HTML of every language
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
const RESTRICTED = Object.keys(COUNTRIES).length < Object.keys(COUNTRIES_ALL).length;
// VAT (review fix 2026-11-14, owner: not VAT-registered anywhere): a VAT line or "+ VAT" is shown only for a country whose price
// data marks VAT as charged (vat_pct above 0, and vat_charged not false). Otherwise the price shown is the amount due.
const vatOn = (cc) => !!cc && !!COUNTRIES[cc] && Number(COUNTRIES[cc].vat_pct) > 0 && COUNTRIES[cc].vat_charged !== false;
const vatPct = (cc) => (vatOn(cc) ? Number(COUNTRIES[cc].vat_pct) : 0);
const CURS = [...new Set(['USD', ...Object.values(COUNTRIES_ALL).map((c) => c.currency)])]; // every currency stays in data-* (one-country mode shows only its own) // the USA (2026-11-13) is a country in USD: listed once
// MENA landing (2026-10-16): a visitor whose country is unknown is quoted as Saudi Arabia (SAR + VAT), on every language page.
// The HTML is written in this country's prices (no flash of US dollars); site.js then follows the visitor's pick, Cloudflare or
// the time zone. The legal pages keep the US-dollar price list.
const DEFAULT_CC = RESTRICTED ? Object.keys(COUNTRIES)[0] : 'SA';
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
const LINKS = JSON.parse(rd('payment-links.json'));
// (checkout.json, the old public order form's Stripe switch, is no longer read: payment happens in the client portal)
for (const k of Object.keys(LINKS)) if (!PRODUCTS.includes(k)) throw new Error('payment-links.json: unknown product ' + k);
for (const k of PRODUCTS) {
  const v = LINKS[k];
  if (typeof v !== 'string') throw new Error('payment-links.json: missing or non-string entry for ' + k);
  if (v !== '' && !/^https:\/\/[^\s"'<>]+$/.test(v)) throw new Error('payment-links.json: ' + k + ' must be empty or an https:// link');
}
const dicts = Object.fromEntries(LANGS.map(([c]) => [c, JSON.parse(rd(`i18n/${c}.json`))]));
const partials = {
  hero: rd('templates/hero.html'), logo: rd('templates/logo.svg.html'), footer: rd('templates/footer.html'), header: rd('templates/header.html'),
  consent: rd('templates/consent.html'), panels: rd('templates/instore-panels.html'), waFloat: rd('templates/wa-float.html'),
  // the new home page (2026-11-15): its "How it works" slot ({{>how}} in templates/home-v2.html) is the video section, and its hero is the
  // animated phone ({{>hero-v2}}); the live home page keeps templates/hero.html
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
const VARIANT = RESTRICTED ? '.' + DEFAULT_CC.toLowerCase() : null;
function raw(lang, key) {
  used.add(key);
  if (VARIANT && dicts[lang][key + VARIANT] != null) { used.add(key + VARIANT); key = key + VARIANT; }
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
const VARIANT_RE = /\.(sa|ae|eg|us)$/;
function fillPricing(v, key, lang) {
  const need = (x, what) => { if (x == null) throw new Error(`i18n ${key}: ${what} is not in data/pricing.json`); return x; };
  // a price becomes a marker \u0002<usd>|<SAR>|<AED>|<EGP>\u0002: t() writes it as $<usd>, h() as a <span> site.js can localise
  const mark = (usd, loc, what) => '\u0002' + [need(usd, what), ...CURS.slice(1).map((c) => need(loc?.[c], what + ' ' + c))].join('|') + '\u0002';
  return v.replace(/\{price:(\w+)\}/g, (m, id) => mark(PKG[id]?.price, PKG[id]?.prices, 'price ' + id))
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
  return `<span class="${cls}" dir="${cur !== 'USD' && RTL.has(lang) ? 'rtl' : 'ltr'}" data-usd="${usd}"${CURS.slice(1).map((c, i) => ` data-${c.toLowerCase()}="${loc[i]}"`).join('')}>${esc(text)}</span>`;
}
const t = (lang, key) => raw(lang, key).replace(PRICE_MARK, (m, vals) => '$' + fmtNum(+vals.split('|')[0])).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/<\/?(?:b|a)>/g, '');
function h(lang, key, href) {
  let s = raw(lang, key).replace(/\{(\w+)\}/g, (m, k) => (k === 'email' ? '\u0001E\u0001' : k === 'wa' && WA ? '\u0001W\u0001' : vars[k] ?? m));
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
  const o = { countries, def: DEFAULT_CC, ...(RESTRICTED ? { lock: DEFAULT_CC } : {}), fmt: t(lang, 'cur.fmt'), vatLine: t(lang, 'cur.vatLine'), plusVat: t(lang, 'cur.plusVat'), vatAdded: t(lang, 'cur.vatAdded'), due: t(lang, 'cur.due'), pk: PKGDATA };
  for (const c of CURS) Object.assign(o, { ['sym' + c]: t(lang, 'cur.sym' + c), ['note' + c]: t(lang, 'cur.note' + c) });
  return `<script type="application/json" id="cur-data">${jsonScript(o)}</script>`;
}
// M14: a WhatsApp link only when data/contact.json has a number (the label key is always read, so it is never "unused")
// a wa.me link with a prefilled message (an i18n key, in the page language)
const waHref = (lang, key) => `https://wa.me/${WA}?text=${encodeURIComponent(t(lang, key))}`;
// the floating WhatsApp button (2026-11-15): every page and language, a short greeting in the page language
const waFab = (ctx) => (WA ? render(partials.waFloat, { lang: ctx.lang, v: { ...ctx.v, waFabHref: esc(waHref(ctx.lang, 'wa.fab.msg')) } }) + '\n' : (t(ctx.lang, 'wa.fab.aria'), t(ctx.lang, 'wa.fab.msg'), ''));
function waLink(lang) { return WA ? `<a href="https://wa.me/${WA}" dir="ltr" rel="noopener" target="_blank" class="wa-link">${esc(t(lang, 'contact.wa'))}</a>` : ''; }
// Order on WhatsApp (owner 2026-11-15): each Social package's MAIN button is a green "Order <package> on WhatsApp" that opens
// wa.me with the message prefilled with the package name and its monthly price (the page language, the page's country); under it a
// small "or create your account" link to the portal sign-up (?plan=<id>) and the "Pay by InstaPay" line. Payment details are
// given on WhatsApp until the payment gateway exists.
const waPrice = (lang, p) => (htmlCc ? display(lang, localQuote(p, htmlCc)) : '$' + fmtNum(PKG[p].price));
const waPayHref = (lang, p) => `https://wa.me/${WA}?text=${encodeURIComponent(t(lang, 'pay.wa.msg').replace('{pkg}', () => pname(lang, p)).replace('{price}', () => waPrice(lang, p)))}`;
function waPay(lang, p) {
  if (!WA || PKG[p]?.coming_soon) return ''; // the Brand Deck is coming soon: never payable
  return `<p class="wapay fine" data-pkg="${p}">${esc(t(lang, 'pay.wa.line'))}</p>`;
}
const pname = (lang, p) => t(lang, `name.${p}`);
const isLinked = (p) => LINKS[p] !== '';
// Audit fixes (2026-10-19): every buy / plan button opens the client portal's sign-up (AR pages with ?lang=ar); the public
// order form is gone. The portal supports no plan intent, so none is sent.
// Review fix (2026-11-14): the portal reads only ?lang=en|ar (hash or query, portal/public/app.js boot) and ?intent=quote; it has
// no plan or package parameter, so the chosen package cannot be passed and only the page language is sent.
// THE one place the portal sign-up link is built (2026-11-14): SIGNUP_PATH is the portal's sign-up route; a package button adds
// plan=<package id from data/pricing.json> (the portal is gaining ?plan=; an older portal ignores it), every link adds lang.
const SIGNUP_PATH = '#/signup';
const signupUrl = (lang, plan) => `${PORTAL}${SIGNUP_PATH}?${plan ? `plan=${encodeURIComponent(plan)}&` : ''}lang=${lang}`;
const portalHome = (lang) => `${PORTAL}?lang=${lang}`;
function buyHref(lang, p) { if (!PKG[p] || PKG[p].coming_soon) throw new Error('no buy link for ' + p); return isLinked(p) ? LINKS[p] : signupUrl(lang, p); }
function buyBtn(lang, p, ghost, noNote) { // noNote: the card carries the "Pay by InstaPay" WhatsApp line instead (waPay)
  if (p === 'deck') return `<button class="btn coming-soon" type="button" disabled data-unavailable="deck">${h(lang, 'pkg.deck.btn')}</button><span class="paynote">${h(lang, 'availability.deck')}</span>`;
  const payNote = h(lang, 'pay.note'); // read even when not shown: it comes back when data/contact.json has no WhatsApp number
  const choose = h(lang, `pkg.${p}.btn`), order = h(lang, `pkg.${p}.wa`), acct = h(lang, 'plan.orAccount'); // all read: the plain button comes back without a number
  if (WA && SOCIAL.includes(p)) return `<a class="btn wa-order" href="${esc(waPayHref(lang, p))}" data-product="${p}" data-wa-order="${p}" rel="noopener" target="_blank">${order}</a><a class="acct-link" href="${esc(buyHref(lang, p))}" data-signup="${p}">${acct}</a>`;
  const note = isLinked(p) || noNote ? '' : `<span class="paynote">${payNote}</span>`;
  return `<a class="btn${ghost ? ' ghost' : ''}" href="${esc(buyHref(lang, p))}" data-product="${p}">${choose}</a>${note}`;
}
// home hero (audit fixes, 2026-10-19): a "Start in your portal" card whose button opens the portal sign-up (no price, no
// package name: those are on /pricing/ only)
const ARROW = (lang) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${lang === 'ar' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'}"/></svg>`;
function heroStart(lang) {
  return { heroBtn: `<a class="btn" href="${esc(signupUrl(lang))}">${h(lang, 'hero.start.btn')} ${ARROW(lang)}</a>` };
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
// The example business (review fix 2026-11-14): "Example Café", made up, no real name, handle, logo or post. Its six posts are
// drawn in HTML/CSS from data/example-posts.json (client), in the page language; the avatar is a plain neutral circle. The count
// never exceeds the smallest package's posts a month, and every post is labelled a post (not a reel).
const EX = JSON.parse(rd('data/example-posts.json')).client;
const EX_LAYOUTS = ['word', 'spot', 'question', 'list', 'steps', 'tip', 'split', 'hours'];
const SMALLEST = PRICING.packages.filter((p) => !p.coming_soon && p.items?.posts).sort((a, b) => a.items.posts - b.items.posts)[0];
// 2026-11-15 (four packages, Bronze 4 posts a month): the hero phone is an Instagram PROFILE grid (six posts, several weeks of posts);
// the walkthrough is ONE month in the portal, so it shows no more than the smallest package's posts a month (dashPosts below)
if (!Array.isArray(EX.posts) || EX.posts.length < 6 || SMALLEST.items.posts < 1) throw new Error('data/example-posts.json: at least 6 example posts (the hero profile grid)');
for (const x of EX.posts) if (!EX_LAYOUTS.includes(x.layout) || !x.text?.en?.title || !x.text?.ar?.title) throw new Error('data/example-posts.json: bad post ' + JSON.stringify(x).slice(0, 60));
const digitsOf = (lang, n) => String(n); // digits 0–9 on every page, Arabic included (voice guide v3, 2026-11-15)
// a post's inner drawing in the page language
function exInner(layout, tx, tl, shapeKind) {
  const e = (s) => esc(s), n = (i) => digitsOf(tl, i);
  const mark = '<i class="xp-mark"></i>';
  if (layout === 'word') return `${mark}<b class="xp-big">${e(tx.h)}</b><span class="xp-s">${e(tx.s)}</span>`;
  if (layout === 'spot') return `${mark}<i class="xp-shape xp-sh-${shapeKind || 'circle'}"></i><b class="xp-h">${e(tx.h)}</b><span class="xp-s">${e(tx.s)}</span>`;
  if (layout === 'question') return `${mark}<i class="xp-q">${tl === 'ar' ? '؟' : '?'}</i><b class="xp-h">${e(tx.h)}</b><span class="xp-s">${e(tx.s)}</span>`;
  if (layout === 'list') return `${mark}<b class="xp-h">${e(tx.h)}</b><span class="xp-list">${tx.items.map((it) => `<span>${e(it)}</span>`).join('')}</span>`;
  if (layout === 'steps') return `${mark}<b class="xp-h">${e(tx.h)}</b><span class="xp-steps">${tx.items.map((it, i) => `<span><i>${n(i + 1)}</i>${e(it)}</span>`).join('')}</span>`;
  if (layout === 'tip') return `${mark}<span class="xp-tag">${e(tx.tag)}</span><b class="xp-h">${e(tx.h)}</b><span class="xp-s">${e(tx.s)}</span>`;
  if (layout === 'split') return `<span class="xp-half xp-before"><em>${e(tx.before)}</em><i></i></span><span class="xp-half xp-after"><em>${e(tx.after)}</em><i></i></span><b class="xp-h xp-band">${e(tx.h)}</b>`;
  return `${mark}<b class="xp-h">${e(tx.h)}</b><span class="xp-rows">${tx.rows.map(([a, b]) => `<span><b>${e(a)}</b><span>${e(b)}</span></span>`).join('')}</span>`; // hours
}
const palStyle = (pal) => `--xb:${pal[0]};--xi:${pal[1]};--xa:${pal[2]}`;
// one example post as a drawing (decorative: the phone and the dashboard carry their own description)
const exPost = (lang, p, cls = '') => `<span class="xp xp-fill xp-l-${p.layout}${cls ? ' ' + cls : ''}" style="${palStyle(EX.pal)}" lang="${lang}" dir="${RTL.has(lang) ? 'rtl' : 'ltr'}">${exInner(p.layout, p.text[lang], lang, p.shapeKind)}</span>`;
const HERO_STORY = 0;
const exPosts = (lang) => EX.posts.slice(0, 6).map((p) => `<span class="ex-cell">${exPost(lang, p)}</span>`).join('');
const exStory = (lang) => exPost(lang, EX.posts[HERO_STORY], 'xp-story');
const exLogo = '<span class="ex-logo" aria-hidden="true"></span>';
// Bronze in numbers (the Social Kit is retired, 2026-11-13): every number is a count from data/pricing.json
const KIT_PKG = 'seen';
const KIT_NUMS = [['posts', 'la.n.posts', 'la.n.postsx'], ['stories', 'la.n.stories', 'la.n.storiesx'], ['described_reels', 'la.n.reels', 'la.n.reelsx']];
const kitNums = (lang) => KIT_NUMS.map(([item, k, x]) => `<div class="la-num"><b dir="ltr">${PKG[KIT_PKG].items[item]}</b><span>${h(lang, k)}</span><small>${h(lang, x)}</small></div>`).join('');
// the OK rule: four promises, the last one links the refund policy
function homeTrust(lang) {
  const li = [['la.ok.1', 'home.trust.approve'], ['la.ok.2', 'home.trust.own'], ['la.ok.3', 'home.trust.f2']].map(([b, k]) => `<li><b>${h(lang, b)}</b>${h(lang, k)}</li>`).join('');
  return `<ul class="la-oklist">${li}<li><b>${h(lang, 'la.ok.4')}</b>${h(lang, 'home.trust.f5')} <a href="${pathFor(lang, 'refund')}">${h(lang, 'home.trust.refund')}</a></li></ul>`;
}
// the package table: one column per Social package; cells are i18n keys (counts as {n:<id>.<item>}), a cell key may be shared
// 2026-11-15: four packages with the same items (only the counts differ), so every row is the same key per package
const TABLE_PKGS = SOCIAL;
const TABLE_ROWS = [
  ['la.t.posts', TABLE_PKGS.map((p) => `la.t.posts.${p}`)],
  ['la.t.stories', TABLE_PKGS.map(() => 'la.t.stories.all')],
  ['la.t.reel', TABLE_PKGS.map((p) => `la.t.reel.${p}`)],
  ['la.t.plan', TABLE_PKGS.map((p) => `pkg.${p}.f4`)],
  ['la.t.rev', TABLE_PKGS.map((p) => `la.t.rev.${p}`)],
  ['la.t.plat', TABLE_PKGS.map((p) => `la.t.plat.${p}`)],
  ['la.t.pub', TABLE_PKGS.map(() => 'la.t.yes')],
  ['la.t.brand', TABLE_PKGS.map(() => 'la.t.yes')],
];
function priceTable(lang) {
  const hot = (p) => (p === 'visible' ? ' class="hot"' : '');
  const head = `<thead><tr><th scope="col">${h(lang, 'la.t.what')}</th>${TABLE_PKGS.map((p) => `<th scope="col"${hot(p)}><span class="la-pname">${esc(pname(lang, p))}</span><span class="la-ptag">${h(lang, `pkg.${p}.eye`)}</span></th>`).join('')}</tr></thead>`;
  const price = `<tr class="la-prow"><th scope="row">${h(lang, 'la.t.price')}</th>${TABLE_PKGS.map((p) => `<td${hot(p)}>${money(lang, p)}<span class="per">${h(lang, MONTHLY.has(p) ? 'plan.per' : 'one.per')}</span></td>`).join('')}</tr>`;
  const cls = (p, k) => { const c = [p === 'visible' && 'hot'].filter(Boolean); return c.length ? ` class="${c.join(' ')}"` : ''; };
  const rows = TABLE_ROWS.map(([label, cells]) => `<tr><th scope="row">${h(lang, label)}</th>${cells.map((k, i) => `<td${cls(TABLE_PKGS[i], k)}>${h(lang, k)}</td>`).join('')}</tr>`).join('');
  const buy = `<tr class="la-buy"><td></td>${TABLE_PKGS.map((p) => `<td${hot(p)}>${WA ? buyBtn(lang, p, false, true) : `<a class="btn${p === 'visible' ? '' : ' la-line'}" href="${esc(buyHref(lang, p))}" data-product="${p}">${h(lang, `pkg.${p}.btn`)}</a>`}${waPay(lang, p)}</td>`).join('')}</tr>`;
  return `<table class="la-table">${head}<tbody>${price}${rows}${buy}</tbody></table>`;
}

// ---- home "See what working with Crier looks like": the client portal walkthrough (approved mockup v2, 2026-10-18) ----
// An HTML/CSS recreation of the client portal, driven by assets/dash.js (45 s story loop). Portal labels
// are the portal's own (dash.* keys); posts, names and the caption are example content. Steps: wt.<n>l / t / x / screen.
const WT_STEPS = 5;
const DASH_EMAIL = 'team@crierstudio.com';
// icon paths copied from the portal's own set (portal/public/app.js)
const PI = {
  overview: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', review: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  folder: 'M3 6h6l2 2h10v11H3z', calendar: 'M4 5h16v15H4zM8 3v4M16 3v4M4 10h16', card: 'M3 6h18v12H3zM3 10h18M7 15h3', chat: 'M4 5h16v11H9l-5 4z', menu: 'M4 7h16M4 12h16M4 17h16', chev: 'M9 6l6 6-6 6', check: 'M4 12l5 5L20 6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18', work: 'M12 3v12M7 10l5 5 5-5M4 20h16', comment: 'M4 5h16v11H9l-5 4z',
};
const ic = (k, lang) => { const d = k === 'chev' && lang === 'ar' ? 'M15 6l-6 6 6 6' : PI[k]; return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`; };
const digits = digitsOf; // 0–9 everywhere

function dash(lang) {
  const T = (k) => t(lang, 'dash.' + k), D = (k) => esc(T(k)), ar = lang === 'ar';
  // the example business is the made-up "Example Café" (data/example-posts.json): its posts are drawings in one palette, in the
  // page language, labelled posts; the avatars are a plain neutral circle (no letters, no logo)
  const posts = EX.posts.slice(0, SMALLEST.items.posts).map((p) => ({ ...p, title: p.text[lang].title, label: T('typePost') })); // one month of the smallest package
  const date = (day) => ar ? digits(lang, day) + ' ' + T('monthShort') : T('monthShort') + ' ' + digits(lang, day);
  const image = (p, cls) => exPost(lang, p, cls);
  const logo = (cls) => '<span class="' + cls + ' d-neutral"></span>';
  const title = (p) => '<strong>' + esc(p.title) + '</strong>';
  const postCard = (p) => '<span class="d-post-card"><span class="d-post-visual">' + image(p, 'd-post-img') + '<span class="d-post-kind">' + esc(p.label) + '</span></span><span class="d-post-copy">' + title(p) + '<small>' + esc(date(p.day)) + '</small></span></span>';
  const postGrid = (arr, cls) => '<span class="d-post-grid ' + cls + '">' + arr.map(postCard).join('') + '</span>';
  const calendarCell = (p) => '<span class="d-calendar-cell"><span class="d-calendar-day">' + digits(lang, p.day) + '</span><span class="d-calendar-thumb">' + image(p, 'd-calendar-img') + '</span><span class="d-calendar-type">' + esc(p.label) + '</span></span>';
  const nav = (icon, key, screen, active) => '<span class="d-link' + (active ? ' on' : '') + '" data-nav="' + screen + '">' + ic(icon, lang) + '<span class="d-nl">' + D(key) + '</span></span>';
  const tab = (key, screen, active) => '<span class="d-tab' + (active ? ' on' : '') + '" data-nav="' + screen + '">' + D(key) + '</span>';
  const view = (screen, title, body, active) => '<span class="d-view' + (active ? ' is-on' : '') + '" data-screen="' + screen + '"><span class="d-view-head"><strong>' + D(title) + '</strong></span>' + body + '</span>';
  const row = (key, label) => '<span class="d-brief-row" data-brief="' + key + '"><span class="d-brief-label">' + D('brief' + key.charAt(0).toUpperCase() + key.slice(1)) + '</span><strong>' + D(label) + '</strong><span class="d-brief-check">' + ic('check', lang) + '</span></span>';
  const summary = (delivered, awaiting, approved, fourth, fourthCount) => '<span class="d-summary-grid">' +
    '<span class="d-summary-tile dark"><small>' + D('delivered') + '</small><strong data-k="delivered">' + digits(lang, delivered) + '</strong></span>' +
    '<span class="d-summary-tile"><small>' + D('awaiting') + '</small><strong data-k="await">' + digits(lang, awaiting) + '</strong></span>' +
    '<span class="d-summary-tile"><small>' + D('approved') + '</small><strong data-k="approved">' + digits(lang, approved) + '</strong></span>' +
    '<span class="d-summary-tile"><small>' + D(fourth) + '</small><strong data-k="' + (fourth === 'channels' ? 'channels' : 'readyCount') + '">' + digits(lang, fourthCount) + '</strong></span>' +
    '</span>';
  const emptyBody = summary(0, 0, 0, 'ready', 0) + '<span class="d-empty-state"><strong>' + D('emptyTitle') + '</strong><span class="d-empty-prompt"><span class="d-empty-spark">' + ic('spark', lang) + '</span><span><b>' + D('tellBusiness') + '</b><small>' + D('emptyHint') + '</small></span><span class="d-btn lime" data-b="answer">' + D('answerQuestions') + '</span></span></span>';
  const overviewBody = summary(posts.length, posts.length, 0, 'channels', 1) + postGrid(posts.slice(0, 4), 'd-overview-grid');
  const briefBody = '<span class="d-brief-list">' + row('industry', 'industryValue') + row('audience', 'audienceValue') + row('channels', 'channelsValue') + row('language', 'languageValue') + '</span><span class="d-brief-footer"><span class="d-brief-submitted" data-k="briefSubmitted">' + D('briefSubmitted') + '</span><span class="d-btn lime" data-b="submit-brief">' + D('submitBrief') + '</span></span>';
  const deliverablesBody = '<span class="d-view-note"><b data-k="delivered">' + digits(lang, posts.length) + '</b> ' + D('postsDelivered') + '</span>' + postGrid(posts, 'd-many-grid');
  const calendarBody = '<span class="d-calendar-title">' + D('calendarMonth') + '</span><span class="d-calendar-grid">' + posts.slice().sort((a, b) => a.day - b.day).map(calendarCell).join('') + '</span>';
  const libraryBody = '<span class="d-view-note">' + D('libraryNote') + '</span>' + postGrid(posts, 'd-many-grid d-library-grid');
  // no clock and no hours (review fix 2026-11-14): there is no promised delivery time
  const waitingBody = '<span class="d-wait-card"><span class="d-wait-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="d-wait-copy"><small>' + D('waitSub') + '</small><span class="d-clock-label">' + D('waitNote') + '</span></span></span>';
  const reviewPost = posts[posts.length - 1];
  const reviewBody = '<span class="d-review-card"><span class="d-review-image">' + image(reviewPost, 'd-review-img') + '</span><span class="d-review-copy"><small>' + esc(reviewPost.label + ' · ' + date(reviewPost.day)) + '</small>' + title(reviewPost) + '<span class="d-review-status" data-k="reviewStatus">' + D('pendingStatus') + '</span><span class="d-review-actions"><span class="d-btn sec" data-b="changes">' + D('changes') + '</span><span class="d-btn lime" data-b="approve">' + D('approve') + '</span></span></span></span>';
  const readyBody = '<span class="d-ready-card"><span class="d-ready-image">' + image(reviewPost, 'd-ready-img') + '</span><span class="d-ready-copy"><span class="d-ready-chips"><span class="d-chip">' + D('approvedStatus') + '</span><span class="d-chip">' + D('ready') + '</span></span><strong>' + D('readyTitle') + '</strong><small>' + esc(reviewPost.title) + '</small><span class="d-ready-actions"><span class="d-btn lime" data-b="sched"><span data-k="schedLabel">' + D('scheduled') + '</span></span></span></span></span>';
  const instagramBody = '<span class="d-instagram-card"><span class="d-ig-head"><span class="d-ig-avatar">' + logo('d-ig-logo') + '</span><strong>' + D('instagramHandle') + '</strong><span class="d-ig-network">' + D('instagram') + '</span></span><span class="d-ig-image">' + image(reviewPost, 'd-ig-post') + '<span class="d-ig-posted">' + D('posted') + '</span></span><span class="d-ig-footer"><span class="d-ig-icons" aria-hidden="true">♡　○　↗</span><small>' + esc(reviewPost.title) + '</small></span></span>';
  const briefView = view('brief', 'briefTitle', briefBody, false);
  const emptyView = view('empty', 'glance', emptyBody, false);
  const overviewView = view('overview', 'glance', overviewBody, false);
  const waitingView = view('waiting', 'waitTitle', waitingBody, false);
  const deliverablesView = view('deliverables', 'deliverables', deliverablesBody, false);
  const calendarView = view('calendar', 'calendar', calendarBody, false);
  const libraryView = view('library', 'library', libraryBody, false);
  const reviewView = view('review', 'reviewTitle', reviewBody, false);
  const readyView = view('ready', 'readyTitle', readyBody, true);
  const instagramView = view('instagram', 'instagram', instagramBody, false);
  const js = Object.fromEntries(['brand', 'site', 'briefSubmitted', 'pendingStatus', 'approvedStatus', 'approve', 'scheduled', 'postedNow'].map((k) => [k, T(k)]));
  js.posts = posts.length;
  const navLinks = nav('overview', 'overview', 'overview', true) + nav('layers', 'deliverables', 'deliverables', false) + nav('card', 'calendar', 'calendar', false) + nav('folder', 'library', 'library', false) + nav('review', 'review', 'review', false);
  const bottomLinks = [['overview', 'overview'], ['layers', 'deliverables'], ['card', 'calendar'], ['folder', 'library'], ['review', 'review']].map(([icon, key]) => '<span class="d-bn" data-nav="' + key + '">' + ic(icon, lang) + '<span>' + D(key) + '</span></span>').join('');
  return '<div class="dash" id="dash" role="img" aria-label="' + D('aria') + '">' +
    '<span class="d-cam" aria-hidden="true"></span><span class="ex-badge" aria-hidden="true">' + D('ex') + '</span>' +
    '<span class="d-vp" aria-hidden="true"><span class="d-cv">' +
      '<span class="d-side"><span class="d-logo">' + logo('d-brand-logo') + '</span>' +
        '<span class="d-client"><span class="d-mark">' + logo('d-brand-avatar') + '</span><span class="d-ct"><strong>' + D('brand') + '</strong><small>' + D('ws') + '</small></span></span>' +
        '<span class="d-nav">' + navLinks + '</span><span class="d-group">' + D('group') + '</span>' +
        '<span class="d-foot"><span class="d-user"><span class="d-av">' + logo('d-user-avatar') + '</span><span class="d-ct"><strong>' + D('user') + '</strong><small>' + D('client') + '</small></span></span></span></span>' +
      '<span class="d-mtop"><span class="d-mmenu">' + ic('menu', lang) + '</span><span class="d-mbrand">' + logo('d-brand-avatar') + '<strong>' + D('brand') + '</strong></span><span class="d-pill lime d-mpill">' + D('ready') + '</span></span>' +
      '<span class="d-main"><span class="d-head"><span class="d-h1">' + D('greet') + '</span><span class="d-pill lime d-hpill">' + D('ready') + '</span></span>' +
        '<span class="d-tabs">' + tab('overview', 'overview', true) + tab('deliverables', 'deliverables', false) + tab('calendar', 'calendar', false) + tab('library', 'library', false) + '</span>' +
        '<span class="d-stage">' + briefView + emptyView + overviewView + waitingView + deliverablesView + calendarView + libraryView + reviewView + readyView + instagramView + '</span>' +
      '</span><span class="d-bnav">' + bottomLinks + '</span>' +
      '<span class="d-modal" data-k="modal"><span class="d-mbox"><span class="d-mbrand modal-brand">' + logo('d-brand-avatar') + '<strong>' + D('brand') + '</strong></span><strong class="d-mt">' + D('signup') + '</strong>' +
        '<span class="d-f"><span class="d-fl">' + D('company') + '</span><span class="d-fi" data-c="company"><span data-k="type">' + D('brand') + '</span><i class="d-caret"></i></span></span>' +
        '<span class="d-f"><span class="d-fl">' + D('website') + '</span><span class="d-fi" data-c="site" dir="ltr"><span data-k="typedSite">' + D('site') + '</span><i class="d-caret"></i></span></span>' +
        '<span class="d-btn lime d-wide" data-b="create">' + D('signup') + '</span></span></span>' +
      '<span class="d-cursor"><svg viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.1 1.3 3.6 6.9-2.7 1.4-3.6-7L5 18.2z" fill="#0E0F0C" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></span>' +
    '</span></span><script type="application/json" id="dash-s">' + jsonScript(js) + '</script></div>';
}
function walkthrough(lang) {
  const n = Array.from({ length: WT_STEPS }, (_, i) => i + 1), two = (i) => String(i).padStart(2, '0');
  // the finished state: the last step active, the ones before it done (dash.js resets this when it runs)
  const wtSteps = n.map((i) => `<li class="wt-step ${i < WT_STEPS ? 'is-done' : 'is-active'}" data-step="${i}"><button type="button" class="wt-btn" aria-controls="dash" aria-current="${i < WT_STEPS ? 'false' : 'step'}"><span class="wt-num" aria-hidden="true">${two(i)}</span><span class="wt-text"><span class="wt-label">${h(lang, `wt.${i}l`)}</span><span class="wt-title">${h(lang, `wt.${i}t`)}</span></span></button><span class="wt-bar" aria-hidden="true"><i></i></span></li>`).join('');
  // the active step's detail sits in one fixed-height box (all five stacked in one grid cell) so the page never shifts
  const wtDetails = n.map((i) => `<div class="wt-d${i < WT_STEPS ? '' : ' is-on'}" data-step="${i}"><p class="wt-sub">${h(lang, `wt.${i}x`)}</p><p class="wt-screen"><span>${h(lang, 'wt.screen')}:</span> ${h(lang, `wt.${i}screen`)}</p></div>`).join('');
  // "Get started": the client portal's own sign-up, in the page language
  return { dash: dash(lang), wtSteps, wtDetails, wtTotal: two(WT_STEPS), signupHref: esc(signupUrl(lang)) };
}
function homeVars(lang) {
  return {
    heroH1: heroH1(lang), exPosts: exPosts(lang), exStory: exStory(lang), exLogo, ...heroStart(lang),
    kitNums: kitNums(lang), kitPrice: money(lang, KIT_PKG), kitBtn: `<a class="btn lime" href="${esc(buyHref(lang, KIT_PKG))}" data-product="${KIT_PKG}">${h(lang, `pkg.${KIT_PKG}.btn`)}</a>`,
    trust: homeTrust(lang), ...walkthrough(lang), curPick: curPick(lang), priceTable: priceTable(lang),
  };
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
  // Home: Landing A (2026-11-06, Adham): the package table is back on the home page (overrides the 2026-10-19 audit rule);
  // the walkthrough and the home FAQ are gone (the FAQ page stays).
  if (page === 'index') Object.assign(v, homeVars(lang));
  if (page === 'social') Object.assign(v, { kitList: ticks(lang, 'kit.inc', 'cols'), flow: flow(lang, 3, 'how') });
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
  const base = (size) => { const b = `/assets/video/how-${lang}-${size}`; for (const ext of ['.mp4', '.webm', '-poster.jpg']) if (!fs.existsSync(path.join(ROOT, b.slice(1) + ext))) throw new Error('how-it-works video: missing ' + b + ext + ' (run node build/render-walkthrough.mjs)'); return b; };
  const two = (i) => String(i).padStart(2, '0');
  // the still state: step 1 is the one the poster shows
  const hwSteps = HOW.steps.map((_, k) => { const i = k + 1; return `<li class="wt-step${k ? '' : ' is-active'}" data-step="${i}"><button type="button" class="wt-btn" aria-controls="how-video" aria-current="${k ? 'false' : 'step'}"><span class="wt-num" aria-hidden="true">${two(i)}</span><span class="wt-text"><span class="wt-label">${h(lang, `hw.${i}l`)}</span><span class="wt-title">${h(lang, `hw.${i}t`)}</span></span></button><span class="wt-bar" aria-hidden="true"><i></i></span></li>`; }).join('');
  return {
    hvGrid: HV_GRID[lang].slice(0, 9).map(tile).join(''), hvNext: HV_GRID[lang].slice(9).map(hvSrc).join(','),
    hvStory: `<img src="${hvSrc(HV_STORY[lang])}" width="240" height="427" decoding="async" alt="">`,
    hvCal: [...HV_CAL].map((c) => (c === '.' ? '<i></i>' : `<i class="${c}"></i>`)).join(''), hvFol: esc(t(lang, 'hv.k').replace('{n}', '1.2')),
    hwSteps, hwTotal: two(HW_STEPS), hwTimes: HOW.steps.join(','), hwDur: String(HOW.duration), hwDesk: base('1080'), hwPhone: base('phone'),
  };
}
const waBtn = (lang, key, where, label = 'lp.cta') => `<a class="btn wa-order" href="${esc(waHref(lang, key))}" target="_blank" rel="noopener" data-wa="${where}">${h(lang, label)}</a>`;
function landingVars(lang, page) {
  const common = { makeItems: makeItems(lang), exGallery: exGallery(lang), curPick: curPick(lang), planCards: planCards(lang) };
  if (page === 'index') return { ...homeVars(lang), ...common, ...motionVars(lang), heroBtn: waBtn(lang, 'wa.fab.msg', 'home_hero'), lpWaHref: esc(waHref(lang, 'wa.fab.msg')), lpFaq: LP_FAQ.map((k) => qa(lang, k)).join('') };
  return { ...common, spWaHref: esc(waHref(lang, 'sp.wamsg')), spFaq: SP_FAQ.map((k) => qa(lang, k)).join(''),
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
const quoteHref = (lang) => (WA ? waHref(lang, 'is.q.wamsg') : `mailto:${EMAIL}?subject=${encodeURIComponent(t(lang, 'is.q.wamsg'))}`);
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
    nodes.push({ '@type': 'Organization', '@id': orgId, name: BRAND, url: SITE + '/', logo: { '@type': 'ImageObject', url: LOGO_URL, width: 512, height: 512 }, image: LOGO_URL, email: EMAIL, description: t(lang, 'foot.blurb'),
      areaServed: Object.keys(COUNTRIES).map(COUNTRY_LD) });
    // Egypt-only (2026-11-15): the studio as a ProfessionalService serving Egypt, with the package offers in EGP (no street address is
    // published, so no LocalBusiness address)
    nodes.push({ '@type': 'ProfessionalService', '@id': SITE + '/#service', name: BRAND, url: urlFor(lang, 'index'), image: LOGO_URL, logo: LOGO_URL, email: EMAIL, ...(WA ? { telephone: '+' + WA } : {}),
      description: t(lang, 'meta.d.index'), areaServed: Object.keys(COUNTRIES).map(COUNTRY_LD), availableLanguage: ['ar', 'en'], parentOrganization: { '@id': orgId },
      priceRange: [Math.min(...SOCIAL.map((p) => localQuote(p, DEFAULT_CC).total)), Math.max(...SOCIAL.map((p) => localQuote(p, DEFAULT_CC).total))].map((m) => fmtNum(m / 100)).join('–') + ' ' + COUNTRIES[DEFAULT_CC].currency,
      hasOfferCatalog: { '@type': 'OfferCatalog', name: t(lang, 'pricing.h1'), itemListElement: SOCIAL.flatMap((p) => offerNode(lang, p)) } });
    if (landing && LANDING_FAQ[page]) nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: LANDING_FAQ[page].map((k) => ({ '@type': 'Question', name: t(lang, k + 'q'), acceptedAnswer: { '@type': 'Answer', text: t(lang, k + 'a') } })) });
    nodes.push({ '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, alternateName: 'Crier', url: SITE + '/', inLanguage: lang, publisher: { '@id': orgId } });
  } else {
    nodes.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(lang, 'crumb.home'), item: urlFor(lang, 'index') },
      { '@type': 'ListItem', position: 2, name: t(lang, CRUMB_KEY[page]), item: urlFor(lang, page) }] });
    const provider = { '@type': 'Organization', name: BRAND, url: SITE + '/' };
    // informational Services without offers (audit fixes, 2026-10-19: offers and prices are on /pricing/ only)
    if (landing && LANDING_FAQ[page]) nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: LANDING_FAQ[page].map((k) => ({ '@type': 'Question', name: t(lang, k + 'q'), acceptedAnswer: { '@type': 'Answer', text: t(lang, k + 'a') } })) });
    if (page === 'brand-deck' || page === 'social') {
      nodes.push({ '@type': 'Service', name: page === 'social' ? t(lang, 'kit.title') : pname(lang, 'deck'), description: t(lang, `meta.d.${page}`), url: urlFor(lang, page), provider, availableLanguage: ['en', 'ar'] });
    }
    // In-store: The Store Kit (waitlist) and Custom pieces (requests through the client portal), informational, with no offers
    if (page === 'in-store') {
      nodes.push({ '@type': 'Service', name: t(lang, 'name.store'), description: t(lang, 'is.kit.line'), url: urlFor(lang, page) + '#kit', provider, areaServed: Object.keys(COUNTRIES).map(COUNTRY_LD) });
      nodes.push({ '@type': 'Service', name: t(lang, 'is.c.name'), description: t(lang, 'is.c.intro'), url: urlFor(lang, page) + '#custom', provider });
    }
    // Sculptures: informational, with no offers (pieces are quoted in the client portal)
    if (page === 'sculptures') nodes.push({ '@type': 'Service', name: t(lang, 'nav.sculptures'), description: t(lang, 'meta.d.sculptures'), url: urlFor(lang, page), provider });
    if (page === 'pricing') {
      const items = PRODUCTS.map((p) => ({ '@type': 'Service', name: pname(lang, p), provider, ...(p === 'deck' ? { description: t(lang, 'availability.deck') } : { offers: offerNode(lang, p) }) }));
      nodes.push({ '@type': 'ItemList', name: t(lang, 'pricing.h1'), itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })) });
    }
    if (page === 'faq') {
      nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: FAQ_ALL.map((i) => ({ '@type': 'Question', name: t(lang, `faq.${i}q`),
        acceptedAnswer: { '@type': 'Answer', text: faqAnswers(lang, i).map((k) => t(lang, k)).join(' ') } })) });
    }
  }
  return `<script type="application/ld+json">${jsonScript({ '@context': 'https://schema.org', '@graph': nodes })}</script>`;
}
// ---------- Google Analytics 4 + Consent Mode v2 ----------
// Every page (all languages, 404, redirect stubs) carries this once, right after the CSP meta. Consent defaults to denied for
// everything; only analytics_storage is granted, and only after the visitor presses Accept in the consent bar
// (templates/consent.html, localStorage 'crier_consent'). Ads signals stay denied always.
// Speed (2026-10-11, owner approved "delay Analytics"): gtag.js (~176 KB) is NOT a <script src> in <head>. The inline script
// sets the consent defaults and queues js/config in dataLayer right away. gtag.js itself is injected on the visitor's first
// interaction (pointerdown, touchstart, keydown, scroll or wheel), or 6 s after the window 'load' event if there is none, or at
// once when the visitor uses the consent bar or the Cookie settings link. gtag.js replays the queue on arrival, so nothing is
// lost and page_view fires once. (2026-10-11, mobile PageSpeed 100: the earlier "after load + idle, at most 3 s" still ran
// gtag.js's ~300 ms of script inside the PageSpeed test window, costing Total Blocking Time and Speed Index.)
// Trade-off: visitors who leave within about 6 s of the page loading without scrolling, tapping or typing are not counted.
const GA_ID = 'G-QLQ443CQ8E';
const GA_INLINE = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{if(localStorage.getItem('crier_consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('js',new Date());gtag('config','${GA_ID}');` +
  `(function(){var w=window,d=document,n=0,E=['pointerdown','touchstart','keydown','scroll','wheel'],O={passive:true,capture:true};` +
  `function L(){if(n)return;n=1;for(var i=0;i<E.length;i++)w.removeEventListener(E[i],L,O);var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';d.head.appendChild(s);}` +
  `for(var i=0;i<E.length;i++)w.addEventListener(E[i],L,O);` +
  `function T(){setTimeout(L,6000);}` +
  `if(d.readyState==='complete')T();else w.addEventListener('load',T);` +
  `d.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('#consent-bar,[data-consent-open],a[href$="#cookie-settings"]'))L();},true);})();`;
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
const SCRIPT_HASHES = [sha(GA_INLINE), sha(LANGUAGE_INLINE), sha(CONSENT_JS)];
const CSP = "default-src 'self'; script-src 'self' " + SCRIPT_HASHES.join(' ') + " https://static.cloudflareinsights.com https://*.googletagmanager.com; connect-src 'self' https://crm-production-d789.up.railway.app https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'";
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
  const alt = LANGS.map(([c]) => `<link rel="alternate" hreflang="${c}" href="${urlFor(c, page)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, page)}">`;
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
${GA_HEAD}
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
const JS_WORDS = new Set([rd('site.js'), rd('assets/studio.js'), rd('assets/deck.js'), CONSENT_JS].join('\n').match(/[A-Za-z_][\w-]*/g));
// assets/dash.js (the home dashboard) only runs on pages with #dash, so its words count only there
const DASH_WORDS = rd('assets/dash.js').match(/[A-Za-z_][\w-]*/g);
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
  if (html.includes('id="dash"')) for (const w of DASH_WORDS) have.add(w);
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
// rebuilt from scratch on every build; the original files stay where they are for anything else that links to them.
const HASHED_DIR = 'assets/h';
fs.rmSync(path.join(ROOT, HASHED_DIR), { recursive: true, force: true });
const hashedUrls = new Map();
function hashed(url) {
  if (hashedUrls.has(url)) return hashedUrls.get(url);
  const src = path.join(ROOT, url.slice(1)), buf = fs.readFileSync(src);
  const ext = path.extname(url), out = `/${HASHED_DIR}/${path.basename(url, ext)}.${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)}${ext}`;
  fs.mkdirSync(path.join(ROOT, HASHED_DIR), { recursive: true });
  fs.writeFileSync(path.join(ROOT, out.slice(1)), buf);
  hashedUrls.set(url, out);
  return out;
}
// (the sculpture images in assets/sculptures/ keep their names: the lightbox builds their URLs from the piece id)
const hashUrls = (html) => html.replace(/\/(?:fonts|assets)\/[\w.-]+\.(?:woff2|avif|webp|png)\b|\/site\.js\b|\/assets\/(?:dash|sculptures|landing)\.js\b/g, hashed);

// ---------- build ----------
function write(rel, content) {
  // every inline script that runs must be allowed by a CSP hash, or the browser blocks it
  if (rel.endsWith('.html')) for (const m of content.matchAll(/<script>([\s\S]*?)<\/script>/g)) if (!SCRIPT_HASHES.includes(sha(m[1]))) throw new Error('inline script without a CSP hash in ' + rel);
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
const built = [];
for (const [lang] of LANGS) {
  for (const page of PAGES) {
    htmlCc = LEGAL.includes(page) && !RESTRICTED ? null : DEFAULT_CC; // the legal pages keep the US-dollar price list, except while one country is served (they are in its currency then)
    for (const landing of V2[page] ? [true, false] : [false]) {
      if (landing !== SHOW_NEW_LANDING && !(landing && !SHOW_NEW_LANDING)) continue; // live: the chosen version; held v2: preview copy too
      const ctx = { lang, v: landing ? { ...pageVars(lang, page), ...landingVars(lang, page) } : pageVars(lang, page) };
      const body = render(rd(`templates/${landing ? V2[page] : page === 'index' ? 'home' : page}.html`), ctx);
      const bodyHtml = `<body data-page="${page}" class="studio-inner">\n${render(partials.consent, ctx)}\n<div class="wrap">\n${render(partials.header, ctx)}\n${body}\n${render(partials.footer, ctx)}\n</div>\n${waFab(ctx)}${!LEGAL.includes(page) && /class="(price )?amt"/.test(body) ? curData(lang) + '\n' : ''}<script src="/site.js" defer></script>\n${body.includes('id="dash"') ? '<script src="/assets/dash.js" defer></script>\n' : ''}${body.includes('id="hv"') || body.includes('id="how-video"') ? '<script src="/assets/landing.js" defer></script>\n' : ''}${page === 'sculptures' ? '<script src="/assets/sculptures.js" defer></script>\n' : ''}</body>\n</html>\n`;
      const html = `${head(lang, page, purgeCss(cssFor(lang, page, landing), bodyHtml), landing)}\n${trimIndent(bodyHtml)}`;
      if (PARKED.has(page)) { write(`${PARKED_DIR}/${dirFor(lang, page)}index.html`, html); continue; } // kept, never published
      if (landing && !SHOW_NEW_LANDING) { write(`${PARKED_DIR}/preview/${dirFor(lang, page)}index.html`, hashUrls(html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">'))); continue; } // held: review copy only
      write(dirFor(lang, page) + 'index.html', hashUrls(html));
      built.push([lang, page]);
    }
  }
}

// The old studio introduction and the old share-image page (the retired branding offer): kept in _parked/, never published;
// their old addresses redirect home (stubs below).
write(`${PARKED_DIR}/studio-deck/index.html`, rd('templates/studio-deck.html'));
write(`${PARKED_DIR}/social-preview.html`, rd('templates/social-preview.html'));

// old legal URL stubs redirect to the default language (Arabic); a saved language is applied before paint
for (const page of LEGAL) {
  write(`${page}.html`, hashUrls(`<!doctype html>
<html lang="${DEFAULT_LANG}" dir="${RTL.has(DEFAULT_LANG) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
${LANGUAGE_HEAD}
<title>${BRAND}</title>
<link rel="canonical" href="${urlFor(DEFAULT_LANG, page)}">
<noscript><meta http-equiv="refresh" content="0;url=${pathFor(DEFAULT_LANG, page)}"></noscript>
</head>
<body data-page="redirect" data-target="${page}">
<p><a href="${pathFor(DEFAULT_LANG, page)}">${BRAND}</a></p>
<script src="/site.js"></script>
</body>
</html>
`));
}

// redirect stub at /<from>/ (in the folder of language `dir`) to page `to` in language `lang`; `to` may carry a #hash
// (physical -> in-store#custom). site.js keeps the full query string, and the visitor's own #hash if there is one, else the
// target's; without JS the meta refresh goes to the new page (with the target's #hash). Not in the sitemap.
function stub(dir, from, lang, to) {
  const folder = (dir ? dir + '/' : '') + (from === 'index' ? '' : from + '/');
  write(folder + 'index.html', stubHtml(lang, to));
}
function stubHtml(lang, to) {
  const [pg, hash = ''] = to.split('#'), href = pathFor(lang, pg) + (hash ? '#' + hash : '');
  return hashUrls(`<!doctype html>
<html lang="${lang}" dir="${RTL.has(lang) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
${LANGUAGE_HEAD}
<title>${BRAND}</title>
<link rel="canonical" href="${urlFor(lang, pg)}">
<noscript><meta http-equiv="refresh" content="0;url=${href}"></noscript>
</head>
<body data-page="redirect" data-target="${pg}"${hash ? ` data-hash="${hash}"` : ''} data-lang="${lang}">
<p><a href="${href}">${BRAND}</a></p>
<script src="/site.js"></script>
</body>
</html>
`);
}
// renamed pages, in each language's own folder: Arabic (the default) at the root, English under /en/
for (const [from, to] of Object.entries(MOVED)) { stub('', from, 'ar', to); stub('en', from, 'en', to); }
// the retired studio deck and share-image page (2026-11-14): their old addresses go home
stub('assets', 'studio-deck', 'en', 'index');
write('assets/social-preview.html', stubHtml('en', 'index'));
// Arabic lived under /ar/ until 2026-11-15 (English was the default at the root): every old /ar/… URL redirects to the same Arabic
// page at the root, keeping the query string and the #hash
const LIVE_PAGES = PAGES.filter((p) => !PARKED.has(p)).map((p) => [p, p]); // parked pages are in MOVED
for (const [from, to] of [...LIVE_PAGES, ...Object.entries(MOVED)]) stub('ar', from, 'ar', to);
// removed languages: /es/… and /fr/… redirect to the English page (/en/…)
for (const lang of REMOVED) for (const [from, to] of [...LIVE_PAGES, ...Object.entries(MOVED)]) stub(lang, from, 'en', to);

// 404 (one file, two languages; header and footer in Arabic, the default, then one block per language, Arabic first)
{
  htmlCc = null;
  const ctx = { lang: DEFAULT_LANG, v: { ...pageVars(DEFAULT_LANG, '404'), langpick: langpick(DEFAULT_LANG, 'index'), crumbs: '' } };
  const sections = [...LANGS].sort(([a]) => (a === DEFAULT_LANG ? -1 : 1)).map(([c]) => {
    const links = [['index', 'crumb.home'], ['social', 'nav.social'], ['in-store', 'nav.instore'], ['pricing', 'nav.pricing']].map(([p, k]) => `<a href="${pathFor(c, p)}">${esc(t(c, k))}</a>`).join(' · ');
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
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for (const page of PAGES.filter((p) => !HIDDEN.has(p))) {
  for (const [lang] of LANGS) {
    sm.push('<url>', `<loc>${urlFor(lang, page)}</loc>`);
    for (const [c] of LANGS) sm.push(`<xhtml:link rel="alternate" hreflang="${c}" href="${urlFor(c, page)}"/>`);
    sm.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, page)}"/>`, '</url>');
  }
}
sm.push('</urlset>', '');
write('sitemap.xml', sm.join('\n'));
write('site.webmanifest', JSON.stringify({ name: BRAND, short_name: BRAND, lang: DEFAULT_LANG, dir: 'auto', start_url: '/', display: 'browser', background_color: '#F6F8EF', theme_color: '#0E0F0C',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] }, null, 2) + '\n');

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
console.log(`built ${built.length} pages + ${LEGAL.length + LANGS.length * Object.keys(MOVED).length + LIVE_PAGES.length + Object.keys(MOVED).length + REMOVED.length * (LIVE_PAGES.length + Object.keys(MOVED).length) + 2} stubs + 404 + robots/sitemap/manifest (noindex ${NOINDEX ? 'ON' : 'off'})`);
