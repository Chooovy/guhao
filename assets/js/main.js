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
})();
