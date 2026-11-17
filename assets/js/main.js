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

  /* ---------- footer particle field (pointer-reactive) ---------- */
  var field = $('#field');
  if (field) (function () {
    var host = field.parentNode, ctx, W = 0, H = 0, P = [], raf = 0, visible = false;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false, last: -1e9 };
    // Google-ish palette, ordered so neighbouring hues blend across the field
    var PAL = [[66, 133, 244], [87, 103, 255], [123, 97, 255], [161, 66, 244], [234, 67, 53], [246, 118, 64], [251, 188, 4], [52, 168, 83], [66, 133, 244]];
    function pal(t) {
      t = ((t % 1) + 1) % 1 * (PAL.length - 1);
      var i = Math.floor(t), f = t - i, a = PAL[i], b = PAL[i + 1];
      return 'rgb(' + (a[0] + (b[0] - a[0]) * f | 0) + ',' + (a[1] + (b[1] - a[1]) * f | 0) + ',' + (a[2] + (b[2] - a[2]) * f | 0) + ')';
    }
    function build() {
      var f = fit(field); ctx = f.ctx; W = f.w; H = f.h;
      var R = rng(7), gap = W < 700 ? 30 : 36;
      P = [];
      for (var y = gap / 2; y < H; y += gap) for (var x = gap / 2; x < W; x += gap) {
        var hx = x + (R() - .5) * gap * .9, hy = y + (R() - .5) * gap * .9;
        P.push({
          hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0,
          a: R() * Math.PI * 2, spin: (R() - .5) * .6,
          len: 3 + R() * 4.5, ph: R() * 6.283,
          c: pal(hx / W * .55 + hy / H * .25 + (R() - .5) * .12),
          base: .22 + R() * .35
        });
      }
      mouse.x = mouse.tx = W * .5; mouse.y = mouse.ty = H * .5;
    }
    function frame(t) {
      raf = 0;
      if (!visible) return;
      var idle = !mouse.active && t - mouse.last > 1200;
      if (idle) {                                      // drift on its own when nobody is pointing
        mouse.tx = W * .5 + Math.cos(t * .00035) * W * .3;
        mouse.ty = H * .48 + Math.sin(t * .0006) * H * .26;
      }
      mouse.x += (mouse.tx - mouse.x) * (idle ? .04 : .14);
      mouse.y += (mouse.ty - mouse.y) * (idle ? .04 : .14);
      var Rr = Math.min(170, Math.max(110, W * .11)), R2 = Rr * 2.6;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var hx = p.hx + Math.sin(t * .0004 + p.ph) * 5, hy = p.hy + Math.cos(t * .00033 + p.ph * 1.7) * 5;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < Rr) {                                   // push out → a ring forms around the pointer
          var k = 1 - d / Rr; k = k * k * 9;
          p.vx += dx / d * k; p.vy += dy / d * k;
        }
        p.vx += (hx - p.x) * .028; p.vy += (hy - p.y) * .028;
        p.vx *= .86; p.vy *= .86;
        p.x += p.vx; p.y += p.vy;

        var near = d < R2 ? 1 - d / R2 : 0; near = near * near * (3 - 2 * near);
        var base = p.a + t * .00025 * p.spin;
        var ux = Math.cos(base) * (1 - near) + dx / d * near * 1.6, uy = Math.sin(base) * (1 - near) + dy / d * near * 1.6;
        var ul = Math.sqrt(ux * ux + uy * uy) || 1; ux /= ul; uy /= ul;
        var sp = Math.min(6, Math.abs(p.vx) + Math.abs(p.vy));
        var L = p.len * (1 + near * 1.3) + sp * 1.2;
        ctx.globalAlpha = Math.min(1, p.base + near * .85);
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 1.7 + near * .9;
        ctx.beginPath();
        ctx.moveTo(p.x - ux * L * .5, p.y - uy * L * .5);
        ctx.lineTo(p.x + ux * L * .5, p.y + uy * L * .5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function point(e) {
      var r = field.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      mouse.active = true; mouse.last = performance.now();
    }
    host.addEventListener('pointermove', point);
    host.addEventListener('pointerdown', point);
    host.addEventListener('pointerleave', function () { mouse.active = false; mouse.last = performance.now(); });

    build();
    if (reduce) { visible = true; frame(0); visible = false; return; }   // one static frame
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; start(); }, { rootMargin: '120px' }).observe(host);
    } else { visible = true; start(); }
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 120); });
  })();
})();
