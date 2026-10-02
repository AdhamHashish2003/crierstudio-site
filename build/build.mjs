// Crier Studio static site build. Node only, no dependencies.
// Reads i18n/<lang>.json + templates/*, writes static HTML for en (/), es, fr, ar into the repo root.
// Run:  node build/build.mjs        (the built files are committed; GitHub Pages serves them as-is)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
const EMAIL = 'team@crierstudio.com';
const BRAND = 'Crier Studio';
const ENDPOINT = 'https://crm-production-d789.up.railway.app/api/public/snapshot-request';
const NOINDEX = true; // stays on until the trigger in the SEO plan section 2.4 is met
const LANGS = [['en', 'English', 'en_US'], ['es', 'Español', 'es_ES'], ['fr', 'Français', 'fr_FR'], ['ar', 'العربية', 'ar_AR']];
const RTL = new Set(['ar']);
const PAGES = ['index', 'faq', 'terms', 'privacy', 'refund'];
const INDUSTRY_VALUES = ['Cafés and dessert shops', 'Salons', 'Gyms and studios', 'Clinics', 'Local services', 'Other local business'];

const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dicts = Object.fromEntries(LANGS.map(([c]) => [c, JSON.parse(rd(`i18n/${c}.json`))]));
const partials = {
  hero: rd('templates/hero.html'), logo: rd('templates/logo.svg.html'), footer: rd('templates/footer.html'),
  'legal-head': rd('templates/legal-head.html'), 'legal-foot': rd('templates/legal-foot.html'),
};
const CSS = {
  fonts: rd('templates/fonts.css'), fontsAr: rd('templates/fonts-ar.css'), common: rd('templates/common.css'),
  home: rd('templates/home.css'), legal: rd('templates/legal.css'),
};
const faqCss = CSS.home.slice(CSS.home.indexOf('/* faq */'), CSS.home.indexOf('/* closing + footer */'));

// ---------- text helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function raw(lang, key) {
  const v = dicts[lang][key] ?? dicts.en[key];
  if (v == null) throw new Error(`missing i18n key ${key} (${lang})`);
  return v;
}
const vars = { brand: BRAND, email: EMAIL };
const t = (lang, key) => raw(lang, key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/<\/?(?:b|ph|a)>/g, '');
function h(lang, key, href) {
  let s = raw(lang, key).replace(/\{(\w+)\}/g, (m, k) => (k === 'email' ? '\u0001E\u0001' : vars[k] ?? m));
  s = esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/&lt;ph&gt;/g, '<span class="ph">').replace(/&lt;\/ph&gt;/g, '</span>')
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
    .replace(/\{\{t:([\w.]+)(?:@(\w+))?\}\}/g, (_, k, pg) => h(ctx.lang, k, pg ? pathFor(ctx.lang, pg) : null))
    .replace(/\{\{a:([\w.]+)\}\}/g, (_, k) => esc(t(ctx.lang, k)))
    .replace(/\{\{=(\w+)\}\}/g, (_, n) => { if (!(n in ctx.v)) throw new Error('no var ' + n); return ctx.v[n]; });
}

// ---------- generated blocks ----------
const syms = [
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="6" y="4" width="32" height="36" fill="none" stroke="currentColor" stroke-width="4"/><rect x="13" y="13" width="18" height="4" fill="currentColor"/><rect x="13" y="22" width="12" height="4" fill="currentColor"/></svg>',
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="8" width="36" height="30" fill="none" stroke="currentColor" stroke-width="4"/><rect x="4" y="8" width="36" height="8" fill="var(--accent)" stroke="currentColor" stroke-width="2"/><rect x="11" y="22" width="6" height="6" fill="currentColor"/><rect x="21" y="22" width="6" height="6" fill="currentColor"/></svg>',
  '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="4" width="16" height="16" fill="var(--sun)" stroke="currentColor" stroke-width="2"/><rect x="24" y="4" width="16" height="16" fill="var(--coral)"/><rect x="4" y="24" width="16" height="16" fill="currentColor"/><path d="M26 32l5 5 9-11" fill="none" stroke="currentColor" stroke-width="4"/></svg>',
];
const minis = [
  '<div class="mini score" aria-hidden="true"><span style="height:55%"></span><span style="height:75%"></span><span style="height:40%"></span><span style="height:65%"></span></div>',
  '<div class="mini fix" aria-hidden="true"><span style="width:80%"></span><span style="width:62%"></span><span style="width:70%"></span></div>',
  '<div class="mini posts" aria-hidden="true"><span></span><span></span></div>',
];
const INDCOLORS = [['sun', 'coral'], ['coral', 'accent'], ['accent', 'ink'], ['ink', 'sun'], ['sun', 'accent']];
const FAQ_IDS = [1, 2, 4, 5, 7, 9];
const FAQ_HOME = [1, 2, 5, 7];
const DRAFT_FAQ = new Set([4]);

function faqAnswers(lang, i) {
  const out = [];
  for (const j of [1, 2]) { const k = `faq.${i}a${j}`; if (dicts[lang][k] != null) out.push(k); }
  return out;
}
function faqItems(lang, ids, openFirst) {
  return ids.map((i, n) => {
    const ans = faqAnswers(lang, i).map((k) => `<p${DRAFT_FAQ.has(i) ? ' class="ph"' : ''}>${h(lang, k)}</p>`).join('');
    return `<details${openFirst && n === 0 ? ' open' : ''}><summary>${h(lang, `faq.${i}q`)}</summary><div class="ans">${ans}</div></details>`;
  }).join('');
}
function langpick(lang, page) {
  const links = LANGS.map(([c, name]) => `<a href="${pathFor(c, page)}" lang="${c}" hreflang="${c}" aria-label="${esc(name)}"${c === lang ? ' aria-current="true"' : ''}>${c.toUpperCase()}</a>`).join('');
  return `<div class="langpick" role="group" aria-label="${esc(t(lang, 'lang.label'))}">${links}</div>`;
}
function hrefs(lang) {
  return { homeHref: pathFor(lang, 'index'), faqHref: pathFor(lang, 'faq'), termsHref: pathFor(lang, 'terms'), privacyHref: pathFor(lang, 'privacy'), refundHref: pathFor(lang, 'refund') };
}
function homeVars(lang) {
  const snapPages = [1, 2, 3].map((i) => `<article class="page"><span class="pg">${h(lang, 'snap.label')}</span>${minis[i - 1]}<span class="ex2">${h(lang, 'board.ex')}</span><h3>${h(lang, `snap.p${i}t`)}</h3><p>${h(lang, `snap.p${i}x`)}</p></article>`).join('');
  const industryOptions = `<option value="">${esc(t(lang, 'f.choose'))}</option>` + INDUSTRY_VALUES.map((v, j) => `<option value="${esc(v)}">${esc(t(lang, j < 5 ? `ind.${j + 1}n` : 'ind.other'))}</option>`).join('');
  const flow = [1, 2, 3].map((i) => `<div class="stage">${syms[i - 1]}<h3>${h(lang, `how.${i}t`)}</h3><p>${h(lang, `how.${i}x`)}</p></div>`).join('');
  const inds = [1, 2, 3, 4, 5].map((i) => {
    const sw = INDCOLORS[i - 1].map((c) => `<i style="background:var(--${c})"></i>`).join('');
    return `<div class="ind"><div class="swatch" aria-hidden="true">${sw}</div><h3>${h(lang, `ind.${i}n`)}</h3><p>${h(lang, `ind.${i}x`)}</p>${i === 4 ? `<p class="note">${h(lang, 'ind.4note')}</p>` : ''}</div>`;
  }).join('');
  const msgKeys = ['f.sending', 'f.thanks', 'f.failed', 'f.tooMany', 'f.consentErr', 'v.business', 'v.web', 'v.emailEmpty', 'v.emailBad', 'v.city', 'v.industry'];
  const formMsgs = jsonScript(Object.fromEntries(msgKeys.map((k) => [k, t(lang, k)])));
  return { snapPages, industryOptions, flow, inds, faqItems: faqItems(lang, FAQ_HOME, true), formMsgs, endpoint: ENDPOINT };
}

// ---------- head ----------
function jsonLd(lang, page) {
  const orgId = SITE + '/#organization';
  const nodes = [];
  if (page === 'index') {
    nodes.push({ '@type': 'Organization', '@id': orgId, name: BRAND, url: SITE + '/', logo: SITE + '/favicon-512.png', email: EMAIL });
    nodes.push({ '@type': 'WebSite', '@id': SITE + '/#website', name: BRAND, url: SITE + '/', inLanguage: lang, publisher: { '@id': orgId } });
  } else {
    const name = page === 'faq' ? t(lang, 'faq.title') : t(lang, `${page}.h1`);
    nodes.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t(lang, 'leg.home'), item: urlFor(lang, 'index') },
      { '@type': 'ListItem', position: 2, name, item: urlFor(lang, page) }] });
    if (page === 'faq') {
      nodes.push({ '@type': 'FAQPage', inLanguage: lang, mainEntity: FAQ_IDS.map((i) => ({ '@type': 'Question', name: t(lang, `faq.${i}q`),
        acceptedAnswer: { '@type': 'Answer', text: faqAnswers(lang, i).map((k) => t(lang, k)).join(' ') } })) });
    }
  }
  return `<script type="application/ld+json">${jsonScript({ '@context': 'https://schema.org', '@graph': nodes })}</script>`;
}
const CSP = "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://crm-production-d789.up.railway.app https://cloudflareinsights.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'self'; form-action 'self'";
function pageMeta(lang, page) {
  if (page === 'index') return { title: t(lang, 'meta.t.index'), desc: t(lang, 'meta.desc'), ogdesc: t(lang, 'meta.ogdesc') };
  return { title: t(lang, `meta.t.${page}`), desc: t(lang, `meta.d.${page}`), ogdesc: t(lang, `meta.d.${page}`) };
}
function head(lang, page, css) {
  const m = pageMeta(lang, page), url = urlFor(lang, page);
  const alt = LANGS.map(([c]) => `<link rel="alternate" hreflang="${c}" href="${urlFor(c, page)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${urlFor('en', page)}">`;
  const ogAlt = LANGS.filter(([c]) => c !== lang).map(([, , loc]) => `<meta property="og:locale:alternate" content="${loc}">`).join('\n');
  const loc = LANGS.find(([c]) => c === lang)[2];
  const preload = ['<link rel="preload" href="/fonts/archivo-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>']
    .concat(lang === 'ar' ? ['<link rel="preload" href="/fonts/noto-sans-arabic-arabic-700-normal.woff2" as="font" type="font/woff2" crossorigin>'] : []).join('\n');
  return `<!doctype html>
<html lang="${lang}" dir="${RTL.has(lang) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${NOINDEX ? '<meta name="robots" content="noindex">\n' : ''}<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.desc)}">
<link rel="canonical" href="${url}">
${alt}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.ogdesc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${loc}">
${ogAlt}
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${BRAND}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.ogdesc)}">
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
const cssFor = (lang, page) => [CSS.fonts, lang === 'ar' ? CSS.fontsAr : '', page === 'index' ? CSS.home : CSS.legal + (page === 'faq' ? '\n' + faqCss : ''), CSS.common].join('\n');

// ---------- build ----------
function write(rel, content) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
const built = [];
for (const [lang] of LANGS) {
  for (const page of PAGES) {
    const v = { ...hrefs(lang), langpick: langpick(lang, page), conv: lang === 'en' ? '' : `<p class="conv">${h(lang, 'leg.conv')}</p>` };
    if (page === 'index') Object.assign(v, homeVars(lang));
    if (page === 'faq') v.faqItems = faqItems(lang, FAQ_IDS, false);
    const ctx = { lang, v };
    const body = render(rd(`templates/${page === 'index' ? 'home' : page}.html`), ctx);
    const html = `${head(lang, page, cssFor(lang, page))}\n<body data-page="${page}">\n${body}\n<script src="/site.js" defer></script>\n</body>\n</html>\n`;
    write(dirFor(lang, page) + 'index.html', html);
    built.push([lang, page]);
  }
}

// old URL stubs: /terms.html etc. (JS picks the language from ?lang= or the saved choice; no-JS goes to English)
for (const page of ['terms', 'privacy', 'refund']) {
  write(`${page}.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
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

// 404 (one page, four languages)
{
  const secs = LANGS.map(([c]) => `<section lang="${c}" dir="${RTL.has(c) ? 'rtl' : 'ltr'}"><h2>${esc(t(c, 'e404.title'))}</h2><p>${esc(t(c, 'e404.p'))} <a href="${pathFor(c, 'index')}">${esc(t(c, 'e404.home'))}</a></p></section>`).join('\n');
  const css404 = [CSS.fonts, CSS.fontsAr, CSS.legal, CSS.common, 'section{padding-block:18px;border-top:2px solid var(--line)}section h2{margin-top:0}html[lang=ar] body{line-height:1.75}'].join('\n');
  write('404.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="${esc(CSP)}">
<title>404 | ${BRAND}</title>
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0E0F0C">
<style>
${css404}
</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="logo" href="/" aria-label="${BRAND}">${partials.logo}</a></header>
<main>
<h1>404</h1>
${secs}
</main>
</div>
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
console.log(`built ${built.length} pages + 3 stubs + 404 + robots/sitemap/manifest`);
