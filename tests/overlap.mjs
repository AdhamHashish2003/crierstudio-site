// Overlap and clipping checks (2026-11-15, owner: "take care of overlapping problems like this"). For every page, in Arabic and English,
// at 360, 390, 768 and 1280 px wide, this fails the run when:
//   1. the page scrolls sideways;
//   2. a piece of text is covered by another element (hit-tested at the middle of every rendered text line);
//   3. a piece of text is cut by an overflow:hidden box;
//   4. two text lines of different blocks overlap;
//   5. a highlight band (an inline background that wraps over lines, e.g. the hero's lime band) touches the band of the next line,
//      reaches into the letters of the line above or below, or does not cover its own letters (ink measured with canvas);
//   6. on phones, a button or link sits under the floating WhatsApp button while it is still showing;
//   7. a heading that wraps has letters taller than its line height (tails of one line could touch the marks of the next);
//   8. on Arabic pages, numbers, signs and Latin words that the browser would reorder wrongly (phone numbers, +20, @name, "24 → 27"),
//      Arabic-Indic digits, or Arabic inside a left-to-right box;
//   9. a chip or badge touches or covers a text line.
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
      lines.push({ el, node: n, block: blockOf(el), x0: q.left, x1: q.right, y0: q.top + sy, y1: q.bottom + sy, text: n.nodeValue.trim().slice(0, 40) });
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
  // 8. mixed Arabic / Latin / numbers (bidi), on right-to-left pages. The browser reorders such text by fixed rules, and these patterns
  //    come out in the wrong order unless they sit in their own left-to-right box (dir="ltr" or <bdi>):
  //    a. groups of digits separated by spaces (a phone number: "+20 114 600 0101" would read "0101 600 114 20+");
  //    b. a sign glued to the front of a number or Latin word (+20, @name, #tag, -5) or to its end (name/, 5+);
  //    c. numbers or Latin words joined by an arrow or a spaced dash, colon or sign ("24 → 27", "9 - 5", "1 : 2");
  //    d. Arabic-Indic digits (the site writes 0–9 everywhere);
  //    e. a left-to-right box whose text is mostly Arabic.
  if (document.documentElement.dir === 'rtl') {
    const done = new Set(), AR = /[\u0600-\u06FF]/;
    const flag = (el, text, why) => { const k = why + '|' + text; if (!done.has(k)) { done.add(k); out.issues.push(`bidi: "${text.trim().slice(0, 50)}" (${path(el)}): ${why}`); } };
    for (const L of lines) {
      if (done.has(L.node)) continue; done.add(L.node);
      const t = L.node.nodeValue, el = L.el;
      if (/[\u0660-\u0669\u06F0-\u06F9]/.test(t)) flag(el, t, 'Arabic-Indic digits (the site uses 0–9)');
      if (el.closest('[dir="ltr"],bdi,[dir="auto"]')) continue; // already in its own left-to-right box
      if (/\d[\d.,]*[ \u00A0]+\d/.test(t)) flag(el, t, 'digit groups separated by spaces need dir="ltr" (they come out reversed)');
      if (/(^|[\s\u0600-\u06FF(«"])[+@#~^=<>\\-](?=[A-Za-z0-9])/.test(t) || /[A-Za-z0-9][+@#~^=<>\\\/](?=$|[\s\u0600-\u06FF،.؟»")])/.test(t)) flag(el, t, 'a sign glued to a number or Latin word needs dir="ltr" (the sign jumps to the other side)');
      if (/[A-Za-z0-9][ \u00A0]*[→←↔×÷][ \u00A0]*[A-Za-z0-9]/.test(t) || /[A-Za-z0-9][ \u00A0]+[-–—:=+][ \u00A0]+[A-Za-z0-9]/.test(t)) flag(el, t, 'numbers or Latin words joined by an arrow or a spaced sign need dir="ltr" (they swap sides)');
    }
    for (const el of document.querySelectorAll('body [dir="ltr"]')) {
      if (el.closest(DECOR) || (el.checkVisibility && !el.checkVisibility())) continue;
      const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join(' ');
      const ar = (own.match(/[\u0600-\u06FF]/g) || []).length, la = (own.match(/[A-Za-z]/g) || []).length;
      if (ar > 3 && ar > la) flag(el, own, 'a left-to-right box holds Arabic text');
    }
  }
  // 9. chips and badges (small labels with their own background or border) must not touch or cover a text line of another block
  for (const chip of document.querySelectorAll('.badge,.eyebrow,.lab,.isa-st,.la-ptag,.hc-tag,.hw-tag,[class*="chip"],[class*="pill"],[class*="badge"]')) {
    if (chip.closest(DECOR) || (chip.checkVisibility && !chip.checkVisibility()) || !/\S/.test(chip.textContent)) continue;
    const c = chip.getBoundingClientRect(); if (c.width < 4 || c.height < 4 || c.height > 60) continue;
    const top = c.top + sy, bot = c.bottom + sy;
    for (const L of lines) {
      if (chip.contains(L.el) || L.el.contains(chip) || L.block === chip || blockOf(chip) === L.block && L.el.closest('.badge,.eyebrow') === chip) continue;
      if (Math.min(L.x1, c.right) - Math.max(L.x0, c.left) < 3) continue; // not in the same column
      const h = L.y1 - L.y0, a = L.y0 + h * 0.22, z = L.y1 - h * 0.22; // the letters of that line
      const gap = Math.max(a - bot, top - z);
      if (gap < 2) { out.issues.push(`label ${path(chip)} "${chip.textContent.trim().slice(0, 24)}" ${gap < 0 ? 'covers' : 'touches'} the text "${L.text}" (${path(L.el)})`); break; }
    }
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
// widths: 360 (small Android), 390 (iPhone), 768 (tablet), 1280 (desktop); WIDTHS=375x812,844x390 overrides (below 768 wide = a touch phone)
const SIZES = (process.env.WIDTHS || '360x740,390x844,768x1024,1280x800').split(',').map((x) => x.split('x').map(Number));
for (const [w, h] of SIZES) {
  const tag = w + 'x' + h;
  const c = await b.newContext({ viewport: { width: w, height: h }, ...(w < 768 || h < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  await c.addInitScript(() => { try { localStorage.setItem('crier_consent', 'denied'); } catch (e) {} });
  for (const u of urls) {
    if (ONLY && !ONLY.includes(u)) continue;
    const pg = await c.newPage();
    await pg.goto(BASE + u); await pg.waitForLoadState('load'); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 20)); } scrollTo({ top: 0, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)); });
    await pg.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true; }); // closed answers are not laid out: open them so their text is checked too
    const r = await pg.evaluate(scan);
    const issues = [...r.issues, ...(await pg.evaluate(covered)), ...(w < 768 ? await pg.evaluate(fabCovers) : [])];
    if (r.sw > r.vw) issues.unshift(`the page scrolls sideways (${r.sw} > ${r.vw})`);
    checked++;
    for (const m of issues) bad(`${tag} ${u}: ${m}`);
    if (!issues.length) console.log('PASS', `${tag} ${u} (${r.lines.length} text lines)`);
    await pg.close();
  }
  await c.close();
}
await b.close();
console.log(fail ? `${fail} overlap problems on ${checked} page views` : `no overlap problems on ${checked} page views`);
process.exit(fail ? 1 : 0);
