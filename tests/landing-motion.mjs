// The new home page's hero phone and "How it works" video (2026-11-15): templates/hero-v2.html, how-video.html, assets/landing.js.
// While the page is held (SHOW_NEW_LANDING = false) it is tested at /_parked/preview/; after the switch, at /.
// Google, wa.me and the portal are blocked: nothing leaves this machine. Run with a static server on the repo root:
//   BASE=http://127.0.0.1:8767 node tests/landing-motion.mjs        (OUTPUT=<dir> also saves screenshots)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765';
const OUT = process.env.OUTPUT || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let fail = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fail++; };
const held = (await (await fetch(BASE + '/')).text()).includes('id="hv"') ? '' : '/_parked/preview';
const HOW = JSON.parse(fs.readFileSync(new URL('../data/how-video.json', import.meta.url), 'utf8'));
async function open(lang, opts) {
  const c = await b.newContext(opts);
  await c.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|wa\.me|portal\.crierstudio\.com|crm-production/, (r) => r.abort());
  const pg = await c.newPage(), errors = [], media = [];
  pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); // (the blocked Google and WhatsApp requests)
  pg.on('pageerror', (e) => errors.push(String(e)));
  pg.on('request', (r) => { if (/\/assets\/video\//.test(r.url())) media.push(new URL(r.url()).pathname); });
  await pg.goto(BASE + held + (lang === 'ar' ? '/' : '/en/')); await pg.waitForLoadState('load');
  return { c, pg, errors, media };
}
const shot = async (pg, name, sel) => { if (!OUT) return; fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name + '.png'); if (sel) await pg.locator(sel).screenshot({ path: f }); else await pg.screenshot({ path: f }); };

for (const lang of ['ar', 'en']) {
  for (const [dev, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 844 }]]) {
    const tag = `${lang} ${dev}`;
    const { c, pg, errors, media } = await open(lang, { viewport: vp, deviceScaleFactor: 2 });
    // ---- hero phone ----
    const h0 = await pg.evaluate(() => ({ name: document.querySelector('.hv-bio bdi').textContent, handle: document.querySelector('.hv-tb b').textContent.trim(), fol: document.getElementById('hv-fol').textContent,
      posts: document.getElementById('hv-posts').textContent, tiles: [...document.querySelectorAll('#hv-grid img')].map((i) => i.complete && i.naturalWidth > 0), flat: document.querySelectorAll('#hero .ig-post, #hero .xp').length,
      next: document.getElementById('hv-grid').getAttribute('data-next').split(',') }));
    ok(h0.name === (lang === 'ar' ? 'مشروعك' : 'Your business') && h0.handle === 'yourbusiness', `${tag}: the profile is ${h0.name} (@${h0.handle})`);
    ok(h0.tiles.length === 9 && h0.tiles.every(Boolean) && h0.flat === 0, `${tag}: the grid is 9 real example images, no drawn tiles`);
    ok(/1\.2/.test(h0.fol) && h0.posts === '24', `${tag}: starts at ${h0.fol} followers and ${h0.posts} posts`);
    ok(!media.some((u) => !/poster/.test(u)), `${tag}: no video is fetched when the page opens`);
    if (dev === 'phone') await pg.locator('#hv').scrollIntoViewIfNeeded();
    await pg.waitForFunction(() => document.getElementById('hv').classList.contains('is-live'), null, { timeout: 5000 }).catch(() => {});
    ok(await pg.evaluate(() => document.getElementById('hv').classList.contains('is-live')), `${tag}: the phone runs while it is on screen`);
    await pg.waitForTimeout(5200); await shot(pg, `hero-${lang}-${dev}-mid`, '#hero');
    await pg.waitForFunction(() => /3\.8/.test(document.getElementById('hv-fol').textContent), null, { timeout: 16000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    const h1 = await pg.evaluate(() => ({ fol: document.getElementById('hv-fol').textContent, posts: document.getElementById('hv-posts').textContent, n: document.querySelectorAll('#hv-grid .hv-cell').length,
      first: new URL(document.querySelector('#hv-grid img').src).pathname, likes: +document.getElementById('hv-likes').textContent, moved: [...document.querySelectorAll('#hv-grid .hv-cell')].some((e) => e.style.transform) }));
    ok(/3\.8/.test(h1.fol) && h1.posts === '27', `${tag}: followers rose to ${h1.fol}, posts to ${h1.posts}`);
    ok(h1.n === 9 && h1.first === h0.next[2] && !h1.moved, `${tag}: three new posts dropped in (newest first), the grid is back to 9 tiles at rest`);
    ok(h1.likes > 128, `${tag}: likes ticked up to ${h1.likes}`);
    await shot(pg, `hero-${lang}-${dev}-end`, '#hero');
    // off screen: paused
    await pg.locator('#faq').scrollIntoViewIfNeeded(); await pg.waitForTimeout(400);
    ok(!(await pg.evaluate(() => document.getElementById('hv').classList.contains('is-live'))), `${tag}: the phone pauses off screen`);

    // ---- the video ----
    await pg.locator('#how-video').scrollIntoViewIfNeeded();
    await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return !v.paused && v.currentTime > 0.5; }, null, { timeout: 15000 }).catch(() => {});
    const v0 = await pg.evaluate(() => { const v = document.querySelector('#how-video video'); return { t: v.currentTime, paused: v.paused, muted: v.muted, loop: v.loop, inline: v.playsInline, src: new URL(v.currentSrc || 'http://x/').pathname, w: v.videoWidth, h: v.videoHeight, dur: v.duration,
      active: [...document.querySelectorAll('#walkthrough .wt-step')].findIndex((l) => l.classList.contains('is-active')), statics: document.getElementById('walkthrough').classList.contains('is-static') }; });
    ok(!v0.paused && v0.t > 0.5 && v0.muted && v0.loop && v0.inline, `${tag}: the video plays by itself, muted, looping, inline (${v0.t.toFixed(1)} s)`);
    const want = `/assets/video/how-${lang}-${dev === 'phone' ? 'phone' : '1080'}`;
    ok(v0.src.startsWith(want) && (dev === 'phone' ? v0.w === 720 : v0.w === 1920) && v0.h === 1080, `${tag}: it is the ${dev} file in ${lang} (${v0.src}, ${v0.w}x${v0.h})`);
    ok(Math.abs(v0.dur - HOW.duration) < 0.2, `${tag}: ${v0.dur.toFixed(1)} s long`);
    ok(v0.active === 0 && !v0.statics, `${tag}: step 1 is highlighted at the start`);
    // a step's button jumps the video there, and the list follows
    await pg.locator('#walkthrough .wt-step').nth(3).locator('button').click();
    await pg.waitForFunction((t) => { const v = document.querySelector('#how-video video'); return v.currentTime >= t + 0.4 && !v.paused; }, HOW.steps[3], { timeout: 8000 }).catch(() => {});
    const v1 = await pg.evaluate(() => ({ t: document.querySelector('#how-video video').currentTime, active: [...document.querySelectorAll('#walkthrough .wt-step')].findIndex((l) => l.classList.contains('is-active')),
      done: document.querySelectorAll('#walkthrough .wt-step.is-done').length, count: document.querySelector('#walkthrough .wt-count b').textContent }));
    ok(v1.t >= HOW.steps[3] + 0.4 && v1.t < HOW.steps[4] && v1.active === 3 && v1.done === 3 && v1.count === '04', `${tag}: step 4's button jumps to ${v1.t.toFixed(1)} s; the list shows ${v1.count}`);
    await shot(pg, `video-${lang}-${dev}`, '#walkthrough');
    // the pause button
    await pg.locator('#how-video button').click(); await pg.waitForTimeout(300);
    const p1 = await pg.evaluate(() => ({ paused: document.querySelector('#how-video video').paused, label: document.querySelector('#how-video button').getAttribute('aria-label') }));
    ok(p1.paused && p1.label === (lang === 'ar' ? 'شغّل الفيديو' : 'Play the video'), `${tag}: the button pauses it (now "${p1.label}")`);
    // layout
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(wide <= 0, `${tag}: no sideways scroll (${wide})`);
    ok(errors.length === 0, `${tag}: no console errors ${errors.slice(0, 2).join(' | ')}`);
    await c.close();
  }
  // ---- reduced motion: the still phone, the poster and the steps ----
  const { c, pg, media } = await open(lang, { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await pg.locator('#hv').scrollIntoViewIfNeeded(); await pg.waitForTimeout(2500);
  const r0 = await pg.evaluate(() => ({ live: document.getElementById('hv').classList.contains('is-live'), fol: document.getElementById('hv-fol').textContent, anim: getComputedStyle(document.querySelector('.hv-card')).animationName }));
  ok(!r0.live && /1\.2/.test(r0.fol) && r0.anim === 'none', `${lang} reduced motion: the phone stays still (${r0.fol})`);
  await pg.locator('#how-video').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1500);
  const r1 = await pg.evaluate(() => { const v = document.querySelector('#how-video video'), p = document.querySelector('#how-video img'); return { paused: v.paused, sources: v.querySelectorAll('source').length, poster: p.complete && p.naturalWidth, src: new URL(p.currentSrc).pathname,
    steps: document.querySelectorAll('#walkthrough .wt-step').length, statics: document.getElementById('walkthrough').classList.contains('is-static') }; });
  ok(r1.paused && r1.sources === 0 && !media.some((u) => !/poster/.test(u)), `${lang} reduced motion: the video does not load or play`);
  ok(r1.poster === 720 && /phone-poster/.test(r1.src) && r1.steps === 5 && r1.statics, `${lang} reduced motion: the poster (${r1.src}) and the 5 steps show`);
  await shot(pg, `reduced-${lang}-phone`, '#walkthrough');
  await pg.locator('#how-video button').click();
  await pg.waitForFunction(() => { const v = document.querySelector('#how-video video'); return !v.paused && v.currentTime > 0.3; }, null, { timeout: 15000 }).catch(() => {});
  ok(await pg.evaluate(() => !document.querySelector('#how-video video').paused), `${lang} reduced motion: the play button still starts it`);
  await c.close();
}
await b.close();
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
