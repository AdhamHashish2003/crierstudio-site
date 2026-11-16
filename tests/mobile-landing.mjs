// Phone layouts of the home page and /social/ (owner 2026-11-15: "make sure this is ready for mobile layout too").
// Four phones in portrait (iPhone SE 375, iPhone 15 393, Pixel 7 412, a small Android 360) and two on their side, Arabic and English.
// Chrome with each phone's screen size, pixel ratio, touch and user agent: a layout check, not a test of Safari itself.
// Checks: no sideways scroll; the video section (plays or shows its poster, whole picture on screen and not cropped, steps in step,
// tap to pause and play); the hero phone (fits the screen, runs, frame times while it animates, the WhatsApp button is not on the
// phone's screen); every button and link is at least 44 px to tap; no text under 12 px.
// The hero and the How it works section are this test's own subject: anything wrong there fails the run. Tap sizes and small text
// found in the rest of the page (header, package cards, FAQ, footer) are printed as NOTE lines and fail the run only with STRICT=1.
// Google, wa.me and the portal are blocked. Run with a static server on the repo root (one that answers Range requests):
//   BASE=http://127.0.0.1:8767 node tests/mobile-landing.mjs        (OUTPUT=<dir> also saves screenshots of every phone)
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const OUT = process.env.OUTPUT || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const notes = [];
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const STRICT = !!process.env.STRICT;
const note = (m) => { console.log('NOTE', m); notes.push(m); };
// own: in the hero or How it works (fails); rest: elsewhere on the page (a NOTE, or a failure with STRICT=1)
const sized = (tag, what, x) => { ok(x.own.length === 0, `${tag}: ${what} in the hero and How it works ${x.own.slice(0, 6).join(' | ')}`); if (x.rest.length) (STRICT ? (m) => ok(false, m) : note)(`${tag}: ${what}, rest of the page: ${x.rest.slice(0, 8).join(' | ')}${x.rest.length > 8 ? ` … ${x.rest.length} in all` : ''}`); };
const ios = devices['iPhone 15'].userAgent, android = devices['Pixel 7'].userAgent;
// the screen area a page really gets (browser bars taken off)
const PHONES = [
  ['iphone-se-375', { width: 375, height: 553 }, 2, ios],
  ['iphone-15-393', { width: 393, height: 659 }, 3, ios],
  ['pixel-7-412', { width: 412, height: 839 }, 2.625, android],
  ['android-360', { width: 360, height: 640 }, 3, android],
  ['iphone-15-landscape-734', { width: 734, height: 343 }, 3, ios],
  ['pixel-7-landscape-863', { width: 863, height: 360 }, 2.625, android],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const shot = async (pg, name, opts = {}) => { if (!OUT) return; fs.mkdirSync(OUT, { recursive: true }); await pg.screenshot({ path: path.join(OUT, name + '.png'), ...opts }); };

// everything a visitor can tap in the page body, with its size; and text smaller than 12 px (mock screens and the video are pictures: skipped)
function audit() {
  const DECOR = '[aria-hidden="true"],[role="img"],#consent-bar,.skip-link,video', OWN = '#hero,#walkthrough';
  const seen = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.01; };
  const name = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  const taps = [];
  for (const el of document.querySelectorAll('main a[href], main button, main summary, main select, main input, header a[href], header button, footer a[href], footer button')) {
    if (el.closest(DECOR) || !seen(el)) continue;
    const r = el.getBoundingClientRect(), inline = getComputedStyle(el).display === 'inline';
    // a link inside a sentence is as tall as its line: WCAG's target-size rule leaves those out
    if (inline && el.closest('p,li,dd,summary,small,figcaption') && el.parentElement.textContent.trim().length > el.textContent.trim().length + 8) continue;
    if (r.width < 43.5 || r.height < 43.5) taps.push([`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`, !!el.closest(OWN)]);
  }
  const small = new Map(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (!/\S/.test(n.nodeValue)) continue; const el = n.parentElement; if (!el || el.closest(DECOR + ',script,style,noscript') || !seen(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11.95) small.set(name(el) + ' ' + fs + 'px', !!el.closest(OWN)); }
  const split = (list) => ({ own: list.filter((x) => x[1]).map((x) => x[0]), rest: list.filter((x) => !x[1]).map((x) => x[0]) });
  return { taps: split(taps), small: split([...small]), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
}

for (const lang of ['ar', 'en']) for (const [phone, viewport, dpr, userAgent] of PHONES) {
  if (ONLY && !ONLY.includes(phone)) continue;
  const tag = `${lang} ${phone}`, side = viewport.width > viewport.height;
  const c = await b.newContext({ viewport, deviceScaleFactor: dpr, userAgent, isMobile: true, hasTouch: true, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  const pg = await c.newPage(), errors = [];
  pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  pg.on('pageerror', (e) => errors.push(String(e)));
  const pre = lang === 'ar' ? '/' : '/en/';

  // ================= home =================
  await pg.goto(BASE + pre); await pg.waitForLoadState('load'); await pg.waitForTimeout(400);
  await shot(pg, `${phone}-${lang}-home-1-top`);
  // ---- hero phone ----
  await pg.evaluate(() => { const r = document.querySelector('.hv-phone').getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); });
  await pg.waitForFunction(() => document.getElementById('hv').classList.contains('is-live'), null, { timeout: 5000 }).catch(() => {});
  const h = await pg.evaluate(() => {
    const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const ph = box('.hv-phone'), scr = box('.hv-scr'), stage = box('.hv-stage'), fab = document.getElementById('wa-fab'), f = fab ? fab.getBoundingClientRect() : null;
    const fabOn = fab && !fab.classList.contains('wa-fab-off') && getComputedStyle(fab).display !== 'none';
    const hit = fabOn ? Math.max(0, Math.min(f.right, scr.r) - Math.max(f.left, scr.l)) * Math.max(0, Math.min(f.bottom, scr.b) - Math.max(f.top, scr.t)) : 0;
    const cards = ['.hv-story', '.hv-plan', '.hv-act', '.hv-id', '.hv-tag'].map((s) => { const e = document.querySelector(s); if (getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return { s, out: Math.max(0, -r.left, r.right - innerWidth) / r.width }; }).filter(Boolean);
    return { ph, stage, vw: innerWidth, vh: innerHeight, live: document.getElementById('hv').classList.contains('is-live'), fabHit: hit, cards, num: parseFloat(getComputedStyle(document.getElementById('hv-fol')).fontSize) * (ph.w / document.querySelector('.hv-phone').offsetWidth) };
  });
  ok(h.ph.l >= 0 && h.ph.r <= h.vw && h.ph.t >= h.stage.t - 1 && h.ph.b <= h.stage.b + 1, `${tag}: the hero phone fits (${Math.round(h.ph.w)} px wide on a ${h.vw} px screen)`);
  ok(h.cards.every((x) => x.out < 0.12), `${tag}: the floating cards stay on screen ${h.cards.filter((x) => x.out >= 0.12).map((x) => x.s + ' ' + Math.round(x.out * 100) + '% off').join(', ')}`);
  ok(h.live, `${tag}: the hero phone runs`);
  ok(h.fabHit === 0, `${tag}: the WhatsApp button is not on the phone's screen (${Math.round(h.fabHit)} px²)`);
  // frame times while it animates (a new post drops in at about 3 s): the gaps between animation frames
  const ft = await pg.evaluate(() => new Promise((res) => { const g = []; let last = performance.now(); const t0 = last; const f = (t) => { g.push(t - last); last = t; if (t - t0 < 4500) requestAnimationFrame(f); else { g.sort((a, c) => a - c); res({ n: g.length, med: g[Math.floor(g.length / 2)], p95: g[Math.floor(g.length * 0.95)], max: g[g.length - 1], slow: g.filter((x) => x > 50).length }); } }; requestAnimationFrame(f); }));
  ok(ft.p95 < 34 && ft.slow <= 2, `${tag}: hero animation frame gaps: median ${ft.med.toFixed(1)} ms, 95% under ${ft.p95.toFixed(1)} ms, ${ft.slow} over 50 ms`);

  // ---- the video ----
  // (first visit: the cookie bar is showing and takes room at the bottom of the screen)
  const toVideo = () => pg.evaluate(() => { const bar = document.getElementById('consent-bar'), bh = bar && !bar.hidden ? bar.getBoundingClientRect().height : 0, r = document.querySelector('.hw-clip').getBoundingClientRect(); scrollTo(0, scrollY + r.top - Math.max(8, (innerHeight - bh - r.height) / 2)); });
  const videoBox = () => pg.evaluate(() => { const vid = document.querySelector('#how-video video'), r = document.querySelector('.hw-clip').getBoundingClientRect(), p = document.querySelector('#how-video img'), bar = document.getElementById('consent-bar');
    return { playing: !vid.paused, t: vid.currentTime, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight - (bar && !bar.hidden ? bar.getBoundingClientRect().height : 0), vr: vid.videoWidth / vid.videoHeight, src: (vid.currentSrc || '').split('/').pop(),
      poster: p.complete && p.naturalWidth > 0, pr: p.naturalWidth / p.naturalHeight, active: [...document.querySelectorAll('#walkthrough .wt-step')].findIndex((l) => l.classList.contains('is-active')) }; });
  const whole = (q) => q.left >= 0 && q.right <= q.vw + 0.5 && q.top >= -1 && q.bottom <= q.vh + 1;
  await toVideo();
  await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return !v.paused && v.currentTime > 0.6; }, null, { timeout: 15000 }).catch(() => {});
  const v = await videoBox();
  ok(v.playing && v.t > 0.6, `${tag}: the video plays by itself (${v.src})`);
  ok(v.poster && Math.abs(v.pr - v.w / v.h) < 0.02, `${tag}: the poster is loaded and has the frame's shape`);
  ok(Math.abs(v.vr - v.w / v.h) < 0.02, `${tag}: the video is not cropped (video ${v.vr.toFixed(3)}, frame ${(v.w / v.h).toFixed(3)})`);
  ok(whole(v), `${tag}: the whole video is on screen above the cookie bar (${Math.round(v.w)}x${Math.round(v.h)} in ${v.vw}x${Math.round(v.vh)})`);
  await pg.waitForFunction(() => document.querySelector('#how-video video').currentTime > 6.4, null, { timeout: 15000 }).catch(() => {});
  const s2 = await pg.evaluate(() => ({ active: [...document.querySelectorAll('#walkthrough .wt-step')].findIndex((l) => l.classList.contains('is-active')), count: document.querySelector('#walkthrough .wt-count b').textContent }));
  ok(v.active === 0 && s2.active === 1 && s2.count === '02', `${tag}: the step list follows the video (step 1, then ${s2.count})`);
  // tap to pause, tap to play
  const btn = pg.locator('#how-video button');
  await btn.tap(); await pg.waitForTimeout(250); const paused = await pg.evaluate(() => document.querySelector('#how-video video').paused);
  await btn.tap(); await pg.waitForTimeout(500); const again = await pg.evaluate(() => !document.querySelector('#how-video video').paused);
  ok(paused && again, `${tag}: a tap on the button pauses the video and a second tap plays it`);
  // tapping a step in the list jumps the video there and brings it back on screen
  if (!side) {
    await pg.locator('#walkthrough .wt-step').nth(4).locator('button').tap();
    await pg.waitForFunction(() => { const vd = document.querySelector('#how-video video'); return vd.currentTime > 24 && !vd.paused; }, null, { timeout: 8000 }).catch(() => {});
    const j = await pg.evaluate(() => { const vd = document.querySelector('#how-video video'), r = document.querySelector('.hw-clip').getBoundingClientRect(); return { t: vd.currentTime, playing: !vd.paused, seen: (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height }; });
    ok(j.t > 24 && j.playing && j.seen > 0.6, `${tag}: tapping step 5 jumps to ${j.t.toFixed(1)} s with the video back on screen`);
  }
  // the visitor answers the cookie bar (declined here): the video takes the room it frees, still whole on screen
  await pg.locator('#consent-bar [data-consent="denied"]').tap(); await pg.waitForTimeout(350);
  await toVideo(); await pg.waitForTimeout(300); const v2 = await videoBox();
  ok(whole(v2) && Math.abs(v2.vr - v2.w / v2.h) < 0.02, `${tag}: with the bar gone the video is ${Math.round(v2.w)}x${Math.round(v2.h)}, whole and uncropped`);
  await shot(pg, `${phone}-${lang}-home-3-video`);
  if (!side) { await pg.locator('#walkthrough .wt-steps').scrollIntoViewIfNeeded(); await pg.waitForTimeout(300); await shot(pg, `${phone}-${lang}-home-4-steps`); }
  await pg.evaluate(() => { const r = document.querySelector('.hv-phone').getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); }); await pg.waitForTimeout(700);
  await shot(pg, `${phone}-${lang}-home-2-hero-phone`);
  // ---- the whole page: sideways scroll, tap sizes, small text ----
  for (let y = 0, hgt = await pg.evaluate(() => document.documentElement.scrollHeight); y < hgt; y += viewport.height) { await pg.evaluate((to) => scrollTo(0, to), y); await pg.waitForTimeout(40); }
  let a = await pg.evaluate(audit);
  ok(a.sw <= a.cw, `${tag}: home does not scroll sideways (${a.sw - a.cw})`);
  sized(tag, 'home: tap targets under 44 px', a.taps); sized(tag, 'home: text under 12 px', a.small);
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(200);
  if (!side) await shot(pg, `${phone}-${lang}-home-5-full`, { fullPage: true });

  // ================= /social/ =================
  await pg.goto(BASE + pre + 'social/'); await pg.waitForLoadState('load'); await pg.waitForTimeout(400); // (the cookie answer is remembered)
  await shot(pg, `${phone}-${lang}-social-1-top`);
  for (let y = 0, hgt = await pg.evaluate(() => document.documentElement.scrollHeight); y < hgt; y += viewport.height) { await pg.evaluate((to) => scrollTo(0, to), y); await pg.waitForTimeout(40); }
  a = await pg.evaluate(audit);
  ok(a.sw <= a.cw, `${tag}: /social/ does not scroll sideways (${a.sw - a.cw})`);
  sized(tag, '/social/: tap targets under 44 px', a.taps); sized(tag, '/social/: text under 12 px', a.small);
  await pg.evaluate(() => scrollTo(0, 0)); await pg.waitForTimeout(200);
  if (!side) await shot(pg, `${phone}-${lang}-social-2-full`, { fullPage: true });
  ok(errors.length === 0, `${tag}: no console errors ${errors.slice(0, 2).join(' | ')}`);
  await c.close();
}

// turning the phone: the frame changes shape, and the video changes to the file of that shape
{
  const c = await b.newContext({ viewport: { width: 393, height: 659 }, deviceScaleFactor: 2, userAgent: ios, isMobile: true, hasTouch: true });
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  const pg = await c.newPage(); await pg.goto(BASE + '/'); await pg.waitForLoadState('load');
  await pg.locator('.hw-clip').scrollIntoViewIfNeeded();
  await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return !v.paused && v.currentTime > 1; }, null, { timeout: 15000 }).catch(() => {});
  await pg.setViewportSize({ width: 734, height: 343 }); await pg.locator('.hw-clip').scrollIntoViewIfNeeded();
  await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return v.videoWidth === 1920 && !v.paused; }, null, { timeout: 15000 }).catch(() => {});
  const r = await pg.evaluate(() => { const v = document.querySelector('#how-video video'), q = document.querySelector('.hw-clip').getBoundingClientRect(); return { vw: v.videoWidth, vr: v.videoWidth / v.videoHeight, fr: q.width / q.height, t: v.currentTime, playing: !v.paused }; });
  ok(r.vw === 1920 && Math.abs(r.vr - r.fr) < 0.02 && r.playing, `turning the phone on its side: the wide file takes over, uncropped, still playing (${r.t.toFixed(1)} s)`);
  await c.close();
}
await b.close();
console.log(fail ? `${fail} FAILED` : 'all passed', notes.length ? `(${notes.length} notes about the rest of the page; STRICT=1 makes them failures)` : '');
process.exit(fail ? 1 : 0);
