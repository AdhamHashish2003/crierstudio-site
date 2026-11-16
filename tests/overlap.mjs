// Overlap and clipping checks (2026-11-15, owner: "take care of overlapping problems like this"). For every page, in Arabic and English,
// at 375, 768 and 1280 px wide, this fails the run when:
//   1. the page scrolls sideways;
//   2. a piece of text is covered by another element (hit-tested at the middle of every rendered text line);
//   3. a piece of text is cut by an overflow:hidden box;
//   4. two text lines of different blocks overlap;
//   5. a highlight band (an inline background that wraps over lines, e.g. the hero's lime band) touches the band of the next line,
//      reaches into the letters of the line above or below, or does not cover its own letters (ink measured with canvas);
//   6. on phones, a button or link sits under the floating WhatsApp button while it is still showing;
//   7. a heading that wraps has letters taller than its line height (tails of one line could touch the marks of the next).
// Decorative drawings (role="img", aria-hidden: the mock phone and the mock client page) are skipped: they clip on purpose.
// Run: BASE=http://127.0.0.1:8767 node tests/overlap.mjs      EXTRA=/_parked/preview/,/_parked/preview/en/ adds pages (with their language: ar unless /en/)
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0, checked = 0; const bad = (m) => { fail++; console.log('FAIL', m); };
const PAGES = ['', 'pricing/', 'social/', 'in-store/', 'brand-deck/', 'samples/', 'faq/', 'about/', 'terms/', 'privacy/', 'refund/'];
const urls = [...PAGES.map((p) => '/' + p), ...PAGES.map((p) => '/en/' + p), '/404.html', ...(process.env.EXTRA ? process.env.EXTRA.split(',') : [])];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

function scan() {
  // runs in the page
  const DECOR = '[aria-hidden="true"],[role="img"],#wa-fab,#consent-bar,script,style,noscript,option,title,.skip-link';
  const out = { sw: document.documentElement.scrollWidth, vw: innerWidth, issues: [] };
  const name = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const path = (el) => { const a = []; for (let e = el; e && e !== document.body && a.length < 3; e = e.parentElement) a.unshift(name(e)); return a.join(' > '); };
  const blockOf = (el) => { for (let e = el; e; e = e.parentElement) { const d = getComputedStyle(e).display; if (!/^inline($|-(?!block|flex|grid))|contents/.test(d)) return e; } return document.body; };
  const lines = []; // { el, block, x0, x1, y0, y1 (page coords), text }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const sy = scrollY;
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!/\S/.test(n.nodeValue)) continue;
    const el = n.parentElement; if (!el || el.closest(DECOR)) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const q of r.getClientRects()) {
      if (q.width < 2 || q.height < 2) continue;
      if (q.right < 0 || q.left > innerWidth) continue; // off-screen helpers
      lines.push({ el, block: blockOf(el), x0: q.left, x1: q.right, y0: q.top + sy, y1: q.bottom + sy, text: n.nodeValue.trim().slice(0, 40) });
    }
  }
  // 3. text cut by an overflow:hidden ancestor (scroll containers are fine: the reader can scroll them)
  for (const L of lines) {
    for (let e = L.el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e); const ox = cs.overflowX, oy = cs.overflowY;
      if (!/hidden|clip/.test(ox + oy)) continue;
      const c = e.getBoundingClientRect(), t = c.top + sy, l = c.left;
      const ink = (L.y1 - L.y0) * 0.2; // the line box is taller than the letters
      if ((/hidden|clip/.test(oy) && (L.y0 + ink < t - 1 || L.y1 - ink > t + c.height + 1)) || (/hidden|clip/.test(ox) && (L.x0 < l - 1.5 || L.x1 > l + c.width + 1.5)))
        { out.issues.push(`text cut by overflow:hidden on ${path(e)}: "${L.text}"`); break; }
    }
  }
  // 4. text lines of different blocks overlapping (letters area: the middle 56% of the line box, 1 px in from the sides)
  const S = lines.map((L) => { const h = L.y1 - L.y0; return { ...L, a: L.y0 + h * 0.22, z: L.y1 - h * 0.22 }; }).sort((p, q) => p.a - q.a);
  const seen = new Set();
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length && S[j].a < S[i].z; j++) {
    const A = S[i], B = S[j];
    if (A.block === B.block || A.block.contains(B.block) || B.block.contains(A.block)) continue;
    const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) - 2, oy = Math.min(A.z, B.z) - Math.max(A.a, B.a);
    if (ox > 2 && oy > 2) { const k = path(A.el) + '|' + path(B.el); if (!seen.has(k)) { seen.add(k); out.issues.push(`text overlaps text: "${A.text}" (${path(A.el)}) and "${B.text}" (${path(B.el)})`); } }
  }
  // 5. highlight bands: inline elements with a background that wrap over more than one line
  const canvas = document.createElement('canvas').getContext('2d');
  const inkOf = (el, text) => { const cs = getComputedStyle(el); canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; canvas.direction = cs.direction; const m = canvas.measureText(text); return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent }; };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest(DECOR)) continue;
    const cs = getComputedStyle(el); if (cs.display !== 'inline') continue;
    const hasBg = cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    if (!hasBg || !/\S/.test(el.textContent)) continue;
    const fr = [...el.getClientRects()].filter((q) => q.width > 2); if (!fr.length) continue;
    const blk = blockOf(el.parentElement), lh = parseFloat(getComputedStyle(blk).lineHeight) || parseFloat(cs.fontSize) * 1.2;
    // the painted band of each fragment: the whole fragment box, or the gradient's own height and position inside it
    const sizeH = cs.backgroundImage !== 'none' && /px$/.test((cs.backgroundSize.split(' ')[1] || '')) ? parseFloat(cs.backgroundSize.split(' ')[1]) : null;
    const pos = cs.backgroundPositionY || '0%'; const pct = /(-?[\d.]+)%/.exec(pos), px = /(-?[\d.]+)px/.exec(pos);
    const bands = fr.map((q) => { if (sizeH == null) return [q.top, q.bottom]; const t = q.top + (q.height - sizeH) * (pct ? +pct[1] / 100 : 0) + (px ? +px[1] : 0); return [Math.max(t, q.top), Math.min(t + sizeH, q.bottom)]; }).sort((p, q) => p[0] - q[0]);
    // the baseline of the LAST line: a zero-size inline-block at the end of the text sits on it (at the start it would stay on the line before)
    const probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0'; el.appendChild(probe);
    const base0 = probe.getBoundingClientRect().bottom; probe.remove();
    const own = inkOf(el, el.textContent), around = inkOf(blk, blk.textContent);
    const tag = `highlight ${path(el)} "${el.textContent.trim().slice(0, 30)}"`;
    for (let i = 0; i + 1 < bands.length; i++) if (bands[i][1] > bands[i + 1][0] + 0.5) out.issues.push(`${tag}: the band of line ${i + 1} overlaps the band of line ${i + 2} by ${(bands[i][1] - bands[i + 1][0]).toFixed(1)}px`);
    const first = bands.find((q) => q[0] <= base0 - 2 && q[1] >= base0 - 2) || bands[bands.length - 1]; // the band of the probe's line
    if (first[0] > base0 - own.asc + 1 || first[1] < base0 + own.desc - 1) out.issues.push(`${tag}: the band (${first[0].toFixed(0)}–${first[1].toFixed(0)}) does not cover its letters (${(base0 - own.asc).toFixed(0)}–${(base0 + own.desc).toFixed(0)})`);
    if (first[0] < base0 - lh + around.desc - 0.5) out.issues.push(`${tag}: the band reaches ${(base0 - lh + around.desc - first[0]).toFixed(1)}px into the letters of the line above`);
    if (first[1] > base0 + lh - around.asc + 0.5) out.issues.push(`${tag}: the band reaches ${(first[1] - (base0 + lh - around.asc)).toFixed(1)}px into the letters of the line below`);
  }
  // 7. headings that wrap: the letters of one line (tallest mark to deepest tail, measured with canvas) must fit in the line height,
  //    or the tails of one line can touch the marks of the next (Arabic reaches further up and down than Latin)
  for (const hd of document.querySelectorAll('h1,h2,h3')) {
    if (hd.closest(DECOR) || (hd.checkVisibility && !hd.checkVisibility())) continue;
    const r = document.createRange(); r.selectNodeContents(hd);
    const tops = new Set([...r.getClientRects()].filter((q) => q.width > 2).map((q) => Math.round(q.top / 4))); if (tops.size < 2) continue;
    const cs = getComputedStyle(hd), lh = parseFloat(cs.lineHeight), k = inkOf(hd, hd.textContent);
    if (lh && k.asc + k.desc > lh + 1) out.issues.push(`heading ${path(hd)} "${hd.textContent.trim().slice(0, 30)}": its letters are ${(k.asc + k.desc).toFixed(0)}px tall but the line height is ${lh.toFixed(0)}px`);
  }
  out.lines = lines.map((L, i) => ({ i, x: (L.x0 + L.x1) / 2, y: (L.y0 + L.y1) / 2, text: L.text }));
  window.__lines = lines; window.__path = path;
  return out;
}
async function covered() {
  // 2. hit-test the middle of every text line, scrolling the page through its whole height
  const issues = [], seen = new Set(), L = window.__lines, path = window.__path;
  const step = Math.max(200, innerHeight - 160), max = document.documentElement.scrollHeight;
  for (let y = 0; y < max; y += step) {
    scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40));
    const sy = scrollY;
    for (const l of L) {
      const cy = (l.y0 + l.y1) / 2 - sy, cx = Math.min(Math.max((l.x0 + l.x1) / 2, 1), innerWidth - 2);
      if (cy < 4 || cy > innerHeight - 4 || l.done) continue; l.done = 1;
      if (l.el.checkVisibility && !l.el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue; // hidden now (the walkthrough shows one step's text at a time)
      const hit = document.elementFromPoint(cx, cy); if (!hit) continue;
      if (hit === l.el || hit.contains(l.el) || l.el.contains(hit) || hit.closest('#wa-fab')) continue;
      const k = path(hit) + '|' + path(l.el); if (seen.has(k)) continue; seen.add(k);
      issues.push(`text "${l.text}" (${path(l.el)}) is covered by ${path(hit)}`);
    }
  }
  scrollTo({ top: 0, behavior: 'instant' });
  return issues;
}
async function fabCovers() {
  // 6. phones: put every button and link under the floating WhatsApp button; it must have stepped aside
  const fab = document.getElementById('wa-fab'); if (!fab) return [];
  const issues = [], path = window.__path;
  const els = [...document.querySelectorAll('main a, main button, main summary, main input, main select, footer a')].filter((e) => !e.closest('[aria-hidden="true"],[role="img"]') && e.checkVisibility && e.checkVisibility());
  for (const e of els) {
    const f = fab.getBoundingClientRect(), r0 = e.getBoundingClientRect();
    if (r0.right < f.left || r0.left > f.right) continue; // never shares the button's column
    scrollTo({ top: scrollY + (r0.top + r0.height / 2) - (f.top + f.height / 2), behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 160));
    const r = e.getBoundingClientRect(), g = fab.getBoundingClientRect();
    const over = r.left < g.right && r.right > g.left && r.top < g.bottom && r.bottom > g.top;
    if (over && !fab.classList.contains('wa-fab-off')) issues.push(`${path(e)} "${(e.textContent || '').trim().slice(0, 30)}" sits under the floating WhatsApp button while it is showing`);
  }
  scrollTo({ top: 0, behavior: 'instant' });
  return issues;
}
for (const [w, h, tag] of [[375, 812, '375'], [768, 1024, '768'], [1280, 800, '1280']]) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  await c.addInitScript(() => { try { localStorage.setItem('crier_consent', 'denied'); } catch (e) {} });
  for (const u of urls) {
    if (ONLY && !ONLY.includes(u)) continue;
    const pg = await c.newPage();
    await pg.goto(BASE + u); await pg.waitForLoadState('load'); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 20)); } scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)); });
    const r = await pg.evaluate(scan);
    const issues = [...r.issues, ...(await pg.evaluate(covered)), ...(w < 768 ? await pg.evaluate(fabCovers) : [])];
    if (r.sw > r.vw) issues.unshift(`the page scrolls sideways (${r.sw} > ${r.vw})`);
    checked++;
    for (const m of issues) bad(`${tag}px ${u}: ${m}`);
    if (!issues.length) console.log('PASS', `${tag}px ${u} (${r.lines.length} text lines)`);
    await pg.close();
  }
  await c.close();
}
await b.close();
console.log(fail ? `${fail} overlap problems on ${checked} page views` : `no overlap problems on ${checked} page views`);
process.exit(fail ? 1 : 0);
