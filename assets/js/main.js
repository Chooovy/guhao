/* Hao Gu — site behaviour (no dependencies) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  var tbtn = $('#theme-btn');
  if (tbtn) tbtn.addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    document.dispatchEvent(new CustomEvent('themechange'));
  });

  /* ---------- top bar border + scroll spy + reading progress ---------- */
  var bar = $('#topbar'), prog = $('#progress');
  var spy = $$('.nav a[data-spy]').map(function (a) {
    var id = a.getAttribute('href').split('#')[1];
    return { a: a, el: document.getElementById(id) };
  }).filter(function (x) { return x.el; });
  function onScroll() {
    var y = window.scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 8);
    if (spy.length) {
      var cur = null;
      spy.forEach(function (s) { if (s.el.getBoundingClientRect().top < 140) cur = s; });
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
    more.textContent = open ? 'Show less ↑' : 'Show all ' + log.children.length + ' ↓';
  });

  /* ---------- publication filters: selected (default) · all · by theme ---------- */
  var pubs = $$('.pub'), groups = $$('.year-group'), chips = $$('.chip[data-filter]');
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
    chips.forEach(function (c) {
      var on = c.dataset.filter === state;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on);
    });
    if (emptyMsg) emptyMsg.hidden = shown > 0;
    if (allBtn) allBtn.hidden = state === 'all';
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { state = c.dataset.filter; applyFilter(); }); });
  if (allBtn) allBtn.addEventListener('click', function () { state = 'all'; applyFilter(); });
  $$('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () {
      state = b.dataset.goto; applyFilter();
      var sec = document.getElementById('publications');
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  if (chips.length) applyFilter();

  /* ---------- quantized avatar ---------- */
  var card = $('#qcard');
  if (card) (function () {
    var img = $('#q-img'), cv = $('#q-canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    var btns = $$('.qbar button', card), dtype = $('#q-dtype'), sizeEl = $('#q-size'), ratioEl = $('#q-ratio');
    var W = 460, H = 460, src = null, timer = null, current = 16;
    var NAMES = { 16: 'FP16', 8: 'INT8', 4: 'INT4', 2: 'INT2', 1: '1-bit' };
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    function fmt(bytes) { return bytes >= 1e6 ? (bytes / 1e6).toFixed(2) + ' MB' : Math.round(bytes / 1e3) + ' KB'; }
    function cssColor(name) {
      var v = getComputedStyle(root).getPropertyValue(name).trim();
      var m = v.match(/^#([0-9a-f]{6})$/i);
      if (!m) return [23, 24, 28];
      var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }

    function render(bits) {
      current = bits;
      btns.forEach(function (b) { b.setAttribute('aria-checked', +b.dataset.bits === bits); });
      dtype.textContent = NAMES[bits];
      var full = W * H * 3 * 2;                                   // FP16 RGB
      var bytes = bits === 1 ? W * H / 8 : W * H * 3 * bits / 8;  // 1-bit: single channel
      sizeEl.textContent = fmt(bytes);
      ratioEl.textContent = bits === 16 ? 'full precision' : (full / bytes).toFixed(1) + '× smaller';

      if (bits === 16) { card.classList.remove('is-live'); return; }
      card.classList.add('is-live');

      if (bits === 1) {
        // 1-bit: luminance + Floyd–Steinberg at reduced resolution, painted in theme ink/paper
        var s = 3, w = Math.round(W / s), h = Math.round(H / s);
        var tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        var t = tmp.getContext('2d'); t.drawImage(img, 0, 0, w, h);
        var d = t.getImageData(0, 0, w, h), px = d.data, lum = new Float32Array(w * h), i, x, y;
        for (i = 0; i < w * h; i++) {
          var l0 = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
          lum[i] = Math.max(0, Math.min(1, (l0 - 0.5) * 1.5 + 0.47));   // a bit more contrast
        }
        var ink = cssColor('--ink'), paper = cssColor('--card');
        var Y = function (c) { return c[0] * .299 + c[1] * .587 + c[2] * .114; };
        var dark = Y(ink) < Y(paper) ? ink : paper, light = dark === ink ? paper : ink;
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          i = y * w + x;
          var o = lum[i] < 0.5 ? 0 : 1, e = lum[i] - o;
          if (x + 1 < w) lum[i + 1] += e * 7 / 16;
          if (y + 1 < h) {
            if (x > 0) lum[i + w - 1] += e * 3 / 16;
            lum[i + w] += e * 5 / 16;
            if (x + 1 < w) lum[i + w + 1] += e * 1 / 16;
          }
          var c = o ? light : dark;
          px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255;
        }
        t.putImageData(d, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(tmp, 0, 0, W, H);
        return;
      }

      // k-bit per channel: uniform quantization with a light ordered dither
      var out = ctx.createImageData(W, H), o2 = out.data, L = (1 << bits) - 1, step = 255 / L;
      var amp = bits <= 2 ? 0.9 : bits <= 4 ? 0.5 : 0;
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
        var k = (yy * W + xx) * 4, bias = amp ? (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.5) * amp : 0;
        for (var ch = 0; ch < 3; ch++) {
          var q = Math.round(src[k + ch] / step + bias);
          o2[k + ch] = (q < 0 ? 0 : q > L ? L : q) * step;
        }
        o2[k + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
    }

    function ready() {
      try {
        var t = document.createElement('canvas'); t.width = W; t.height = H;
        var c = t.getContext('2d'); c.drawImage(img, 0, 0, W, H);
        src = c.getImageData(0, 0, W, H).data;   // throws on file:// (tainted canvas)
      } catch (e) { return; }                     // graceful: plain image stays
      card.classList.add('is-ready');
      btns.forEach(function (b) {
        b.addEventListener('click', function () { clearInterval(timer); render(+b.dataset.bits); });
      });
      document.addEventListener('themechange', function () { if (current === 1) render(1); });
      var forced = +(new URLSearchParams(location.search).get('bits') || 0);
      if (NAMES[forced]) { render(forced); return; }  // e.g. /?bits=1
      if (!reduce) {                              // intro: de-quantize 1 → 16
        var seq = [1, 2, 4, 8, 16], n = 0;
        render(seq[n++]);
        timer = setInterval(function () { render(seq[n++]); if (n >= seq.length) clearInterval(timer); }, 380);
      }
    }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready);
  })();

  /* ---------- footer: page weight ---------- */
  addEventListener('load', function () {
    var el = $('#page-weight');
    if (!el || !window.performance || !performance.getEntriesByType) return;
    setTimeout(function () {
      var total = 0;
      performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource'))
        .forEach(function (e) { total += e.transferSize || 0; });
      if (total > 0) { el.textContent = 'This page: ' + Math.round(total / 1024) + ' KB over the wire'; el.hidden = false; }
    }, 600);
  });
})();
