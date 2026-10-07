// Crier Studio static site build. Node only, no dependencies.
// Reads i18n/<lang>.json + templates/*, writes static HTML for en (/), es, fr, ar into the repo root.
// Run:  node build/build.mjs        (the built files are committed; GitHub Pages serves it as-is)
// Check: node build/check.mjs       (key sets identical in all 4 languages, no unused keys, no price/UMA/draft text)
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
const EMAIL = 'team@crierstudio.com';
const BRAND = 'Crier Studio';
const PORTAL = 'https://portal.crierstudio.com/';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const LANGS = [['en', 'English', 'en_US'], ['es', 'Español', 'es_ES'], ['fr', 'Français', 'fr_FR'], ['ar', 'العربية', 'ar_AR']];
const RTL = new Set(['ar']);
// every page exists in all 4 languages: / (en), /es/, /fr/, /ar/ and the sub-paths below
const PAGES = ['index', 'pricing', 'brand-deck', 'kit', 'samples', 'faq', 'about', 'physical', 'terms', 'privacy', 'refund'];
// renamed pages: the old URLs stay as redirect stubs in every language (query + hash kept), not in the sitemap
const MOVED = { snapshot: 'kit', 'crier-deck': 'brand-deck' };
const WIDE = new Set(['index', 'pricing', 'brand-deck', 'kit', 'samples', 'about', 'physical']); // wide layout; the rest use the narrow reading layout
const LEGAL = ['terms', 'privacy', 'refund'];
const NAV = [['pricing', 'nav.pricing'], ['kit', 'nav.kit'], ['brand-deck', 'nav.deck'], ['samples', 'nav.samples'], ['faq', 'nav.faq'], ['about', 'nav.about'], ['physical', 'nav.physical'], [PORTAL, 'nav.portal']];
const CRUMB_KEY = { pricing: 'nav.pricing', 'brand-deck': 'nav.deck', kit: 'nav.kit', samples: 'nav.samples', faq: 'nav.faq', about: 'nav.about', physical: 'nav.physical', terms: 'foot.terms', privacy: 'foot.privacy', refund: 'foot.refund' };
const INDUSTRY_VALUES = ['Cafés and dessert shops', 'Salons', 'Gyms and studios', 'Clinics', 'Local services', 'Other local business'];

// ---------- products + payment links ----------
// payment-links.json (repo root) holds one entry per product. Empty = the Buy button opens the request form with the product
// preselected ("We'll email you a secure payment link"). A filled-in https:// link (a Stripe Payment Link) = the button goes straight to it.
// Every price and count comes from data/pricing.json, written by the UMA repo's portal/scripts/publish-pricing.cjs from
// portal/lib/pricing.json (the one price list). Texts use {price:<id>}, {extra:<id>} (extra platform), {plat:<id>}
// (platforms included) and {n:<id>.<item>} (a count). Never write a price or a count into i18n or templates.
const PRICING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pricing.json'), 'utf8'));
const PKG = Object.fromEntries(PRICING.packages.map((p) => [p.id, p]));
const PRICES = Object.fromEntries(PRICING.packages.map((p) => [p.id, p.price])); // USD, shown as-is in every language
const MONTHLY = new Set(PRICING.packages.filter((p) => p.billing === 'monthly').map((p) => p.id)); // billed monthly; kit and deck are one-time
// product names are i18n keys (name.<id>) so every language shows its own name
const PRODUCTS = Object.keys(PRICES);
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const LINKS = JSON.parse(rd('payment-links.json'));
// L1 checkout (checkout.json): off = the request form as before; on = Pay with platforms and the live total (Stripe Checkout)
const CHECKOUT = JSON.parse(rd('checkout.json'));
if (CHECKOUT.enabled && !/^https:\/\/[^\s"'<>]+\/api\/public\/checkout$/.test(CHECKOUT.endpoint || '')) throw new Error('checkout.json: endpoint must be https://…/api/public/checkout');
for (const k of Object.keys(LINKS)) if (!PRODUCTS.includes(k)) throw new Error('payment-links.json: unknown product ' + k);
for (const k of PRODUCTS) {
  const v = LINKS[k];
  if (typeof v !== 'string') throw new Error('payment-links.json: missing or non-string entry for ' + k);
  if (v !== '' && !/^https:\/\/[^\s"'<>]+$/.test(v)) throw new Error('payment-links.json: ' + k + ' must be empty or an https:// link');
}
const dicts = Object.fromEntries(LANGS.map(([c]) => [c, JSON.parse(rd(`i18n/${c}.json`))]));
const partials = {
  hero: rd('templates/hero.html'), logo: rd('templates/logo.svg.html'), footer: rd('templates/footer.html'), header: rd('templates/header.html'),
  consent: rd('templates/consent.html'),
};
const CSS = {
  fonts: rd('templates/fonts.css'), fontsAr: rd('templates/fonts-ar.css'), common: rd('templates/common.css'),
  home: rd('templates/home.css'), legal: rd('templates/legal.css'), consent: rd('templates/consent.css'), studio: rd('templates/studio-home.css'), chrome: rd('templates/studio-shared.css'),
};
const faqCss = CSS.home.slice(CSS.home.indexOf('/* faq */'), CSS.home.indexOf('/* closing */'));

// ---------- text helpers ----------
const used = new Set();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function raw(lang, key) {
  used.add(key);
  const v = dicts[lang][key];
  if (v == null) throw new Error(`missing i18n key ${key} (${lang})`); // strict: no silent fallback to English
  return fillPricing(v, key);
}
const vars = { brand: BRAND, email: EMAIL };
function fillPricing(v, key) {
  const need = (x, what) => { if (x == null) throw new Error(`i18n ${key}: ${what} is not in data/pricing.json`); return x; };
  return v.replace(/\{price:(\w+)\}/g, (m, id) => '$' + need(PKG[id]?.price, 'price ' + id))
    .replace(/\{extra:(\w+)\}/g, (m, id) => '$' + need(PKG[id]?.extra_platform_price, 'extra platform price ' + id))
    .replace(/\{plat:(\w+)\}/g, (m, id) => String(need(PKG[id]?.platforms_included, 'platforms of ' + id)))
    .replace(/\{n:(\w+)\.(\w+)\}/g, (m, id, item) => String(need(PKG[id]?.items?.[item], `count ${id}.${item}`)));
}
const t = (lang, key) => raw(lang, key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/<\/?(?:b|a)>/g, '');
function h(lang, key, href) {
  let s = raw(lang, key).replace(/\{(\w+)\}/g, (m, k) => (k === 'email' ? '\u0001E\u0001' : vars[k] ?? m));
  s = esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>')
    .replace(/&lt;a&gt;/g, href ? `<a href="${esc(href)}">` : '<a>').replace(/&lt;\/a&gt;/g, '</a>')
    .replace(/\u0001E\u0001/g, `<a dir="ltr" href="mailto:${EMAIL}">${EMAIL}</a>`);
  return s;
}
const jsonScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// ---------- URLs ----------
const dirFor = (lang, page) => (lang === 'en' ? '' : lang + '/') + (page === 'index' ? '' : page + '/');
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
const minis = [
  '<div class="mini score" aria-hidden="true"><span style="height:55%"></span><span style="height:75%"></span><span style="height:40%"></span><span style="height:65%"></span></div>',
  '<div class="mini fix" aria-hidden="true"><span style="width:80%"></span><span style="width:62%"></span><span style="width:70%"></span></div>',
  '<div class="mini posts" aria-hidden="true"><span></span><span></span></div>',
];
const INDCOLORS = [['sun', 'coral'], ['coral', 'accent'], ['accent', 'ink'], ['ink', 'sun'], ['sun', 'accent']];
// FAQ ids (keys faq.<id>q, faq.<id>a1, faq.<id>a2)
const FAQ_ALL = [19, 20, 21, 22, 11, 12, 13, 14, 15, 16, 1, 7, 2, 4, 5, 17, 9, 18];
const FAQ_HOME = [19, 11, 14, 1, 5];
const FAQ_PRICING = [19, 20, 21, 22];
const FAQ_DECK = [11, 12, 13, 14, 15, 16];

function faqAnswers(lang, i) {
  const out = [];
  for (const j of [1, 2]) { const k = `faq.${i}a${j}`; if (dicts[lang][k] != null) out.push(k); }
  return out;
}
function faqItems(lang, ids, openFirst) {
  return ids.map((i, n) => {
    const ans = faqAnswers(lang, i).map((k) => `<p>${h(lang, k, pathFor(lang, 'privacy'))}</p>`).join('');
    return `<details${openFirst && n === 0 ? ' open' : ''}><summary>${h(lang, `faq.${i}q`)}</summary><div class="ans">${ans}</div></details>`;
  }).join('');
}
function langpick(lang, page) {
  const links = LANGS.map(([c, name]) => `<a href="${pathFor(c, page)}" lang="${c}" hreflang="${c}" aria-label="${esc(name)}"${c === lang ? ' aria-current="true"' : ''}>${c.toUpperCase()}</a>`).join('');
  return `<div class="langpick" role="group" aria-label="${esc(t(lang, 'lang.label'))}">${links}</div>`;
}
function navLinks(lang, page, mark) {
  return NAV.map(([target, key]) => {
    const ext = target.startsWith('http');
    return `<a href="${ext ? target : pathFor(lang, target)}"${mark && target === page ? ' aria-current="page"' : ''}>${esc(t(lang, key))}</a>`;
  }).join('');
}
function crumbs(lang, page) {
  if (page === 'index' || !CRUMB_KEY[page]) return '';
  return `<nav class="crumbs" aria-label="${esc(t(lang, 'crumb.label'))}"><a href="${pathFor(lang, 'index')}">${esc(t(lang, 'crumb.home'))}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(t(lang, CRUMB_KEY[page]))}</span></nav>`;
}
function hrefs(lang) {
  const o = { homeHref: pathFor(lang, 'index'), kitCtaHref: pathFor(lang, 'kit') + '#request', deckCtaHref: pathFor(lang, 'brand-deck') + '#availability' };
  const NAME = { index: 'home', 'brand-deck': 'deck' };
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

const money = (p) => `<span class="price" dir="ltr">$${PRICES[p]}</span>`;
const pname = (lang, p) => t(lang, `name.${p}`);
const isLinked = (p) => LINKS[p] !== '';
function buyHref(lang, p) { return isLinked(p) ? LINKS[p] : `${pathFor(lang, 'kit')}?product=${p}#request`; }
function buyBtn(lang, p, ghost) {
  if (p === 'deck') return `<button class="btn coming-soon" type="button" disabled data-unavailable="deck">${h(lang, 'pkg.deck.btn')}</button><span class="paynote">${h(lang, 'availability.deck')}</span>`;
  const note = isLinked(p) ? '' : `<span class="paynote">${h(lang, 'pay.note')}</span>`;
  return `<a class="btn${ghost ? ' ghost' : ''}" href="${esc(buyHref(lang, p))}" data-product="${p}">${h(lang, `pkg.${p}.btn`)}</a>${note}`;
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
  return `<article class="plan${hot ? ' hot' : ''}" data-plan="${p}"><span class="badge">${h(lang, `pkg.${p}.eye`)}</span><h3>${esc(pname(lang, p))}</h3><p class="pt">${h(lang, `pkg.${p}.tag`)}</p><div class="priceline">${money(p)}<span class="per">${h(lang, per)}</span></div><p class="billnote">${h(lang, bill)}</p>${platPick(lang, p)}${ticks(lang, `pkg.${p}`)}<p class="pnote">${h(lang, `pkg.${p}.note`)}</p><div class="buyrow">${buyBtn(lang, p, !hot)}</div></article>`;
}
// P1: a monthly package picks its platforms on the card; the live line ("Keep Growing · Instagram + TikTok · $90/mo") is computed in
// the browser from the numbers below (data/pricing.json: price + (platforms - included) × extra_platform_price), never typed.
// The first platform is ticked; the server-side line is the one-platform price so the page reads right without JavaScript.
function platPick(lang, p) {
  const k = PKG[p]; if (!MONTHLY.has(p) || !k.extra_platform_price) return '';
  const first = PRICING.platforms[0];
  const line = t(lang, 'plan.live').replace('{name}', pname(lang, p)).replace('{platforms}', t(lang, 'plat.' + first)).replace('{price}', '$' + k.price).replace('{per}', t(lang, 'plan.perShort'));
  const boxes = PRICING.platforms.map((id) => `<label class="opt"><input type="checkbox" name="pp-${p}" value="${esc(id)}"${id === first ? ' checked' : ''}><span>${h(lang, 'plat.' + id)}</span></label>`).join('');
  return `<fieldset class="platpick" data-price="${k.price}" data-extra="${k.extra_platform_price}" data-included="${k.platforms_included || 1}" data-name="${esc(pname(lang, p))}" data-tpl="${esc(t(lang, 'plan.live'))}" data-per="${esc(t(lang, 'plan.perShort'))}"><legend>${h(lang, 'plan.pickPlatforms')}</legend><div class="opts">${boxes}</div><p class="liveprice" aria-live="polite" dir="auto">${esc(line)}</p><p class="fine">${h(lang, 'plan.extraNote')}</p></fieldset>`;
}
const planCards = (lang) => ['kit', 'visible', 'growing'].map((p) => planCard(lang, p, p === 'kit')).join('');
const deckCards = (lang) => planCard(lang, 'deck', false);
const billItems = (lang) => { const out = []; for (let i = 1; dicts[lang][`bill.${i}`] != null; i++) out.push(`<li>${h(lang, `bill.${i}`)}</li>`); return out.join(''); };

function pageVars(lang, page) {
  const v = {
    ...hrefs(lang), studioNav: [ ['#work', 'studio.copy.098'], ['#services', 'studio.copy.099'], ['about', 'studio.copy.100'], ['pricing', 'nav.pricing'] ].map(([p,k]) => `<a href="${p.startsWith('#') ? pathFor(lang,'index')+p : pathFor(lang,p)}">${h(lang,k)}</a>`).join(''), langpick: langpick(lang, page), nav: navLinks(lang, page, true), navFoot: navLinks(lang, page, false),
    crumbs: crumbs(lang, page), portalHref: PORTAL, emailLink: `<a href="mailto:${EMAIL}" dir="ltr">${EMAIL}</a>`,
    buyKit: buyBtn(lang, 'kit', false), buyDeck: buyBtn(lang, 'deck', false), conv: lang === 'en' ? '' : `<p class="conv">${h(lang, 'leg.conv')}</p>`,
  };
  if (page === 'index') Object.assign(v, { flow: flow(lang, 3, 'how'), inds: inds(lang), faqItems: faqItems(lang, FAQ_HOME, true) });
  if (page === 'kit') Object.assign(v, kitVars(lang));
  if (page === 'pricing') Object.assign(v, { planCards: planCards(lang), deckCards: deckCards(lang), billItems: billItems(lang), faqItems: faqItems(lang, FAQ_PRICING, false) });
  if (page === 'brand-deck') Object.assign(v, { deckFlow: flow(lang, 4, 'deck.how'), deckCards: deckCards(lang), faqItems: faqItems(lang, FAQ_DECK, true), sheets: [1, 2, 4].map((n) => fig(lang, n)).join('') });
  if (page === 'samples') v.sheets = [1, 2, 3, 4].map((n) => fig(lang, n)).join('');
  if (page === 'faq') v.faqItems = faqItems(lang, FAQ_ALL, false);
  return v;
}
function flow(lang, n, prefix) {
  return Array.from({ length: n }, (_, i) => i + 1).map((i) => `<div class="stage">${syms[i - 1]}<h3>${h(lang, `${prefix}.${i}t`)}</h3><p>${h(lang, `${prefix}.${i}x`)}</p></div>`).join('');
}
function inds(lang) {
  return [1, 2, 3, 4, 5].map((i) => {
    const sw = INDCOLORS[i - 1].map((c) => `<i style="background:var(--${c})"></i>`).join('');
    return `<div class="ind"><div class="swatch" aria-hidden="true">${sw}</div><h3>${h(lang, `ind.${i}n`)}</h3><p>${h(lang, `ind.${i}x`)}</p>${i === 4 ? `<p class="note">${h(lang, 'ind.4note')}</p>` : ''}</div>`;
  }).join('');
}
function kitVars(lang) {
  const kitPages = [1, 2, 3].map((i) => `<article class="page"><span class="pg">${h(lang, 'kit.label')}</span>${minis[i - 1]}<span class="ex2">${h(lang, 'board.ex')}</span><h3>${h(lang, `kit.p${i}t`)}</h3><p>${h(lang, `kit.p${i}x`)}</p></article>`).join('');
  const industryOptions = `<option value="">${esc(t(lang, 'f.choose'))}</option>` + INDUSTRY_VALUES.map((v, j) => `<option value="${esc(v)}">${esc(t(lang, j < 5 ? `ind.${j + 1}n` : 'ind.other'))}</option>`).join('');
  const deckLangOptions = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['ar', 'العربية'], ['ar-en', t(lang, 'f.deckBi')]]
    .map(([v, n]) => `<option value="${v}"${v === lang ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const msgKeys = ['availability.soon', 'availability.deck', 'pay.note', 'pay.noteCheckout', 'f.platformsErr', 'f.total', 'f.totalMonthly', 'f.toStripe', 'f.pay', 'f.sending', 'f.thanks', 'f.thanksDeck', 'f.failed', 'f.tooMany', 'f.consentErr', 'v.business', 'v.web', 'v.emailEmpty', 'v.emailBad', 'v.city', 'v.industry', 'v.address'];
  const formMsgs = jsonScript(Object.fromEntries(msgKeys.map((k) => [k, t(lang, k)])));
  const platformChecks = PRICING.platforms.map((id, i) => `<label class="opt"><input type="checkbox" name="platform" value="${esc(id)}"${i === 0 ? ' checked' : ''}><span>${h(lang, 'plat.' + id)}</span></label>`).join('');
  return { kitPages, kitList: ticks(lang, 'pkg.kit', 'cols'), industryOptions, deckLangOptions, formMsgs, endpoint: ENDPOINT, flow: flow(lang, 3, 'how'),
    platformChecks, checkoutAttr: CHECKOUT.enabled ? ` data-checkout="${esc(CHECKOUT.endpoint)}"` : '' };
}

// ---------- head ----------
function offerNode(lang, p) {
  const o = { '@type': 'Offer', name: pname(lang, p), price: String(PRICES[p]), priceCurrency: 'USD', url: urlFor(lang, 'pricing') };
  if (MONTHLY.has(p)) o.priceSpecification = { '@type': 'UnitPriceSpecification', price: String(PRICES[p]), priceCurrency: 'USD', unitCode: 'MON' };
  return o;
}
function jsonLd(lang, page) {
  const orgId = SITE + '/#organization';
  const nodes = [];
  if (page === 'index') {
    nodes.push({ '@type': 'Organization', '@id': orgId, name: BRAND, url: SITE + '/', logo: SITE + '/favicon-512.png', email: EMAIL });
    nodes.push({ '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, alternateName: 'Crier', url: SITE + '/', inLanguage: lang, publisher: { '@id': orgId } });
  } else {
    nodes.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(lang, 'crumb.home'), item: urlFor(lang, 'index') },
      { '@type': 'ListItem', position: 2, name: t(lang, CRUMB_KEY[page]), item: urlFor(lang, page) }] });
    if (page === 'brand-deck' || page === 'kit') {
      const p = page === 'kit' ? 'kit' : 'deck';
      nodes.push({ '@type': 'Service', name: pname(lang, p), description: t(lang, `meta.d.${page}`), url: urlFor(lang, page), provider: { '@type': 'Organization', name: BRAND, url: SITE + '/' }, availableLanguage: ['en', 'es', 'fr', 'ar'],
        ...(p === 'deck' ? {} : { offers: [offerNode(lang, p)] }) });
    }
    if (page === 'pricing') {
      nodes.push({ '@type': 'ItemList', name: t(lang, 'pricing.h1'), itemListElement: PRODUCTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1,
        item: { '@type': 'Service', name: pname(lang, p), provider: { '@type': 'Organization', name: BRAND, url: SITE + '/' }, ...(p === 'deck' ? { description: t(lang, 'availability.deck') } : { offers: offerNode(lang, p) }) } })) });
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
const GA_ID = 'G-QLQ443CQ8E';
const GA_INLINE = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{if(localStorage.getItem('crier_consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('js',new Date());gtag('config','${GA_ID}');`;
const GA_HEAD = `<script>${GA_INLINE}</script>\n<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`;
const CONSENT_JS = (partials.consent.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!CONSENT_JS || CONSENT_JS.includes('{{')) throw new Error('templates/consent.html: one inline <script> without template tags expected');
// the site allows no 'unsafe-inline' scripts: each inline script is allowed by its sha256 hash (recomputed on every build)
const sha = (js) => `'sha256-${crypto.createHash('sha256').update(js, 'utf8').digest('base64')}'`;
const SCRIPT_HASHES = [sha(GA_INLINE), sha(CONSENT_JS)];
const CSP = "default-src 'self'; script-src 'self' " + SCRIPT_HASHES.join(' ') + " https://static.cloudflareinsights.com https://*.googletagmanager.com; connect-src 'self' https://crm-production-d789.up.railway.app https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'";
function head(lang, page, css) {
  const title = t(lang, `meta.t.${page}`), desc = t(lang, `meta.d.${page}`), url = urlFor(lang, page);
  const alt = LANGS.map(([c]) => `<link rel="alternate" hreflang="${c}" href="${urlFor(c, page)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${urlFor('en', page)}">`;
  const ogAlt = LANGS.filter(([c]) => c !== lang).map(([, , loc]) => `<meta property="og:locale:alternate" content="${loc}">`).join('\n');
  const loc = LANGS.find(([c]) => c === lang)[2];
  const pl = (f) => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`;
  const preload = (lang === 'ar' ? ['noto-sans-arabic-arabic-400-normal', 'noto-sans-arabic-arabic-700-normal'] : ['archivo-latin-wght-normal', 'instrument-sans-latin-400-normal', 'instrument-sans-latin-700-normal']).map(pl).join('\n');
  return `<!doctype html>
<html lang="${lang}" dir="${RTL.has(lang) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
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
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${BRAND}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/og.png">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0E0F0C">
${preload}
<style>
${css}
</style>
${jsonLd(lang, page)}
</head>`;
}
const cssFor = (lang, page) => [CSS.fonts, lang === 'ar' ? CSS.fontsAr : '', WIDE.has(page) ? CSS.home : CSS.legal + (page === 'faq' ? '\n' + faqCss : ''), CSS.common, CSS.consent, page === 'index' ? CSS.studio : '', CSS.chrome].join('\n');

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
    const ctx = { lang, v: pageVars(lang, page) };
    const body = render(rd(`templates/${page === 'index' ? 'home' : page}.html`), ctx);
    const html = `${head(lang, page, cssFor(lang, page))}\n<body data-page="${page}" class="${page === 'index' ? 'gallery spatial' : 'studio-inner'}">\n${render(partials.consent, ctx)}\n<div class="${page === 'index' ? 'site-shell' : 'wrap'}">\n${render(partials.header, ctx)}\n${body}\n${render(partials.footer, ctx)}\n</div>\n<script src="/site.js" defer></script>\n</body>\n</html>\n`;
    write(dirFor(lang, page) + 'index.html', html);
    built.push([lang, page]);
  }
}

// Editable studio introduction; distinct from the paid Brand Deck product.
write('assets/studio-deck/index.html', rd('templates/studio-deck.html'));
write('assets/social-preview.html', rd('templates/social-preview.html'));

// old URL stubs: /terms.html etc. (JS picks the language from ?lang= or the saved choice; no-JS goes to English)
for (const page of LEGAL) {
  write(`${page}.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
<title>${BRAND}</title>
<link rel="canonical" href="${urlFor('en', page)}">
<noscript><meta http-equiv="refresh" content="0;url=${pathFor('en', page)}"></noscript>
</head>
<body data-page="redirect" data-target="${page}">
<p><a href="${pathFor('en', page)}">${BRAND}</a></p>
<script src="/site.js"></script>
</body>
</html>
`);
}

// renamed pages: /snapshot/ -> /kit/, /crier-deck/ -> /brand-deck/ in every language. site.js keeps ?product= and the #hash;
// without JS the meta refresh goes to the new page. Not in the sitemap.
for (const [lang] of LANGS) for (const [from, to] of Object.entries(MOVED)) {
  write(dirFor(lang, from) + 'index.html', `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
<title>${BRAND}</title>
<link rel="canonical" href="${urlFor(lang, to)}">
<noscript><meta http-equiv="refresh" content="0;url=${pathFor(lang, to)}"></noscript>
</head>
<body data-page="redirect" data-target="${to}" data-lang="${lang}">
<p><a href="${pathFor(lang, to)}">${BRAND}</a></p>
<script src="/site.js"></script>
</body>
</html>
`);
}

// 404 (one file, four languages; header and footer in English, one block per language)
{
  const ctx = { lang: 'en', v: { ...pageVars('en', '404'), langpick: '', crumbs: '' } };
  const sections = LANGS.map(([c]) => {
    const links = [['index', 'crumb.home'], ['pricing', 'nav.pricing'], ['kit', 'nav.kit'], ['brand-deck', 'nav.deck']].map(([p, k]) => `<a href="${pathFor(c, p)}">${esc(t(c, k))}</a>`).join(' · ');
    return `<section lang="${c}" dir="${RTL.has(c) ? 'rtl' : 'ltr'}"><h2>${esc(t(c, 'e404.title'))}</h2><p>${esc(t(c, 'e404.p'))} <a href="${pathFor(c, 'index')}">${esc(t(c, 'e404.home'))}</a></p><p>${esc(t(c, 'e404.nav'))} ${links}</p></section>`;
  }).join('\n');
  ctx.v.sections = sections;
  const css404 = [CSS.fonts, CSS.fontsAr, CSS.legal, CSS.common, CSS.consent, CSS.chrome, 'section{padding-block:18px;border-top:2px solid var(--line)}section h2{margin-top:0}html[lang=ar] body{line-height:1.75}'].join('\n');
  write('404.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
${GA_HEAD}
<title>404 | ${BRAND}</title>
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0E0F0C">
<style>
${css404}
</style>
</head>
<body data-page="404">
${render(partials.consent, ctx)}
<div class="wrap">
${render(partials.header, ctx)}
${render(rd('templates/404.html'), ctx)}
${render(partials.footer, ctx)}
</div>
<script src="/site.js" defer></script>
</body>
</html>
`);
}

// robots.txt, sitemap.xml, webmanifest
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for (const page of PAGES) for (const [lang] of LANGS) {
  sm.push('<url>', `<loc>${urlFor(lang, page)}</loc>`);
  for (const [c] of LANGS) sm.push(`<xhtml:link rel="alternate" hreflang="${c}" href="${urlFor(c, page)}"/>`);
  sm.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('en', page)}"/>`, '</url>');
}
sm.push('</urlset>', '');
write('sitemap.xml', sm.join('\n'));
write('site.webmanifest', JSON.stringify({ name: BRAND, short_name: BRAND, start_url: '/', display: 'browser', background_color: '#F6F8EF', theme_color: '#0E0F0C',
  icons: [{ src: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2) + '\n');

// keys in the JSON that no page used (the check script fails on these)
const unused = Object.keys(dicts.en).filter((k) => !used.has(k));
if (unused.length) console.warn('UNUSED i18n keys: ' + unused.join(', '));
console.log(`built ${built.length} pages + ${LEGAL.length + LANGS.length * Object.keys(MOVED).length} stubs + 404 + robots/sitemap/manifest (noindex ${NOINDEX ? 'ON' : 'off'})`);
