// Renders the home page's "How it works" video from design/walkthrough-video/stage.html.
// The stage is a pure function of time (window.seek), so this steps through it frame by frame in headless Chrome and pipes the
// frames to ffmpeg: no screen recording, the same result on every run.
//
//   node build/render-walkthrough.mjs                  all four videos (ar/en x desk/phone) + posters into assets/video/
//   node build/render-walkthrough.mjs --lang ar --size phone
//   node build/render-walkthrough.mjs --posters         only the poster images again
//   node build/render-walkthrough.mjs --stills 2.4,9,15 --out /tmp/x     PNG stills only (for checking a change)
//
// Needs playwright-core (as the browser tests do), Google Chrome (CHROME overrides the path) and ffmpeg with libx264 + libvpx-vp9.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANGS = arg('lang', 'ar,en').split(','), SIZES = arg('size', 'desk,phone').split(',');
const FPS = +arg('fps', 30), OUT = path.resolve(arg('out', path.join(ROOT, 'assets/video')));
const STILLS = arg('stills', '') ? arg('stills').split(',').map(Number) : null;
const POSTER_T = +arg('poster', 1.95); // step 1: the four packages, Silver picked, before the tap
const POSTERS_ONLY = process.argv.includes('--posters'); // only the poster images again
// desk: 960x540 at 2x = 1920x1080 (1080p). phone: 360x540 at 2x = 720x1080, the lighter file for small screens.
const VIEW = { desk: { width: 960, height: 540, name: '1080' }, phone: { width: 360, height: 540, name: 'phone' } };
// x264: CRF 24 keeps flat UI and small text clean; VP9 at CRF 36 is about the same quality at ~60% of the size.
const ENC = { desk: { crf: 25, vp9: 38 }, phone: { crf: 25, vp9: 38 } };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/design/walkthrough-video/stage.html`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
fs.mkdirSync(OUT, { recursive: true });
const run = (cmd, args, input) => new Promise((resolve, reject) => { const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', (d) => { err = (err + d).slice(-2000); }); p.on('close', (c) => (c ? reject(new Error(cmd + ' failed: ' + err)) : resolve())); if (input) input(p.stdin); });

try {
  for (const lang of LANGS) for (const size of SIZES) {
    const v = VIEW[size], page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${base}?lang=${lang}&size=${size}`);
    await page.waitForFunction('window.__ready === true');
    const dur = await page.evaluate('window.DURATION'), steps = await page.evaluate('window.STEPS');
    // a missing text would be burned into every frame: stop before rendering if the stage shows one
    const hole = await page.evaluate(() => (document.getElementById('stage').textContent.match(/undefined|\bnull\b|NaN|\[object/) || [])[0]);
    if (hole) throw new Error(`stage ${lang}/${size} shows "${hole}": a text is missing in design/walkthrough-video/stage.js`);
    const shot = async (t, type = 'png') => { await page.evaluate((x) => window.seek(x), t); return page.screenshot({ type, ...(type === 'jpeg' ? { quality: 84 } : {}) }); };
    if (STILLS) { for (const t of STILLS) fs.writeFileSync(path.join(OUT, `still-${lang}-${size}-${String(t).replace('.', '_')}.png`), await shot(t)); await page.close(); continue; }
    const stem = path.join(OUT, `how-${lang}-${v.name}`), n = Math.round(dur * FPS), e = ENC[size];
    if (POSTERS_ONLY) { fs.writeFileSync(stem + '-poster.jpg', await shot(POSTER_T, 'jpeg')); console.log(`${lang} ${size}: poster`); await page.close(); continue; }
    // one pass over the frames feeds both encoders
    // PNG frames (RGB) are converted once to BT.709 limited-range 4:2:0, and both files are tagged with it, so the colours match the page
    const color = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
    const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-map', '0:v', ...color, '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(e.crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'animation', '-g', String(FPS * 4), '-movflags', '+faststart', '-an', stem + '.mp4',
      '-map', '0:v', ...color, '-c:v', 'libvpx-vp9', '-crf', String(e.vp9), '-b:v', '0', '-pix_fmt', 'yuv420p', '-row-mt', '1', '-cpu-used', '1', '-g', String(FPS * 4), '-an', stem + '.webm'];
    const t0 = Date.now();
    await run('ffmpeg', ff, async (stdin) => { for (let i = 0; i < n; i++) { const buf = await shot(i / FPS); if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r)); } stdin.end(); });
    fs.writeFileSync(stem + '-poster.jpg', await shot(POSTER_T, 'jpeg'));
    const kb = (f) => Math.round(fs.statSync(f).size / 1024) + ' KB';
    // the page keeps its step list in step with the video from these numbers (build/build.mjs reads the file)
    const hw = path.join(ROOT, 'data/how-video.json'), meta = JSON.parse(fs.readFileSync(hw, 'utf8'));
    if (meta.duration !== dur || String(meta.steps) !== String(steps)) fs.writeFileSync(hw, JSON.stringify({ ...meta, duration: dur, steps }, null, 1).replace(/\[\n\s+([\d.,\s]+?)\n\s+\]/, (m, x) => '[' + x.replace(/\s+/g, ' ') + ']') + '\n');
    console.log(`${lang} ${size}: ${n} frames, ${dur}s, steps ${steps.join('/')} · mp4 ${kb(stem + '.mp4')} · webm ${kb(stem + '.webm')} · ${Math.round((Date.now() - t0) / 1000)}s`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
