// Writes the standalone /branddeck/ page (English) and /ar/branddeck/ (Arabic, RTL). Like /fiberglass/, these pages are
// noindex, not in the sitemap, not linked from any other page, and not touched by build.mjs. The Arabic texts come verbatim
// from build/branddeck-ar.json (UTF-8); the English texts below mirror them. Images: python build/branddeck_mockups.py
// Run:  node build/branddeck-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AR = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/branddeck-ar.json'), 'utf8'));
const AR_NAME = fs.readFileSync(path.join(ROOT, 'build/build.mjs'), 'utf8').match(/\['ar', '([^']+)'/)[1]; // the language's own name
const EN = {
  title: 'Your shop’s new look | Crier Studio',
  kicker: 'Branding you can touch',
  h1: 'Your shop deserves <span>a glow-up</span>',
  hero_p: 'Logo, cups, aprons, menu board, door mat and business cards. Tell us about your shop… and we make everything in it match and look good enough to eat.',
  cta_main: 'Let’s start',
  cta_example: 'See the cafe example',
  example_label: 'Example: “Bun w Bas” cafe',
  example_h2: 'From a plain cafe… to the cafe people take photos in',
  example_p: '“Bun w Bas” is a made-up cafe we invented to show you. Before: a plain white cup, a faded apron and a menu written in marker. After? See for yourself 👇',
  logo_h: 'The logo', logo_p: 'Easy to spot from across the street, even if the customer is still half asleep.',
  cups_h: 'The cups', cups_p: 'A good-looking cup = a photo on Instagram = new people finding your shop.',
  apron_h: 'The aprons', apron_p: 'Your barista looks like a pro, even when the latte art comes out looking like a potato.',
  menu_h: 'The menu board', menu_p: 'A clear menu: customers pick in two seconds instead of standing there for fifteen minutes.',
  mat_h: 'The door mat', mat_p: 'The first thing customers step on… so make it say “hello”.',
  cards_h: 'Business cards', cards_p: 'A sharp card stays in the wallet, not in the bin.',
  how_label: 'How it works',
  how_h2: '3 steps, that’s it',
  step1: 'Tell us about your shop: what you sell, who your customers are, and how you’d like to look.',
  step2: 'We send you how everything looks before anything is printed. Don’t like something? We change it.',
  step3: 'We print and deliver. You unpack it and take a selfie next to it.',
  also_label: 'And also',
  also_h2: 'Not just cafes',
  also_p: 'Bakeries, restaurants, flower shops, gyms, salons… anywhere people walk in and look around.',
  final_h2: 'Ready to give your shop a new look?',
  final_p: 'Tell us about your business… and we’ll handle the rest.',
  footer_note: '“Bun w Bas” is a made-up name, just for this example.',
  lang_switch: AR_NAME,
};
const PIECES = [['logo', 'logo'], ['cups', 'cup'], ['apron', 'apron'], ['menu', 'menu-board'], ['mat', 'door-mat'], ['cards', 'business-cards']];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => s.replace(/<[^>]+>/g, '');

const FONTS = {
  en: `<link rel="preload" href="/fonts/archivo-latin-wght-normal.subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-sans-latin-var.subset.woff2" as="font" type="font/woff2" crossorigin>`,
  ar: `<link rel="preload" href="/fonts/noto-sans-arabic-arabic-400-normal.subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-sans-arabic-arabic-700-normal.subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/archivo-latin-wght-normal.subset.woff2" as="font" type="font/woff2" crossorigin>`,
};
const FACES = `@font-face{font-family:Archivo;src:url("/fonts/archivo-latin-wght-normal.subset.woff2") format("woff2");font-style:normal;font-weight:100 900;font-display:swap}
@font-face{font-family:Instrument;src:url("/fonts/instrument-sans-latin-var.subset.woff2") format("woff2");font-style:normal;font-weight:100 900;font-display:swap}`;
const FACES_AR = `
@font-face{font-family:"Noto Sans Arabic";src:url("/fonts/noto-sans-arabic-arabic-400-normal.subset.woff2") format("woff2");font-style:normal;font-weight:400 500;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:"Noto Sans Arabic";src:url("/fonts/noto-sans-arabic-arabic-700-normal.subset.woff2") format("woff2");font-style:normal;font-weight:600 900;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC}`;

const CSS = (lang) => `${FACES}${lang === 'ar' ? FACES_AR : ''}
:root{--ink:#0f0a14;--red:#eb1e2d;--yellow:#ffde00;--orange:#ffaa00;--pink:#ff46a0;--cyan:#00beff;--paper:#FFFAEC;--white:#fff;--muted:#514b4e;${lang === 'ar'
  ? '--display:"Noto Sans Arabic",Archivo,"Arial Black",sans-serif;--body:"Noto Sans Arabic",Instrument,Arial,sans-serif'
  : '--display:Archivo,"Arial Black",sans-serif;--body:Instrument,Arial,sans-serif'}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.6 var(--body);-webkit-font-smoothing:antialiased}
a{color:inherit}
img{display:block;max-width:100%;height:auto}
.wrap{width:min(1240px,100% - 36px);margin-inline:auto}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 0}
.brand{display:inline-flex;align-items:center;gap:12px;text-decoration:none;font:900 13px/1.1 var(--display);letter-spacing:.1em;text-transform:uppercase}
.brand img{width:52px;height:52px;border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink)}
.nav{display:flex;align-items:center;gap:10px}
.nav a{font-weight:800;text-decoration:none;padding:10px 13px;border-bottom:3px solid transparent}
.nav a:hover{border-color:var(--red)}
.nav .nav-cta{border:2px solid var(--ink);background:var(--yellow);box-shadow:3px 3px 0 var(--ink)}
.hero{position:relative;isolation:isolate;overflow:hidden;margin:6px auto 46px;min-height:475px;padding:30px 34px 32px;border:4px solid var(--ink);background:var(--red);box-shadow:9px 9px 0 var(--ink);display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,1fr);align-items:center;gap:28px}
.hero:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle,#0f0a14 1.3px,transparent 1.7px) 0 0/13px 13px,linear-gradient(120deg,var(--red) 0 48%,var(--pink) 48% 100%)}
.hero-copy{max-width:640px}
.kicker{display:inline-block;background:var(--yellow);border:2px solid var(--ink);padding:6px 11px;font:900 12px/1.2 var(--display);letter-spacing:.12em;text-transform:uppercase;box-shadow:3px 3px 0 var(--ink)}
h1,h2,h3{font-family:var(--display);line-height:.98;letter-spacing:-.025em;text-wrap:balance;margin:0}
h1{font-size:clamp(2.8rem,6.2vw,5.6rem);text-transform:uppercase;color:var(--white);text-shadow:4px 4px 0 var(--ink);max-width:11ch;margin:17px 0 18px}
h1 span{color:var(--yellow)}
.hero p{max-width:48ch;font-size:clamp(1.05rem,1.6vw,1.25rem);font-weight:650;color:var(--white)}
.hero-visual{position:relative;transform:rotate(2deg)}
.hero-visual img{border:4px solid var(--ink);box-shadow:8px 8px 0 var(--ink);background:var(--yellow)}
.hero-visual .sticker{position:absolute;top:-16px;inset-inline-start:-14px;z-index:1;transform:rotate(-8deg);background:var(--yellow);border:3px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:6px 10px;font:900 12px/1.2 var(--display);letter-spacing:.08em;text-transform:uppercase}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 16px;background:var(--yellow);border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink);font-weight:900;line-height:1.15;text-align:center;text-decoration:none;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)}
.btn.dark{background:var(--ink);color:var(--white)}
.btn.cyan{background:var(--cyan)}
main{padding:0 0 56px}
.section{padding:48px 0 54px;border-top:3px solid var(--ink);scroll-margin-top:18px}
.section-head{display:grid;gap:12px;max-width:760px;margin:0 0 26px}
.section-label{display:inline-flex;align-items:center;gap:8px;width:max-content;max-width:100%;padding:7px 11px;background:var(--yellow);border:2px solid var(--ink);font:900 11px/1.2 var(--display);letter-spacing:.1em;text-transform:uppercase;box-shadow:3px 3px 0 var(--ink)}
.section-label:before{content:"★";font-size:16px}
h2{font-size:clamp(2rem,4.5vw,3.8rem);text-transform:uppercase;text-shadow:2px 2px 0 var(--yellow)}
.section-head p{max-width:64ch;color:var(--muted);font-size:1.08rem;font-weight:600;margin:0}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:21px;padding:0;margin:0;list-style:none}
.card{display:flex;flex-direction:column;min-width:0;overflow:hidden;background:var(--white);border:3px solid var(--ink);box-shadow:5px 5px 0 var(--ink)}
.card:nth-child(3n+2){transform:rotate(-.6deg)}.card:nth-child(3n){transform:rotate(.5deg)}
.card-image{position:relative;background:#f2e7ce;border-bottom:3px solid var(--ink);overflow:hidden;aspect-ratio:1.42}
.card-image img{width:100%;height:100%;object-fit:cover;transition:transform .25s}
.card:hover .card-image img{transform:scale(1.025)}
.card-copy{display:flex;flex:1;flex-direction:column;align-items:flex-start;gap:10px;padding:17px}
.card-tag{display:inline-block;margin:0;background:var(--pink);border:1.5px solid var(--ink);padding:5px 8px;font:900 10px/1.2 var(--display);letter-spacing:.09em;text-transform:uppercase}
.card h3{font-size:clamp(1.15rem,1.8vw,1.65rem);text-transform:uppercase}
.card p{margin:0;color:var(--muted);font-weight:550}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:21px;padding:0;margin:0;list-style:none;counter-reset:step}
.steps li{position:relative;padding:58px 20px 22px;background:var(--white);border:3px solid var(--ink);box-shadow:5px 5px 0 var(--ink);font-weight:650;font-size:1.06rem;counter-increment:step}
.steps li:before{content:counter(step);position:absolute;top:-22px;inset-inline-start:16px;display:grid;place-items:center;width:62px;height:62px;border:3px solid var(--ink);border-radius:50%;background:var(--yellow);box-shadow:3px 3px 0 var(--ink);font:900 28px/1 var(--display)}
.steps li:nth-child(2):before{background:var(--pink)}.steps li:nth-child(3):before{background:var(--cyan)}
.also{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:24px;padding:28px;background:var(--yellow);border:3px solid var(--ink);box-shadow:7px 7px 0 var(--ink)}
.also p{margin:0;font-size:1.15rem;font-weight:700}
.also .icons{font-size:2.6rem;line-height:1;letter-spacing:.12em}
.cta{display:grid;grid-template-columns:1.35fr auto;align-items:center;gap:24px;margin-top:48px;padding:30px;background:var(--cyan);border:3px solid var(--ink);box-shadow:7px 7px 0 var(--ink)}
.cta h2{font-size:clamp(1.8rem,3vw,2.7rem);text-shadow:2px 2px 0 var(--white);margin-bottom:10px}
.cta p{max-width:55ch;font-weight:650;margin:0}
.cta-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
.note{margin:22px auto 0;color:var(--muted);font-size:.9rem;font-weight:600}
footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:38px;padding:17px 0;border-top:4px solid var(--ink);font-weight:700}
footer p{margin:0}
footer a{text-decoration-thickness:2px;text-underline-offset:3px}
@media(max-width:850px){.hero{grid-template-columns:1fr;min-height:0;padding:26px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.steps{grid-template-columns:1fr;gap:34px}.also{grid-template-columns:1fr}}
@media(max-width:600px){.wrap{width:min(100% - 24px,500px)}.topbar{padding:8px 0}.brand img{width:44px;height:44px}.brand span{font-size:10px}.nav{gap:4px}.nav a{padding:8px 8px;font-size:12px}.nav .nav-cta,.nav .hide-s{display:none}
.hero{margin-top:2px;margin-bottom:37px;padding:20px 18px 25px;gap:18px}.hero h1{max-width:12ch;font-size:clamp(2.45rem,12vw,4rem);margin:14px 0}.hero p{font-size:1rem;max-width:36ch}.hero-actions{display:grid;grid-template-columns:1fr;max-width:330px;margin-top:18px}.btn{width:100%}
.section{padding:37px 0 42px}.section-head{margin-bottom:20px}h2{font-size:clamp(1.9rem,9vw,2.7rem)}.cards{grid-template-columns:1fr;gap:17px}.cta{grid-template-columns:1fr;margin-top:35px;padding:22px}.cta-actions{justify-content:stretch}.cta-actions .btn{width:auto;flex:1}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
:focus-visible{outline:3px solid var(--cyan);outline-offset:4px}${lang === 'ar' ? `
/* Arabic letters must join: no letter spacing, a little more line height */
[dir=rtl] *{letter-spacing:0!important}
[dir=rtl] h1,[dir=rtl] h2,[dir=rtl] h3{line-height:1.25}
[dir=rtl] .hero-visual{transform:rotate(-2deg)}` : ''}`;

function page(lang) {
  const s = lang === 'ar' ? AR : EN, rtl = lang === 'ar';
  const t = (k) => esc(s[k]);
  const home = rtl ? '/ar/' : '/', start = `${home}#walkthrough`;
  const other = rtl ? { href: '/branddeck/', lang: 'en', dir: 'ltr' } : { href: '/ar/branddeck/', lang: 'ar', dir: 'rtl' };
  const sw = `<a href="${other.href}" lang="${other.lang}" hreflang="${other.lang}" dir="${other.dir}">${t('lang_switch')}</a>`;
  const alt = (k) => esc(`${strip(s.example_label)}: ${s[k + '_h']}`);
  const cards = PIECES.map(([k, img]) => `      <li class="card">
        <div class="card-image"><img src="/assets/branddeck/${img}.webp" width="1200" height="845" loading="lazy" decoding="async" alt="${alt(k)}"></div>
        <div class="card-copy"><h3>${t(k + '_h')}</h3><p>${t(k + '_p')}</p></div>
      </li>`).join('\n');
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0f0a14">
<title>${t('title')}</title>
<meta name="description" content="${esc(strip(s.hero_p))}">
<link rel="alternate" hreflang="${other.lang}" href="https://crierstudio.com${other.href}">
${FONTS[lang]}
<style>
${CSS(lang)}
</style>
</head>
<body>
<header class="wrap topbar">
  <a class="brand" href="${home}" aria-label="Crier Studio">
    <img src="/favicon.svg" width="512" height="512" alt="">
    <span>Crier<br>Studio</span>
  </a>
  <nav class="nav" aria-label="Crier Studio">
    <a class="hide-s" href="#how">${t('how_label')}</a>
    ${sw}
    <a class="nav-cta" href="${start}">${t('cta_main')}</a>
  </nav>
</header>
<main id="main-content" class="wrap">
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <span class="kicker">${t('kicker')}</span>
      <h1 id="hero-title">${s.h1}</h1>
      <p>${t('hero_p')}</p>
      <div class="hero-actions">
        <a class="btn" href="${start}">${t('cta_main')}</a>
        <a class="btn dark" href="#example">${t('cta_example')}</a>
      </div>
    </div>
    <div class="hero-visual">
      <span class="sticker" aria-hidden="true">Bun w Bas</span>
      <img src="/assets/branddeck/hero.webp" width="1200" height="845" decoding="async" fetchpriority="high" alt="${esc(strip(s.example_label))}">
    </div>
  </section>

  <section class="section" id="example" aria-labelledby="example-title">
    <div class="section-head">
      <span class="section-label">${t('example_label')}</span>
      <h2 id="example-title">${t('example_h2')}</h2>
      <p>${t('example_p')}</p>
    </div>
    <ul class="cards">
${cards}
    </ul>
  </section>

  <section class="section" id="how" aria-labelledby="how-title">
    <div class="section-head">
      <span class="section-label">${t('how_label')}</span>
      <h2 id="how-title">${t('how_h2')}</h2>
    </div>
    <ol class="steps">
      <li>${t('step1')}</li>
      <li>${t('step2')}</li>
      <li>${t('step3')}</li>
    </ol>
  </section>

  <section class="section" id="also" aria-labelledby="also-title">
    <div class="section-head">
      <span class="section-label">${t('also_label')}</span>
      <h2 id="also-title">${t('also_h2')}</h2>
    </div>
    <div class="also"><p>${t('also_p')}</p><span class="icons" aria-hidden="true">🥐🍝💐🏋️💇</span></div>
  </section>

  <section class="cta" aria-labelledby="cta-title">
    <div>
      <h2 id="cta-title">${t('final_h2')}</h2>
      <p>${t('final_p')}</p>
    </div>
    <div class="cta-actions"><a class="btn" href="${start}">${t('cta_main')}</a></div>
  </section>
  <p class="note">${t('footer_note')}</p>
</main>
<footer class="wrap">
  <a class="brand" href="${home}"><img src="/favicon.svg" width="512" height="512" alt=""><span>Crier<br>Studio</span></a>
  <p>&copy; 2026 Crier Studio. <a href="mailto:team@crierstudio.com">team@crierstudio.com</a> &middot; ${sw}</p>
</footer>
</body>
</html>
`;
}

for (const [lang, rel] of [['en', 'branddeck/index.html'], ['ar', 'ar/branddeck/index.html']]) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, page(lang), 'utf8');
  console.log('wrote', rel);
}
