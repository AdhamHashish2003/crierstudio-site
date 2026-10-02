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

  /* ---------------- Snapshot form ---------------- */
  var form = document.getElementById("snap-form");
  if (!form) return;
  var M = {};
  try { M = JSON.parse(document.getElementById("form-msgs").textContent); } catch (e) {}
  function $(id) { return document.getElementById(id); }
  var status = $("snap-status"), btn = $("snap-submit"), endpoint = form.getAttribute("data-endpoint");
  var FIELDS = [
    ["f-business", function (v) { return v ? "" : "v.business"; }],
    ["f-web", function (v) { return v ? "" : "v.web"; }],
    ["f-email", function (v) { return !v ? "v.emailEmpty" : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "v.emailBad"); }],
    ["f-city", function (v) { return v ? "" : "v.city"; }],
    ["f-industry", function (v) { return v ? "" : "v.industry"; }]
  ];
  function say(key, bad) { status.textContent = M[key] || key; status.hidden = false; status.style.borderColor = bad ? "var(--error)" : "var(--ink)"; }
  function setErr(id, key) { var e = $("e-" + id.replace(/^f-/, "")); e.textContent = key ? (M[key] || key) : ""; e.hidden = !key; }
  // the payload is exactly what the live intake API accepts: business, web, email, city, industry, consent, company_website
  window.__snapPayload = function () {
    return {
      business: $("f-business").value.trim(), web: $("f-web").value.trim(),
      email: $("f-email").value.trim(), city: $("f-city").value.trim(),
      industry: $("f-industry").value, consent: true,
      company_website: $("f-company").value
    };
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
    var data = window.__snapPayload();
    btn.disabled = true; say("f.sending", false);
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.ok === true) { say("f.thanks", false); form.reset(); }
        else if (res.status === 429) { say("f.tooMany", true); }
        else { say("f.failed", true); }
      })
      .catch(function () { say("f.failed", true); })
      .then(function () { clearTimeout(timer); btn.disabled = false; });
  });
})();
