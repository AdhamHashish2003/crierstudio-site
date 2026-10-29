(function () {
  var q = new URLSearchParams(location.search);
  var root = document.getElementById('walkthrough');
  var dash = document.getElementById('dash');
  var data = document.getElementById('dash-s');
  if (!root || !dash || !data) return;

  var S = JSON.parse(data.textContent);
  var ar = document.documentElement.lang === 'ar';
  var nf = new Intl.NumberFormat(ar ? 'ar-EG' : 'en');
  var RATE = 2, CYCLE = 45, STEP_AT = [0, 8, 12, 28, 37], STATIC_T = 39;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isStatic = q.get('static') === '1' || reduced;
  var tq = parseFloat(q.get('t'));
  var frozen = isStatic || !isNaN(tq);
  var t = isStatic ? STATIC_T : (!isNaN(tq) ? (((tq * RATE) % CYCLE) + CYCLE) % CYCLE : 0);

  var one = function (s) { return dash.querySelector(s); };
  var all = function (s) { return [].slice.call(dash.querySelectorAll(s)); };
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var ramp = function (tt, a, d) { return easeOut(clamp((tt - a) / d)); };
  var lin = function (tt, a, d) { return clamp((tt - a) / d); };
  var cv = one('.d-cv'), vp = one('.d-vp'), cursor = one('.d-cursor');
  var views = all('.d-view'), navItems = all('[data-nav]');
  var briefRows = all('.d-brief-row');
  var steps = [].slice.call(root.querySelectorAll('.wt-step'));
  var details = [].slice.call(root.querySelectorAll('.wt-d'));
  var lastStep = -1, activeView = '', lastWidth = 0;

  function css(el, prop, value) {
    var key = '_' + prop;
    if (el && el[key] !== value) { el[key] = value; el.style.setProperty(prop, value); }
  }
  function cls(el, name, on) {
    if (el && el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on);
  }
  function txt(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }
  function number(key, value) {
    all('[data-k=' + key + ']').forEach(function (el) { txt(el, nf.format(value)); });
  }
  function state(tt) {
    var screen = 'empty';
    if (tt >= 8 && tt < 12) screen = 'brief';
    else if (tt >= 12 && tt < 16) screen = 'waiting';
    else if (tt >= 16 && tt < 20) screen = 'overview';
    else if (tt >= 20 && tt < 24) screen = 'calendar';
    else if (tt >= 24 && tt < 28) screen = 'library';
    else if (tt >= 28 && tt < 37) screen = 'review';
    else if (tt >= 37 && tt < 41) screen = 'ready';
    else if (tt >= 41) screen = 'instagram';
    var sent = tt >= 30.4;
    var approved = tt >= 33;
    return {
      screen: screen,
      modal: 1 - ramp(tt, 3.5, .5),
      delivered: tt >= 16 ? 8 : 0,
      awaiting: approved ? 7 : (tt >= 16 ? 8 : 0),
      approved: approved ? 1 : 0,
      readyCount: approved ? 1 : 0,
      approvedReview: approved,
      briefDone: tt >= 11.45,
      changeSent: sent,
      changeTyped: S.changeText.slice(0, Math.round(S.changeText.length * lin(tt, 29, 1.05))),
      copyDone: tt >= 39.2,
      company: S.brand.slice(0, Math.round(S.brand.length * lin(tt, .25, 1))),
      site: S.site.slice(0, Math.round(S.site.length * lin(tt, 1.35, 1.1)))
    };
  }
  function stepper(tt) {
    var idx = 0;
    while (idx + 1 < STEP_AT.length && STEP_AT[idx + 1] <= tt) idx++;
    if (idx !== lastStep) {
      lastStep = idx;
      steps.forEach(function (li, j) {
        cls(li, 'is-active', j === idx);
        cls(li, 'is-done', j < idx);
        li.querySelector('.wt-btn').setAttribute('aria-current', j === idx ? 'step' : 'false');
      });
      details.forEach(function (detail, j) { cls(detail, 'is-on', j === idx); });
      var count = root.querySelector('.wt-count b');
      if (count) count.textContent = '0' + (idx + 1);
      root.style.setProperty('--wt-p', String((idx + 1) / steps.length));
    }
    steps.forEach(function (li, j) {
      var bar = li.querySelector('.wt-bar i');
      var end = j + 1 < STEP_AT.length ? STEP_AT[j + 1] : CYCLE;
      css(bar, '--p', j === idx ? (isStatic ? '1' : clamp((tt - STEP_AT[idx]) / (end - STEP_AT[idx])).toFixed(3)) : '0');
    });
  }
  function paint(tt) {
    var s = state(tt);
    if (s.screen !== activeView) {
      activeView = s.screen;
      views.forEach(function (view) { cls(view, 'is-on', view.getAttribute('data-screen') === activeView); });
      navItems.forEach(function (item) {
        var target = item.getAttribute('data-nav');
        var current = activeView === 'brief' || activeView === 'empty' || activeView === 'waiting' ? 'overview' : activeView;
        cls(item, 'on', target === current);
      });
    }
    var modal = one('[data-k=modal]');
    css(modal, 'opacity', s.modal.toFixed(3));
    css(modal, 'visibility', s.modal > .01 ? 'visible' : 'hidden');
    css(modal, 'pointer-events', s.modal > .01 ? 'auto' : 'none');
    css(one('.d-mbox'), 'transform', 'translateY(' + ((1 - s.modal) * 12).toFixed(1) + 'px) scale(' + (.97 + .03 * s.modal).toFixed(3) + ')');
    cls(one('[data-c=company]'), 'on', tt >= .25 && tt < 1.35);
    cls(one('[data-c=site]'), 'on', tt >= 1.35 && tt < 2.55);
    txt(one('[data-k=type]'), s.company);
    txt(one('[data-k=typedSite]'), s.site);
    briefRows.forEach(function (row, i) {
      cls(row, 'is-filled', tt >= [8.45, 9.1, 9.75, 10.4][i]);
    });
    cls(one('[data-k=briefSubmitted]'), 'is-on', s.briefDone);
    cls(one('.d-change-box'), 'is-on', tt >= 28.5 && tt < 32.9);
    cls(one('.d-change-text'), 'on', tt >= 29 && tt < 30.2);
    txt(one('[data-k=changeTyped]'), s.changeTyped);
    cls(one('.d-change-sent'), 'is-on', s.changeSent);
    cls(one('[data-b=sendChange]'), 'done', s.changeSent);
    number('delivered', s.delivered);
    number('await', s.awaiting);
    number('approved', s.approved);
    number('readyCount', s.readyCount);
    txt(one('[data-k=reviewStatus]'), s.approvedReview ? S.approvedStatus : (s.changeSent ? S.changeStatus : S.pendingStatus));
    txt(one('[data-b=approve]'), s.approvedReview ? S.approvedStatus : S.approve);
    txt(one('[data-k=copyLabel]'), s.copyDone ? S.copied : S.copyCap);
    cls(one('[data-b=copy]'), 'done', s.copyDone);
    cls(one('[data-b=dl]'), 'done', s.copyDone);
    stepper(tt);
    if (!isStatic) pointer(tt);
  }

  var MOVES = [
    [.25, '[data-c=company]'], [1.4, '[data-c=site]'], [2.75, '[data-b=create]'],
    [4.3, '[data-b=answer]'], [8.4, '[data-brief=industry]'], [9.2, '[data-brief=audience]'],
    [10, '[data-brief=channels]'], [10.55, '[data-brief=language]'], [11.15, '[data-b=submit-brief]'],
    [13, '.d-clock'], [16.35, '[data-nav=overview]'], [20.2, '[data-nav=calendar]'],
    [24.2, '[data-nav=library]'], [28.35, '[data-b=changes]'], [30.1, '[data-b=sendChange]'],
    [33.15, '[data-b=approve]'], [38.25, '[data-b=copy]'], [41.2, 'rest']
  ];
  var CLICKS = [
    [2.95, '[data-b=create]'], [7.6, '[data-b=answer]'], [11.45, '[data-b=submit-brief]'],
    [20.4, '[data-nav=calendar]'], [24.4, '[data-nav=library]'], [28.55, '[data-b=changes]'],
    [30.25, '[data-b=sendChange]'], [33.35, '[data-b=approve]'], [38.5, '[data-b=copy]']
  ];
  var positions = {};
  function at(selector) {
    if (positions[selector]) return positions[selector];
    var el = selector === 'rest' ? one('.d-stage') : one(selector);
    if (!el) return [20, 20];
    var x = 0, y = 0, node = el;
    while (node && node !== cv) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    var post = /d-post|d-clock/.test(selector);
    return positions[selector] = selector === 'rest'
      ? [x + el.offsetWidth * .7, y + el.offsetHeight * .6]
      : [x + el.offsetWidth * (post ? .5 : .56), y + el.offsetHeight * (post ? .45 : .6)];
  }
  function pointer(tt) {
    var i = 0;
    while (i + 1 < MOVES.length && MOVES[i + 1][0] <= tt) i++;
    var from = at(MOVES[i ? i - 1 : MOVES.length - 1][1]), to = at(MOVES[i][1]);
    var k = easeInOut(lin(tt, MOVES[i][0], .55));
    var x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k;
    var scale = 1, ring = 0, opacity = 0;
    CLICKS.forEach(function (click) {
      var delta = tt - click[0];
      if (delta >= 0 && delta < .42) {
        ring = .45 + 1.1 * delta / .42;
        opacity = 1 - delta / .42;
        scale = 1 - .13 * Math.sin(Math.PI * clamp(delta / .2));
      }
      if (click[1]) cls(one(click[1]), 'press', delta >= 0 && delta < .18);
    });
    css(cursor, 'transform', 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')');
    css(cursor, '--ck-s', ring.toFixed(3));
    css(cursor, '--ck-o', opacity.toFixed(3));
    css(cursor, 'opacity', '1');
  }
  function render() { paint(t); }
  var raf = 0, last = null, inView = true, visible = !document.hidden;
  function frame(now) {
    if (last !== null) t = (t + Math.min(.1, (now - last) / 1000) * RATE * (t >= 12.2 && t < 16.2 ? 2 : 1)) % CYCLE;
    last = now;
    render();
    raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && !frozen && inView && visible) { last = null; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function layout() {
    var width = vp.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    var compact = width < 560;
    cls(dash, 'cmp', compact);
    var scale = width / (compact ? 380 : 860);
    cv.style.setProperty('--s', scale.toFixed(5));
    vp.style.height = ((compact ? cv.offsetHeight : 600) * scale).toFixed(2) + 'px';
    positions = {};
    if (!isStatic) pointer(t);
  }
  steps.forEach(function (li, index) {
    li.querySelector('.wt-btn').addEventListener('click', function () {
      t = STEP_AT[index] + (index ? .05 : 0);
      render();
      if (!frozen) { last = null; play(); }
    });
  });
  dash.classList.add('is-live', 'no-tr');
  root.classList.add('is-live');
  if (isStatic) { dash.classList.add('is-static'); root.classList.add('is-static'); }
  layout();
  render();
  if (!frozen) requestAnimationFrame(function () { requestAnimationFrame(function () { dash.classList.remove('no-tr'); }); });
  if (window.ResizeObserver) new ResizeObserver(layout).observe(vp);
  else window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastWidth = 0; layout(); render(); });
  if (window.IntersectionObserver) new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; inView ? play() : stop(); }).observe(dash);
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; visible ? play() : stop(); });
  play();
})();