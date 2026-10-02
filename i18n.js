/* Crier Studio i18n: no build step, no framework.
   Strings live in /i18n/<code>.json (one file per language, loaded on demand; en.json is the fallback).
   Language: ?lang= override, else the saved choice, else navigator.languages, else en. */
(function(){
  var LANGS = [["en","English"],["es","Español"],["fr","Français"],["ar","العربية"]];
  var RTL = {ar:1};
  // Prices and numbers live here (USD, never converted). Page copy refers to them as {price} {regular} {n}.
  var CFG = {brand:"Crier Studio", email:"team@crierstudio.com", currency:"$", price:49, regular:99, founding:20};
  // Extra fonts, loaded only for the language that needs them. Latin (incl. latin-ext) is covered by the base fonts.
  var GF = "https://fonts.googleapis.com/css2?family=";
  var FONT = {ar:"Noto+Sans+Arabic"};
  var codes = LANGS.map(function(l){return l[0];});
  var KEY = "crier.lang";
  var dicts = {}, cur = "en", listeners = [];

  function norm(tag){
    if (!tag) return null;
    var t = String(tag).replace(/_/g,"-"), low = t.toLowerCase(), i;
    for (i=0;i<codes.length;i++) if (codes[i].toLowerCase()===low) return codes[i];
    var p = low.split("-");
    for (i=0;i<codes.length;i++) if (codes[i].toLowerCase()===p[0]) return codes[i];
    return null;
  }
  function pick(){
    var q = null, s = null, c = null, i;
    try { q = norm(new URLSearchParams(location.search).get("lang")); } catch(e){}
    if (q) return q;
    try { s = norm(localStorage.getItem(KEY)); } catch(e){}
    if (s) return s;
    var nl = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (i=0;i<nl.length;i++){ c = norm(nl[i]); if (c) return c; }
    return "en";
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
  function money(n){return CFG.currency + n;}
  function vars(extra){
    var v = {brand:CFG.brand, email:CFG.email, n:CFG.founding, price:money(CFG.price), regular:money(CFG.regular), name:""};
    if (extra) for (var k in extra) v[k]=extra[k];
    return v;
  }
  function raw(key){
    var d = dicts[cur]; if (d && d[key]!=null) return d[key];
    d = dicts.en; if (d && d[key]!=null) return d[key];
    return key;
  }
  // plain text (placeholders replaced, tags stripped)
  function t(key, extra){
    var v = vars(extra);
    return raw(key).replace(/\{(\w+)\}/g,function(m,k){return v[k]!=null?v[k]:m;}).replace(/<\/?(?:b|ph|a)>/g,"");
  }
  // safe html: everything escaped, then only <b> <ph> <a> and {email} turned into markup
  function h(key, extra, href){
    var v = vars(extra);
    var s = raw(key).replace(/\{(\w+)\}/g,function(m,k){return k==="email"?"\u0001EMAIL\u0001":(v[k]!=null?v[k]:m);});
    s = esc(s).replace(/&lt;(\/?)b&gt;/g,"<$1b>").replace(/&lt;ph&gt;/g,'<span class="ph">').replace(/&lt;\/ph&gt;/g,"</span>")
      .replace(/&lt;a&gt;/g, href ? '<a href="'+esc(href)+'">' : "<a>").replace(/&lt;\/a&gt;/g,"</a>")
      .replace(/\u0001EMAIL\u0001/g,'<a dir="ltr" href="mailto:'+CFG.email+'">'+CFG.email+'</a>');
    return s;
  }
  function pageHref(page){ return (page==="index" ? "/" : page+".html") + "?lang=" + encodeURIComponent(cur); }

  function load(code){
    if (dicts[code]) return Promise.resolve();
    return fetch("/i18n/"+code+".json", {cache:"no-cache"}).then(function(r){
      if (!r.ok) throw new Error(code+" "+r.status);
      return r.json();
    }).then(function(j){ dicts[code] = j; });
  }
  function setFont(code){
    var el = document.getElementById("lang-font"), fam = FONT[code];
    if (!fam){ if (el) el.remove(); return; }
    if (!el){ el = document.createElement("link"); el.id = "lang-font"; el.rel = "stylesheet"; document.head.appendChild(el); }
    var href = GF + fam + ":wght@400..900&display=swap";
    if (el.getAttribute("href") !== href) el.setAttribute("href", href);
  }
  function applyStatic(){
    var de = document.documentElement;
    de.lang = cur; de.dir = RTL[cur] ? "rtl" : "ltr";
    setFont(cur);
    var els = document.querySelectorAll("[data-i18n]"), i;
    for (i=0;i<els.length;i++){
      var el = els[i], hr = el.getAttribute("data-href");
      el.innerHTML = h(el.getAttribute("data-i18n"), null, hr ? pageHref(hr.replace(/\.html$/,"")) : null);
    }
    els = document.querySelectorAll("[data-i18n-attr]");
    for (i=0;i<els.length;i++){
      els[i].getAttribute("data-i18n-attr").split(";").forEach(function(pair){
        var a = pair.split(":"); if (a[1]) this.setAttribute(a[0], t(a[1]));
      }, els[i]);
    }
    els = document.querySelectorAll("[data-mail]");
    for (i=0;i<els.length;i++){ els[i].href = "mailto:"+CFG.email; els[i].textContent = CFG.email; els[i].setAttribute("dir","ltr"); }
    els = document.querySelectorAll("a[data-page]");
    for (i=0;i<els.length;i++) els[i].href = pageHref(els[i].getAttribute("data-page"));
    els = document.querySelectorAll(".conv");
    for (i=0;i<els.length;i++) els[i].hidden = (cur==="en");
    var page = document.body.getAttribute("data-page") || "index";
    if (page==="index"){
      document.title = CFG.brand;
      [["meta[name=description]","meta.desc"],["meta[property='og:description']","meta.ogdesc"],["meta[name='twitter:description']","meta.ogdesc"]].forEach(function(p){
        var m = document.querySelector(p[0]); if (m) m.setAttribute("content", t(p[1]));
      });
    } else {
      document.title = t("meta.t."+page);
      var m = document.querySelector("meta[name=description]"); if (m) m.setAttribute("content", t("meta.d."+page));
    }
    var sel = document.getElementById("langsel"); if (sel) sel.value = cur;
  }
  function buildPicker(){
    var sel = document.getElementById("langsel"); if (!sel || sel.options.length) return;
    LANGS.forEach(function(l){ var o = document.createElement("option"); o.value = l[0]; o.textContent = l[1]; o.setAttribute("lang", l[0]); sel.appendChild(o); });
    sel.addEventListener("change", function(){ set(sel.value, true); });
  }
  function emit(){ listeners.forEach(function(f){ try { f(); } catch(e){ if (window.console) console.error(e); } }); }
  function set(code, save){
    code = norm(code) || "en";
    return Promise.all([load("en"), load(code)]).catch(function(){ code = "en"; return load("en"); }).then(function(){
      cur = code;
      if (save){
        try { localStorage.setItem(KEY, code); } catch(e){}
        try { var u = new URL(location.href); u.searchParams.set("lang", code); history.replaceState(null, "", u.pathname + u.search + u.hash); } catch(e){}
      }
      applyStatic(); emit();
    });
  }
  window.CRIER = {
    LANGS: LANGS, RTL: RTL, cfg: CFG, t: t, h: h, esc: esc, money: money, norm: norm, pageHref: pageHref,
    get lang(){ return cur; },
    onChange: function(f){ listeners.push(f); },
    set: set,
    init: function(){ buildPicker(); return set(pick(), false); }
  };
})();
