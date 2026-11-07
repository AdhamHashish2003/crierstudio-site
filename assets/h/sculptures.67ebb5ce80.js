/* /sculptures/: catalog filters + lightbox. The cards are written into the HTML by build/build.mjs (the catalog reads without
   JavaScript); this only adds the filter chips and the lightbox. Lightbox images load when it opens:
   <data-img on #sc-grid><id>-<front|side|back|scene>.webp, with each view's width x height from the card's data-dims. */
(function () {
  var doc = document.documentElement;
  var rtl = doc.dir === 'rtl';
  var grid = document.getElementById('sc-grid');
  if (!grid) return;
  var cards = [].slice.call(grid.querySelectorAll('.sc-card'));
  if (!cards.length) return;
  var VIEWS = ['front', 'side', 'back', 'scene'];

  /* filters: collection (All / Origami / Animal forms) combined with category; an active category chip pressed again turns off */
  var filters = document.getElementById('sc-filters');
  var count = document.getElementById('sc-count');
  var empty = document.getElementById('sc-empty');
  var state = { col: 'all', cat: 'all' };
  var visible = cards.slice();

  function apply() {
    visible = cards.filter(function (c) {
      var ok = (state.col === 'all' || c.getAttribute('data-col') === state.col) &&
               (state.cat === 'all' || c.getAttribute('data-cat') === state.cat);
      c.hidden = !ok;
      return ok;
    });
    count.textContent = count.getAttribute('data-tpl').replace('{n}', visible.length);
    empty.hidden = visible.length > 0;
  }

  if (filters) {
    filters.hidden = false;
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('.sc-chip');
      if (!b) return;
      var group = b.getAttribute('data-group'), val = b.getAttribute('data-val');
      if (group === 'cat' && state.cat === val) val = 'all';
      state[group] = val;
      [].forEach.call(filters.querySelectorAll('.sc-chip[data-group="' + group + '"]'), function (c) {
        c.setAttribute('aria-pressed', String(c.getAttribute('data-val') === val));
      });
      apply();
    });
    apply();
  }

  /* lightbox */
  var lb = document.getElementById('sc-lb');
  var img = document.getElementById('sc-lb-img');
  var views = [].slice.call(lb.querySelectorAll('.sc-views button'));
  var f = {};
  ['name', 'col', 'cat', 'size', 'size-t', 'finish', 'material', 'desc', 'pos'].forEach(function (k) {
    f[k] = document.getElementById('sc-lb-' + k);
  });
  var cur = 0, view = 'front', opener = null;

  function show(i) {
    var n = visible.length;
    cur = (i + n) % n;
    var c = visible[cur], d = function (k) { return c.getAttribute('data-' + k) || ''; };
    f.name.textContent = c.querySelector('.sc-card-name').textContent;
    f.col.textContent = d('collabel');
    f.cat.textContent = d('catlabel');
    // a size only when the catalog gives one; otherwise the row is left out
    f.size.textContent = d('size');
    f.size.hidden = f['size-t'].hidden = !d('size');
    f.finish.textContent = d('finish');
    f.material.textContent = d('material');
    f.desc.textContent = d('desc');
    f.pos.textContent = (cur + 1) + ' / ' + n;
    setView(view);
  }

  function setView(v) {
    view = v;
    var c = visible[cur], label = '';
    views.forEach(function (b) {
      var on = b.getAttribute('data-view') === v;
      b.setAttribute('aria-pressed', String(on));
      if (on) label = b.textContent;
    });
    var dims = (c.getAttribute('data-dims') || '').split(' ')[VIEWS.indexOf(v)];
    if (dims) { var wh = dims.split('x'); img.width = +wh[0]; img.height = +wh[1]; }
    img.src = grid.getAttribute('data-img') + c.getAttribute('data-id') + '-' + v + '.webp';
    img.alt = f.name.textContent + lb.getAttribute('data-sep') + label;
  }

  function open(card) {
    opener = card.querySelector('.sc-card-btn');
    view = 'front';
    lb.hidden = false;
    doc.classList.add('sc-lb-open');
    show(visible.indexOf(card));
    document.getElementById('sc-lb-close').focus();
  }

  function close() {
    lb.hidden = true;
    doc.classList.remove('sc-lb-open');
    img.removeAttribute('src');
    if (opener) opener.focus();
  }

  cards.forEach(function (c) {
    c.querySelector('.sc-card-btn').addEventListener('click', function () { open(c); });
  });
  views.forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
  });
  document.getElementById('sc-lb-close').addEventListener('click', close);
  document.getElementById('sc-lb-prev').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('sc-lb-next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

  lb.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // arrow keys follow the reading direction (mirrored on the Arabic page)
      var fwd = (e.key === 'ArrowRight') !== rtl;
      show(cur + (fwd ? 1 : -1));
      return;
    }
    if (e.key !== 'Tab') return;
    var items = [].slice.call(lb.querySelectorAll('button, a[href]')).filter(function (el) {
      return el.offsetParent !== null;
    });
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
