/* Crier Studio: language memory, old-URL redirects and the pricing currency. All visible text is already in the HTML. */
(function () {
  "use strict";
  var KEY = "crier.lang", CODES = ["en", "ar"];
  var de = document.documentElement, page = document.body.getAttribute("data-page");
  function saved() { try { var s = localStorage.getItem(KEY); return CODES.indexOf(s) > -1 ? s : null; } catch (e) { return null; } }
  function pathFor(lang, p) { return "/" + (lang === "ar" ? "" : lang + "/") + (p === "index" ? "" : p + "/"); } // Arabic first (2026-11-15): Arabic at the root, English under /en/

  // old URLs: /?lang=xx and /terms.html?lang=xx
  var q = null;
  try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
  if (CODES.indexOf(q) < 0) q = null;
  if (page === "redirect") {
    // renamed pages (/kit/ and /snapshot/ -> /social/, /physical/ -> /in-store/#custom, /crier-deck/ -> /brand-deck/) carry
    // their own language and keep the full query string; the visitor's own #hash wins over the target's (data-hash)
    var own = document.body.getAttribute("data-lang"), th = document.body.getAttribute("data-hash");
    location.replace(pathFor(own || q || saved() || "ar", document.body.getAttribute("data-target")) + (own ? location.search : "") + (location.hash || (th ? "#" + th : "")));
    return;
  }
  // (the page's own language is decided in <head> before paint: the URL wins; the memory only picks the language on a neutral
  // entry to "/". Nothing here redirects a page by the memory.)

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
  // zone or the browser's language region; unknown = "Another country" in US dollars (review fix 2026-11-14; the HTML is still
  // written in Saudi riyals so the page reads right without JavaScript). Never taken from the page language: an Arabic page read in Kuwait, Qatar or Bahrain stays in US dollars.
  // Picking "Another country" always means US dollars. The legal pages keep the US-dollar price list.
  var CC_KEY = "crier.cc", CD = null, cc = null, ccPicked = null, ccSeen = null, cur = "USD", curHooks = [];
  try { CD = JSON.parse(document.getElementById("cur-data").textContent); } catch (e) {}
  var CC = CD ? CD.countries : {};
  function isLocal(c) { return typeof c === "string" && Object.prototype.hasOwnProperty.call(CC, c); }
  // VAT is shown only where the price data marks it as charged (vat_pct above 0); otherwise the price shown is the amount due
  function vatOf(c) { return isLocal(c) ? +CC[c].vat_pct || 0 : 0; }
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
    var q = vatOf(cc) ? localQuote(pkg, cc, extra) : null;
    el.hidden = !q; el.textContent = q ? display(q) + (per || "") : "";
  }
  function setCountry(c) {
    cc = c || null; cur = curOf(cc); if (!CD) return;
    var ps = document.querySelectorAll(".amt[data-usd]");
    for (var i = 0; i < ps.length; i++) {
      var v = ps[i].getAttribute(cur === "USD" ? "data-usd" : "data-" + cur.toLowerCase()); if (v == null) continue;
      // a card's big price is followed by its VAT line; a price inside a sentence says "+ VAT" itself
      var big = /(^|\s)(?:price|price-list)(\s|$)/.test(ps[i].className);
      ps[i].textContent = money(cur, +v) + (vatOf(cc) && !big ? " " + CD.plusVat : "");
      ps[i].dir = cur !== "USD" && de.dir === "rtl" ? "rtl" : "ltr";
    }
    // home: the "+ VAT" written next to a big price (hero, package cards); US dollars carry no VAT
    var vt = document.querySelectorAll("[data-vat]");
    for (var vi = 0; vi < vt.length; vi++) vt[vi].hidden = !vatOf(cc);
    var us = document.querySelectorAll(".usdnote[data-pkg]");
    for (var j = 0; j < us.length; j++) { var cd = us[j].closest(".plan"); if (!(cd && cd.querySelector(".platpick"))) vatNote(us[j], us[j].getAttribute("data-pkg"), 0, us[j].getAttribute("data-per") || ""); }
    var note = document.getElementById("vat-note"); if (note) note.textContent = (CD["note" + cur] || "") + " " + (vatOf(cc) ? (CD.vatAdded || "").replace("{vat}", vatOf(cc)) : (CD.due || ""));
    var sels = document.querySelectorAll("select[data-cc]");
    for (var s = 0; s < sels.length; s++) sels[s].value = isLocal(cc) ? cc : "other";
    // several countries (MULTI, cur-data fallback): the texts and WhatsApp links written for each country (data-cv-<cc>,
    // data-cv-href-<cc>); the page's own text and link are kept to come back to (Egypt and every other country)
    if (CD.fallback) {
      var lc = (cc || "").toLowerCase(), cv = document.querySelectorAll(".cv");
      for (var c1 = 0; c1 < cv.length; c1++) {
        if (cv[c1].__cvDef == null) cv[c1].__cvDef = cv[c1].innerHTML;
        var alt = lc ? cv[c1].getAttribute("data-cv-" + lc) : null;
        cv[c1].innerHTML = alt != null ? alt : cv[c1].__cvDef;
      }
      var hl = document.querySelectorAll("a[data-cv-href-us], a[data-cv-href-sa], a[data-cv-href-ae]");
      for (var c2 = 0; c2 < hl.length; c2++) {
        if (hl[c2].__cvDef == null) hl[c2].__cvDef = hl[c2].getAttribute("href");
        var ah = lc ? hl[c2].getAttribute("data-cv-href-" + lc) : null;
        hl[c2].setAttribute("href", ah != null ? ah : hl[c2].__cvDef);
      }
    }
    for (var k = 0; k < curHooks.length; k++) curHooks[k]();
  }
  // "Other" keeps the detected country code when it is not one of the three (Kuwait stays KW, US dollars)
  function fromPick(p) { return p === "other" ? (ccSeen && !isLocal(ccSeen) ? ccSeen : null) : p; }
  if (CD && !/^(terms|privacy|refund)$/.test(page) && document.querySelector(".amt[data-usd]")) {
    var box = document.getElementById("curbox"); if (box) box.hidden = false;
  }
  // one country served (cur-data lock, Egypt only since 2026-11-15): the page stays in its currency, no picker, no guess, no Cloudflare
  if (CD && CD.lock && isLocal(CD.lock) && !/^(terms|privacy|refund)$/.test(page) && document.querySelector(".amt[data-usd]")) setCountry(CD.lock);
  // several countries served (owner 2026-11-19: Egypt, the USA, Saudi Arabia, the UAE; cur-data fallback = Egypt): the visitor's
  // country from Cloudflare (the <head> script's window.__crierLoc, remembered as 'crier.loc'); a served country shows its own
  // currency and texts, every other country (and an unknown one) keeps the page as written (Egypt). No picker. Crawlers keep the page
  // as built (window.__crierBot). The legal pages are not switched: they state all four countries.
  else if (CD && CD.fallback && isLocal(CD.fallback)) {
    if (!/^(terms|privacy|refund)$/.test(page) && !window.__crierBot) {
      var mine = function (c) { return isLocal(c) ? c : CD.fallback; }, known = null;
      try { known = localStorage.getItem("crier.loc"); } catch (e) {}
      if (known && /^[A-Z]{2}$/.test(known) && mine(known) !== CD.fallback) setCountry(mine(known));
      var later = window.__crierLoc || (window.fetch ? fetch("/cdn-cgi/trace").then(function (r) { return r.ok ? r.text() : ""; }).then(function (tx) {
        var m = /(?:^|\n)loc=([A-Z]{2})(?:\n|$)/.exec(tx || ""); return m && m[1] !== "XX" && m[1] !== "T1" ? m[1] : null; }).catch(function () { return null; }) : null);
      if (later) later.then(function (l) { if (l && mine(l) !== (cc || CD.fallback)) setCountry(mine(l)); });
    }
  }
  else if (CD && !/^(terms|privacy|refund)$/.test(page) && document.querySelector(".amt[data-usd]")) {
    var ccSels = document.querySelectorAll("select[data-cc]");
    for (var cs = 0; cs < ccSels.length; cs++) ccSels[cs].addEventListener("change", function () { ccPicked = this.value; try { localStorage.setItem(CC_KEY, ccPicked); } catch (e) {} setCountry(fromPick(ccPicked)); });
    ccSeen = guessCountry();
    // review fix (2026-11-14): when neither the time zone nor the browser names a country, "Another country" (US dollars) is
    // shown, never Saudi Arabia; an explicit pick is kept in localStorage and always wins
    setCountry(ccPicked ? fromPick(ccPicked) : ccSeen);
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
      var shown = money(lp ? cur : "USD", price) + (lp && CD && vatOf(cc) ? " " + CD.plusVat : "");
      out.textContent = fs.dataset.tpl.replace("{name}", function () { return fs.dataset.name; }).replace("{platforms}", function () { return n.o.join(" + "); }).replace("{price}", function () { return shown; }).replace("{per}", function () { return fs.dataset.per; });
      if (vn) vatNote(vn, fs.dataset.pkg, extras, fs.dataset.per);
      if (buy) { try { var u = new URL(buy.getAttribute("href"), location.href); if (u.origin === location.origin) { u.searchParams.set("platforms", n.v.join(",")); buy.setAttribute("href", u.pathname + u.search + u.hash); } } catch (e) {} }
    }
    for (var b = 0; b < boxes.length; b++) boxes[b].addEventListener("change", update);
    curHooks.push(update);
    update();
  })(picks[pi]);

})();

/* In-store (2026-10-18): the zone chips (real tab buttons) and the Store Kit waitlist form. It posts to the Launchpad intake
   (the order form's endpoint). Review fix 2026-11-14: the request is sent as what it is, product "store-waitlist" with the
   visitor's website or handle (web), email, business type (industry), country code (country: SA, AE, EG, US or other), page
   language and consent. The intake live on 2026-11-14 accepts only the products "snapshot" and "crier_deck" and requires a
   business name and a city: when it answers 422 on product, business or city, the form sends once more in that older shape
   (labelled "[Store Kit waitlist]"), and keeps using it for the rest of the visit, so nothing is lost until the intake is
   upgraded. Custom pieces quotes are asked in the client portal (a plain link, no script here). Without
   JavaScript the chips stay hidden (every zone is listed) and the submit button stays disabled (a noscript line gives the email). */
(function () {
  "use strict";
  var tabs = document.getElementById("zone-tabs");
  if (tabs) {
    var list = tabs.querySelector('[role="tablist"]'), chips = tabs.querySelectorAll('[role="tab"]');
    var pick = function (i, focus) {
      for (var j = 0; j < chips.length; j++) {
        var on = j === i, panel = document.getElementById(chips[j].getAttribute("aria-controls"));
        chips[j].setAttribute("aria-selected", on ? "true" : "false"); chips[j].tabIndex = on ? 0 : -1;
        if (panel) panel.hidden = !on;
      }
      if (focus) chips[i].focus();
    };
    for (var c = 0; c < chips.length; c++) (function (i) {
      chips[i].addEventListener("click", function () { pick(i, false); });
      chips[i].addEventListener("keydown", function (e) {
        var n = chips.length, k = e.key, rtl = document.documentElement.dir === "rtl", d = 0;
        if (k === "ArrowRight") d = rtl ? -1 : 1; else if (k === "ArrowLeft") d = rtl ? 1 : -1;
        else if (k === "Home" || k === "End") { e.preventDefault(); pick(k === "Home" ? 0 : n - 1, true); return; }
        if (d) { e.preventDefault(); pick((i + d + n) % n, true); }
      });
    })(c);
    list.hidden = false; tabs.classList.add("tabs-on"); pick(0, false);
  }

  var forms = document.querySelectorAll("form.lead-form");
  if (!forms.length) return;
  var M = {}; try { M = JSON.parse(document.getElementById("lead-msgs").textContent); } catch (e) {}
  var lang = document.documentElement.lang;
  // the intake's own rules (crm/launchpad_crm/launchpad/web_public.py): required fields, length caps, a website or an
  // @handle, a valid email, no < or >; whitespace is collapsed before the length is counted
  var EMAIL = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}$/;
  var SITE = /^(https?:\/\/)?([A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,24}(:\d{1,5})?(\/[^\s<>"']{0,150})?$/;
  var HANDLE = /^@?[A-Za-z0-9._]{1,30}$/;
  var CC = { SA: "Saudi Arabia", AE: "UAE", EG: "Egypt", US: "United States", other: "Other country" };
  var RULES = {
    country: function (v) { return v ? "" : "v.country"; },
    type: function (v) { return v ? "" : "v.type"; },
    email: function (v) { return !v ? "v.email" : (EMAIL.test(v) ? "" : "v.emailBad"); },
    web: function (v) { return !v ? "v.web" : (SITE.test(v) || HANDLE.test(v) ? "" : "v.webBad"); }
  };
  // a 422 from the intake names the intake's field: point it at the input it was made from, with that input's message
  var FROM = { store_waitlist: { website: "web", business: "web", city: "country", industry: "type" } };
  var MSG = { email: "v.emailBad", web: "v.webBad", type: "v.type", consent: "f.consentErr" };
  function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
  function cut(s, n) { return s.length > n ? s.slice(0, n).trim() : s; }
  for (var f = 0; f < forms.length; f++) (function (form) {
    var kind = form.getAttribute("data-form"), endpoint = form.getAttribute("data-endpoint");
    var btn = form.querySelector('button[type="submit"]'), status = form.querySelector(".status");
    function el(n) { return form.elements.namedItem(n); }
    function val(n) { var x = el(n); return x ? clean(x.value) : ""; }
    function say(key, bad, busy) { status.textContent = M[key] || key; status.hidden = false; status.style.borderColor = bad ? "var(--error)" : "var(--ink)"; status.classList.toggle("busy", !!busy); }
    function setErr(n, key, text) {
      var e = form.querySelector('[data-err="' + n + '"]'), x = el(n), msg = key ? (M[key] || key) : (text || "");
      if (e) { e.textContent = msg; e.hidden = !msg; }
      if (x) x.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    function check() {
      var first = null;
      for (var n in RULES) {
        var x = el(n); if (!x) continue;
        var v = clean(x.value), max = +x.getAttribute("maxlength") || 0;
        var key = RULES[n](v) || (max && v.length > max ? "v.tooLong" : "") || (/[<>]/.test(v) ? "v.angle" : "");
        setErr(n, key); if (key && !first) first = x;
      }
      var cb = el("consent"); setErr("consent", cb.checked ? "" : "f.consentErr"); if (!cb.checked && !first) first = cb;
      return first;
    }
    function payload(old) {
      var web = val("web"), country = el("country").value;
      var p = { product: "store-waitlist", form: kind, website: web, email: val("email"), industry: el("type").value, country: country, lang: lang, consent: true, company_website: el("company_website").value };
      // the intake of 2026-11-14 (see above): web, its two required free-text fields, and no product (it files it as its default)
      if (old) { delete p.product; delete p.website; p.web = web; p.business = cut("[Store Kit waitlist] " + web, 120); p.city = CC[country] || CC.other; }
      return p;
    }
    var legacy = false;
    function send(old) {
      var ctl = ("AbortController" in window) ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(old)), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
        .then(function (res) {
          clearTimeout(timer);
          var f = res.status === 422 && res.body && res.body.field;
          if (!old && (f === "product" || f === "business" || f === "city" || f === "web")) { legacy = true; return send(true); } // OLD-INTAKE FALLBACK: delete this one line once the Launchpad intake accepts product "store-waitlist"
          return res;
        }, function (e) { clearTimeout(timer); throw e; });
    }
    btn.disabled = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = check(); if (bad) { status.hidden = true; bad.focus(); return; }
      btn.disabled = true; say("f.sending", false, true);
      send(legacy)
        .then(function (res) {
          if (res.status === 200 && res.body && res.body.ok === true) { form.reset(); say("is.wl.ok", false); return; }
          if (res.status === 429) { say("f.tooMany", true); return; }
          var sf = res.status === 422 && res.body && res.body.field, n = sf && ((FROM[kind] || {})[sf] || sf);
          if (n && el(n)) { setErr(n, MSG[n] || "", String(res.body.message || "")); status.hidden = true; el(n).focus(); return; }
          say("f.failed", true);
        })
        .catch(function () { say("f.failed", true); })
        .then(function () { btn.disabled = false; });
    });
  })(forms[f]);
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

/* Floating WhatsApp button (2026-11-15). It sits above the consent bar while the bar shows (--cbar), and on phones it steps aside
   (class wa-fab-off) whenever a link, button or field is under it, so it never covers something the visitor needs to tap. */
(function () {
  "use strict";
  var fab = document.getElementById("wa-fab"); if (!fab) return;
  var de = document.documentElement, bar = document.getElementById("consent-bar"), phone = matchMedia("(max-width:767px)"), queued = 0;
  var SEL = "a,button,input,select,textarea,summary,label,[role=button]", PTS = [], PAD = 8;
  for (var a = 0; a <= 4; a++) for (var c = 0; c <= 4; c++) PTS.push([a / 4, c / 4]); // a 5 x 5 grid, 18 px apart: a one-line text link cannot slip between the points
  function lift() { var h = bar && !bar.hidden ? bar.getBoundingClientRect().height : 0; de.style.setProperty("--cbar", Math.round(h) + "px"); }
  function covers() {
    if (!phone.matches || !document.elementsFromPoint) return false;
    var r = fab.getBoundingClientRect();
    for (var i = 0; i < PTS.length; i++) {
      var x = r.left - PAD + (r.width + 2 * PAD) * PTS[i][0], y = r.top - PAD + (r.height + 2 * PAD) * PTS[i][1];
      var els = document.elementsFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1));
      for (var j = 0; j < els.length; j++) {
        if (els[j] === fab || fab.contains(els[j])) continue;
        var hit = els[j].closest && els[j].closest(SEL);
        if (hit) return true;
        break; // only the topmost element under the button counts
      }
    }
    return false;
  }
  function update() { queued = 0; lift(); fab.classList.toggle("wa-fab-off", covers()); }
  function soon() { if (!queued) { queued = 1; setTimeout(update, 50); } }
  addEventListener("scroll", soon, { passive: true }); addEventListener("resize", soon);
  if (phone.addEventListener) phone.addEventListener("change", soon);
  if (bar && window.MutationObserver) new MutationObserver(soon).observe(bar, { attributes: true, attributeFilter: ["hidden"] });
  // the page can also move under the button without a scroll (a video or image loading, an answer opening): look again then
  if (window.ResizeObserver) new ResizeObserver(soon).observe(document.body);
  addEventListener("load", soon); document.addEventListener("toggle", soon, true);
  update();
})();

/* Conversion tracking (2026-11-15): every WhatsApp link click is a GA4 event "whatsapp_click", sent through the gtag() queue that the
   <head> tag sets up, so it follows the visitor's choice exactly like the page views (opt-in, audit 3 S02: without Accept gtag.js is
   never loaded and the queue is dropped at Accept, so nothing is sent before consent or after Decline). Parameters: wa_location (card, table, float, quote, footer,
   landing_*, link), package (Bronze, Silver, Gold, Diamond or none), page_type (the page's data-page) and page_language. A package's
   own buttons also send "choose_plan" with package_id (seen, visible, growing, diamond) and method (whatsapp or account). Every wa.me
   link opens in a new tab, so the page stays open while gtag.js sends the event. */
(function () {
  "use strict";
  var NAMES = { seen: "Bronze", visible: "Silver", growing: "Gold", diamond: "Diamond" };
  // choose_plan (audit H3): a click on a package's own button, with the package id (seen, visible, growing, diamond) and how it was
  // chosen (the WhatsApp button or the "or create your account" link). It is sent beside whatsapp_click / sign_up_click.
  function choose(id, method) { window.gtag("event", "choose_plan", { package_id: id, package: NAMES[id], method: method, page_type: document.body.getAttribute("data-page") || "", page_language: document.documentElement.lang, transport_type: "beacon" }); }
  document.addEventListener("click", function (e) {
    if (typeof window.gtag !== "function" || !e.target || !e.target.closest) return;
    // the "or create your account" links: sign_up_click, with the package when the link carries one
    var s = e.target.closest('a[href^="https://portal.crierstudio.com/#/signup"]');
    if (s) { var sp = s.getAttribute("data-signup") || ""; if (NAMES[sp]) choose(sp, "account"); window.gtag("event", "sign_up_click", { package: NAMES[sp] || "none", page_type: document.body.getAttribute("data-page") || "", page_language: document.documentElement.lang, transport_type: "beacon" }); return; }
    var a = e.target.closest('a[href^="https://wa.me/"]');
    if (!a) return;
    var pkg = a.getAttribute("data-wa-order") || a.getAttribute("data-pkg") || "";
    var where = a.getAttribute("data-wa") || (a.closest(".plan") ? "card" : a.closest(".la-table") ? "table" : a.closest("footer") ? "footer" : "link");
    if (NAMES[pkg]) choose(pkg, "whatsapp");
    window.gtag("event", "whatsapp_click", { wa_location: where, package: NAMES[pkg] || "none", page_type: document.body.getAttribute("data-page") || "", page_language: document.documentElement.lang, transport_type: "beacon" });
  }, true);
})();
