/* Crier Studio: language memory, old-URL redirects and the request form. All visible text is already in the HTML. */
(function () {
  "use strict";
  var KEY = "crier.lang", CODES = ["en", "es", "fr", "ar"];
  var de = document.documentElement, page = document.body.getAttribute("data-page");
  function saved() { try { var s = localStorage.getItem(KEY); return CODES.indexOf(s) > -1 ? s : null; } catch (e) { return null; } }
  function pathFor(lang, p) { return "/" + (lang === "en" ? "" : lang + "/") + (p === "index" ? "" : p + "/"); }

  // old URLs: /?lang=xx and /terms.html?lang=xx
  var q = null;
  try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
  if (CODES.indexOf(q) < 0) q = null;
  if (page === "redirect") {
    // renamed pages (/snapshot/ -> /kit/, /crier-deck/ -> /brand-deck/) carry their own language and keep ?product=
    var own = document.body.getAttribute("data-lang");
    var keep = "";
    try { var pr = new URLSearchParams(location.search).get("product"); if (pr) keep = "?product=" + encodeURIComponent(pr); } catch (e) {}
    location.replace(pathFor(own || q || saved() || "en", document.body.getAttribute("data-target")) + (own ? keep : "") + location.hash);
    return;
  }
  if (page === "index" && location.pathname === "/") {
    var want = q || (location.search ? null : saved());
    if (want && want !== de.lang) { location.replace(pathFor(want, "index") + location.hash); return; }
  }

  // the language links remember the choice; crawlers have no storage and are never redirected
  var links = document.querySelectorAll(".langpick a");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function () { try { localStorage.setItem(KEY, this.getAttribute("lang")); } catch (e) {} });
  }

  // P1: pricing page cards: pick platforms, the live price follows (numbers from data/pricing.json, written into the card)
  var picks = document.querySelectorAll(".platpick");
  for (var pi = 0; pi < picks.length; pi++) (function (fs) {
    var card = fs.closest(".plan"), buy = card && card.querySelector(".buyrow a"), boxes = fs.querySelectorAll('input[type="checkbox"]'), out = fs.querySelector(".liveprice");
    function names() { var o = [], v = []; for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) { o.push(boxes[i].parentNode.textContent.trim()); v.push(boxes[i].value); } return { o: o, v: v }; }
    function update() {
      var n = names(); if (!n.v.length) { boxes[0].checked = true; n = names(); }
      var price = +fs.dataset.price + Math.max(0, n.v.length - (+fs.dataset.included || 1)) * +fs.dataset.extra;
      out.textContent = fs.dataset.tpl.replace("{name}", fs.dataset.name).replace("{platforms}", n.o.join(" + ")).replace("{price}", "$" + price).replace("{per}", fs.dataset.per);
      if (buy) { try { var u = new URL(buy.getAttribute("href"), location.href); if (u.origin === location.origin) { u.searchParams.set("platforms", n.v.join(",")); buy.setAttribute("href", u.pathname + u.search + u.hash); } } catch (e) {} }
    }
    for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener("change", update);
    update();
  })(picks[pi]);

  /* ---------------- request form (The Complete Kit, monthly plans, Brand Deck) ---------------- */
  var form = document.getElementById("snap-form");
  if (!form) return;
  var M = {};
  try { M = JSON.parse(document.getElementById("form-msgs").textContent); } catch (e) {}
  function $(id) { return document.getElementById(id); }
  var status = $("snap-status"), btn = $("snap-submit"), endpoint = form.getAttribute("data-endpoint");
  var radios = form.querySelectorAll('input[name="product"]');
  function product() { for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value; return "kit"; }
  function isDeck() { return product() === "deck"; }
  function isPlan() { var p = product(); return p === "visible" || p === "growing"; }
  // the intake API accepts product "snapshot" and "crier_deck" only: the kit and the monthly plans go in as "snapshot" with the
  // package name added to the business name (the free-text field); the Brand Deck goes in as "crier_deck" with the same tag.
  var TAGS = { kit: "The Complete Kit", visible: "Stay Visible plan", growing: "Keep Growing plan", deck: "Brand Deck" };
  function apiProduct() { return isDeck() ? "crier_deck" : "snapshot"; }
  function sync() {
    var deck = isDeck();
    $("deck-address").hidden = !deck; $("deck-lang").hidden = !deck;
    $("f-address").required = deck;
    btn.textContent = btn.getAttribute(deck ? "data-deck" : (isPlan() ? "data-plan" : "data-kit"));
    status.hidden = true;
  }
  // /kit/?product=visible (the Buy buttons) opens the form with that product selected; old product ids map to the new packages
  var want = null;
  try { want = new URLSearchParams(location.search).get("product"); } catch (e) {}
  var OLD = { snapshot: "kit", starter: "visible", growth: "growing", pro: "growing", deck_print: "deck", crier_deck: "deck" };
  if (want && OLD[want]) want = OLD[want];
  if (want) { for (var r = 0; r < radios.length; r++) if (radios[r].value === want) { for (var q2 = 0; q2 < radios.length; q2++) radios[q2].checked = radios[q2].value === want; break; } }
  // ?platforms=instagram,tiktok (from a pricing card) ticks those platforms in the form
  var wantPl = null; try { wantPl = new URLSearchParams(location.search).get("platforms"); } catch (e) {}
  if (wantPl) { var wl = wantPl.split(","), pcs = form.querySelectorAll('input[name="platform"]'); for (var w = 0; w < pcs.length; w++) pcs[w].checked = wl.indexOf(pcs[w].value) > -1; }
  for (var r2 = 0; r2 < radios.length; r2++) radios[r2].addEventListener("change", sync);
  sync();
  var FIELDS = [
    ["f-business", function (v) { return v ? "" : "v.business"; }],
    ["f-web", function (v) { return v ? "" : "v.web"; }],
    ["f-email", function (v) { return !v ? "v.emailEmpty" : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "v.emailBad"); }],
    ["f-city", function (v) { return v ? "" : "v.city"; }],
    ["f-industry", function (v) { return v ? "" : "v.industry"; }],
    ["f-address", function (v) { return !isDeck() || v ? "" : "v.address"; }]
  ];
  function say(key, bad) { status.textContent = M[key] || key; status.hidden = false; status.style.borderColor = bad ? "var(--error)" : "var(--ink)"; }
  function setErr(id, key) { var e = $("e-" + id.replace(/^f-/, "")); e.textContent = key ? (M[key] || key) : ""; e.hidden = !key; }
  // the payload is what the live intake API accepts: business, web, email, city, industry, consent, company_website,
  // plus product and lang, and for crier_deck also address and deck_lang. Every package adds its name to business.
  window.__snapPayload = function () {
    var p = {
      business: $("f-business").value.trim() + (TAGS[product()] ? " [" + TAGS[product()] + "]" : ""), web: $("f-web").value.trim(),
      email: $("f-email").value.trim(), city: $("f-city").value.trim(),
      industry: $("f-industry").value, consent: true,
      company_website: $("f-company").value,
      product: apiProduct(), lang: de.lang
    };
    if (isDeck()) { p.address = $("f-address").value.trim(); p.deck_lang = $("f-decklang").value; }
    return p;
  };
  // L1 checkout (checkout.json on): the paid packages go to Stripe Checkout with the platforms picked and the live total
  // (the Launchpad's quote from the one price list); the Brand Deck keeps the request form. Paid is decided by Stripe only.
  var checkout = form.getAttribute("data-checkout"), plats = $("plats"), live = $("live-price");
  function picked() { var o = [], c = form.querySelectorAll('input[name="platform"]'); for (var i = 0; i < c.length; i++) if (c[i].checked) o.push(c[i].value); return o; }
  function quote() {
    if (!checkout || isDeck()) { if (plats) plats.hidden = true; return; }
    plats.hidden = false; btn.textContent = M["f.pay"] || btn.textContent;
    if (!picked().length) { live.hidden = true; return; }
    fetch(checkout + "/quote?package=" + encodeURIComponent(product()) + "&platforms=" + encodeURIComponent(picked().join(",")))
      .then(function (r) { return r.json(); })
      .then(function (q) { if (!q || !q.ok) { live.hidden = true; return; } live.textContent = (M[q.billing === "monthly" ? "f.totalMonthly" : "f.total"] || "{amount}").replace("{amount}", "$" + q.amount_usd); live.hidden = false; })
      .catch(function () { live.hidden = true; });
  }
  if (checkout) {
    var pc = form.querySelectorAll('input[name="platform"]');
    for (var k = 0; k < pc.length; k++) pc[k].addEventListener("change", quote);
    for (var k2 = 0; k2 < radios.length; k2++) radios[k2].addEventListener("change", quote);
    quote();
  }
  function payNow() {
    var ctl2 = ("AbortController" in window) ? new AbortController() : null, t2 = setTimeout(function () { if (ctl2) ctl2.abort(); }, 20000);
    var body = { package: product(), platforms: picked(), language: de.lang, business: $("f-business").value.trim(), email: $("f-email").value.trim(),
      website_or_handle: $("f-web").value.trim(), city: $("f-city").value.trim(), industry: $("f-industry").value, consent: true };
    btn.disabled = true; say("f.toStripe", false);
    return fetch(checkout, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl2 ? ctl2.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.url) { location.href = res.body.url; return true; }
        if (res.status === 429) { say("f.tooMany", true); return true; }
        return false;                              // not configured or refused: the request form still works
      })
      .catch(function () { return false; })
      .then(function (done) { clearTimeout(t2); if (!done) btn.disabled = false; return done; });
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (checkout && !isDeck() && !picked().length) { setErr("f-platforms", "f.platformsErr"); return; }
    var firstBad = null;
    FIELDS.forEach(function (f) {
      var el = $(f[0]), key = f[1](el.value.trim());
      el.setAttribute("aria-invalid", key ? "true" : "false");
      setErr(f[0], key);
      if (key && !firstBad) firstBad = el;
    });
    var cb = $("f-consent");
    setErr("f-consent", cb.checked ? "" : "f.consentErr");
    cb.setAttribute("aria-invalid", cb.checked ? "false" : "true");
    if (!cb.checked && !firstBad) firstBad = cb;
    if (firstBad) { status.hidden = true; firstBad.focus(); return; }
    // Pay first; if checkout is not open yet (not configured, refused) the same click sends the request form instead
    if (checkout && !isDeck() && !form.__noPay) { payNow().then(function (done) { if (!done) { form.__noPay = true; if (form.requestSubmit) form.requestSubmit(); } }); return; }
    form.__noPay = false;
    var data = window.__snapPayload(), deck = isDeck();
    btn.disabled = true; say("f.sending", false);
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.ok === true) { say(deck ? "f.thanksDeck" : "f.thanks", false); form.reset(); sync(); say(deck ? "f.thanksDeck" : "f.thanks", false); }
        else if (res.status === 429) { say("f.tooMany", true); }
        else { say("f.failed", true); }
      })
      .catch(function () { say("f.failed", true); })
      .then(function () { clearTimeout(timer); btn.disabled = false; });
  });
})();

/* ---------------- home hero: The Deck (3D), a progressive layer ---------------- */
(function () {
  "use strict";
  if (document.body.getAttribute("data-page") !== "index" || !document.getElementById("hero")) return;
  var nav = navigator, conn = nav.connection || {};
  // keep the static CSS deck: reduced motion, data saver, small devices
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (conn.saveData || (nav.hardwareConcurrency && nav.hardwareConcurrency < 4)) return;
  var started = false, evs = ["pointerdown", "pointermove", "scroll", "keydown", "touchstart"];
  function load() {
    if (started) return; started = true;
    for (var i = 0; i < evs.length; i++) removeEventListener(evs[i], load);
    var s = document.createElement("script"); s.src = "/assets/deck.js"; s.async = true; document.head.appendChild(s);
  }
  // after load, once the page is idle: first interaction, or 4 s later at the latest (keeps the 3D out of the first-paint / load window)
  function arm() {
    for (var i = 0; i < evs.length; i++) addEventListener(evs[i], load, { passive: true, once: true });
    setTimeout(function () { if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 1500 }); else load(); }, 4000);
  }
  if (document.readyState === "complete") arm(); else addEventListener("load", arm);
})();
