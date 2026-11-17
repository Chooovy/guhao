/* Hao Gu — site behaviour (no dependencies) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- top bar border + scroll spy + reading progress ---------- */
  var bar = $('#topbar'), prog = $('#progress');
  var spy = $$('.nav a[data-spy]').map(function (a) {
    return { a: a, el: document.getElementById(a.getAttribute('href').split('#')[1]) };
  }).filter(function (x) { return x.el; });
  function onScroll() {
    var y = window.scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 8);
    if (spy.length) {
      var cur = null;
      spy.forEach(function (s) { if (s.el.getBoundingClientRect().top < 160) cur = s; });
      spy.forEach(function (s) { s.a.classList.toggle('is-active', s === cur); });
    }
    if (prog) {
      var h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- news: show all ---------- */
  var more = $('#news-more'), log = $('#news-log');
  if (more && log) more.addEventListener('click', function () {
    var open = log.classList.toggle('is-open');
    more.setAttribute('aria-expanded', open);
    more.textContent = open ? 'Show less' : 'Show all ' + log.children.length;
  });

  /* ---------- publications: selected (default) · all · by theme ---------- */
  var pubs = $$('.pub'), groups = $$('.year-group'), segs = $$('.seg-btn[data-filter]');
  var emptyMsg = $('#pubs-empty'), allBtn = $('#pubs-all');
  var state = 'selected';
  function applyFilter() {
    var shown = 0;
    pubs.forEach(function (p) {
      var ok = state === 'all' ||
        (state === 'selected' ? p.dataset.selected === '1'
                              : (' ' + p.dataset.themes + ' ').indexOf(' ' + state + ' ') > -1);
      p.hidden = !ok;
      if (ok) shown++;
    });
    groups.forEach(function (g) { g.hidden = !$$('.pub:not([hidden])', g).length; });
    segs.forEach(function (c) {
      var on = c.dataset.filter === state;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on);
    });
    if (emptyMsg) emptyMsg.hidden = shown > 0;
    if (allBtn) allBtn.parentNode.hidden = state !== 'selected';
  }
  segs.forEach(function (c) { c.addEventListener('click', function () { state = c.dataset.filter; applyFilter(); }); });
  if (allBtn) allBtn.addEventListener('click', function () { state = 'all'; applyFilter(); });
  $$('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () {
      state = b.dataset.goto; applyFilter();
      var sec = document.getElementById('publications');
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  if (segs.length) applyFilter();

  /* ---------- WeChat QR dialog ---------- */
  var dlg = $('#wechat-dialog');
  if (dlg) {
    $$('[data-wechat]').forEach(function (b) {
      b.addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // click backdrop to close
    if (location.hash === '#wechat' && dlg.showModal) dlg.showModal();                    // shareable: /#wechat
    if (location.hash === '#wechat' && dlg.showModal) dlg.showModal();                    // shareable: /#wechat
    var cp = $('#wechat-copy');
    if (cp) cp.addEventListener('click', function () {
      var id = cp.parentNode.querySelector('b').textContent.trim();
      (navigator.clipboard ? navigator.clipboard.writeText(id) : Promise.reject()).then(function () {
        cp.textContent = 'Copied ✓'; setTimeout(function () { cp.textContent = 'Copy ID'; }, 1600);
      }, function () { cp.textContent = id; });
    });
  }

  /* ---------- helpers ---------- */
  function rng(seed) {                                   // deterministic PRNG (mulberry32)
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function fit(cv) {
    var r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * DPR));
    cv.height = Math.max(1, Math.round(r.height * DPR));
    var ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  /* ---------- statement card: a quiet "delta" of branching streams ---------- */
  var delta = $('#delta');
  if (delta) (function () {
    function draw() {
      var f = fit(delta), ctx = f.ctx, w = f.w, h = f.h, R = rng(11);
      ctx.clearRect(0, 0, w, h);
      var bg = ctx.createRadialGradient(w * .85, h * .2, 0, w * .85, h * .2, w * .9);
      bg.addColorStop(0, '#22252B'); bg.addColorStop(1, '#131314');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      var streams = [];
      for (var i = 0; i < 14; i++) streams.push({ x: w * (.25 + R() * .8), y: -10, a: Math.PI / 2 + (R() - .5) * .9, wd: 2.6 + R() * 2, life: 0 });
      var steps = 0;
      while (streams.length && steps++ < 6000) {
        var s = streams.pop();
        ctx.beginPath(); ctx.moveTo(s.x, s.y);
        for (var k = 0; k < 400; k++) {
          s.a += (R() - .5) * .28;
          s.a += (Math.PI / 2 + .35 - s.a) * .02;           // drift down-left, like water
          var nx = s.x + Math.cos(s.a) * 6, ny = s.y + Math.sin(s.a) * 6;
          ctx.lineTo(nx, ny); s.x = nx; s.y = ny; s.life++;
          if (ny > h + 20 || nx < -20 || nx > w + 20) break;
          if (s.wd > .5 && R() < .045) {                   // branch
            streams.push({ x: s.x, y: s.y, a: s.a + (R() < .5 ? -1 : 1) * (.35 + R() * .5), wd: s.wd * (.55 + R() * .25), life: 0 });
            s.wd *= .82;
          }
        }
        var g = s.wd / 4.6;
        ctx.strokeStyle = 'rgba(' + (150 + 60 * g | 0) + ',' + (185 + 40 * g | 0) + ',250,' + (.12 + .3 * g) + ')';
        ctx.lineWidth = s.wd; ctx.stroke();
      }
      // keep the text side calm
      var fade = ctx.createLinearGradient(0, 0, w, 0);
      fade.addColorStop(0, 'rgba(19,19,20,.9)'); fade.addColorStop(.5, 'rgba(19,19,20,.45)'); fade.addColorStop(1, 'rgba(19,19,20,0)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(delta); else addEventListener('resize', draw);
  })();

  /* ---------- hero particle field ----------
     A Canvas-2D port of the light-theme particle ring on antigravity.google:
     Poisson-disc points, a breathing ring that lazily follows the pointer,
     capsules oriented radially to the ring, sized by a ring band + large-scale
     noise (tiny ones vanish → patches), coloured by noise (blue → red → yellow)
     and darkened when slow. Simulation mirrors their fragment shader. */
  function makeNoise(seed) {                              // 3D simplex noise, ~[-1, 1]
    var R = rng(seed), p = new Uint8Array(256), i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = Math.floor(R() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
    var perm = new Uint8Array(512), pm = new Uint8Array(512);
    for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12 * 3; }
    var g = [1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1];
    var F3 = 1 / 3, G3 = 1 / 6;
    function c(t, gi, x, y, z) { if (t < 0) return 0; t *= t; return t * t * (g[gi] * x + g[gi + 1] * y + g[gi + 2] * z); }
    return function (x, y, z) {
      var s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
      var t = (i + j + k) * G3, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t, i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      var x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      var ii = i & 255, jj = j & 255, kk = k & 255;
      return 32 * (
        c(.6 - x0 * x0 - y0 * y0 - z0 * z0, pm[ii + perm[jj + perm[kk]]], x0, y0, z0) +
        c(.6 - x1 * x1 - y1 * y1 - z1 * z1, pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1) +
        c(.6 - x2 * x2 - y2 * y2 - z2 * z2, pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2) +
        c(.6 - x3 * x3 - y3 * y3 - z3 * z3, pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3));
    };
  }
  function poisson(w, h, r, R) {                          // Bridson, returns flat [x0,y0,x1,y1,...]
    var cs = r / Math.SQRT2, gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
    var grid = new Int32Array(gw * gh).fill(-1), pts = [], active = [];
    function add(x, y) { var id = pts.length / 2; pts.push(x, y); active.push(id); grid[(y / cs | 0) * gw + (x / cs | 0)] = id; }
    add(w * R(), h * R());
    while (active.length) {
      var ai = R() * active.length | 0, id = active[ai], px = pts[id * 2], py = pts[id * 2 + 1], ok = false;
      for (var n = 0; n < 20; n++) {
        var a = R() * 6.2832, d = r * (1 + R() * .3), x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        var gx = x / cs | 0, gy = y / cs | 0, far = true;
        for (var yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && far; yy++)
          for (var xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
            var q = grid[yy * gw + xx];
            if (q >= 0) { var ex = pts[q * 2] - x, ey = pts[q * 2 + 1] - y; if (ex * ex + ey * ey < r * r) { far = false; break; } }
          }
        if (far) { add(x, y); ok = true; break; }
      }
      if (!ok) active.splice(ai, 1);
    }
    return pts;
  }

  var field = $('#field');
  if (field) (function () {
    var host = field.parentNode, ctx, W = 0, H = 0, K = 1, N = 0, raf = 0, visible = false, inView = false;
    var RX, RY, PX, PY, SC, VE;                            // ref pos, sim pos, scale, velocity
    var snoise = makeNoise(3);
    // light-theme settings from antigravity.google's hero
    var RING_W = .006, RING_W2 = .107, DISP = .62, SPACING = .0172, SIZE = 1;
    var C1 = [44, 100, 237], C2 = [248, 66, 66], C3 = [255, 207, 3];
    var ring = { x: 0, y: 0 }, cursor = { x: 0, y: 0 }, over = false, mx = 0, my = 0;
    var t0 = performance.now(), last = t0;

    function ss(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

    function build() {
      var f = fit(field); ctx = f.ctx; W = f.w; H = f.h;
      K = Math.min(H, W * 1.15) / .4514;                   // px per local unit (their camera: half-height .2257)
      var hw = W / 2 / K / 1.25 + .06, hh = H / 2 / K / 1.25 + .06;   // field renders at 1.25× its refs
      var pts = poisson(hw * 2, hh * 2, SPACING, rng(5));
      N = pts.length / 2;
      RX = new Float32Array(N); RY = new Float32Array(N); PX = new Float32Array(N); PY = new Float32Array(N);
      SC = new Float32Array(N); VE = new Float32Array(N);
      for (var i = 0; i < N; i++) {
        RX[i] = pts[i * 2] - hw; RY[i] = pts[i * 2 + 1] - hh;
        PX[i] = RX[i] * 1.25; PY[i] = RY[i] * 1.25;
      }
      SIZE = Math.max(.8, Math.min(1.15, W / 1440)) * 1.2;
    }

    function step(now) {
      raf = 0;
      if (!visible) return;
      var T = (now - t0) / 1000, time = T * .5;
      // ring target: pointer when over the hero, otherwise a slow noise wander around the centre
      var n = snoise(T * .66 + 94.234, 0, 0), r = snoise(0, T * .75 + 21.028, 0);
      if (over) {
        cursor.x = mx * .875 + n * .1; cursor.y = my * .875 + r * .1;
        ring.x += (cursor.x - ring.x) * .02; ring.y += (cursor.y - ring.y) * .02;
      } else {
        cursor.x = n * .2; cursor.y = r * .1;
        ring.x += (cursor.x - ring.x) * .01; ring.y += (cursor.y - ring.y) * .01;
      }
      var Rr = .175 + Math.sin(T) * .03 + Math.cos(T * 3) * .02;
      var cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (var i = 0; i < N; i++) {
        var rx = RX[i], ry = RY[i];
        // ---- simulation (mirrors their sim shader) ----
        var px = PX[i] * .8, py = PY[i] * .8;
        var dx = rx - ring.x, dy = ry - ring.y, dist = Math.sqrt(dx * dx + dy * dy);
        var n0 = snoise(rx * .2 + 18.4924, ry * .2 + 72.9744, time * .5);
        var ex = dx + n0 * .005, ey = dy + n0 * .005, dist1 = Math.sqrt(ex * ex + ey * ey);
        var t = ss(Rr - RING_W * 2, Rr, dist) - ss(Rr, Rr + RING_W, dist1);
        var t2 = ss(Rr - RING_W2 * 2, Rr, dist) - ss(Rr, Rr + RING_W2, dist1);
        var t3 = ss(Rr + RING_W2, Rr, dist);
        t = t > 0 ? t * t : 0;
        t2 = t2 > 0 ? t2 * t2 * t2 : 0;
        t += t2 * 3 + t3 * .4;
        if (t3 > 0) t += snoise(rx * 30 + 11.4924, ry * 30 + 12.9744, time * .5) * t3 * .5;
        var nS = (snoise(rx * 2 + 18.4924, ry * 2 + 72.9744, time * .5) + 1.5) * .5;
        t += nS * nS * .6;
        var qx = rx + snoise(rx * 4 + 88.494, ry * 4 + 32.4397, time * .35) * .03 + snoise(rx * 20 + 18.4924, ry * 20 + 72.9744, time * .5) * .005;
        var qy = ry + snoise(rx * 4 + 50.904, ry * 4 + 120.947, time * .35) * .03 + snoise(rx * 20 + 50.904, ry * 20 + 120.947, time * .5) * .005;
        var dc = dist < 1 ? dist : 1;
        qx += Math.sin(rx * 20 + time * 4) * .02 * dc;
        qy += Math.cos(ry * 20 + time * 3) * .02 * dc;
        if (t2 > 0) { var f = Math.pow(t2, .75) * DISP; px -= (ring.x - qx) * f; py -= (ring.y - qy) * f; }
        var sc = SC[i] + (t - SC[i]) * .2;
        var fx = qx + px * .25, fy = qy + py * .25;
        var ve = VE[i] * .5 + sc * .25;
        PX[i] = fx; PY[i] = fy; SC[i] = sc; VE[i] = ve;

        // ---- render (mirrors their point shader) ----
        if (sc < .1) continue;
        var alpha = ss(.1, .2, sc);
        var sx = cx + fx * K, sy = cy + fy * K;
        if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
        var na = snoise(fx * 10 + 18.4924, fy * 10 + 72.9744, T * .85);
        var nc = (snoise(fx * 2 + 74.664, fy * 2 + 91.556, T * .5) + 1) * .5;
        var ang = Math.atan2(fy - ring.y, fx - ring.x) + na * .5;
        var pr = ss(0, .75, Math.pow(nc, 1.4)), A, B, m;
        if (pr < .8) { A = C1; B = C2; m = pr / .8; } else { A = C2; B = C3; m = (pr - .8) / .2; }
        var v = ve < 0 ? 0 : ve > 1 ? 1 : ve;
        // size grows super-linearly with scale → the ring band pops, the rest stays a fine dust
        var L = Math.pow(sc, 1.5) * SIZE, th = L * .3;
        if (th < .85) th = .85;
        if (L < th) L = th;
        alpha *= .3 + .7 * v;
        var hl = Math.max(0, L - th) / 2, ca = Math.cos(ang) * hl, sa = Math.sin(ang) * hl;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgb(' + (A[0] + (B[0] - A[0]) * m | 0) + ',' + (A[1] + (B[1] - A[1]) * m | 0) + ',' + (A[2] + (B[2] - A[2]) * m | 0) + ')';
        ctx.lineWidth = th;
        ctx.beginPath(); ctx.moveTo(sx - ca, sy - sa); ctx.lineTo(sx + ca + .01, sy + sa); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }
    function start() { if (!raf && visible) raf = requestAnimationFrame(step); }
    addEventListener('pointermove', function (e) {
      var r = field.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      over = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      mx = (x - r.width / 2) / K; my = (y - r.height / 2) / K;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { over = false; });

    build();
    if (reduce) {                                         // settle a few steps, draw one still frame
      visible = true;
      for (var s = 0; s < 40; s++) { step(t0 + s * 16); cancelAnimationFrame(raf); raf = 0; }
      visible = false; return;
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; visible = inView && !document.hidden; start(); }, { rootMargin: '100px' }).observe(host);
    } else { inView = visible = true; start(); }
    document.addEventListener('visibilitychange', function () { visible = inView && !document.hidden; start(); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
  })();

  /* ---------- shared: run a canvas loop only while it is on screen ---------- */
  function runVisible(el, draw) {
    var vis = false, raf = 0;
    function loop(t) { raf = 0; if (!vis || document.hidden) return; draw(t); raf = requestAnimationFrame(loop); }
    function kick() { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(loop); }
    if (reduce) { draw(performance.now()); return; }
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; kick(); }, { rootMargin: '100px' }).observe(el);
    else { vis = true; kick(); }
    document.addEventListener('visibilitychange', kick);
  }
  function onResize(el, fn) {
    if (window.ResizeObserver) { var first = true; new ResizeObserver(function () { if (first) { first = false; return; } fn(); }).observe(el); }
    else addEventListener('resize', fn);
  }

  /* ---------- research stage: grey dust + rotating dotted spheres ----------
     One sphere per research theme; hovering a theme card brings its sphere forward. */
  var orbs = $('#orbs');
  if (orbs) (function () {
    var stage = orbs.parentNode, ctx, W, H, dust = [], S = [], m = { x: .5, y: .5, tx: .5, ty: .5, px: -999, py: -999 }, active = -1;
    var cards = $$('.themes .theme');
    cards.forEach(function (c, i) {
      c.addEventListener('mouseenter', function () { active = i; });
      c.addEventListener('focus', function () { active = i; });
      c.addEventListener('mouseleave', function () { active = -1; });
      c.addEventListener('blur', function () { active = -1; });
    });
    function fib(n) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), th = i * 2.399963;
        pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
      }
      return pts;
    }
    function build() {
      var f = fit(orbs); ctx = f.ctx; W = f.w; H = f.h;
      var R = rng(21), g = 15; dust = [];
      for (var y = g / 2; y < H; y += g) for (var x = g / 2; x < W; x += g)
        if (R() < .82) dust.push({ x: x + (R() - .5) * g * .7, y: y + (R() - .5) * g * .7 });
      var wide = W >= 760, u = wide ? H : Math.min(W, H);
      var L = wide
        ? [{ x: .61, y: .36, r: .25 }, { x: .80, y: .64, r: .31 }, { x: .95, y: .22, r: .2 }]
        : [{ x: .24, y: .74, r: .2 }, { x: .62, y: .78, r: .26 }, { x: .9, y: .58, r: .17 }];
      S = L.map(function (o, i) {
        var rad = o.r * u, n = Math.max(160, Math.min(460, rad * 2.6 | 0));
        return { cx: o.x * W, cy: o.y * H, r: rad, pts: fib(n), spin: [.16, -.11, .21][i], tilt: [.35, -.25, .5][i], ph: i * 2.1, hl: 0, dim: 1 };
      });
    }
    stage.addEventListener('pointermove', function (e) {
      var r = orbs.getBoundingClientRect();
      m.px = e.clientX - r.left; m.py = e.clientY - r.top; m.tx = m.px / r.width; m.ty = m.py / r.height;
    });
    stage.addEventListener('pointerleave', function () { m.tx = m.ty = .5; m.px = m.py = -999; });

    function draw(now) {
      var T = now / 1000;
      m.x += (m.tx - m.x) * .05; m.y += (m.ty - m.y) * .05;
      ctx.clearRect(0, 0, W, H);
      // dust, with a small lens around the pointer
      ctx.fillStyle = 'rgba(95,99,104,.42)';
      for (var i = 0; i < dust.length; i++) {
        var d = dust[i], x = d.x, y = d.y, dx = x - m.px, dy = y - m.py, dd = dx * dx + dy * dy;
        if (dd < 8100) { var k = 1 - Math.sqrt(dd) / 90, p = k * k * 10 / (Math.sqrt(dd) + 1); x += dx * p; y += dy * p; }
        ctx.fillRect(x - .6, y - .6, 1.2, 1.2);
      }
      for (var s = 0; s < S.length; s++) {
        var o = S[s];
        o.hl += ((active === s ? 1 : 0) - o.hl) * .08;
        o.dim += ((active >= 0 && active !== s ? .35 : 1) - o.dim) * .08;
        var ay = T * o.spin + o.ph + (m.x - .5) * .7, ax = o.tilt + (m.y - .5) * .5;
        var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
        var R = o.r * (1 + .025 * Math.sin(T * .8 + o.ph)) * (1 + .1 * o.hl);
        for (var j = 0; j < o.pts.length; j++) {
          var P = o.pts[j];
          var x1 = P[0] * cy + P[2] * sy, z1 = -P[0] * sy + P[2] * cy;
          var y2 = P[1] * cx - z1 * sx, z2 = P[1] * sx + z1 * cx;
          var rip = 1 + .05 * o.hl * Math.sin(P[1] * 9 - T * 4);   // hover: a wave runs pole to pole
          var depth = (z2 + 1) * .5, sz = 1 + depth * 1.5 + o.hl * .5;
          ctx.globalAlpha = (.22 + .78 * depth) * o.dim;
          ctx.fillStyle = o.hl > .5 && depth > .6 ? '#1F1F1F' : '#2F5FF0';
          ctx.fillRect(o.cx + x1 * R * rip - sz / 2, o.cy + y2 * R * rip - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
    }
    build();
    onResize(orbs, build);
    runVisible(orbs, draw);
  })();

  /* ---------- footer card: "attention field" ----------
     Dots live in KV-style blocks. The pointer is the query: it selects the local block plus
     a few top-k blocks (scores drift with noise), which light up, lean toward the query and
     receive a pulse along a thin link — sparse attention, drawn. */
  var attn = $('#attn');
  if (attn) (function () {
    var card = attn.parentNode, ctx, W, H, D = [], B = [], cols = 0, BS = 6, gap = 18;
    var q = { x: 0, y: 0 }, tq = { x: 0, y: 0 }, over = false, nz = makeNoise(9);
    function build() {
      var f = fit(attn); ctx = f.ctx; W = f.w; H = f.h;
      gap = W < 700 ? 15 : 18;
      var R = rng(13), nx = Math.ceil(W / gap), ny = Math.ceil(H / gap);
      cols = Math.ceil(nx / BS);
      var rowsB = Math.ceil(ny / BS); B = []; D = [];
      for (var b = 0; b < cols * rowsB; b++) B.push({ i: b, sx: 0, sy: 0, n: 0, w: 0, x0: (b % cols) * BS * gap, y0: (b / cols | 0) * BS * gap });
      for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
        var bi = (j / BS | 0) * cols + (i / BS | 0), x = i * gap + gap / 2 + (R() - .5) * gap * .5, y = j * gap + gap / 2 + (R() - .5) * gap * .5;
        D.push({ hx: x, hy: y, b: bi, s: R() });
        B[bi].sx += x; B[bi].sy += y; B[bi].n++;
      }
      B.forEach(function (b) { b.cx = b.sx / b.n; b.cy = b.sy / b.n; });
      q.x = tq.x = W * .7; q.y = tq.y = H * .5;
    }
    card.addEventListener('pointermove', function (e) {
      var r = attn.getBoundingClientRect(); tq.x = e.clientX - r.left; tq.y = e.clientY - r.top; over = true;
    });
    card.addEventListener('pointerleave', function () { over = false; });

    function draw(now) {
      var T = now / 1000, i, b, d;
      if (!over) { tq.x = W * (.5 + .4 * Math.cos(T * .21)); tq.y = H * (.5 + .34 * Math.sin(T * .34)); }
      var k = over ? .1 : .03; q.x += (tq.x - q.x) * k; q.y += (tq.y - q.y) * k;
      // score blocks: mostly content (noise), a little locality → retrieval-like top-k
      var span = Math.max(W, H), sc = [];
      for (i = 0; i < B.length; i++) {
        b = B[i];
        var dist = Math.hypot(q.x - b.cx, q.y - b.cy) / span;
        sc.push([-.9 * dist + nz(b.i * .61, T * .12, 3.7) * .9, i]);
      }
      sc.sort(function (a, c) { return c[0] - a[0]; });
      var sel = {}, K = W < 700 ? 4 : 6;
      for (i = 0; i < K && i < sc.length; i++) sel[sc[i][1]] = 1;
      var qi = Math.min(B.length - 1, Math.floor(q.y / (BS * gap)) * cols + Math.floor(q.x / (BS * gap)));
      if (qi >= 0) { sel[qi] = 1; if (qi % cols) sel[qi - 1] = 1; }   // local window: own block + the one before
      for (i = 0; i < B.length; i++) B[i].w += ((sel[i] ? 1 : 0) - B[i].w) * .05;

      ctx.clearRect(0, 0, W, H);
      // selected blocks: faint frame
      for (i = 0; i < B.length; i++) {
        b = B[i]; if (b.w < .03) continue;
        ctx.strokeStyle = 'rgba(138,180,248,' + (.16 * b.w) + ')'; ctx.lineWidth = 1;
        ctx.strokeRect(b.x0 + 3, b.y0 + 3, BS * gap - 6, BS * gap - 6);
      }
      // links + pulses
      for (i = 0; i < B.length; i++) {
        b = B[i]; if (b.w < .03) continue;
        var mx = (q.x + b.cx) / 2, my = (q.y + b.cy) / 2, vx = b.cx - q.x, vy = b.cy - q.y;
        var cxp = mx - vy * .18, cyp = my + vx * .18;
        ctx.strokeStyle = 'rgba(138,180,248,' + (.28 * b.w) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.cx, b.cy); ctx.quadraticCurveTo(cxp, cyp, q.x, q.y); ctx.stroke();
        var u = (T * .55 + b.i * .137) % 1, iu = 1 - u;                // value flows block → query
        var px = iu * iu * b.cx + 2 * iu * u * cxp + u * u * q.x, py = iu * iu * b.cy + 2 * iu * u * cyp + u * u * q.y;
        ctx.globalAlpha = b.w; ctx.fillStyle = '#C6DAFC';
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      }
      // dots
      ctx.fillStyle = 'rgba(113,137,255,.32)';
      var lit = [];
      for (i = 0; i < D.length; i++) {
        d = D[i];
        var x = d.hx + nz(d.hx * .004, d.hy * .004, T * .1) * 5, y = d.hy + nz(d.hx * .004 + 40, d.hy * .004, T * .1) * 5;
        var w = B[d.b].w;
        if (w < .05) { ctx.fillRect(x - .65, y - .65, 1.3, 1.3); continue; }
        var ax = q.x - x, ay = q.y - y, al = Math.sqrt(ax * ax + ay * ay) || 1, pull = Math.min(16, al * .09) * w;
        lit.push(x + ax / al * pull, y + ay / al * pull, ax / al, ay / al, w * (.6 + .4 * d.s));
      }
      ctx.lineCap = 'round';
      for (i = 0; i < lit.length; i += 5) {
        var lw = lit[i + 4], len = 1.5 + 5 * lw;
        ctx.strokeStyle = 'rgb(' + (113 + 85 * lw | 0) + ',' + (137 + 83 * lw | 0) + ',255)';
        ctx.globalAlpha = .3 + .7 * lw; ctx.lineWidth = 1.3 + .7 * lw;
        ctx.beginPath(); ctx.moveTo(lit[i] - lit[i + 2] * len / 2, lit[i + 1] - lit[i + 3] * len / 2);
        ctx.lineTo(lit[i] + lit[i + 2] * len / 2, lit[i + 1] + lit[i + 3] * len / 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // the query
      var pr = (T * .8) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (.5 * (1 - pr)) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, 6 + pr * 22, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, 6.2832); ctx.fill();
      // keep the copy readable
      var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * .75);
      g.addColorStop(0, 'rgba(19,19,20,.72)'); g.addColorStop(.6, 'rgba(19,19,20,.35)'); g.addColorStop(1, 'rgba(19,19,20,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    build();
    onResize(attn, build);
    runVisible(attn, draw);
  })();
})();
