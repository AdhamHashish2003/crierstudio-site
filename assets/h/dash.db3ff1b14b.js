// Home v2 (2026-10-18): the "See what working with Crier looks like" section. A recreated client portal dashboard (example
// client) plays a loop by itself; ported from the approved mockup (UMA/landing-mockup/assets/mockup.js). Served from 'self'
// as a hashed copy (/assets/h/dash.<hash>.js), only on the home pages; its strings come from i18n (the #dash-s JSON block).
// Everything on screen is a pure function of the loop time t, so any moment can be frozen exactly.
//   ?static=1  no motion: the finished state (also for prefers-reduced-motion: reduce)
//   ?t=SECONDS freeze the loop at that moment, in real seconds from the loop start (handy for screenshots)
// The story is written on a 16-unit timeline and played at RATE, so one real loop lasts 14.4 s.
// The loop pauses while the section is off-screen or the tab is hidden. Clicking a step jumps to it.
(function () {
  var q = new URLSearchParams(location.search);
  var root = document.getElementById('walkthrough'), dash = document.getElementById('dash'), data = document.getElementById('dash-s');
  if (!root || !dash || !data) return;

  var S = JSON.parse(data.textContent);
  var ar = document.documentElement.lang === 'ar';
  var nf = new Intl.NumberFormat(ar ? 'ar-EG' : 'en'); // the portal formats counts with the page locale
  var RATE = 16 / 14.4, CYCLE = 16, STEP_AT = [0, 2.2, 4.3, 7.2, 12.4], STATIC_T = 13.1;
  var ARRIVE = [4.5, 5.0, 5.5, 6.0], RESET = 15.0, BEHIND = 15.6; // RESET: the sign-up card returns; BEHIND: once it covers the screen, the board resets under it
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isStatic = q.get('static') === '1' || reduced;
  var tq = parseFloat(q.get('t'));
  var frozen = isStatic || !isNaN(tq);
  var t = isStatic ? STATIC_T : (!isNaN(tq) ? (((tq * RATE) % CYCLE) + CYCLE) % CYCLE : 0);

  var one = function (s) { return dash.querySelector(s); }, all = function (s) { return [].slice.call(dash.querySelectorAll(s)); };
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var back = function (x) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  var ramp = function (tt, a, d) { return easeOut(clamp((tt - a) / d)); };
  var lin = function (tt, a, d) { return clamp((tt - a) / d); };

  var cv = one('.d-cv'), vp = one('.d-vp'), cursor = one('.d-cursor');
  var posts = all('.d-post'), modal = one('.d-modal'), mbox = one('.d-mbox'), empty = one('.d-empty');
  var layers = { A: one('[data-l=A]'), B: one('[data-l=B]'), C: one('[data-l=C]'), D: one('[data-l=D]') };
  var b1 = one('[data-k=b1]'), b2 = one('[data-k=b2]'), cchip = one('[data-k=cchip]');
  var under = [posts[2].querySelector('.d-info'), posts[2].querySelector('.d-media .art-s')]; // what the bubbles hang over
  var minis = all('.d-mini .art');
  var steps = [].slice.call(root.querySelectorAll('.wt-step')), details = [].slice.call(root.querySelectorAll('.wt-d'));

  // cached style writes: only touch the DOM when a value changes
  function css(el, prop, v) { var k = '_' + prop; if (el[k] !== v) { el[k] = v; el.style.setProperty(prop, v); } }
  function cls(el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); }
  function txt(el, v) { if (el.textContent !== v) el.textContent = v; }

  // ---- the story, as discrete UI state at time t ----
  function state(tt) {
    var r = tt >= BEHIND, s = {};
    s.arr = r ? 0 : ARRIVE.filter(function (a) { return tt >= a; }).length;
    s.p1 = r ? 'wait' : tt >= 12.5 ? 'ready' : tt >= 8.1 ? 'appr' : 'wait';
    s.p3 = r ? 'wait' : tt >= 11.8 ? 'appr' : tt >= 10.9 ? 'wait' : tt >= 9.3 ? 'chg' : 'wait';
    s.v2 = !r && tt >= 10.9;
    s.sel = r ? -1 : tt >= 12.45 ? 0 : tt >= 8.85 ? 2 : tt >= 7.3 ? 0 : -1;
    s.opened = r ? 0 : (tt >= 7.3 ? 1 : 0) + (tt >= 8.85 ? 1 : 0);
    s.need = !r && tt >= 3.35;
    s.chg = s.sel === 2 && s.p3 === 'chg';
    s.taOn = s.sel === 2 && tt >= 9.3 && tt < 10.9;
    s.ta = s.taOn ? S.note.slice(0, Math.ceil(S.note.length * lin(tt, 9.3, .7))) : '';
    s.copied = !r && tt >= 13.4;
    s.typing = !r && tt >= .45 && tt < 1.65;
    s.typed = tt >= RESET ? '' : S.brand.slice(0, Math.round(S.brand.length * lin(tt, .5, 1)));
    s.aw = s.arr - (s.p1 !== 'wait' ? 1 : 0) - (s.p3 === 'chg' || s.p3 === 'appr' ? 1 : 0);
    s.ap = (s.p1 !== 'wait' ? 1 : 0) + (s.p3 === 'appr' ? 1 : 0);
    s.dec = s.ap + (s.p3 === 'chg' ? 1 : 0);
    s.nw = s.arr - s.opened;
    return s;
  }
  var STATUS = { wait: ['amber', S.waiting], appr: ['lime', S.approved], chg: ['indigo', S.changesAsked], ready: ['ready', S.ready] };

  function pill(el, base, st, anim) {
    var p = STATUS[st], key = p[0] + p[1];
    if (el._k === key) return;
    var had = el._k; el._k = key;
    el.className = 'd-pill ' + base + p[0];
    txt(el.lastChild, p[1]);
    if (had && anim) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
  function num(k, n, anim) {
    all('[data-k=' + k + ']').forEach(function (el) {
      var v = nf.format(n); if (el.textContent === v) return;
      el.textContent = v; cls(el, 'zero', n === 0);
      if (anim && el.classList.contains('d-tv')) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    });
  }

  function discrete(s, anim) {
    pill(one('[data-k=st0]'), 'd-st ', s.p1, anim);
    pill(one('[data-k=st2]'), 'd-st ', s.p3, anim);
    pill(one('[data-k=st1]'), 'd-st ', 'wait', anim);
    pill(one('[data-k=st3]'), 'd-st ', 'wait', anim);
    posts.forEach(function (p, i) { cls(p, 'sel', s.sel === i); });
    cls(posts[2], 'v2', s.v2);
    var si = s.sel < 0 ? 0 : s.sel;
    minis.forEach(function (m, i) { cls(m, 'on', i === si); cls(m, 'v2', i === 2 && s.v2); });
    txt(one('[data-k=selT]'), S.titles[si]);
    pill(one('[data-k=selPill]'), '', si === 2 ? s.p3 : s.p1 === 'ready' ? 'appr' : s.p1, anim);
    txt(one('[data-k=selV]'), si === 2 && s.v2 ? 'v2' : 'v1');
    cls(one('[data-b=changes]'), 'sel', s.chg);
    txt(one('[data-k=ta]'), s.ta); cls(one('.d-ta'), 'on', s.taOn);
    cls(one('[data-k=need]'), 'done', s.need);
    cls(one('[data-b=copy]'), 'done', s.copied);
    cls(one('[data-c=company]'), 'on', s.typing); txt(one('[data-k=type]'), s.typed);
    num('deliv', s.arr, anim); num('delivB', s.arr, anim); num('weekN', s.arr, anim);
    num('await', s.aw, anim); num('awaitB', s.aw, anim); num('appr', s.ap, anim); num('new', s.nw, anim);
    var line = s.aw === 0 ? S.pillNone : s.aw === 1 ? S.pillOne : S.pill.replace('{n}', nf.format(s.aw));
    all('[data-k=line]').forEach(function (el) { txt(el, line); });
    ['hpill', 'mpill'].forEach(function (k) { var el = one('[data-k=' + k + ']'); cls(el, 'amber', s.aw > 0); cls(el, 'none', s.aw === 0); });
    txt(one('[data-k=delivSub]'), S.inTotal.replace('{n}', nf.format(s.arr)));
    txt(one('[data-k=awaitSub]'), s.aw ? S.awaitSub : S.awaitNone);
    txt(one('[data-k=apprSub]'), S.ofDecided.replace('{n}', nf.format(s.dec)));
  }

  // ---- the pointer: where it heads (from that moment, 0.6 s glide) and when it clicks ----
  var MOVES = [[0, 'rest'], [.5, '[data-c=company]'], [1.15, '[data-b=create]'], [2.3, '[data-b=q]'], [3.6, 'rest'],
    [7.3, '[data-b=approve]'], [8.35, '.d-post[data-p="2"]'], [8.95, '[data-b=changes]'], [9.55, '.d-ta'], [11.1, '[data-b=approve]'],
    [11.95, '.d-post[data-p="0"]'], [12.75, '[data-b=copy]'], [13.85, '[data-b=dl]'], [14.9, 'rest']];
  var CLICKS = [[1.75, '[data-b=create]'], [3.1, '[data-b=q]'], [8.1, '[data-b=approve]'], [8.85, ''], [9.3, '[data-b=changes]'],
    [11.8, '[data-b=approve]'], [12.45, ''], [13.4, '[data-b=copy]'], [14.5, '[data-b=dl]']];
  var pos = {};
  function at(sel) {
    if (pos[sel]) return pos[sel];
    var el = one(sel === 'rest' ? '.d-week' : sel), x = 0, y = 0, n = el;
    while (n && n !== cv) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    var post = /d-post/.test(sel);
    return (pos[sel] = sel === 'rest' ? [x + el.offsetWidth * .62, y + el.offsetHeight * .55]
      : [x + el.offsetWidth * (post ? .5 : .56), y + el.offsetHeight * (post ? .42 : .62)]);
  }
  function pointer(tt) {
    var i = 0; while (i + 1 < MOVES.length && MOVES[i + 1][0] <= tt) i++;
    var from = at(MOVES[i ? i - 1 : MOVES.length - 1][1]), to = at(MOVES[i][1]);
    var k = easeInOut(lin(tt, MOVES[i][0], .6));
    var x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k, sc = 1, ring = 0, ro = 0;
    CLICKS.forEach(function (c) {
      var d = tt - c[0];
      if (d >= 0 && d < .45) { ring = .4 + 1.1 * (d / .45); ro = .9 * (1 - d / .45); sc = 1 - .14 * Math.sin(Math.PI * clamp(d / .22)); }
      if (c[1]) { var b = one(c[1]); if (b) cls(b, 'press', d >= 0 && d < .2); }
    });
    css(cursor, 'transform', 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')');
    css(cursor, '--ck-s', ring.toFixed(3)); css(cursor, '--ck-o', ro.toFixed(3));
    show(cursor, 1);
  }

  // ---- continuous motion (opacity / transform only) ----
  // anything at opacity 0 is also taken out entirely (visibility hidden, no pointer events), so no layer from another moment
  // can ghost over the current one
  function show(el, o) {
    var v = o < .001 ? '0' : o.toFixed(3);
    css(el, 'opacity', v);
    css(el, 'visibility', v === '0' ? 'hidden' : 'visible');
    css(el, 'pointer-events', v === '0' ? 'none' : '');
  }
  function fade(el, o, dy, sc) {
    show(el, o);
    css(el, 'transform', o >= 1 ? 'none' : 'translateY(' + (dy || 0).toFixed(2) + 'px)' + (sc != null ? ' scale(' + sc.toFixed(3) + ')' : ''));
  }
  function motion(tt) {
    var m = tt < 8 ? 1 - ramp(tt, 2, .45) : ramp(tt, RESET, .55);
    fade(modal, m, 0); css(mbox, 'transform', 'translateY(' + ((1 - m) * 14).toFixed(2) + 'px) scale(' + (.97 + .03 * m).toFixed(3) + ')');
    var gone = 1 - ramp(tt, BEHIND, .3);
    posts.forEach(function (p, i) { var a = lin(tt, ARRIVE[i], .7), o = easeOut(a) * gone; fade(p, o, (1 - easeOut(a)) * 16, .9 + .1 * back(a)); });
    fade(empty, tt < 8 ? 1 - ramp(tt, ARRIVE[0], .4) : ramp(tt, BEHIND, .3), 0);
    function layer(el, a, b) { var i = ramp(tt, a, .45), o = b == null ? i : i * (1 - ramp(tt, b, .3)); fade(el, o, (1 - i) * 10); }
    var A = tt < 8 ? 1 - ramp(tt, ARRIVE[0], .3) : ramp(tt, BEHIND, .3); fade(layers.A, A, 0);
    layer(layers.B, ARRIVE[0], 7.3); layer(layers.C, 7.3, 12.45); layer(layers.D, 12.45, BEHIND);
    function bub(el, a) { var x = lin(tt, a, .5), out = 1 - ramp(tt, 10.9, .35), o = clamp(x * 2.5) * out; show(el, o); css(el, 'transform', 'translateY(' + ((1 - easeOut(x)) * 6 + (1 - out) * 4).toFixed(2) + 'px) scale(' + ((.55 + .45 * back(x)) * (.85 + .15 * out)).toFixed(3) + ')'); }
    bub(b1, 9.3); bub(b2, 10.1);
    var u = (1 - lin(tt, 9.3, .2)) + ramp(tt, 10.9, .35); under.forEach(function (el) { show(el, clamp(u)); });
    var c = ramp(tt, 11.05, .4) * gone; show(cchip, c); css(cchip, 'transform', 'scale(' + (.6 + .4 * back(lin(tt, 11.05, .4))).toFixed(3) + ')');
  }

  // ---- the step list beside it ----
  var lastStep = -1;
  function stepper(tt) {
    // from RESET the sign-up card is coming back: that is step 01 again, not the finished step 05
    var back1 = tt >= RESET, idx = 0; if (!back1) while (idx + 1 < STEP_AT.length && STEP_AT[idx + 1] <= tt) idx++;
    var end = idx + 1 < STEP_AT.length ? STEP_AT[idx + 1] : RESET;
    if (idx !== lastStep) {
      lastStep = idx;
      steps.forEach(function (li, j) { cls(li, 'is-active', j === idx); cls(li, 'is-done', j < idx); li.querySelector('.wt-btn').setAttribute('aria-current', j === idx ? 'step' : 'false'); });
      details.forEach(function (d, j) { cls(d, 'is-on', j === idx); });
      var c = root.querySelector('.wt-count b'); if (c) c.textContent = '0' + (idx + 1);
      root.style.setProperty('--wt-p', String((idx + 1) / steps.length));
    }
    steps.forEach(function (li, j) { var b = li.querySelector('.wt-bar i'); css(b, '--p', j === idx && !back1 ? (isStatic ? '1' : clamp((tt - STEP_AT[idx]) / (end - STEP_AT[idx])).toFixed(3)) : '0'); });
  }

  function render(anim) { discrete(state(t), anim); motion(t); if (!isStatic) pointer(t); stepper(t); }

  // ---- fit the canvas into the frame; compact phone layout under 560px ----
  var lastW = 0;
  function layout() {
    var w = vp.clientWidth; if (!w || w === lastW) return; lastW = w;
    var cmp = w < 560; cls(dash, 'cmp', cmp);
    var s = w / (cmp ? 380 : 860); cv.style.setProperty('--s', s.toFixed(5));
    vp.style.height = ((cmp ? cv.offsetHeight : 600) * s).toFixed(2) + 'px';
    pos = {}; if (!isStatic) pointer(t);
  }

  // ---- play loop ----
  var raf = 0, last = null, inView = true, visible = !document.hidden;
  function frame(now) {
    if (last !== null) t = (t + Math.min(.1, (now - last) / 1000) * RATE) % CYCLE;
    last = now; render(true); raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && !frozen && inView && visible) { last = null; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  steps.forEach(function (li, j) {
    li.querySelector('.wt-btn').addEventListener('click', function () {
      t = STEP_AT[j] + (j ? .05 : 0);
      if (frozen) render(false);
    });
  });
  // the server markup is the finished state (for no JavaScript); from here the script owns every frame
  dash.classList.add('is-live'); root.classList.add('is-live');
  if (frozen) { dash.classList.add('no-tr'); }
  if (isStatic) { dash.classList.add('is-static'); root.classList.add('is-static'); }
  else dash.classList.add('no-tr');
  layout(); render(false);
  if (!frozen) requestAnimationFrame(function () { requestAnimationFrame(function () { dash.classList.remove('no-tr'); }); });
  if (window.ResizeObserver) new ResizeObserver(layout).observe(vp); else window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastW = 0; layout(); render(false); });
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; inView ? play() : stop(); }).observe(dash);
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; visible ? play() : stop(); });
  play();
})();
