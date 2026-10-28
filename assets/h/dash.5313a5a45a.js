(function () {
  var q = new URLSearchParams(location.search);
  var root = document.getElementById('walkthrough');
  var dash = document.getElementById('dash');
  var data = document.getElementById('dash-s');
  if (!root || !dash || !data) return;

  var S = JSON.parse(data.textContent);
  var ar = document.documentElement.lang === 'ar';
  var nf = new Intl.NumberFormat(ar ? 'ar-EG' : 'en');
  var RATE = 22 / 20, CYCLE = 22, STEP_AT = [0, 3.2, 6.9, 14, 18], STATIC_T = 19.4;
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
    var screen = 'overview';
    if (tt >= 3.2 && tt < 6.4) screen = 'brief';
    else if (tt >= 8.8 && tt < 9.9) screen = 'deliverables';
    else if (tt >= 9.9 && tt < 11.2) screen = 'calendar';
    else if (tt >= 11.2 && tt < 12.5) screen = 'library';
    else if (tt >= 14 && tt < 18) screen = 'review';
    else if (tt >= 18) screen = 'ready';
    return {
      screen: screen,
      modal: 1 - ramp(tt, 2.65, .55),
      later: tt >= 6.35 && tt < 7.25,
      delivered: tt >= 7.2 ? 9 : 0,
      awaiting: tt >= 14 && tt < 16.25 ? 1 : 0,
      approved: tt >= 16.25 ? 9 : 0,
      approvedReview: tt >= 16.25,
      briefDone: tt >= 5.9,
      copyDone: tt >= 19.25,
      company: S.brand.slice(0, Math.round(S.brand.length * lin(tt, .35, 1))),
      site: S.site.slice(0, Math.round(S.site.length * lin(tt, 1.3, 1.25)))
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
        var current = activeView === 'brief' ? 'overview' : activeView;
        cls(item, 'on', target === current);
      });
    }
    var modal = one('[data-k=modal]');
    css(modal, 'opacity', s.modal.toFixed(3));
    css(modal, 'visibility', s.modal > .01 ? 'visible' : 'hidden');
    css(modal, 'pointer-events', s.modal > .01 ? 'auto' : 'none');
    css(one('.d-mbox'), 'transform', 'translateY(' + ((1 - s.modal) * 12).toFixed(1) + 'px) scale(' + (.97 + .03 * s.modal).toFixed(3) + ')');
    cls(one('[data-c=company]'), 'on', tt >= .35 && tt < 1.35);
    cls(one('[data-c=site]'), 'on', tt >= 1.3 && tt < 2.55);
    txt(one('[data-k=type]'), s.company);
    txt(one('[data-k=typedSite]'), s.site);
    briefRows.forEach(function (row, i) {
      cls(row, 'is-filled', tt >= [3.55, 4.15, 4.75, 5.35][i]);
    });
    cls(one('[data-k=briefSubmitted]'), 'is-on', s.briefDone);
    cls(one('.d-time-later'), 'is-on', s.later);
    number('delivered', s.delivered);
    number('await', s.awaiting);
    number('approved', s.approved);
    txt(one('[data-k=reviewStatus]'), s.approvedReview ? S.approvedStatus : S.pendingStatus);
    txt(one('[data-b=approve]'), s.approvedReview ? S.approvedStatus : S.approve);
    txt(one('[data-k=copyLabel]'), s.copyDone ? S.copied : S.copyCap);
    cls(one('[data-b=copy]'), 'done', s.copyDone);
    cls(one('[data-b=dl]'), 'done', s.copyDone);
    stepper(tt);
    if (!isStatic) pointer(tt);
  }

  var MOVES = [
    [.25, '[data-c=company]'], [1.35, '[data-c=site]'], [2.2, '[data-b=create]'],
    [3.6, '[data-brief=industry]'], [4.35, '[data-brief=audience]'], [5.55, '[data-b=submit-brief]'],
    [7.55, '[data-nav=overview]'], [8.95, '[data-nav=deliverables]'], [10.05, '[data-nav=calendar]'],
    [11.45, '[data-nav=library]'], [14.45, '[data-b=approve]'], [16.3, '[data-b=approve]'],
    [18.45, '[data-b=copy]'], [19.65, '[data-b=dl]'], [20.8, 'rest']
  ];
  var CLICKS = [
    [2.55, '[data-b=create]'], [5.95, '[data-b=submit-brief]'], [8.55, '[data-nav=overview]'],
    [9.75, '[data-nav=deliverables]'], [10.95, '[data-nav=calendar]'], [12.15, '[data-nav=library]'],
    [14.6, '[data-b=approve]'], [16.35, '[data-b=approve]'], [19.25, '[data-b=copy]'], [20.0, '[data-b=dl]']
  ];
  var positions = {};
  function at(selector) {
    if (positions[selector]) return positions[selector];
    var el = selector === 'rest' ? one('.d-stage') : one(selector);
    if (!el) return [20, 20];
    var x = 0, y = 0, node = el;
    while (node && node !== cv) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    var post = /d-post/.test(selector);
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
    if (last !== null) t = (t + Math.min(.1, (now - last) / 1000) * RATE) % CYCLE;
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