/* =====================================================================
   PRIME TURN — "Install as an app" (PWA) helper
   ---------------------------------------------------------------------
   Used by: index.html, dashboard.html, asset.html (one line each).

   What it does
   1. Registers sw.js so phones allow the site to be installed.
   2. Gives the dashboard a bottom popup:  window.PTInstall.show()
      - Android / Chrome / Edge / Samsung: tapping "Install App" opens the
        phone's own install box, then the app lands on the home screen.
      - iPhone / iPad: Apple does not allow one-tap install, so the popup
        shows the 3 short steps (Share -> Add to Home Screen).
   3. Never shows if the site is already running as an installed app.
   ===================================================================== */
(function () {
  'use strict';

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|MicroMessenger|; wv\)/i.test(ua); /* Facebook/Instagram/etc. built-in browsers */
  var isStandalone = function () {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
           (window.matchMedia && matchMedia('(display-mode: fullscreen)').matches) ||
           window.navigator.standalone === true;
  };

  /* mark the page so CSS can style "running as an app" mode */
  if (isStandalone()) {
    document.documentElement.classList.add('pt-standalone');
    try { localStorage.setItem('pt_installed', String(Date.now())); } catch (e) {}
  }

  /* ---------- 1. service worker ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- 2. install popup ---------- */
  var deferred = null;           /* Android/Chrome install event, saved until the customer taps Install */
  var sheet = null, shown = false, installedNow = false;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          /* we show our own popup instead of Chrome's mini-bar */
    deferred = e;
  });

  window.addEventListener('appinstalled', function () {
    installedNow = true; deferred = null;
    try { localStorage.setItem('pt_installed', String(Date.now())); } catch (e) {}
    hide();
  });

  /* if the app was installed recently, do not nag again inside the browser tab (14 days) */
  function recentlyInstalled() {
    try {
      var t = Number(localStorage.getItem('pt_installed')) || 0;
      return t && (Date.now() - t) < 14 * 24 * 3600 * 1000;
    } catch (e) { return false; }
  }

  var css =
    '#ptInstall{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;padding:0 12px calc(12px + env(safe-area-inset-bottom));pointer-events:none;transform:translateY(24px);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s}' +
    '#ptInstall.show{transform:none;opacity:1}' +
    '#ptInstall[hidden]{display:none}' +
    '#ptInstall .pti-card{pointer-events:auto;width:min(500px,100%);border-radius:22px;padding:16px 16px 14px;color:#E8EDF0;font-family:Manrope,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'background:linear-gradient(160deg,#0A2018,#04120d 70%);border:1px solid rgba(192,200,208,.38);box-shadow:0 -10px 40px rgba(0,0,0,.55),0 0 0 1px rgba(16,185,129,.18),inset 0 1px 0 rgba(255,255,255,.12)}' +
    '#ptInstall .pti-top{display:flex;gap:12px;align-items:center}' +
    '#ptInstall .pti-ic{width:54px;height:54px;border-radius:14px;flex:none;box-shadow:0 0 0 1px rgba(192,200,208,.4),0 6px 16px rgba(0,0,0,.5)}' +
    '#ptInstall h3{margin:0;font-family:Cinzel,Georgia,serif;font-size:17px;letter-spacing:.06em;color:#fff;line-height:1.2}' +
    '#ptInstall p{margin:3px 0 0;font-size:13px;line-height:1.45;color:#C0C8D0}' +
    '#ptInstall ol{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:8px}' +
    '#ptInstall li{display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.35;color:#E8EDF0;background:rgba(255,255,255,.06);border-radius:12px;padding:9px 11px}' +
    '#ptInstall li b{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;background:#10B981;color:#04120d}' +
    '#ptInstall li svg{width:18px;height:18px;vertical-align:-4px;margin:0 2px;stroke:#E8EDF0;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#ptInstall .pti-btns{display:flex;gap:10px;margin-top:14px}' +
    '#ptInstall button{flex:1;height:46px;border-radius:999px;border:1px solid transparent;font:700 13px/1 Manrope,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#ptInstall .pti-go{background:linear-gradient(#10B981,#059669);color:#fff;box-shadow:0 0 20px rgba(16,185,129,.35)}' +
    '#ptInstall .pti-no{background:transparent;border-color:rgba(192,200,208,.4);color:#E8EDF0}' +
    '#ptInstall button:active{transform:scale(.97)}';

  var SHARE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-1"/></svg>';
  var MENU_SVG  = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>';

  function build() {
    if (sheet) return sheet;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    sheet = document.createElement('div');
    sheet.id = 'ptInstall'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-labelledby', 'ptiTitle');
    document.body.appendChild(sheet);
    return sheet;
  }

  function render(mode) {
    /* mode: 'native' (one tap) | 'ios' (steps) | 'manual' (Android menu steps) */
    var steps = '';
    if (mode === 'ios') {
      steps = '<ol>' +
        (inApp ? '<li><b>!</b><span>First open this page in <strong>Safari</strong> (use the browser option in the corner menu).</span></li>' : '') +
        '<li><b>1</b><span>Tap the <strong>Share</strong> button ' + SHARE_SVG + ' at the bottom (or top) of Safari.</span></li>' +
        '<li><b>2</b><span>Scroll and tap <strong>Add to Home Screen</strong>.</span></li>' +
        '<li><b>3</b><span>Tap <strong>Add</strong>. Prime Turn is now an app on your phone.</span></li></ol>';
    } else if (mode === 'manual') {
      steps = '<ol>' +
        (inApp ? '<li><b>!</b><span>First open this page in <strong>Chrome</strong> (use the browser option in the corner menu).</span></li>' : '') +
        '<li><b>1</b><span>Tap the browser menu ' + MENU_SVG + ' (top right).</span></li>' +
        '<li><b>2</b><span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></li>' +
        '<li><b>3</b><span>Tap <strong>Install</strong>. Prime Turn is now an app on your phone.</span></li></ol>';
    }
    var lead = mode === 'native'
      ? 'Add Prime Turn to your phone. It opens full screen like a real app, straight from your home screen.'
      : 'Add Prime Turn to your home screen so it opens full screen like a real app.';
    sheet.innerHTML =
      '<div class="pti-card">' +
        '<div class="pti-top"><img class="pti-ic" src="icons/icon-192.png" alt="" width="54" height="54">' +
        '<div><h3 id="ptiTitle">Install Prime Turn App</h3><p>' + lead + '</p></div></div>' +
        steps +
        '<div class="pti-btns">' +
          '<button type="button" class="pti-no" data-a="no">Not now</button>' +
          (mode === 'native' ? '<button type="button" class="pti-go" data-a="go">Install App</button>'
                             : '<button type="button" class="pti-go" data-a="no">Got it</button>') +
        '</div>' +
      '</div>';
    sheet.onclick = function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-a') === 'go') install(); else hide();
    };
  }

  function install() {
    if (!deferred) { render(isIOS ? 'ios' : 'manual'); return; }
    var d = deferred; deferred = null;
    try {
      d.prompt();
      d.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { try { localStorage.setItem('pt_installed', String(Date.now())); } catch (e) {} }
        hide();
      }).catch(hide);
    } catch (e) { render('manual'); }
  }

  function show() {
    if (isStandalone() || installedNow || recentlyInstalled()) return;
    if (shown) return;
    build();
    render(deferred ? 'native' : (isIOS ? 'ios' : 'manual'));
    shown = true;
    sheet.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('show'); }); });
  }

  function hide() {
    shown = false;
    if (!sheet) return;
    sheet.classList.remove('show');
    setTimeout(function () { if (!shown && sheet) sheet.hidden = true; }, 350);
  }

  /* the Android install event can arrive a moment after the dashboard opens: upgrade the popup to one-tap */
  window.addEventListener('beforeinstallprompt', function () {
    if (shown && sheet && !sheet.hidden) render('native');
  });

  window.PTInstall = { show: show, hide: hide, isStandalone: isStandalone };
})();
