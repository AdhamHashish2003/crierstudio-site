/* Crier Studio landing page: renders the lists and runs the Snapshot form. Text comes from CRIER (i18n.js). */
(function(){
  var C = window.SITE_CONTENT, I = window.CRIER;
  var PK = C.packages, SN = PK.snapshot, PL = PK.plan;
  var t = I.t, h = I.h, esc = I.esc, money = I.money;
  function $(id){return document.getElementById(id);}

  var syms = [
    '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="6" y="4" width="32" height="36" fill="none" stroke="currentColor" stroke-width="4"/><rect x="13" y="13" width="18" height="4" fill="currentColor"/><rect x="13" y="22" width="12" height="4" fill="currentColor"/></svg>',
    '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="8" width="36" height="30" fill="none" stroke="currentColor" stroke-width="4"/><rect x="4" y="8" width="36" height="8" fill="var(--accent)" stroke="currentColor" stroke-width="2"/><rect x="11" y="22" width="6" height="6" fill="currentColor"/><rect x="21" y="22" width="6" height="6" fill="currentColor"/></svg>',
    '<svg class="sym" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="4" width="16" height="16" fill="var(--sun)" stroke="currentColor" stroke-width="2"/><rect x="24" y="4" width="16" height="16" fill="var(--coral)"/><rect x="4" y="24" width="16" height="16" fill="currentColor"/><path d="M26 32l5 5 9-11" fill="none" stroke="currentColor" stroke-width="4"/></svg>'
  ];
  var minis = [
    '<div class="mini score" aria-hidden="true"><span style="height:55%"></span><span style="height:75%"></span><span style="height:40%"></span><span style="height:65%"></span></div>',
    '<div class="mini fix" aria-hidden="true"><span style="width:80%"></span><span style="width:62%"></span><span style="width:70%"></span></div>',
    '<div class="mini posts" aria-hidden="true"><span></span><span></span></div>'
  ];
  var INDCOLORS = [["sun","coral"],["coral","accent"],["accent","ink"],["ink","sun"],["sun","accent"]];
  var CHIPS = {1:"deliv.chip1", 2:"deliv.chip2", 6:"deliv.chip6"};
  var DRAFT_FAQ = {4:1, 6:1};
  var i, n;

  function render(){
    var out, k;
    // snapshot: what is inside
    out = "";
    for (i=1;i<=SN.items;i++) out += '<article class="page"><span class="pg">'+h("snap.label")+'</span>'+minis[i-1]+'<span class="ex2">'+h("board.ex")+'</span><h3>'+h("snap.p"+i+"t")+'</h3><p>'+h("snap.p"+i+"x")+'</p></article>';
    $("snap-pages").innerHTML = out;

    // industry select: shown label is translated, the value sent stays English
    var sel = $("f-industry"), keep = sel.value;
    sel.innerHTML = '<option value="">'+esc(t("f.choose"))+'</option>' + C.industryValues.map(function(v,j){
      return '<option value="'+esc(v)+'">'+esc(j<5 ? t("ind."+(j+1)+"n") : t("ind.other"))+'</option>';
    }).join("");
    sel.value = keep;

    // what is in The Plan
    $("deliv-lead").textContent = t("deliv.lead", {n: PL.items, price: money(PL.price), name: t("plan.name")});
    out = "";
    for (i=1;i<=PL.items;i++) out += '<div class="d"><h3>'+h("deliv."+i+"t")+'</h3><p>'+h("deliv."+i+"x")+'</p>'+(CHIPS[i]?'<span class="snapnote">'+h(CHIPS[i])+'</span>':"")+'</div>';
    $("deliv").innerHTML = out;

    // how it works
    out = "";
    for (i=1;i<=3;i++) out += '<div class="stage">'+syms[i-1]+'<h3>'+h("how."+i+"t")+'</h3><p>'+h("how."+i+"x")+'</p></div>';
    $("flow").innerHTML = out;

    // industries
    out = "";
    for (i=1;i<=5;i++){
      var sw = INDCOLORS[i-1].map(function(c){return '<i style="background:var(--'+c+')"></i>';}).join("");
      out += '<div class="ind"><div class="swatch" aria-hidden="true">'+sw+'</div><h3>'+h("ind."+i+"n")+'</h3><p>'+h("ind."+i+"x")+'</p>'+(i===4?'<p class="note">'+h("ind.4note")+'</p>':"")+'</div>';
    }
    $("inds").innerHTML = out;

    // pricing: Snapshot (free) and The Plan only
    var snapLis = "", planLis = "";
    for (i=1;i<=SN.items;i++) snapLis += "<li>"+h("snap.p"+i+"t")+"</li>";
    for (i=1;i<=PL.items;i++) planLis += "<li>"+h("deliv."+i+"t")+"</li>";
    $("plans").innerHTML =
      '<div class="plan"><h3>'+h("plan.snapName")+'</h3><p class="muted">'+h("plan.snapFor")+'</p><div class="price"><span>'+h("plan.snapFree")+'</span></div><ul>'+snapLis+'</ul><a class="btn" href="#get-snapshot">'+h("hero.cta")+'</a></div>' +
      '<div class="plan feat"><h3>'+h("plan.name")+'</h3><p class="muted">'+h("plan.for")+'</p><div class="price"><span dir="ltr">'+esc(money(PL.price))+'</span><small>'+h("plan.billing")+'</small></div><span class="found">'+h("price.found")+'</span><ul>'+planLis+'</ul><a class="btn" href="#get-snapshot">'+h("plan.cta")+'</a></div>';
    $("terms").innerHTML = '<span>'+h("price.t1")+'</span><span class="ph"><a href="'+I.pageHref("refund")+'">'+h("price.t2")+'</a></span>';

    // faq
    var open = document.querySelector("#faq-list details[open]");
    var openIdx = open ? open.getAttribute("data-i") : "1";
    out = "";
    for (i=1;i<=9;i++){
      var ans = "", j;
      for (j=1;j<=2;j++){
        k = "faq."+i+"a"+j;
        if (j===1 || t(k)!==k) ans += '<p'+(DRAFT_FAQ[i]?' class="ph"':'')+'>'+h(k)+'</p>';
      }
      out += '<details data-i="'+i+'"'+(String(i)===openIdx?" open":"")+'><summary>'+h("faq."+i+"q")+'</summary><div class="ans">'+ans+'</div></details>';
    }
    $("faq-list").innerHTML = out;

    // a language switch clears any shown form messages (they were in the old language)
    clearMessages();
  }

  /* ---------------- form ---------------- */
  var form = $("snap-form"), status = $("snap-status"), btn = $("snap-submit");
  var FIELDS = [
    ["f-business", function(v){return v ? "" : "v.business";}],
    ["f-web", function(v){return v ? "" : "v.web";}],
    ["f-email", function(v){return !v ? "v.emailEmpty" : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "v.emailBad");}],
    ["f-city", function(v){return v ? "" : "v.city";}],
    ["f-industry", function(v){return v ? "" : "v.industry";}]
  ];
  var shown = {};   // id -> message key currently shown, so a language switch can re-translate instead of clear
  var statusKey = null, statusBad = false;
  function clearMessages(){
    // re-translate what is on screen instead of dropping it
    Object.keys(shown).forEach(function(id){ var e = $("e-"+id.replace(/^f-/,"")); if (e && shown[id]) e.textContent = t(shown[id]); });
    if (statusKey) status.textContent = t(statusKey);
  }
  function say(key, bad){ statusKey = key; status.textContent = t(key); status.hidden = false; status.style.borderColor = bad ? "var(--error)" : "var(--ink)"; }
  function setErr(id, key){
    var e = $("e-"+id.replace(/^f-/,"")); shown[id] = key;
    e.textContent = key ? t(key) : ""; e.hidden = !key;
  }
  // exposed for the local test (payload shape + validation, request mocked)
  window.__snapPayload = function(){
    return {
      business: $("f-business").value.trim(), web: $("f-web").value.trim(),
      email: $("f-email").value.trim(), city: $("f-city").value.trim(),
      industry: $("f-industry").value, consent: true,
      company_website: $("f-company").value
    };
  };
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var firstBad = null;
    FIELDS.forEach(function(f){
      var el = $(f[0]), key = f[1](el.value.trim());
      el.setAttribute("aria-invalid", key ? "true" : "false");
      setErr(f[0], key);
      if (key && !firstBad) firstBad = el;
    });
    var cb = $("f-consent");
    setErr("f-consent", cb.checked ? "" : "f.consentErr");
    cb.setAttribute("aria-invalid", cb.checked ? "false" : "true");
    if (!cb.checked && !firstBad) firstBad = cb;
    if (firstBad){ statusKey = null; status.hidden = true; firstBad.focus(); return; }
    var data = window.__snapPayload();
    btn.disabled = true; say("f.sending", false);
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function(){ if (ctl) ctl.abort(); }, 20000);
    fetch(C.endpoint, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined})
      .then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ return {status:r.status, body:j}; }); })
      .then(function(res){
        if (res.status === 200 && res.body && res.body.ok === true){ say("f.thanks", false); form.reset(); }
        else if (res.status === 429){ say("f.tooMany", true); }
        else { say("f.failed", true); }
      })
      .catch(function(){ say("f.failed", true); })
      .then(function(){ clearTimeout(timer); btn.disabled = false; });
  });

  I.onChange(render);
  I.init();
})();
