/* The new landing page's motion (owner 2026-11-15): the hero phone and the "How it works" video.
   Both run only while they are on screen and the tab is visible; with prefers-reduced-motion the phone stays still and the
   video waits for its play button. Classes set here (kept by the build's CSS filter because they are written out in full):
   is-live is-tick hv-cell hv-new hv-pop is-playing is-ready is-static is-active is-done */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canWatch = 'IntersectionObserver' in window;
  function watch(el, margin, ratio, cb) { var io = new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting && es[es.length - 1].intersectionRatio >= ratio); }, { rootMargin: margin, threshold: [0, ratio] }); io.observe(el); return io; }

  /* ---------- hero phone: followers rise, new posts drop in, likes and comments tick ---------- */
  (function () {
    var hv = document.getElementById('hv'); if (!hv || reduce || !canWatch) return;
    var grid = document.getElementById('hv-grid'), fol = document.getElementById('hv-fol'), posts = document.getElementById('hv-posts');
    var likes = document.getElementById('hv-likes'), cmts = document.getElementById('hv-cmts');
    var next = (grid.getAttribute('data-next') || '').split(',').filter(Boolean), kfmt = hv.getAttribute('data-k') || '{n}K';
    var DROPS = [3, 7.5, 12], F0 = 1.2, F1 = 3.8, T0 = 1.2, T1 = 15, STEP = 0.25;
    var inView = false, timer = null, n = 0, dropped = 0, shown = fol.textContent, nLikes = +likes.textContent || 0, nCmts = +cmts.textContent || 0, nPosts = +posts.textContent || 0;
    function set(el, v) { el.textContent = v; el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); }
    function drop(src) {
      var img = new Image(); img.alt = ''; img.width = 240; img.height = 300; img.src = src;
      var go = function () {
        var tiles = [].slice.call(grid.children), from = tiles.map(function (el) { return el.getBoundingClientRect(); });
        var k = grid.offsetWidth ? grid.getBoundingClientRect().width / grid.offsetWidth : 1; // the phone is scaled as one piece
        var cell = document.createElement('span'); cell.className = 'hv-cell hv-new'; cell.appendChild(img); grid.insertBefore(cell, grid.firstChild);
        tiles.forEach(function (el, i) { var to = el.getBoundingClientRect(); el.style.transition = 'none'; el.style.transform = 'translate(' + (from[i].left - to.left) / k + 'px,' + (from[i].top - to.top) / k + 'px)'; });
        void grid.offsetWidth;
        tiles.forEach(function (el) { el.style.transition = 'transform .75s cubic-bezier(.3,.7,.2,1)'; el.style.transform = ''; });
        set(posts, ++nPosts);
        setTimeout(function () { var last = tiles[tiles.length - 1]; if (last && last.parentNode === grid) grid.removeChild(last); cell.classList.remove('hv-new'); }, 950);
        setTimeout(function () { var pop = document.createElement('span'); pop.className = 'hv-pop'; pop.textContent = String(18 + dropped * 7); cell.appendChild(pop); setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 3100); }, 900);
      };
      if (img.decode) img.decode().then(go, go); else { img.onload = go; img.onerror = function () {}; }
    }
    function tick() {
      var t = ++n * STEP, p = Math.min(1, Math.max(0, (t - T0) / (T1 - T0))); p = p * p * (3 - 2 * p);
      var s = kfmt.replace('{n}', (F0 + (F1 - F0) * p).toFixed(1));
      if (s !== shown) { shown = s; set(fol, s); }
      if (dropped < next.length && t >= DROPS[dropped]) drop(next[dropped++]);
      if (n % 7 === 0 && nLikes < 990) { nLikes += 1 + (n / 7) % 3; set(likes, nLikes); }
      if (n % 26 === 0 && nCmts < 99) set(cmts, ++nCmts);
    }
    function sync() {
      var on = inView && !document.hidden;
      hv.classList.toggle('is-live', on);
      if (on && !timer) timer = setInterval(tick, STEP * 1000); else if (!on && timer) { clearInterval(timer); timer = null; }
    }
    watch(hv, '0px', 0.2, function (v) { inView = v; sync(); });
    document.addEventListener('visibilitychange', sync);
  })();

  /* ---------- "How it works": lazy video, muted loop while on screen, steps in step with it ---------- */
  (function () {
    var frame = document.getElementById('how-video'); if (!frame) return;
    var sec = frame.closest ? frame.closest('section') : null, video = frame.querySelector('video'), btn = frame.querySelector('button'); if (!sec || !video || !btn) return;
    var steps = [].slice.call(sec.querySelectorAll('.wt-step')), times = (frame.getAttribute('data-steps') || '').split(',').map(Number), dur = +frame.getAttribute('data-dur') || 0;
    var count = sec.querySelector('.wt-count b'), track = sec.querySelector('.wt-track i');
    var loaded = false, wanted = !reduce, inView = false, cur = -1, raf = 0;
    function load() {
      if (loaded) return; loaded = true;
      var small = window.matchMedia && window.matchMedia('(max-width: 700px)').matches, base = frame.getAttribute(small ? 'data-phone' : 'data-desk');
      [['.webm', 'video/webm; codecs="vp9"'], ['.mp4', 'video/mp4']].forEach(function (x) { var s = document.createElement('source'); s.src = base + x[0]; s.type = x[1]; video.appendChild(s); });
      video.muted = true; video.preload = 'metadata'; video.load(); // the first bytes only; the rest streams once it plays
    }
    function paint() {
      var t = video.currentTime || 0, i = 0; for (var j = 0; j < times.length; j++) if (t >= times[j] - 0.05) i = j;
      var end = i + 1 < times.length ? times[i + 1] : dur, p = end > times[i] ? Math.min(1, Math.max(0, (t - times[i]) / (end - times[i]))) : 0;
      if (i !== cur) {
        cur = i;
        steps.forEach(function (li, j) { li.classList.toggle('is-active', j === i); li.classList.toggle('is-done', j < i); var b = li.querySelector('button'); if (b) b.setAttribute('aria-current', j === i ? 'step' : 'false'); });
        if (count) count.textContent = '0' + (i + 1);
      }
      steps.forEach(function (li, j) { var bar = li.querySelector('.wt-bar i'); if (bar) bar.style.setProperty('--p', j === i ? p.toFixed(3) : 0); });
      if (track && dur) track.style.setProperty('--wt-p', (t / dur).toFixed(3));
    }
    function loop() { paint(); raf = video.paused ? 0 : window.requestAnimationFrame(loop); }
    function state() {
      var on = !video.paused;
      frame.classList.toggle('is-playing', on);
      btn.setAttribute('aria-label', btn.getAttribute(on ? 'data-pause' : 'data-play'));
      if (on) { sec.classList.remove('is-static'); frame.classList.add('is-ready'); if (!raf) loop(); }
    }
    function play() { load(); var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function sync() { if (wanted && inView && !document.hidden) play(); else if (!video.paused && (!inView || document.hidden)) video.pause(); }
    video.addEventListener('play', state); video.addEventListener('pause', state); video.addEventListener('seeked', paint);
    btn.addEventListener('click', function () { wanted = video.paused; if (wanted) play(); else video.pause(); });
    steps.forEach(function (li, i) { var b = li.querySelector('button'); if (b) b.addEventListener('click', function () {
      load(); wanted = true;
      var r = frame.getBoundingClientRect(), seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (seen < r.height * 0.6 && frame.scrollIntoView) frame.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); // on a phone the list sits under the video
      var seek = function () { video.currentTime = times[i] + 0.06; play(); };
      if (video.readyState >= 1) seek(); else video.addEventListener('loadedmetadata', seek, { once: true });
    }); });
    if (!canWatch) return;
    watch(frame, '200px 0px', 0, function (v) { if (v && !reduce) load(); }); // attach the files just before it scrolls in
    watch(frame, '0px', 0.35, function (v) { inView = v; sync(); });
    document.addEventListener('visibilitychange', sync);
  })();
})();
