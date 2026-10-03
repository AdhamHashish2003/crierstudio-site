/* Crier Deck: the 3D hero. three.js r128 (self-hosted, /assets/three.r128.min.js) is fetched here, after first paint and idle, by the loader in site.js.
   Canvas is decorative (aria-hidden); every message is HTML. DPR capped at 2, loop paused off-screen / hidden tab, static CSS cards stay if anything fails. */
(function () {
  "use strict";
  var hero = document.getElementById("hero"); if (!hero) return;
  var stage = hero.querySelector(".deck-stage"), canvas = hero.querySelector("canvas.gl"); if (!stage || !canvas) return;
  var gave = false, giveUp = setTimeout(function () { gave = true; }, 4000); // 4 s without 3D: keep the static hero
  function hasGL() { try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } }
  if (!hasGL()) return;
  var s = document.createElement("script"); s.src = "/assets/three.r128.min.js"; s.async = true;
  s.onload = function () { if (window.THREE && !gave) { clearTimeout(giveUp); setTimeout(go, 0); } };
  s.onerror = function () { clearTimeout(giveUp); };
  document.head.appendChild(s);
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  // Procedural studio environment for reflections (no HDR fetch).
  function envMap(THREE, renderer, tint) {
    const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(), g = new THREE.PlaneGeometry(1, 1);
    s.background = new THREE.Color(0x0b0c09);
    const add = (hex, k, x, y, z, sx, sy) => {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.scale.set(sx, sy, 1); m.lookAt(0, 0, 0); s.add(m);
    };
    add(0xffffff, 4, 0, 7, 2, 10, 4); add(0xffffff, 2.5, -7, 1, 3, 3, 9); add(tint || 0xc6ff00, 3, 7, -1, 2, 3, 8);
    add(0xffffff, 1.2, 0, 2, -8, 14, 3); add(tint || 0xc6ff00, 1.4, 0, -6, 0, 12, 12);
    const t = pm.fromScene(s, 0.035).texture; pm.dispose(); return t;
  }

  function go() {
    var THREE = window.THREE, renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.setClearColor(0x000000, 0);
    var st = { p: 0, tap: 0, px: 0, py: 0, tx: 0, ty: 0, w: 1, h: 1 };
    var api = init(THREE, renderer, st, { envMap: envMap });
    var visible = true, running = false, raf = 0, last = 0, t = 0;
    function draw() { renderer.render(api.scene, api.camera); }
    function progress() { var r = hero.getBoundingClientRect(); return clamp(-r.top / Math.max(r.height * 0.7, 1) + 0.0, 0, 1); }
    function size() { var r = stage.getBoundingClientRect(); st.w = Math.max(1, r.width); st.h = Math.max(1, r.height); renderer.setSize(st.w, st.h, false); api.resize(st.w, st.h); if (!running) { api.tick(t, 0, st); draw(); } }
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
      st.p = Math.max(progress(), st.tap); var k = Math.min(1, dt * 3.5);
      st.px += (st.tx - st.px) * k; st.py += (st.ty - st.py) * k;
      api.tick(t, dt, st); draw(); raf = running ? requestAnimationFrame(frame) : 0;
    }
    function sync() {
      var want = visible && !document.hidden;
      if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!want && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener("visibilitychange", sync);
    new ResizeObserver(size).observe(stage);
    addEventListener("pointermove", function (e) { st.tx = e.clientX / innerWidth * 2 - 1; st.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    stage.addEventListener("pointerdown", function () { st.tap = st.tap > 0.5 ? 0 : 1; });
    size(); hero.classList.add("gl-on"); sync();
  }
  function init(THREE, renderer, st, kit) {

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const F = (w, s) => `${w} ${s}px Archivo, sans-serif`, B = (w, s) => `${w} ${s}px "Instrument Sans", sans-serif`;
  const LIME = '#C6FF00', INK = '#0E0F0C', PAPER = '#F6F8EF';
  const W = 600, H = 800, maxAniso = renderer.capabilities.getMaxAnisotropy();

  function card(draw) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    draw(x); x.font = B(700, 18); const tw = x.measureText('SAMPLE').width + 28; // every texture carries a SAMPLE tag
    x.fillStyle = 'rgba(14,15,12,.85)'; rr(x, W - tw - 24, 24, tw, 36, 18); x.fill(); x.fillStyle = LIME; x.fillText('SAMPLE', W - tw - 10, 48);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso); return t;
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function dia(x, cx, cy, s, c) { x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.fill(); }
  const pages = [
    x => { x.fillStyle = PAPER; x.fillRect(0, 0, W, H); x.fillStyle = INK; x.font = B(700, 22); x.fillText('CRIER DECK', 48, 92);
      x.font = F(900, 92); x.fillText('Sample', 44, 380); x.fillText('Café', 44, 470); x.fillStyle = LIME; x.fillRect(48, 520, 220, 18);
      x.fillStyle = '#5d6250'; x.font = B(500, 24); x.fillText('Brand on every surface', 48, 590); x.fillText('Page 01 of 07', 48, 736); },
    x => { x.fillStyle = '#121410'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2f3425'; x.lineWidth = 6; rr(x, 30, 30, W - 60, H - 60, 20); x.stroke();
      x.fillStyle = PAPER; x.font = F(900, 96); x.fillText('MENU', 70, 190); dia(x, 470, 150, 22, LIME);
      [['Flat white', 'hot'], ['Cardamom bun', 'fresh'], ["Za'atar croissant", '7am'], ['Iced tea', 'cold'], ['Date cake', 'sweet']].forEach(([a, b], i) => {
        const y = 300 + i * 88; x.fillStyle = '#E6E9DD'; x.font = B(500, 32); x.fillText(a, 70, y); x.fillStyle = LIME; x.font = B(600, 22); x.textAlign = 'right'; x.fillText(b, 530, y); x.textAlign = 'left';
        x.strokeStyle = '#3a3f30'; x.setLineDash([3, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(70, y + 26); x.lineTo(530, y + 26); x.stroke(); x.setLineDash([]); }); },
    x => { x.fillStyle = LIME; x.fillRect(0, 0, W, H); x.fillStyle = '#2b3122'; x.beginPath(); x.moveTo(190, 120); x.lineTo(410, 120); x.lineTo(410, 230); x.lineTo(540, 330); x.lineTo(500, 760); x.lineTo(100, 760); x.lineTo(60, 330); x.lineTo(190, 230); x.closePath(); x.fill();
      x.strokeStyle = '#2b3122'; x.lineWidth = 10; x.beginPath(); x.moveTo(190, 125); x.quadraticCurveTo(300, -30, 410, 125); x.stroke();
      x.fillStyle = LIME; x.font = F(900, 50); x.textAlign = 'center'; x.fillText('Sample', 300, 440); x.fillText('Café', 300, 494); dia(x, 300, 360, 14, LIME); x.textAlign = 'left';
      x.fillStyle = INK; x.font = B(700, 22); x.fillText('APRON', 48, 92); },
    x => { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a3020'); g.addColorStop(1, '#0f110b'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = LIME; x.beginPath(); x.arc(420, 260, 150, 0, Math.PI * 2); x.fill(); x.fillStyle = '#E9ECDF'; x.beginPath(); x.arc(300, 330, 110, 0, Math.PI * 2); x.fill();
      x.fillStyle = PAPER; x.font = F(900, 84); x.fillText('Fresh', 44, 600); x.fillText('at 7.', 44, 680); x.fillStyle = '#A9AE9F'; x.font = B(600, 24); x.fillText('@samplebakery  ·  post', 48, 740); },
    x => { x.fillStyle = PAPER; x.fillRect(0, 0, W, H); x.fillStyle = INK; x.font = B(700, 22); x.fillText('SNAPSHOT', 48, 92); x.font = F(900, 60); x.fillText('Sample', 44, 180); x.fillText('Bakery', 44, 240);
      ['Hours differ on the map', 'Menu is a photo', 'No post in six weeks'].forEach((s, i) => { const y = 330 + i * 100; x.fillStyle = '#d9ddcd'; x.fillRect(48, y - 44, 504, 2);
        x.fillStyle = '#B8F000'; rr(x, 48, y - 22, 40, 40, 8); x.fill(); x.fillStyle = INK; x.font = B(700, 22); x.fillText(String(i + 1), 62, y + 6); x.font = B(500, 28); x.fillText(s, 108, y + 8); });
      x.fillStyle = INK; rr(x, 48, 640, 504, 96, 16); x.fill(); x.fillStyle = LIME; x.font = B(700, 26); x.fillText('1 fix  ·  3 posts', 76, 698); },
    x => { x.fillStyle = '#1a1d14'; x.fillRect(0, 0, W, H); x.fillStyle = PAPER; rr(x, 80, 210, 440, 330, 26); x.fill(); x.fillStyle = '#B8F000'; x.fillRect(80, 490, 440, 50);
      x.fillStyle = '#5d6250'; x.font = B(700, 22); x.fillText('SAMPLE SALON', 120, 280); x.fillStyle = INK; x.font = F(900, 58); x.fillText("Hi, I'm", 116, 370); x.fillText('Lina', 116, 432);
      x.fillStyle = '#A9AE9F'; x.font = B(700, 22); x.fillText('NAME BADGE', 48, 92); },
    x => { x.fillStyle = INK; x.fillRect(0, 0, W, H); x.fillStyle = '#1f2318'; x.fillRect(40, 240, 520, 300); x.strokeStyle = LIME; x.lineWidth = 8; x.strokeRect(56, 256, 488, 268);
      x.fillStyle = LIME; x.font = F(900, 80); x.textAlign = 'center'; x.fillText('SAMPLE', 300, 380); x.fillStyle = PAPER; x.font = F(800, 50); x.fillText('HAIR STUDIO', 300, 460); x.textAlign = 'left';
      x.fillStyle = '#A9AE9F'; x.font = B(700, 22); x.fillText('SIGNAGE', 48, 92); x.fillStyle = '#2a2e22'; x.fillRect(120, 540, 14, 200); x.fillRect(466, 540, 14, 200); }
  ];
  const N = pages.length, cw = 1.5, ch = 2;
  const geo = new THREE.BoxGeometry(cw, ch, 0.02);
  const edge = new THREE.MeshStandardMaterial({ color: 0xdfe3d3, roughness: 0.7 }), back = new THREE.MeshStandardMaterial({ roughness: 0.7, map: (() => { const c = document.createElement('canvas'); c.width = 300; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = '#16190f'; x.fillRect(0, 0, 300, 400); for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) dia(x, 25 + i * 50 + (j % 2) * 25, 25 + j * 50, 5, 'rgba(198,255,0,.22)');
    dia(x, 150, 200, 26, LIME); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })() });
  const deck = new THREE.Group(); scene.add(deck);
  const cards = pages.map((d, i) => {
    const front = new THREE.MeshStandardMaterial({ map: card(d), roughness: 0.55, metalness: 0.0 });
    const m = new THREE.Mesh(geo, [edge, edge, edge, edge, front, back]); m.userData.i = i; deck.add(m); return m;
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223000, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(-2, 3, 5); scene.add(key);
  const lime = new THREE.PointLight(0xc6ff00, 0.7, 14); lime.position.set(3, -2, 2); scene.add(lime);

  const ease = (v) => v * v * (3 - 2 * v), lerp = (a, b, k) => a + (b - a) * k;
  return {
    scene, camera,
    resize(w, h) { camera.aspect = w / h; camera.position.set(0, 0, Math.max(8.4, 2.9 / (0.2867 * camera.aspect))); camera.updateProjectionMatrix(); },
    tick(t, dt, s) {
      const e = ease(Math.min(1, s.p * 1.25)), spin = t * 0.12 + e * Math.PI * 1.2;
      cards.forEach((m) => {
        const i = m.userData.i, c = i - (N - 1) / 2;
        // A: fanned hand of cards.  B: an orbiting ring around the deck centre.
        const ax = c * 0.34, ay = -Math.abs(c) * 0.07 + Math.sin(t * 0.9 + i) * 0.04, az = -Math.abs(c) * 0.06 + i * 0.012;
        const a = (i / N) * Math.PI * 2 + spin, R = 2.6;
        const bx = Math.sin(a) * R, by = Math.sin(a * 2 + t * 0.4) * 0.35, bz = Math.cos(a) * R - 1.6;
        m.position.set(lerp(ax, bx, e), lerp(ay, by, e), lerp(az, bz, e));
        m.rotation.set(lerp(-0.08, 0, e), lerp(-0.32 + c * 0.04, a, e), lerp(-c * 0.13, 0, e));
      });
      deck.rotation.y = s.px * 0.35 + (1 - e) * Math.sin(t * 0.3) * 0.12; deck.rotation.x = s.py * 0.18 + e * 0.12;
      camera.lookAt(0, 0, 0);
    }
  };

  }
})();
