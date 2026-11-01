/* =====================================================================
   PRIME TURN — shared data layer (admin.html, dashboard.html, asset.html)
   ---------------------------------------------------------------------
   1. Create ONE bin on jsonbin.io and paste the contents of
      primeturn-bin.json into it.
   2. Paste that bin's ID and your NEW API key below (the two blank lines).
   3. Upload this file next to admin.html / dashboard.html / asset.html.
   ===================================================================== */
window.PRIMETURN_CONFIG = {
  provider: 'jsonbin',        /* 'jsonbin' = live shared data | 'local' = this browser only (testing) */

  binId:  '6ae76278ac6210605a63c97e',
  binKey: '$2a$10$tnXfDwoby8y5ilAc9r3z5Oi/hQJrP.gvXAjqTWNIj2dmvhE60W3UO',
  keyType: 'master',          /* 'master' -> sent as X-Master-Key | 'access' -> sent as X-Access-Key */
  collectionId: '',           /* optional: JSONBin collection id to keep receipt bins tidy */

  siteUrl: '',                /* optional: public address of your site, used for referral links */
  maxBytes: 95000,            /* size limit of one free JSONBin bin (admin shows a warning near this) */

  pollAdmin: 120,             /* seconds between admin refreshes */
  pollCustomer: 120,          /* seconds between customer refreshes */
  heartbeatSeconds: 0,        /* >0 shows customers as "online" in admin (uses more JSONBin requests) */
  idleAdminSeconds: 48        /* admin auto-refresh wait after activity */
};

(function () {
  'use strict';
  var C = window.PRIMETURN_CONFIG;
  var API = 'https://api.jsonbin.io/v3/b';
  var LOCAL_KEY = 'pt_local_db';
  var EMPTY = function () {
    return { customers: [], payments: [], withdrawals: [], referrals: [], giftCodes: [], deleted: [], settings: {} };
  };
  var isLive = function () { return C.provider === 'jsonbin' && C.binId && C.binKey; };
  var headers = function (extra) {
    var h = { 'Content-Type': 'application/json' };
    h[C.keyType === 'access' ? 'X-Access-Key' : 'X-Master-Key'] = C.binKey;
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* fetch with retry on rate-limit / server errors */
  async function call(url, opts) {
    var last;
    for (var i = 0; i < 3; i++) {
      try {
        var res = await fetch(url, Object.assign({ cache: 'no-store' }, opts));
        if (res.ok) return res;
        last = new Error('JSONBin ' + res.status);
        if (res.status !== 429 && res.status < 500) throw last;
      } catch (e) { last = e; if (e && /JSONBin 4\d\d/.test(e.message) && !/429/.test(e.message)) throw e; }
      await sleep(700 * (i + 1));
    }
    throw last;
  }

  function normalise(d) {
    d = (d && typeof d === 'object') ? d : {};
    var base = EMPTY();
    for (var k in base) if (d[k] === undefined) d[k] = base[k];
    return d;
  }

  /* ---------- read ---------- */
  window._fetchBin = async function () {
    if (!isLive()) {
      try { return normalise(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')); } catch (e) { return EMPTY(); }
    }
    var res = await call(API + '/' + encodeURIComponent(C.binId) + '/latest', {
      headers: headers({ 'X-Bin-Meta': 'false' })
    });
    return normalise(await res.json());
  };

  /* ---------- write whole record ---------- */
  window._saveBin = async function (data) {
    data = normalise(data);
    if (!isLive()) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (e) {} return data; }
    await call(API + '/' + encodeURIComponent(C.binId), {
      method: 'PUT', headers: headers(), body: JSON.stringify(data)
    });
    return data;
  };

  /* ---------- read -> change -> write (queued so two edits never overwrite each other) ---------- */
  var queue = Promise.resolve();
  window._updateBin = function (fn) {
    var job = queue.then(async function () {
      var d = await window._fetchBin();
      var out = fn(d);
      if (out && typeof out.then === 'function') out = await out;
      if (out === undefined) out = d;
      return window._saveBin(out);
    });
    queue = job.catch(function () {});
    return job;
  };

  /* ---------- payment receipt photos: each one lives in its own small bin ---------- */
  window._storeReceipt = async function (dataUrl) {
    if (!isLive()) return { receipt: dataUrl };
    var h = headers({ 'X-Bin-Private': 'true', 'X-Bin-Name': 'primeturn-receipt-' + Date.now() });
    if (C.collectionId) h['X-Collection-Id'] = C.collectionId;
    var res = await call(API, { method: 'POST', headers: h, body: JSON.stringify({ img: dataUrl }) });
    var j = await res.json();
    var id = j && j.metadata && j.metadata.id;
    if (!id) throw new Error('Receipt bin not created');
    return { receiptBin: id };
  };

  window._getReceipt = async function (binId) {
    var res = await call(API + '/' + encodeURIComponent(binId) + '/latest', { headers: headers({ 'X-Bin-Meta': 'false' }) });
    var j = await res.json();
    return j && j.img ? j.img : '';
  };
})();
