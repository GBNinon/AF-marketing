/* =====================================================================
   offline.js (v0.56) - the app remembers what you loaded last time.

   Every GET to the Supabase REST API (lists, favorites, dailies, shaker
   data, quiz results) is saved on the phone in IndexedDB. When the phone
   is offline, the request fails, or the network takes longer than 7
   seconds while a saved copy exists, the saved copy is returned instead.
   Pages do not need to change: they just get their data.

   Loaded as the first script in <head> on every page, so it also wraps
   Supabase clients that are created before core.js.
   Only GET requests to *.supabase.co/rest/v1/ are touched. Logins, edge
   functions, writes and everything else go straight to the network.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__amsOffline || !window.fetch) return;
  window.__amsOffline = true;

  var DB = 'ams-offline', STORE = 'rest', VERSION = 1;
  var SLOW_MS = 7000;              // waiting longer than this with a saved copy? use the copy
  var MAX_BYTES = 6 * 1024 * 1024; // skip very large answers
  var MAX_AGE = 60 * 24 * 3600e3;  // saved copies older than 60 days are not used
  var dbP = null;

  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (res) {
      try {
        var rq = indexedDB.open(DB, VERSION);
        rq.onupgradeneeded = function () { rq.result.createObjectStore(STORE); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return dbP;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try {
          var tx = d.transaction(STORE, mode), st = tx.objectStore(STORE), rq = fn(st);
          tx.oncomplete = function () { res(rq && rq.result); };
          tx.onerror = tx.onabort = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  function get(k) { return idb('readonly', function (st) { return st.get(k); }); }
  function put(k, v) { return idb('readwrite', function (st) { return st.put(v, k); }); }

  function urlOf(input) { return typeof input === 'string' ? input : (input && input.url) || String(input); }
  function methodOf(input, init) { return String((init && init.method) || (input && typeof input === 'object' && input.method) || 'GET').toUpperCase(); }
  function header(input, init, name) {
    try {
      var h = (init && init.headers) || (input && typeof input === 'object' && input.headers);
      if (!h) return '';
      if (typeof h.get === 'function') return h.get(name) || '';
      for (var k in h) if (k.toLowerCase() === name) return h[k];
    } catch (e) {}
    return '';
  }
  /* the user's own rows (favorites, results) are kept per account: the key includes a short hash of the auth token's user part */
  function who(input, init) {
    var a = header(input, init, 'authorization');
    var m = /Bearer\s+[^.]+\.([^.]+)\./.exec(a || '');
    if (!m) return 'anon';
    try { var p = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.sub || p.role || 'anon'; } catch (e) { return 'anon'; }
  }
  function cacheable(url, method) { return method === 'GET' && /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\//.test(url); }

  function fromCopy(hit) {
    try { window.dispatchEvent(new CustomEvent('ams-offline-copy', { detail: { at: hit.t } })); } catch (e) {}
    return new Response(hit.body, { status: 200, headers: { 'Content-Type': hit.ct || 'application/json', 'X-Ams-Offline': String(hit.t) } });
  }

  var net0 = window.fetch.bind(window);
  /* v0.57: every call to the shared user database says which app is asking (x-families-app: ams).
     The database only shows Amsterdam favorites to Amsterdam and Ibiza favorites to Ibiza. */
  var APP_HOST = /^https:\/\/qczutthumgpgxwepatte\.supabase\.co\/rest\/v1\//; /* v0.58: database calls only, never edge functions or auth (their CORS rejects unknown headers) */
  function net(input, init) {
    var url = urlOf(input);
    if (!APP_HOST.test(url)) return net0(input, init);
    try {
      if (typeof input !== 'string' && input && input.headers && !(init && init.headers)) {
        var rq = new Request(input); rq.headers.set('x-families-app', 'ams'); return net0(rq, init);
      }
      var o = Object.assign({}, init || {}), h = new Headers((o && o.headers) || {});
      h.set('x-families-app', 'ams'); o.headers = h;
      return net0(input, o);
    } catch (e) { return net0(input, init); }
  }
  window.fetch = function (input, init) {
    var url = urlOf(input), method = methodOf(input, init);
    if (!cacheable(url, method)) return net(input, init);
    var key = who(input, init) + ' ' + url + ' ' + (header(input, init, 'range') || '') + ' ' + (header(input, init, 'accept') || '');

    var netP = net(input, init).then(function (res) {
      if (res && res.ok) {
        res.clone().text().then(function (txt) {
          if (txt.length <= MAX_BYTES) put(key, { t: Date.now(), body: txt, ct: res.headers.get('content-type') });
        }).catch(function () {});
      }
      return res;
    });

    netP.catch(function () {});
    var copyP = get(key).then(function (hit) { return hit && (Date.now() - hit.t) < MAX_AGE ? hit : null; }).catch(function () { return null; });

    if (navigator.onLine === false) {
      return copyP.then(function (hit) { return hit ? fromCopy(hit) : netP; });
    }
    return new Promise(function (resolve, reject) {
      var settled = false, timer = null;
      function done(fn, v) { if (settled) return; settled = true; clearTimeout(timer); fn(v); }
      netP.then(function (res) { done(resolve, res); }, function (err) {
        copyP.then(function (hit) { hit ? done(resolve, fromCopy(hit)) : done(reject, err); });
      });
      timer = setTimeout(function () { copyP.then(function (hit) { if (hit) done(resolve, fromCopy(hit)); }); }, SLOW_MS);
    });
  };

  /* small note at the top when a page shows saved data */
  var shown = false;
  window.addEventListener('ams-offline-copy', function (e) {
    if (shown) return; shown = true;
    function show() {
      var nl = false; try { nl = localStorage.getItem('ams-lang') === 'nl'; } catch (x) {}
      var d = new Date(e.detail.at), when = d.toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short' });
      var el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;background:#2F2A38;color:#fff;font:600 13px/1.3 Karla,-apple-system,sans-serif;padding:10px 16px;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:86vw;text-align:center;transition:opacity .4s';
      el.textContent = nl ? 'Je bent offline. Je ziet wat je op ' + when + ' hebt geladen.' : "You're offline. Showing what you loaded on " + when + '.';
      document.body.appendChild(el);
      setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 500); }, 4500);
    }
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  });
})();
