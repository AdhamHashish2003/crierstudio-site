/* Crier Studio: language memory, old-URL redirects and the request form. All visible text is already in the HTML. */
(function () {
  "use strict";
  var KEY = "crier.lang", CODES = ["en", "ar"];
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
    // Keep the selected package/platforms when switching language in the checkout flow.
    try { var languageURL = new URL(links[i].href); var currentQuery = new URLSearchParams(location.search); currentQuery.delete("lang"); languageURL.search = currentQuery.toString(); languageURL.hash = location.hash; links[i].href = languageURL.href; } catch (e) {}
    links[i].addEventListener("click", function () { try { localStorage.setItem(KEY, this.getAttribute("lang")); } catch (e) {} });
  }

  // Launch pricing (Adham, 2026-10-15): buyers in Saudi Arabia, the UAE and Egypt pay in SAR / AED / EGP with VAT ADDED
  // (15 / 5 / 14 %); every other country pays the US-dollar price with no VAT. The HTML shows US dollars (the international
  // price); every price also carries its local NET price before VAT (data-sar, data-aed, data-egp, from data/pricing.json).
  // The country: the visitor's own pick in a "Your country" dropdown (saved), else Cloudflare's /cdn-cgi/trace, else the time
  // zone or the browser's language region; unknown = Saudi Arabia (CD.def, the country the HTML is written in; MENA landing,
  // 2026-10-16). Never taken from the page language: an Arabic page read in Kuwait, Qatar or Bahrain stays in US dollars.
  // Picking "Another country" always means US dollars. The legal pages keep the US-dollar price list.
  var CC_KEY = "crier.cc", CD = null, cc = null, ccPicked = null, ccSeen = null, cur = "USD", curHooks = [];
  try { CD = JSON.parse(document.getElementById("cur-data").textContent); } catch (e) {}
  var CC = CD ? CD.countries : {};
  function isLocal(c) { return typeof c === "string" && Object.prototype.hasOwnProperty.call(CC, c); }
  function curOf(c) { return isLocal(c) ? CC[c].currency : "USD"; }
  try { ccPicked = localStorage.getItem(CC_KEY); if (!(isLocal(ccPicked) || ccPicked === "other")) ccPicked = null; } catch (e) {}
  function guessCountry() {
    var TZ = { "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Africa/Cairo": "EG", "Asia/Kuwait": "KW", "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Muscat": "OM" };
    try { var z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ[z]) return TZ[z]; } catch (e) {}
    var ls = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < ls.length; i++) { var m = /-([a-z]{2})(?:-|$)/i.exec(ls[i] || ""); if (m) return m[1].toUpperCase(); }
    return null;
  }
  // the country an order is sent with: SA / AE / EG, or the detected ISO code of any other country (US dollars), ZZ if unknown
  function countryCode() { return cc && /^[A-Z]{2}$/.test(cc) ? cc : "ZZ"; }
  function fmtNum(n) {
    var sep = ",", dec = ".";
    var m = Math.round(n * 100), f = m % 100, i = String((m - f) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return f ? i + dec + (f < 10 ? "0" : "") + f : i;
  }
  function money(c, n) {
    if (c === "USD") return "$" + fmtNum(n);
    return CD.fmt.replace("{n}", function () { return fmtNum(n); }).replace("{cur}", function () { return CD["sym" + c]; });
  }
  // the same arithmetic as the checkout server: net = base + extra platforms, VAT on the whole order, in integer cents, half-up
  function localQuote(pkg, c, extra) {
    var P = CD && CD.pk && CD.pk[pkg]; if (!P) return null;
    var L = isLocal(c) ? CC[c] : null, k = L ? L.currency : "USD", pr = P[k], pct = L ? +L.vat_pct || 0 : 0;
    if (!pr) return null;
    var netMinor = Math.round(pr[0] * 100) + (extra || 0) * Math.round(pr[1] * 100), vatMinor = Math.floor((netMinor * pct + 50) / 100);
    return { currency: k, vat_pct: pct, net: netMinor / 100, vat: vatMinor / 100, total: (netMinor + vatMinor) / 100 };
  }
  // "SAR 109 + VAT 15% SAR 16.35 = SAR 125.35"; no VAT (US dollars) -> "$29"
  function display(q) {
    if (!q.vat_pct) return money(q.currency, q.total);
    var r = { net: money(q.currency, q.net), pct: String(q.vat_pct), vat: money(q.currency, q.vat), total: money(q.currency, q.total) };
    return CD.vatLine.replace(/\{(net|pct|vat|total)\}/g, function (m, k) { return r[k]; });
  }
  // the VAT line under a card: "price + VAT = total" in the buyer's currency; hidden in US dollars (no VAT)
  function vatNote(el, pkg, extra, per) {
    var q = cur === "USD" ? null : localQuote(pkg, cc, extra);
    el.hidden = !q; el.textContent = q ? display(q) + (per || "") : "";
  }
  function setCountry(c) {
    cc = c || null; cur = curOf(cc); if (!CD) return;
    var ps = document.querySelectorAll(".amt[data-usd]");
    for (var i = 0; i < ps.length; i++) {
      var v = ps[i].getAttribute(cur === "USD" ? "data-usd" : "data-" + cur.toLowerCase()); if (v == null) continue;
      // a card's big price is followed by its VAT line; a price inside a sentence says "+ VAT" itself
      var big = /(^|\s)price(\s|$)/.test(ps[i].className);
      ps[i].textContent = money(cur, +v) + (cur !== "USD" && !big ? " " + CD.plusVat : "");
      ps[i].dir = cur !== "USD" && de.dir === "rtl" ? "rtl" : "ltr";
    }
    var us = document.querySelectorAll(".usdnote[data-pkg]");
    for (var j = 0; j < us.length; j++) { var cd = us[j].closest(".plan"); if (!(cd && cd.querySelector(".platpick"))) vatNote(us[j], us[j].getAttribute("data-pkg"), 0, us[j].getAttribute("data-per") || ""); }
    var note = document.getElementById("vat-note"); if (note) note.textContent = (CD["note" + cur] || "").replace("{vat}", isLocal(cc) ? CC[cc].vat_pct : "");
    var sels = document.querySelectorAll("select[data-cc]");
    for (var s = 0; s < sels.length; s++) sels[s].value = isLocal(cc) ? cc : "other";
    for (var k = 0; k < curHooks.length; k++) curHooks[k]();
  }
  // "Other" keeps the detected country code when it is not one of the three (Kuwait stays KW, US dollars)
  function fromPick(p) { return p === "other" ? (ccSeen && !isLocal(ccSeen) ? ccSeen : null) : p; }
  if (CD && !/^(terms|privacy|refund)$/.test(page) && document.querySelector(".amt[data-usd]")) {
    var box = document.getElementById("curbox"); if (box) box.hidden = false;
    var ccSels = document.querySelectorAll("select[data-cc]");
    for (var cs = 0; cs < ccSels.length; cs++) ccSels[cs].addEventListener("change", function () { ccPicked = this.value; try { localStorage.setItem(CC_KEY, ccPicked); } catch (e) {} setCountry(fromPick(ccPicked)); });
    ccSeen = guessCountry();
    setCountry(ccPicked ? fromPick(ccPicked) : (ccSeen || (isLocal(CD.def) ? CD.def : null)));
    // the country from Cloudflare (it serves crierstudio.com) wins over the guess, unless the visitor picked their country
    if (window.fetch) fetch("/cdn-cgi/trace").then(function (r) { return r.ok ? r.text() : ""; }).then(function (tx) {
      var m = /(?:^|\n)loc=([A-Z]{2})(?:\n|$)/.exec(tx || ""); if (!m || m[1] === "XX" || m[1] === "T1") return;
      ccSeen = m[1];
      if (!ccPicked) { if (ccSeen !== cc) setCountry(ccSeen); }
      else if (ccPicked === "other" && !isLocal(ccSeen) && cc !== ccSeen) setCountry(ccSeen);
    }).catch(function () {});
  }

  // P1: pricing page cards: pick platforms, the live price and the VAT line follow (numbers from data/pricing.json, in the card)
  var picks = document.querySelectorAll(".platpick");
  for (var pi = 0; pi < picks.length; pi++) (function (fs) {
    var card = fs.closest(".plan"), buy = card && card.querySelector(".buyrow a"), boxes = fs.querySelectorAll('input[type="checkbox"]'), out = fs.querySelector(".liveprice");
    var vn = card && card.querySelector(".usdnote[data-pkg]");
    var local = {}; try { local = JSON.parse(fs.dataset.local || "{}"); } catch (e) {}
    function names() { var o = [], v = []; for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) { o.push(boxes[i].parentNode.textContent.trim()); v.push(boxes[i].value); } return { o: o, v: v }; }
    function update() {
      var n = names(); if (!n.v.length) { boxes[0].checked = true; n = names(); }
      var extras = Math.max(0, n.v.length - (+fs.dataset.included || 1)), lp = cur !== "USD" && local[cur];
      var price = lp ? lp[0] + extras * lp[1] : +fs.dataset.price + extras * +fs.dataset.extra;
      var shown = money(lp ? cur : "USD", price) + (lp && CD ? " " + CD.plusVat : "");
      out.textContent = fs.dataset.tpl.replace("{name}", function () { return fs.dataset.name; }).replace("{platforms}", function () { return n.o.join(" + "); }).replace("{price}", function () { return shown; }).replace("{per}", function () { return fs.dataset.per; });
      if (vn) vatNote(vn, fs.dataset.pkg, extras, fs.dataset.per);
      if (buy) { try { var u = new URL(buy.getAttribute("href"), location.href); if (u.origin === location.origin) { u.searchParams.set("platforms", n.v.join(",")); buy.setAttribute("href", u.pathname + u.search + u.hash); } } catch (e) {} }
    }
    for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener("change", update);
    curHooks.push(update);
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
  // Low 15: The Complete Kit is made for exactly ONE platform (no extra-platform price), so for the kit the platform choices are
  // radio buttons; the monthly plans use checkboxes (the first platform included, each extra one charged).
  var platLegend = $("plats-legend");
  function platKind() {
    var kit = product() === "kit", c = form.querySelectorAll('input[name="platform"]'), seen = false;
    for (var i = 0; i < c.length; i++) {
      var want = kit ? "radio" : "checkbox"; if (c[i].type !== want) c[i].type = want;
      if (kit && c[i].checked) { if (seen) c[i].checked = false; seen = true; }
    }
    if (kit && !seen && c.length) c[0].checked = true;
    if (platLegend && M[kit ? "f.platformKit" : "f.platforms"]) platLegend.textContent = M[kit ? "f.platformKit" : "f.platforms"];
  }
  function sync() {
    var deck = isDeck();
    $("deck-address").hidden = true; $("deck-lang").hidden = true;
    $("f-address").required = false;
    btn.disabled = deck;
    btn.textContent = btn.getAttribute(deck ? "data-deck" : (isPlan() ? "data-plan" : "data-kit"));
    status.hidden = true;
    platKind();
    if (deck) { btn.textContent = M["availability.soon"]; say("availability.deck", false); }
  }
  // /kit/?product=visible (the Buy buttons) opens the form with that product selected; old product ids map to the new packages
  var want = null;
  try { want = new URLSearchParams(location.search).get("product"); } catch (e) {}
  var OLD = { snapshot: "kit", starter: "visible", growth: "growing", pro: "growing", deck_print: "deck", crier_deck: "deck" };
  if (want && OLD[want]) want = OLD[want];
  if (want) { for (var r = 0; r < radios.length; r++) if (radios[r].value === want) { for (var q2 = 0; q2 < radios.length; q2++) radios[q2].checked = radios[q2].value === want; break; } }
  // ?platforms=instagram,facebook (from a pricing card) ticks those platforms in the form (the kit keeps one)
  var wantPl = null; try { wantPl = new URLSearchParams(location.search).get("platforms"); } catch (e) {}
  if (wantPl) { var wl = wantPl.split(","), pcs = form.querySelectorAll('input[name="platform"]'), any = false; for (var w = 0; w < pcs.length; w++) { pcs[w].checked = wl.indexOf(pcs[w].value) > -1; any = any || pcs[w].checked; } if (!any && pcs.length) pcs[0].checked = true; }
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
  function say(key, bad, busy) { status.textContent = M[key] || key; status.hidden = false; status.style.borderColor = bad ? "var(--error)" : "var(--ink)"; status.classList.toggle("busy", !!busy); }
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
  // L1 checkout (checkout.json on): the paid packages go to Stripe Checkout with the platforms and the country picked; the
  // checkout server quotes from the one price list (local currency + VAT for SA / AE / EG, US dollars elsewhere). The Brand
  // Deck is coming soon and cannot be paid for. Paid is decided by Stripe only.
  var checkout = form.getAttribute("data-checkout"), plats = $("plats"), live = $("live-price");
  // the server's total is fetched only once the form comes near the screen (or the buyer changes a choice), so opening the page
  // does not wait on a call to the API (mobile PageSpeed, 2026-10-11); until then the total is worked out from the page's prices
  var quoteOn = !("IntersectionObserver" in window), quoteSeq = 0;
  function picked() { var o = [], c = form.querySelectorAll('input[name="platform"]'); for (var i = 0; i < c.length; i++) if (c[i].checked) o.push(c[i].value); return o; }
  function showTotal(q, billing) {
    if (!q || !CD) { live.hidden = true; return; }
    live.textContent = (M[billing === "monthly" ? "f.totalMonthly" : "f.total"] || "{amount}").replace("{amount}", function () { return display(q); }); live.hidden = false;
  }
  function quote() {
    var pn = $("paynote");
    if (!checkout || isDeck()) { if (plats) plats.hidden = true; if (live) live.hidden = true; if (pn) pn.textContent = M[isDeck() ? "availability.deck" : "pay.note"]; return; }
    if (pn && M["pay.noteCheckout"]) pn.textContent = M["pay.noteCheckout"];
    plats.hidden = false; btn.textContent = M["f.pay"] || btn.textContent;
    var pkg = product(), pl = picked(), ask = ++quoteSeq;
    if (!pl.length) { live.hidden = true; return; }
    var P = CD && CD.pk && CD.pk[pkg], extra = Math.max(0, pl.length - ((P && P.inc) || 1));
    showTotal(localQuote(pkg, cc, extra), P && P.billing);
    if (!quoteOn) return;
    fetch(checkout + "/quote?package=" + encodeURIComponent(pkg) + "&platforms=" + encodeURIComponent(pl.join(",")) + "&country=" + encodeURIComponent(countryCode()))
      .then(function (r) { return r.json(); })
      .then(function (q) {
        // the server's numbers win when they come back complete; otherwise the page's own figure (same price list) stays
        if (ask !== quoteSeq || !q || !q.ok || q.total == null || !q.currency) return;
        showTotal({ currency: q.currency, vat_pct: +q.vat_pct || 0, net: +q.net, vat: +q.vat, total: +q.total }, q.billing);
      })
      .catch(function () {});
  }
  if (checkout) {
    // warm the connection to Stripe while the buyer fills the form, so the checkout page opens faster after Pay
    form.addEventListener("focusin", function warm() {
      form.removeEventListener("focusin", warm);
      ["https://checkout.stripe.com", "https://js.stripe.com", "https://m.stripe.network"].forEach(function (u) {
        var l = document.createElement("link"); l.rel = "preconnect"; l.href = u; l.crossOrigin = ""; document.head.appendChild(l);
      });
    });
    var pc = form.querySelectorAll('input[name="platform"]');
    function requote() { quoteOn = true; quote(); }
    for (var k = 0; k < pc.length; k++) pc[k].addEventListener("change", requote);
    for (var k2 = 0; k2 < radios.length; k2++) radios[k2].addEventListener("change", requote);
    // the country dropdown changes the currency and the VAT: quote again
    curHooks.push(quote);
    quote();
    if (!quoteOn) { var qio = new IntersectionObserver(function (es) { for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { qio.disconnect(); if (!quoteOn) requote(); return; } }, { rootMargin: "600px 0px" }); qio.observe(form); }
  }
  function payNow() {
    var ctl2 = ("AbortController" in window) ? new AbortController() : null, t2 = setTimeout(function () { if (ctl2) ctl2.abort(); }, 20000);
    var body = { package: product(), platforms: picked(), country: countryCode(), language: de.lang, business: $("f-business").value.trim(), email: $("f-email").value.trim(),
      website_or_handle: $("f-web").value.trim(), city: $("f-city").value.trim(), industry: $("f-industry").value, consent: true };
    btn.disabled = true; say("f.toStripe", false, true);
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
    if (isDeck()) { btn.disabled = true; say("availability.deck", false); return; }
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
        if (res.status === 200 && res.body && res.body.ok === true) { say(deck ? "f.thanksDeck" : "f.thanks", false); form.reset(); setCountry(cc); sync(); say(deck ? "f.thanksDeck" : "f.thanks", false); }
        else if (res.status === 429) { say("f.tooMany", true); }
        else { say("f.failed", true); }
      })
      .catch(function () { say("f.failed", true); })
      .then(function () { clearTimeout(timer); btn.disabled = false; });
  });
})();

/* Mobile navigation. No external libraries or model calls. */
(function () {
  "use strict";
  var toggle=document.querySelector('.menu-toggle'), menu=document.getElementById('main-nav');
  function close(){if(!toggle||!menu)return;toggle.setAttribute('aria-expanded','false');menu.classList.remove('open');}
  if(toggle&&menu){
    toggle.addEventListener('click',function(){var open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.classList.toggle('open',open);});
    menu.addEventListener('click',function(e){if(e.target.closest('a'))close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
    document.addEventListener('click',function(e){if(!e.target.closest('.top'))close();});
    matchMedia('(min-width:801px)').addEventListener('change',close);
  }
})();
