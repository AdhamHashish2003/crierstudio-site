/* Crier Studio: language memory, old-URL redirects and the Snapshot form. All visible text is already in the HTML. */
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
    location.replace(pathFor(q || saved() || "en", document.body.getAttribute("data-target")) + location.hash);
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

  /* ---------------- request form (Snapshot, monthly plans, Crier Deck) ---------------- */
  var form = document.getElementById("snap-form");
  if (!form) return;
  var M = {};
  try { M = JSON.parse(document.getElementById("form-msgs").textContent); } catch (e) {}
  function $(id) { return document.getElementById(id); }
  var status = $("snap-status"), btn = $("snap-submit"), endpoint = form.getAttribute("data-endpoint");
  var radios = form.querySelectorAll('input[name="product"]');
  function product() { for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value; return "snapshot"; }
  function isDeck() { var p = product(); return p === "deck" || p === "deck_print"; }
  function isPlan() { var p = product(); return p === "starter" || p === "growth" || p === "pro"; }
  // the intake API accepts product "snapshot" and "crier_deck" only: monthly plans go in as "snapshot" with the plan name added
  // to the business name (the free-text field), and Crier Deck + Print Kit goes in as "crier_deck" with the same tag.
  var TAGS = { starter: "Starter plan", growth: "Growth plan", pro: "Pro plan", deck_print: "Crier Deck + Print Kit" };
  function apiProduct() { return isDeck() ? "crier_deck" : "snapshot"; }
  function sync() {
    var deck = isDeck();
    $("deck-address").hidden = !deck; $("deck-lang").hidden = !deck;
    $("f-address").required = deck;
    btn.textContent = btn.getAttribute(deck ? "data-deck" : (isPlan() ? "data-plan" : "data-snap"));
    status.hidden = true;
  }
  // /snapshot/?product=growth (the Buy buttons) opens the form with that product selected; crier_deck is the old name for deck
  var want = null;
  try { want = new URLSearchParams(location.search).get("product"); } catch (e) {}
  if (want === "crier_deck") want = "deck";
  if (want) { for (var r = 0; r < radios.length; r++) if (radios[r].value === want) { for (var q2 = 0; q2 < radios.length; q2++) radios[q2].checked = radios[q2].value === want; break; } }
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
  // plus product and lang, and for crier_deck also address and deck_lang. A plan or the Print Kit adds its name to business.
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
  form.addEventListener("submit", function (e) {
    e.preventDefault();
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
