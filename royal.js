/* =====================================================================
   PRIME TURN — royal effects (visual only; never touches site logic)
   - floating gold dust, sparkle trail (mouse), sparkle burst (tap/click)
   - 3D tilt on the balance card / plan cards, light-sweep on balance card
   - crown emblem on the sign-in / sign-up screens
   - gold scroll-progress line (index)
   Delete the <script src="royal.js"> line to switch it all off.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var isSite = root.classList.contains('rt-site');
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;

  /* ---------- gold gradient for icons (referenced by royal.css) ---------- */
  if (!document.getElementById('rtDefs')) {
    var d = document.createElement('div');
    d.id = 'rtDefs';
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<svg width="0" height="0" focusable="false"><defs>' +
      '<linearGradient id="rtGoldG" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">' +
      '<stop offset="0" stop-color="#FFF6CF"/><stop offset=".45" stop-color="#F3C84A"/><stop offset=".75" stop-color="#D4AF37"/><stop offset="1" stop-color="#F6E7A8"/>' +
      '</linearGradient></defs></svg>';
    (document.body || root).insertBefore(d, (document.body || root).firstChild);
  }

  /* ---------- canvas: dust + sparkles ---------- */
  var cv, cx, W = 0, H = 0, dpr = 1, motes = [], sparks = [], running = false, last = 0;
  function setup() {
    if (reduce || cv) return;
    cv = document.createElement('canvas');
    cv.id = 'rtMotes';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    cx = cv.getContext('2d');
    size();
    addEventListener('resize', size);
    if (!isSite) {
      for (var i = 0; i < 22; i++) motes.push(mote(true));
    }
    start();
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function mote(rand) {
    return {
      x: Math.random() * W, y: rand ? Math.random() * H : H + 10,
      r: .6 + Math.random() * 1.7, vy: -(.12 + Math.random() * .3),
      vx: (Math.random() - .5) * .18, a: .15 + Math.random() * .5,
      ph: Math.random() * 6.28, sp: .01 + Math.random() * .02
    };
  }
  function star(x, y, r, a) {
    cx.save(); cx.translate(x, y); cx.globalAlpha = a;
    cx.fillStyle = '#FFF3C4';
    cx.beginPath();
    for (var i = 0; i < 8; i++) {
      var rr = i % 2 ? r * .28 : r, ang = i * Math.PI / 4;
      cx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    cx.closePath(); cx.fill();
    cx.globalAlpha = a * .35; cx.fillStyle = '#D4AF37';
    cx.beginPath(); cx.arc(0, 0, r * 1.5, 0, 6.28); cx.fill();
    cx.restore();
  }
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (t - last < 33) return; /* ~30fps keeps phones cool */
    last = t;
    cx.clearRect(0, 0, W, H);
    var i, m, s;
    for (i = 0; i < motes.length; i++) {
      m = motes[i]; m.ph += m.sp; m.x += m.vx + Math.sin(m.ph) * .25; m.y += m.vy;
      if (m.y < -10) motes[i] = mote(false);
      cx.globalAlpha = m.a * (.55 + .45 * Math.sin(m.ph * 2));
      cx.fillStyle = '#F6E7A8';
      cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.28); cx.fill();
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += .06; s.vx *= .985; s.l -= .028;
      if (s.l <= 0) { sparks.splice(i, 1); continue; }
      star(s.x, s.y, s.r * (.5 + s.l), Math.min(1, s.l * 1.4));
    }
    cx.globalAlpha = 1;
  }
  function start() {
    if (running || !cv) return;
    running = true; requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false; else start();
  });
  function burst(x, y, n, spread) {
    if (!cv) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, v = (.6 + Math.random() * 2.2) * (spread || 1);
      sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, r: 2 + Math.random() * 3.4, l: .8 + Math.random() * .6 });
    }
    if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
  }
  addEventListener('pointerdown', function (e) { burst(e.clientX, e.clientY, 14, 1); }, { passive: true });
  if (fine) {
    var lt = 0;
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var n = Date.now(); if (n - lt < 45) return; lt = n;
      burst(e.clientX, e.clientY, 1, .35);
    }, { passive: true });
  }

  /* ---------- 3D tilt ---------- */
  function tilt(sel, max) {
    if (!fine || reduce) return;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var el = e.target.closest && e.target.closest(sel);
      if (!el) return;
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(900px) rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' + (-py * max).toFixed(2) + 'deg) translateZ(0)';
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest && e.target.closest(sel);
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) el.style.transform = '';
    }, { passive: true });
  }
  tilt('.balance', 7);
  if (isSite) tilt('.tier', 6);

  /* ---------- decorations that need markup ---------- */
  var crownN = 0;
  function crown() {
    var id = 'rtCr' + (++crownN);
    return CROWN.replace(/rtCr/g, id);
  }
  var CROWN = '<svg class="rt-crown" viewBox="0 0 64 44" aria-hidden="true">' +
    '<defs><linearGradient id="rtCr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6CF"/><stop offset=".5" stop-color="#D4AF37"/><stop offset="1" stop-color="#8A6A1C"/></linearGradient></defs>' +
    '<path d="M6 36 3 12l15 12L32 4l14 20L61 12 58 36Z" fill="url(#rtCr)" stroke="#FFF6CF" stroke-width="1" stroke-linejoin="round"/>' +
    '<rect x="6" y="37" width="52" height="5" rx="2" fill="url(#rtCr)" stroke="#FFF6CF" stroke-width=".8"/>' +
    '<circle cx="32" cy="4" r="3" fill="#10B981" stroke="#FFF6CF" stroke-width=".8"/><circle cx="3" cy="11" r="2.4" fill="#10B981" stroke="#FFF6CF" stroke-width=".7"/><circle cx="61" cy="11" r="2.4" fill="#10B981" stroke="#FFF6CF" stroke-width=".7"/>' +
    '<circle cx="32" cy="30" r="3" fill="#06382a" stroke="#FFF6CF" stroke-width=".8"/></svg>';
  function decorate() {
    var b = document.querySelector('.balance');
    if (b && !b.querySelector('.rt-shine')) { var s = document.createElement('i'); s.className = 'rt-shine'; b.insertBefore(s, b.firstChild); }
    [].forEach.call(document.querySelectorAll('.auth .hero'), function (h) {
      if (h.querySelector('.rt-crown')) return;
      h.insertAdjacentHTML('afterbegin', crown());
    });
  }

  /* ---------- scroll progress (index) ---------- */
  if (isSite) {
    var bar = document.createElement('div'); bar.id = 'rtProg'; document.body.appendChild(bar);
    var tick = false;
    addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        var h = document.documentElement, m = h.scrollHeight - h.clientHeight;
        bar.style.width = (m > 0 ? (h.scrollTop / m) * 100 : 0) + '%'; tick = false;
      });
    }, { passive: true });
  }

  function init() {
    setup(); decorate();
    /* dashboard builds parts of itself later, so check again for a little while */
    var n = 0, iv = setInterval(function () { decorate(); if (++n > 20) clearInterval(iv); }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
