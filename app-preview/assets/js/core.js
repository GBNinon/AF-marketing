/* ============================================================
   core.js - shared foundation for ALL Amsterdam Families pages
   ------------------------------------------------------------
   Load order at the TOP of <body> on every page:
     <script src="assets/js/supabase.min.js"></script>
     <script src="assets/js/core.js" data-page="event_agenda" data-title="Event Agenda"></script>
   ============================================================ */
(function () {
  'use strict';

  /* AUTH PROJECT = "The Families app" (qczutthumgpgxwepatte):
     auth.users, user_profiles, favorites, page_views live HERE. */
  var SUPABASE_URL  = 'https://qczutthumgpgxwepatte.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjenV0dGh1bWdwZ3h3ZXBhdHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzg5NzAsImV4cCI6MjA4NDY1NDk3MH0.vleNYVReRJnMruKBTXEb9gwdKVdhbiuLJTZoDiuUM0g';
  var ENTITLEMENT   = 'premium';

  var me       = document.currentScript;
  var PAGE     = me ? (me.getAttribute('data-page')  || '') : '';
  var TOPBAR_MODE = me ? (me.getAttribute('data-topbar') || 'on') : 'on';
  var TOPBAR   = TOPBAR_MODE !== 'off';

  var IF = window.IF = window.IF || {};

  IF.sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;
  IF.SUPABASE_URL = SUPABASE_URL;
  IF.SUPABASE_ANON = SUPABASE_ANON;

  IF.lang = function () {
    try { return localStorage.getItem('ams-lang') === 'nl' ? 'nl' : 'en'; }
    catch (e) { return 'en'; }
  };
  IF.setLang = function (l) {
    try { localStorage.setItem('ams-lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('if-lang', { detail: l }));
  };
  IF.t = function (map) { return (map && (map[IF.lang()] || map.en)) || ''; };

  (function boot() {
    if (document.getElementById('if-boot')) return;
    var st = document.createElement('style');
    st.textContent =
      '#if-boot{position:fixed;inset:0;z-index:99999;background:#F8F6FA;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;font-family:Karla,-apple-system,sans-serif;transition:opacity .4s ease;}' +
      '#if-boot.hide{opacity:0;pointer-events:none;}' +
      '#if-boot .ring{width:44px;height:44px;border-radius:50%;border:3px solid #ece4f2;border-top-color:#B597C1;animation:ifSpin .8s linear infinite;}' +
      '#if-boot .wm{margin-top:16px;font-size:12px;font-weight:700;letter-spacing:2px;color:#B597C1;text-transform:uppercase;}' +
      '@keyframes ifSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.id = 'if-boot';
    d.innerHTML = '<div class="ring"></div><div class="wm">Amsterdam Families</div>';
    (document.body || document.documentElement).appendChild(d);

    var start = Date.now(), MIN = 400, MAX = 9000;
    function hasContent() {
      var root = document.getElementById('root');
      if (root) return root.children.length > 0;
      var kids = document.body ? document.body.children : [];
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i], tn = el.tagName;
        if (el.id === 'if-boot' || el.id === 'if-topbar' || tn === 'SCRIPT' || tn === 'STYLE' || tn === 'LINK') continue;
        if (el.offsetHeight > 0 || el.children.length > 0) return true;
      }
      return false;
    }
    var iv = setInterval(function () {
      if ((hasContent() && Date.now() - start > MIN) || Date.now() - start > MAX) {
        clearInterval(iv);
        d.classList.add('hide');
        setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 450);
      }
    }, 120);
  })();

  (function sysBottom() {
    try {
      var a = /Android/i.test(navigator.userAgent), gap = (screen.height || 0) - (window.innerHeight || 0);
      if (a && gap < 40) document.documentElement.style.setProperty('--sys-bottom', '48px');
    } catch (e) {}
  })();
  function renderTopBar() {
    if (!TOPBAR || document.getElementById('if-topbar')) return;
    var st = document.createElement('style');
    st.textContent =
      ':root{--if-topbar-h:56px;}' +
      'body{padding-top:calc(var(--if-topbar-h) + env(safe-area-inset-top)) !important;}' +
      '#if-topbar{position:fixed;top:0;left:0;right:0;z-index:4000;background:#F2ECF3;' +
      'height:calc(var(--if-topbar-h) + env(safe-area-inset-top));padding-top:env(safe-area-inset-top);' +
      'display:flex;align-items:center;gap:6px;border-bottom:1px solid #e4dcec;}' +
      '#if-topbar .bk{width:38px;height:38px;margin-left:10px;border:none;border-radius:50%;background:#2f2a38;' +
      'display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}' +
      '#if-topbar img{height:44px;width:auto;margin-left:6px;display:block;}' +
      /* one EN/NL switch for the whole app, top right (replaces the per-page toggles) */
      '#if-topbar .if-lang{margin-left:auto;margin-right:12px;display:flex;background:#E8DFF0;border-radius:20px;padding:3px;flex-shrink:0;}' +
      '#if-topbar .if-lang button{border:none;background:transparent;border-radius:17px;padding:6px 12px;font-family:Karla,-apple-system,sans-serif;' +
      'font-size:11px;font-weight:700;letter-spacing:.3px;color:#9490A0;cursor:pointer;line-height:1;}' +
      '#if-topbar .if-lang button.on{background:#fff;color:#2D2A33;box-shadow:0 2px 6px rgba(60,40,90,.12);}' +
      '[data-if-langpill]{display:none !important;}' +
      /* Android 15+ draws the page under the system bar; when the webview still fills the whole screen, keep content clear of it */
      'body::after{content:"";display:block;height:var(--sys-bottom,0px);}';
    document.head.appendChild(st);

    var bar = document.createElement('div');
    bar.id = 'if-topbar';
    var noBack = (TOPBAR_MODE === 'noback');
    bar.innerHTML =
      (noBack ? '' :
      '<button class="bk" aria-label="Back">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>' +
      '</button>') +
      '<img src="assets/img/logo.png" alt="Amsterdam Families"' + (noBack ? ' style="margin-left:16px"' : '') + '>' +
      '<div class="if-lang" role="group" aria-label="Language">' +
        '<button type="button" data-l="en">EN</button><button type="button" data-l="nl">NL</button>' +
      '</div>';
    (document.body || document.documentElement).appendChild(bar);
    var bk = bar.querySelector('.bk');
    if (bk) bk.addEventListener('click', IF.back);
    var lg = bar.querySelector('img');
    if (lg) { lg.style.cursor = 'pointer';
      lg.addEventListener('click', function () { location.href = 'index.html'; }); }

    bar.querySelectorAll('.if-lang button').forEach(function (b) {
      b.addEventListener('click', function () { switchLang(b.getAttribute('data-l')); });
    });
    markPagePills();
    syncLangPill();
    try {
      var t = null;
      new MutationObserver(function () {
        if (t) return;
        t = setTimeout(function () { t = null; markPagePills(); syncLangPill(); }, 150);
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* ---------- language: one switch in the top bar ----------
     Every page still has its own EN/NL buttons with its own logic. We hide
     that pill and, on a tap in the top bar, press the page's own (hidden)
     button, so each page switches exactly the way it always did. A page
     without its own buttons is reloaded in the new language. */
  function isLangBtn(b) {
    if (!b || b.closest('#if-topbar') || b.classList.contains('login-lang-btn')) return '';
    var t = (b.textContent || '').trim().toUpperCase();
    return (t === 'EN' || t === 'NL') ? t : '';
  }
  function markPagePills() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (!isLangBtn(btns[i])) continue;
      var p = btns[i].parentElement;
      if (!p || p.hasAttribute('data-if-langpill')) continue;
      var kids = p.querySelectorAll('button'), seen = {};
      if (kids.length !== 2) continue;
      seen[isLangBtn(kids[0])] = 1; seen[isLangBtn(kids[1])] = 1;
      if (seen.EN && seen.NL) p.setAttribute('data-if-langpill', '1');
    }
  }
  function pageLangButton(l) {
    var want = l.toUpperCase();
    var btns = document.querySelectorAll('[data-if-langpill] button');
    for (var i = 0; i < btns.length; i++) if (isLangBtn(btns[i]) === want) return btns[i];
    return null;
  }
  function syncLangPill() {
    var l = IF.lang();
    document.querySelectorAll('#if-topbar .if-lang button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-l') === l);
    });
  }
  function switchLang(l) {
    if (l !== 'en' && l !== 'nl') return;
    var btn = pageLangButton(l);
    IF.setLang(l);
    syncLangPill();
    if (btn) { btn.click(); return; }
    if (typeof window.setLanguage === 'function') { try { window.setLanguage(l); return; } catch (e) {} }
    location.reload();
  }
  IF.switchLang = switchLang;

  var ROUTES = {
    '/home': 'index.html',
    '/ams-agenda': 'event-agenda.html',
    '/ams-activities': 'after-school-activities.html',
    '/ams-birthday': 'birthdays.html',
    '/ams-food': 'family-food-spots.html',
    '/ams-schools': 'schools-directory.html',
    '/ams-playgrounds': 'playgrounds-beaches.html',
    '/ams-top100': 'top100-plans.html',
    '/ams-playdates': 'playdates.html',
    '/ams-dailies': 'dailies.html',
    '/maps': 'maps-hub.html',
    '/favorites': 'favorites.html',
    '/kids-chores-chart-rewards': 'chores-tracker.html',
    '/kids-vacay-memory': 'memory-game.html',
    '/supermarket-adventure': 'groceries-list.html',
    '/foodieyai': 'foodieyai.html',
    '/city-shaker': 'city-shaker.html',
    '/shaker': 'city-shaker.html',
    '/user-profile': 'user-profile.html',
    '/support-page': 'support.html',
    '/send-us-your-tip': 'partner-signup.html'
  };
  IF.go = function (target) {
    if (!target) return;
    var m = String(target).match(/section=(\d+)/);
    var key = m ? m[1] : target;
    location.href = ROUTES[key] || key;
  };
  /* Back: our own page stack (sessionStorage), not the webview history. The webview history
     gets polluted by location.replace, the logo link and pages that shadow window.history
     (v0.43 fix: "back lands on Babydoku"). Home resets the stack. */
  var NAVK = 'if-nav';
  var SKIP_BACK = { 'quick-tour.html': 1 };
  function pageName() { return (location.pathname.split('/').pop() || 'index.html'); }
  function navRead() { try { var a = JSON.parse(sessionStorage.getItem(NAVK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function navWrite(a) { try { sessionStorage.setItem(NAVK, JSON.stringify(a.slice(-30))); } catch (e) {} }
  (function () {
    var p = pageName(), a = navRead();
    if (p === 'index.html') a = ['index.html'];
    else if (SKIP_BACK[p]) { /* the tour is never a step to go back to */ }
    else { var at = a.lastIndexOf(p); if (at >= 0) a = a.slice(0, at + 1); else a.push(p); }
    navWrite(a);
  })();
  IF.back = function () {
    try { if (typeof window.SHAKER_BACK === 'function' && window.SHAKER_BACK()) return; } catch (e) {}   // v0.56: City Shaker steps back inside the tool first
    try { if (typeof window.PAGE_BACK === 'function' && window.PAGE_BACK()) return; } catch (e) {}   // v0.63: a page closes its own open layer first (Top 100 result list, plan detail)
    var a = navRead(), here = pageName();
    if (a[a.length - 1] === here) a.pop();
    while (a.length && SKIP_BACK[a[a.length - 1]]) a.pop();   // v0.63: never back into the quick tour or a login step
    var prev = a[a.length - 1] || 'index.html';
    if (prev === here) prev = 'index.html';
    navWrite(a);
    window.location.replace(prev);
  };

  function sessionId() {
    try {
      var sid = sessionStorage.getItem('if-session');
      if (!sid) {
        sid = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('if-session', sid);
      }
      return sid;
    } catch (e) { return null; }
  }
  function platform() {
    try {
      if (window.Capacitor && window.Capacitor.getPlatform) return window.Capacitor.getPlatform();
    } catch (e) {}
    return 'web';
  }
  function uuid4() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  /* v0.57: which campaign brought this person in (deep link, Play install referrer or web quiz),
     kept for 30 days so the statistics can count per channel and campaign */
  function campaignTags() {
    var out = {};
    try {
      var dl = JSON.parse(localStorage.getItem('ams-deeplink') || 'null');
      if (dl && (dl.src || dl.c) && (Date.now() - (dl.at || 0)) < 30 * 86400000) { if (dl.src) out.src = String(dl.src).slice(0, 60); if (dl.c) out.campaign = String(dl.c).slice(0, 60); }
      if (!out.campaign) {
        var cp = JSON.parse(localStorage.getItem('ams-campaign') || 'null');
        if (cp && cp.campaign) { out.campaign = String(cp.campaign).slice(0, 60); if (!out.src && cp.source) out.src = String(cp.source).slice(0, 60); }
      }
    } catch (e) {}
    return out;
  }
  IF.track = function () {
    if (!PAGE) return;
    var sent = false, t0 = Date.now(), rowId = null;
    function reportDuration() {
      if (!rowId) return;
      var secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
      fetch(SUPABASE_URL + '/rest/v1/page_views?id=eq.' + rowId, {
        method: 'PATCH', keepalive: true,
        headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ duration_seconds: secs })
      }).catch(function () {});
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') reportDuration();
    });
    window.addEventListener('pagehide', reportDuration);
    function post(uid) {
      if (sent) return; sent = true;
      var id = uuid4();
      fetch(SUPABASE_URL + '/rest/v1/page_views', {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(Object.assign({ id: id, page_name: PAGE, user_id: uid,
                               session_id: sessionId(), platform: platform(), app: 'ams' }, campaignTags()))
      }).then(function (r) { if (r.ok) rowId = id; })
        .catch(function () {});
    }
    if (!IF.sb) { post(null); return; }
    function fromSession(s) { return (s && s.user) ? s.user.id : null; }
    IF.sb.auth.getSession().then(function (r) {
      var s = r && r.data ? r.data.session : null;
      if (s) { post(fromSession(s)); return; }
      var done = false;
      var sub = IF.sb.auth.onAuthStateChange(function (ev, sess) {
        if (done) return;
        if (sess && sess.user) { done = true; if (sub && sub.data) sub.data.subscription.unsubscribe(); post(sess.user.id); }
      });
      setTimeout(function () { if (!done) { done = true; try { sub.data.subscription.unsubscribe(); } catch (e) {} post(null); } }, 2500);
    }).catch(function () { post(null); });
  };

  IF.Favorites = {
    _h: function (tok) {
      return { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
    },
    _sess: function () {
      if (!IF.sb) return Promise.resolve(null);
      return IF.sb.auth.getSession().then(function (r) {
        return (r && r.data && r.data.session) ? r.data.session : null;
      }).catch(function () { return null; });
    },
    list: function () {
      return this._sess().then(function (s) {
        if (!s) return [];
        return fetch(SUPABASE_URL + '/rest/v1/favorites?user_id=eq.' + s.user.id + '&select=*&order=created_at.desc',
          { headers: IF.Favorites._h(s.access_token) })
          .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
      });
    },
    add: function (type, id, meta) {
      return this._sess().then(function (s) {
        if (!s) { if (window.Guest) Guest.open('favorite'); return false; }
        var m = meta || {};
        return fetch(SUPABASE_URL + '/rest/v1/favorites', {
          method: 'POST',
          headers: Object.assign({}, IF.Favorites._h(s.access_token),
                                 { Prefer: 'return=minimal,resolution=merge-duplicates' }),
          body: JSON.stringify({ app: 'ams', user_id: s.user.id, item_type: type, item_id: String(id),
                                 title: m.title || '', image_url: m.image_url || '',
                                 subtitle: m.subtitle || '', deep_link: m.deep_link || '' })
        }).then(function (r) { return r.ok; }).catch(function () { return false; });
      });
    },
    remove: function (type, id) {
      return this._sess().then(function (s) {
        if (!s) return false;
        return fetch(SUPABASE_URL + '/rest/v1/favorites?user_id=eq.' + s.user.id +
          '&item_type=eq.' + type + '&item_id=eq.' + String(id),
          { method: 'DELETE', headers: IF.Favorites._h(s.access_token) })
          .then(function (r) { return r.ok; }).catch(function () { return false; });
      });
    },
    isFav: function (list, type, id) {
      return list.some(function (f) { return f.item_type === type && f.item_id === String(id); });
    }
  };

  function purchasesPlugin() {
    try {
      if (window.Capacitor && window.Capacitor.isPluginAvailable &&
          window.Capacitor.isPluginAvailable('Purchases')) {
        return window.Capacitor.Plugins.Purchases;
      }
    } catch (e) {}
    return null;
  }

  /* Configure RevenueCat once per launch with the platform's public key.
     iOS gets the appl_ key, Android the goog_ key. Safe no-op in a browser. */
  var RC_KEYS = { ios: 'appl_lifNjhIWindvIkvoAEKoHwvrssZ', android: 'goog_lxMrUcMiznAIIiWpbUAQKpmsGOM' };
  var _rcConfigured = false;
  IF.configurePurchases = function () {
    if (_rcConfigured) return Promise.resolve();
    var P = purchasesPlugin();
    if (!P) return Promise.resolve();
    var plat = 'web';
    try { if (window.Capacitor && window.Capacitor.getPlatform) plat = window.Capacitor.getPlatform(); } catch (e) {}
    var key = RC_KEYS[plat];
    if (!key) return Promise.resolve();          // web / unknown -> skip
    _rcConfigured = true;
    // If already logged in, hand RevenueCat the Supabase user id up front.
    return (IF.sb ? IF.sb.auth.getSession().catch(function () { return null; })
                  : Promise.resolve(null))
      .then(function (r) {
        var uid = r && r.data && r.data.session ? r.data.session.user.id : null;
        var cfg = { apiKey: key };
        if (uid) cfg.appUserID = uid;
        return P.configure(cfg);
      })
      .then(function () { return IF.syncPurchaseUser(); })
      .then(function () { IF.refreshMembership(); })
      .catch(function () { _rcConfigured = false; });
  };

  /* Make sure RevenueCat knows WHO is logged in (6 Oct 2026). Test purchases sat on an anonymous
     RevenueCat id, so a subscription followed the phone instead of the account. Runs after every
     configure and on every auth event with a session; only calls logIn when the id differs. */
  IF.syncPurchaseUser = function (session) {
    var P = purchasesPlugin();
    if (!P || !_rcConfigured) return Promise.resolve();
    var getSess = session ? Promise.resolve(session) : (IF.sb ? IF.sb.auth.getSession().then(function (r) { return r && r.data ? r.data.session : null; }).catch(function () { return null; }) : Promise.resolve(null));
    return getSess.then(function (sess) {
      if (!sess || !sess.user) return;
      return P.getAppUserID().then(function (r) {
        var cur = r && (r.appUserID || r);
        if (cur === sess.user.id) return;
        return P.logIn({ appUserID: sess.user.id }).then(function () { IF.refreshMembership(); });
      });
    }).catch(function () {});
  };

  IF._checkMembership = function () {
    var P = purchasesPlugin();
    if (!P) return Promise.resolve({ isMember: null });
    return P.getCustomerInfo().then(function (res) {
      var ci = res && (res.customerInfo || res);
      var active = ci && ci.entitlements && ci.entitlements.active;
      return { isMember: !!(active && active[ENTITLEMENT]) };
    }).catch(function () { return { isMember: false }; });
  };
  IF.membership = IF._checkMembership();
  IF.refreshMembership = function () {
    IF.membership = IF._checkMembership();
    /* 'if-membership' fires with {isMember} every time the answer is refreshed (RevenueCat configured,
       login, purchase), so pages that read IF.membership early can correct themselves. */
    IF.membership.then(function (m) { try { document.dispatchEvent(new CustomEvent('if-membership', { detail: m })); } catch (e) {} });
    return IF.membership;
  };
  IF.onMember = function (cb) {
    IF.membership.then(function (m) { if (m.isMember) cb(); });
    document.addEventListener('if-member', cb);
  };

  if (IF.sb) {
    IF.sb.auth.onAuthStateChange(function (event, session) {
      var P = purchasesPlugin();
      if (!P) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session && session.user) {
        if (_rcConfigured) IF.syncPurchaseUser(session);
        else IF.configurePurchases();   // configure picks up the logged-in id itself
      }
      if (event === 'SIGNED_OUT') {
        P.logOut().then(function () { IF.refreshMembership(); }).catch(function () {});
      }
    });
  }

  /* ============================================================
     Offline state (shared by all listing pages)
     ------------------------------------------------------------
     Usage in a page's fetch catch:
       if (IF.isOffline(err)) { IF.showOffline(containerEl, 'event_agenda', loadData); return; }
     After a successful load:
       IF.rememberCount('event_agenda', data.length);
     Seeds below were read from the live database on 24 Aug 2026 and
     only serve the very first offline open; localStorage takes over
     after the first successful load.
     ============================================================ */
  var OFF_SEEDS = {
    event_agenda: 458, afterschool: 1844, top100: 100, food_spots: 1109,
    birthdays: 225, schools: 310, playgrounds: 1264, playdates: 5
  };
  var OFF_NOUNS = {
    event_agenda: { en: 'family events',  nl: 'events' },
    afterschool:  { en: 'activities',     nl: 'activiteiten' },
    top100:       { en: 'plans',          nl: 'plannen' },
    food_spots:   { en: 'food spots',     nl: 'eetplekken' },
    birthdays:    { en: 'birthday ideas', nl: 'verjaardagsideeën' },
    schools:      { en: 'schools',        nl: 'scholen' },
    playgrounds:  { en: 'playgrounds',    nl: 'speeltuinen' },
    playdates:    { en: 'playdates',      nl: 'playdates' },
    dailies:      { en: 'daily tips',     nl: 'dagtips' }
  };
  IF.rememberCount = function (key, n) {
    if (typeof n === 'number' && n > 0) {
      try { localStorage.setItem('ams-count-' + key, String(n)); } catch (e) {}
    }
  };
  IF.lastCount = function (key) {
    try {
      var v = parseInt(localStorage.getItem('ams-count-' + key), 10);
      if (v > 0) return v;
    } catch (e) {}
    return OFF_SEEDS[key] || 0;
  };
  IF.isOffline = function (err) {
    if (navigator.onLine === false) return true;
    return !!(err && err instanceof TypeError);   // fetch network failure
  };
  IF.offlineTexts = function (key) {
    var nl = IF.lang() === 'nl';
    var n = IF.lastCount(key);
    var noun = OFF_NOUNS[key] ? (nl ? OFF_NOUNS[key].nl : OFF_NOUNS[key].en) : '';
    var body;
    if (key === 'babysitters') {
      body = nl ? 'Ga online om de oppasprofielen te laden.'
                : 'Go online to load babysitter profiles.';
    } else if (n > 0) {
      body = nl ? 'De family tools en spelletjes werken gewoon. Ga online om deze lijst met ' + n + ' ' + noun + ' te verversen.'
                : 'You can still use the family tools & games. Go online to refresh this list with ' + n + ' ' + noun + '.';
    } else {
      body = nl ? 'De family tools en spelletjes werken gewoon. Ga online om de ' + noun + ' te laden.'
                : 'You can still use the family tools & games. Go online to load the ' + noun + '.';
    }
    return { title: nl ? 'Je bent offline' : "You're offline",
             body: body, retry: nl ? 'Opnieuw' : 'Retry' };
  };
  function offStyles() {
    if (document.getElementById('ifoff-style')) return;
    var st = document.createElement('style');
    st.id = 'ifoff-style';
    st.textContent =
      '.ifoff{padding:38px 24px 46px;text-align:center;font-family:Karla,-apple-system,sans-serif;}' +
      '.ifoff .sp{width:40px;height:40px;margin:0 auto;border-radius:50%;border:4px solid #ece4f2;border-top-color:#E0705C;animation:ifoffsp 1s linear infinite;}' +
      '@keyframes ifoffsp{to{transform:rotate(360deg)}}' +
      '.ifoff h3{font-size:15px;font-weight:800;color:#2f2a38;margin:16px 0 0;}' +
      '.ifoff p{font-size:13px;color:#8a7f97;line-height:1.5;margin:6px auto 16px;max-width:250px;}' +
      '.ifoff button{border:none;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,#B597C1,#E8B0C8);' +
      'color:#fff;font-size:14px;font-weight:700;border-radius:14px;padding:12px 36px;box-shadow:0 4px 14px rgba(181,151,193,.4);}';
    document.head.appendChild(st);
  }
  IF.offlineHTML = function (key) {
    offStyles();
    var t = IF.offlineTexts(key);
    return '<div class="ifoff"><div class="sp"></div><h3>' + t.title + '</h3><p>' + t.body + '</p>' +
           '<button type="button" class="ifoff-retry">' + t.retry + '</button></div>';
  };
  IF.showOffline = function (container, key, retryFn) {
    if (!container) return;
    container.innerHTML = IF.offlineHTML(key);
    var b = container.querySelector('.ifoff-retry');
    if (b && retryFn) b.addEventListener('click', function () { retryFn(); });
  };

  document.addEventListener('backbutton', IF.back);
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    try {
      window.Capacitor.Plugins.App.addListener('backButton', function () {
        var isHome = /(^|\/)index\.html?$/.test(location.pathname) || location.pathname === '/';
        if (isHome) { window.Capacitor.Plugins.App.exitApp(); } else { IF.back(); }
      });
    } catch (e) {}
  }

  /* Deep links (v0.55): https://www.amsterdamfamilies.com/app/<page>?src=..&c=.. opens that page in the app.
     Android App Links (assetlinks.json) + iOS Universal Links (apple-app-site-association) on the website.
     Unknown pages go to Home. src / c are kept in localStorage 'ams-deeplink' for campaign attribution. */
  var LINKS = {
    'home': 'index.html', 'fridge': 'foodieyai.html', 'koelkast': 'foodieyai.html', 'minichef': 'foodieyai.html',
    'shaker': 'city-shaker.html', 'city-shaker': 'city-shaker.html', 'quiz': 'city-shaker.html',
    'food': 'family-food-spots.html', 'eten': 'family-food-spots.html', 'eetkaart': 'family-food-spots.html',
    'agenda': 'event-agenda.html', 'events': 'event-agenda.html',
    'activities': 'after-school-activities.html', 'afterschool': 'after-school-activities.html', 'naschools': 'after-school-activities.html',
    'birthday': 'birthdays.html', 'feestje': 'birthdays.html', 'birthdays': 'birthdays.html',
    'schools': 'schools-directory.html', 'scholen': 'schools-directory.html',
    'playgrounds': 'playgrounds-beaches.html', 'speeltuinen': 'playgrounds-beaches.html',
    'top100': 'top100-plans.html', 'playdates': 'playdates.html', 'dailies': 'dailies.html', 'battery': 'city-shaker.html', 'batterij': 'city-shaker.html',
    'maps': 'maps-hub.html', 'favorites': 'favorites.html', 'chores': 'chores-tracker.html', 'memory': 'memory-game.html',
    'groceries': 'groceries-list.html', 'babysitters': 'babysitters.html', 'find-the-baby': 'find-the-baby.html',
    'profile': 'user-profile.html', 'support': 'support.html', 'tip': 'partner-signup.html', 'jar': 'city-shaker.html', 'verveelpot': 'city-shaker.html',
    /* v0.71: every page has a link, for custom store listings and campaigns */
    'kinderboerderijen': 'kinderboerderijen-kaart.html', 'petting-farms': 'kinderboerderijen-kaart.html', 'babydoku': 'find-the-baby.html',
    'games': 'index.html', 'spelletjes': 'index.html', 'babysitter': 'babysitters.html', 'oppas': 'babysitters.html',
    'boodschappen': 'groceries-list.html', 'klusjes': 'chores-tracker.html', 'kaarten': 'maps-hub.html', 'scholen-kaart': 'schools-directory.html'
  };
  IF.linkTarget = function (url) {
    var u; try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== 'https:' || !/(^|\.)amsterdamfamilies\.com$/.test(u.hostname)) return null;
    var path = u.pathname.replace(/\/+$/, '').toLowerCase();
    var m = path.match(/^(?:\/nl)?\/app(?:\/([a-z0-9-]+))?/);
    if (!m) return null;
    var slug = m[1] || 'home', page = LINKS[slug] || ROUTES['/' + slug] || ROUTES['/ams-' + slug] || 'index.html';
    var q = u.searchParams, keep = [];
    ['src', 'c', 'utm_content', 'mode', 'plan'].forEach(function (k) { if (q.get(k)) keep.push(k + '=' + encodeURIComponent(q.get(k))); });
    /* v0.69: /app/jar or /app/verveelpot opens City Shaker straight in the boredom jar */
    if ((slug === 'jar' || slug === 'verveelpot') && !q.get('mode')) keep.push('mode=in');
    if (slug === 'games' || slug === 'spelletjes') keep.push('open=edu');
    if (/^\/nl\//.test(path) || q.get('lang') === 'nl') keep.push('lang=nl');
    return { page: page, slug: slug, query: keep.join('&'), src: q.get('src') || '', c: q.get('c') || '' };
  };
  function openLink(url, launch) {
    var t = IF.linkTarget(url); if (!t) return;
    /* getLaunchUrl keeps returning the same link on every page load: only follow it once */
    try { if (launch && sessionStorage.getItem('ams-dl-last') === url) return; sessionStorage.setItem('ams-dl-last', url); } catch (e) {}
    try { localStorage.setItem('ams-deeplink', JSON.stringify({ slug: t.slug, page: t.page, src: t.src, c: t.c, at: Date.now() })); } catch (e) {}
    try { if (/lang=nl/.test(t.query) && IF.setLang) IF.setLang('nl'); } catch (e) {}
    try { sessionStorage.setItem(NAVK, JSON.stringify(t.page === 'index.html' ? ['index.html'] : ['index.html', t.page])); } catch (e) {}
    var here = (location.pathname.split('/').pop() || 'index.html');
    if (here === t.page && !t.query) return;
    location.href = t.page + (t.query ? '?' + t.query : '');
  }
  IF.openLink = openLink;
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    try {
      var CA = window.Capacitor.Plugins.App;
      CA.addListener('appUrlOpen', function (ev) { if (ev && ev.url) openLink(ev.url); });
      if (CA.getLaunchUrl) CA.getLaunchUrl().then(function (r) { if (r && r.url) openLink(r.url, true); }).catch(function () {});
    } catch (e) {}
  }
  /* v0.57 Android campaign memory: Google Play passes the store link's referrer
     (page=fridge&src=instagram&c=autumn) to the app. Read once on the first open
     and go to that page, same as a tapped link. Nothing happens on an organic install. */
  (function () {
    var IR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InstallReferrer;
    if (!IR || !IR.get) return;
    var here = (location.pathname.split('/').pop() || 'index.html');
    if (here !== 'index.html') return;
    try { if (localStorage.getItem('ams-referrer-done')) return; } catch (e) { return; }
    IR.get().then(function (r) {
      try { localStorage.setItem('ams-referrer-done', String(Date.now())); } catch (e) {}
      var raw = (r && r.referrer) || '';
      if (!raw) return;
      var q; try { q = new URLSearchParams(raw); } catch (e) { return; }
      var page = q.get('page') || q.get('utm_content') || '';
      var src = q.get('src') || q.get('utm_source') || '', c = q.get('c') || q.get('utm_campaign') || '';
      if (/google-play/i.test(src) && !page) return;                  /* organic install */
      if (!/^[a-z0-9-]+$/i.test(page)) page = '';
      if (!page && !src && !c) return;
      var url = 'https://www.amsterdamfamilies.com/app/' + (page || '') +
        '?src=' + encodeURIComponent(src || 'play') + (c ? '&c=' + encodeURIComponent(c) : '');
      openLink(url);
    }).catch(function () {});
  })();

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () { renderTopBar(); IF.track(); IF.configurePurchases(); });
  /* app sessions + pages seen, for the notification trigger */
  (function () {
    try {
      if (!localStorage.getItem('ams-first-open')) localStorage.setItem('ams-first-open', String(Date.now()));
      if (!sessionStorage.getItem('ams-sess')) {
        sessionStorage.setItem('ams-sess', '1');
        localStorage.setItem('ams-sessions', String(parseInt(localStorage.getItem('ams-sessions') || '0', 10) + 1));
      }
      var pg = (location.pathname.split('/').pop() || 'index.html');
      var seen = (localStorage.getItem('ams-push-seen') || '').split(',').filter(Boolean);
      if (pg !== 'index.html' && seen.indexOf(pg) < 0) { seen.push(pg); localStorage.setItem('ams-push-seen', seen.slice(-40).join(',')); }
    } catch (e) {}
  })();

  /* ---------- push (OneSignal) ----------
     v2 (1 Oct 2026): our own pre-prompt first. On the second Home open (and never again once answered)
     a sheet asks what they want to hear about (checkboxes, saved as OneSignal tags), then the real
     system prompt follows. Texts can be overridden without a rebuild via cbldl app_config key
     'ams_push_prompt' (same keys as PUSH_TX below, with _en/_nl suffixes). */
  var ONESIGNAL_APP_ID = 'd546c193-e27d-460f-b543-7e2123a1e40e';
  var PUSH_TX = {
    en: { title: "Don't miss a thing!", body: 'Now and then a notification about anything that makes Amsterdam family life easier. No spam, only real Insider scoops your family won\'t want to miss.',
          ask: '', btn: 'Turn on notifications', note: 'Tap Allow on the next screen. You can change this any time in your settings.',
          opts: { hacks: 'Family life hacks', food: 'Food spots', agenda: 'Family activities', kids: 'New kids spots' } },
    nl: { title: 'Mis niks!', body: 'We sturen af en toe een notificatie over alles dat je Amsterdamse leven makkelijk kan maken. Geen SPAM alleen echte Insider scoops, die je als gezin niet wilt missen.',
          ask: '', btn: 'Zet meldingen aan', note: 'Tik op Toestaan op het volgende scherm. Je kunt dit altijd aanpassen in je instellingen.',
          opts: { hacks: 'Family life hacks', food: 'Food spots', agenda: 'Familie activiteiten', kids: 'Nieuwe kids spots' } }
  };
  var _pushCfg = null;
  function pushCfg() {
    if (_pushCfg) return _pushCfg;
    _pushCfg = fetch('https://cbldlpuhmuojdvljdtsk.supabase.co/rest/v1/app_config?config_key=eq.ams_push_prompt&select=config_value',
      { headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM' } })
      .then(function (r) { return r.json(); })
      .then(function (rows) { var v = rows && rows[0] && rows[0].config_value; return (v && typeof v === 'object') ? v : null; })
      .catch(function () { return null; });
    return _pushCfg;
  }
  function pushPrompt(OS, preCfg) {
    var L = IF.lang() === 'nl' ? 'nl' : 'en', T = PUSH_TX[L];
    var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    function paint(cfg) {
      cfg = cfg || {};
      var g = function (k) { return cfg[k + '_' + L] || T[k]; };
      var opts = Object.keys(T.opts).map(function (k) { return { k: k, label: (cfg['opt_' + k + '_' + L]) || T.opts[k] }; });
      var css = '#if-push{position:fixed;inset:0;z-index:9500;background:rgba(47,42,56,.42);display:flex;align-items:flex-end;justify-content:center;font-family:Karla,-apple-system,sans-serif;}' +
        '#if-push .c{position:relative;width:100%;max-width:430px;background:#fff;border-radius:24px 24px 0 0;padding:14px 22px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(60,40,90,.25);color:#2f2a38;animation:ifPushIn .3s ease-out;}' +
        '@keyframes ifPushIn{from{transform:translateY(100%)}to{transform:none}}' +
        '#if-push .g{width:40px;height:5px;border-radius:6px;background:#e6ddef;margin:0 auto 14px;}' +
        '#if-push .x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:none;background:#F4EEF7;color:#8E6FA0;display:flex;align-items:center;justify-content:center;cursor:pointer;}' +
        '#if-push .x svg{width:14px;height:14px;stroke:currentColor;stroke-width:2.4;fill:none;stroke-linecap:round;}' +
        '#if-push .ic{width:46px;height:46px;border-radius:15px;margin:0 auto 12px;background:linear-gradient(135deg,#B597C1,#E8B0C8);display:flex;align-items:center;justify-content:center;}' +
        '#if-push .ic svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}' +
        '#if-push h2{font-size:18px;font-weight:800;line-height:1.25;margin:0 0 6px;text-align:center;}' +
        '#if-push p{font-size:13.5px;color:#8a7f97;line-height:1.5;margin:0 auto 14px;max-width:330px;text-align:center;}' +
        '#if-push .ask{font-size:10.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#8E6FA0;margin:0 0 8px;text-align:center;}' +
        '#if-push .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 auto 16px;max-width:360px;}' +
        '#if-push label{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;text-align:center;line-height:1.2;background:#F8F6FA;border:1.5px solid #E8DFF0;border-radius:14px;padding:10px 10px;font-size:13.5px;font-weight:700;cursor:pointer;}' +
        '#if-push label.on{background:#F4EEF7;border-color:#B597C1;}' +
        '#if-push label i{width:18px;height:18px;border-radius:6px;border:2px solid #C9BDD6;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fff;}' +
        '#if-push label.on i{background:#8E6FA0;border-color:#8E6FA0;}' +
        '#if-push label i svg{width:11px;height:11px;fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;display:none;}' +
        '#if-push label.on i svg{display:block;}' +
        '#if-push input{display:none;}' +
        '#if-push .b{width:100%;border:none;border-radius:14px;padding:14px;font-size:15.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,#B597C1,#E8B0C8);font-family:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(181,151,193,.35);}' +
        '#if-push .n{font-size:11.5px;color:#b0a6bc;text-align:center;margin-top:10px;line-height:1.45;}';
      var st = document.createElement('style'); st.id = 'if-push-style'; st.textContent = css; document.head.appendChild(st);
      var el = document.createElement('div'); el.id = 'if-push';
      el.innerHTML = '<div class="c"><div class="g"></div>' +
        '<button class="x" id="if-push-x" aria-label="close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<div class="ic"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>' +
        '<h2>' + esc(g('title')) + '</h2><p>' + esc(g('body')) + '</p>' +
        (g('ask') ? '<div class="ask">' + esc(g('ask')) + '</div>' : '') + '<div class="opts">' +
        opts.map(function (o) { return '<label class="on"><input type="checkbox" value="' + o.k + '" checked><i><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></i>' + esc(o.label) + '</label>'; }).join('') +
        '</div><button class="b" id="if-push-ok">' + esc(g('btn')) + '</button><div class="n">' + esc(g('note')) + '</div></div>';
      document.body.appendChild(el);
      function close() { if (el.parentNode) el.parentNode.removeChild(el); if (st.parentNode) st.parentNode.removeChild(st); }
      el.addEventListener('click', function (e) {
        var lab = e.target.closest && e.target.closest('label');
        if (lab) { setTimeout(function () { lab.classList.toggle('on', lab.querySelector('input').checked); }, 0); }
        if (e.target === el) { try { localStorage.setItem('ams-push-asked', 'later'); } catch (x) {} close(); }
      });
      document.getElementById('if-push-x').addEventListener('click', function () { try { localStorage.setItem('ams-push-asked', 'later'); } catch (x) {} close(); });
      document.getElementById('if-push-ok').addEventListener('click', function () {
        var tags = {};
        opts.forEach(function (o) { var inp = el.querySelector('input[value="' + o.k + '"]'); tags['wants_' + o.k] = inp && inp.checked ? '1' : '0'; });
        try { localStorage.setItem('ams-push-asked', 'yes'); localStorage.setItem('ams-push-tags', JSON.stringify(tags)); } catch (x) {}
        try { if (OS.User && OS.User.addTags) OS.User.addTags(tags); } catch (x) {}
        close();
        try { OS.Notifications.requestPermission(true); } catch (x) {}
      });
    }
    if (preCfg !== undefined) { paint(preCfg); return; }
    pushCfg().then(paint);
  }
  IF.pushPrompt = pushPrompt;   // for previews: IF.pushPrompt({Notifications:{requestPermission:function(){}}})
  function initPush() {
    try {
      if (!(window.plugins && window.plugins.OneSignal)) return;
      var OS = window.plugins.OneSignal;
      OS.initialize(ONESIGNAL_APP_ID);
      /* our own ask (v0.43): never during the first minutes of the app. Default trigger: back on Home
         after visiting the Event Agenda, or the 3rd app session, whichever comes first. Both are set
         in cbldl app_config 'ams_push_prompt': {"after_page":"event-agenda.html","after_sessions":3}
         (after_page "" = only sessions). Answered = never again; closed = again after 14 days. */
      if (/index\.html$|\/$/.test(window.location.pathname)) {
        var asked = null, later = 0, sessions = 1, first = Date.now(), seenPage = '';
        try {
          asked = localStorage.getItem('ams-push-asked');
          later = parseInt(localStorage.getItem('ams-push-later-at') || '0', 10);
          sessions = parseInt(localStorage.getItem('ams-sessions') || '1', 10);
          first = parseInt(localStorage.getItem('ams-first-open') || String(Date.now()), 10);
          seenPage = localStorage.getItem('ams-push-seen') || '';
        } catch (e) {}
        var due = !asked || (asked === 'later' && later && (Date.now() - later) > 14 * 86400000);
        if (due && (Date.now() - first) > 3 * 60000) {
          pushCfg().then(function (cfg) {
            var n = (cfg && cfg.after_sessions) || 3;
            var pg = (cfg && typeof cfg.after_page === 'string') ? cfg.after_page : 'event-agenda.html';
            var hit = sessions >= n || (pg && seenPage.split(',').indexOf(pg) >= 0);
            if (!hit) return;
            try { if (asked === 'later') localStorage.removeItem('ams-push-asked'); localStorage.setItem('ams-push-later-at', String(Date.now())); } catch (e) {}
            setTimeout(function () { try { pushPrompt(OS, cfg); } catch (e) {} }, 1800);
          });
        }
      }
      /* saved interests again after an app update, in case OneSignal lost them */
      try { var tg = JSON.parse(localStorage.getItem('ams-push-tags') || 'null'); if (tg && OS.User && OS.User.addTags) OS.User.addTags(tg); } catch (e) {}
      /* tie the device to the logged-in account for targeted pushes */
      if (IF.sb) {
        IF.sb.auth.getSession().then(function (r) {
          var s = r && r.data && r.data.session;
          if (s && s.user) { try { OS.login(s.user.id); } catch (e) {} }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* ---------- campaign switches (v0.48): start campaigns later without a new build ----------
     cbldl app_config 'ams_campaign_switch':
     { "landing":      { "enabled": false, "page": "top100-plans.html" },
         -> once per install: the first Home visit after the tour goes to this page (not for quiz arrivals, they land on their gift)
       "member_sheet": { "enabled": false, "key": "top100", "pages": ["index.html"], "after_sessions": 2, "delay_seconds": 15, "repeat_days": 7 }
         -> the Insider sheet (gate.js keys: top100, babysitters, fridge, family, food, bday, battery) for NON-members,
            on these pages, from the Nth app open, at most once every repeat_days days }  */
  (function campaignSwitch() {
    var pg = (location.pathname.split('/').pop() || 'index.html');
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    var cfg = null; try { cfg = JSON.parse(get('ams-campaign-switch') || 'null'); } catch (e) {}
    function run(c) {
      if (!c) return;
      var l = c.landing, m = c.member_sheet;
      if (l && l.enabled && l.page && pg === 'index.html' && !get('ams-landed') && get('onboarding_done') === '1' && !get('ams-campaign')) {
        set('ams-landed', String(Date.now()));
        if (l.page !== 'index.html') { location.href = l.page; return; }
      }
      if (m && m.enabled && (m.pages || ['index.html']).indexOf(pg) >= 0) {
        var sessions = parseInt(get('ams-sessions') || '1', 10), last = parseInt(get('ams-promo-at') || '0', 10);
        if (sessions < (m.after_sessions || 1)) return;
        if (last && (Date.now() - last) < (m.repeat_days != null ? m.repeat_days : 7) * 86400000) return;
        IF.membership.then(function (mm) {
          if (mm && mm.isMember) return;
          setTimeout(function () {
            if (document.getElementById('if-gate') || document.querySelector('.if-sheet')) return;   // never on top of another sheet
            function show() { if (IF.insiderSheet) { set('ams-promo-at', String(Date.now())); IF.insiderSheet({ key: m.key || 'top100', closable: true, blur: 0, tint: 0.22 }); } }
            if (IF.insiderSheet) show();
            else { var sc = document.createElement('script'); sc.src = 'assets/js/gate.js'; sc.onload = show; document.head.appendChild(sc); }
          }, (m.delay_seconds != null ? m.delay_seconds : 15) * 1000);
        });
      }
    }
    ready(function () { run(cfg); });
    try {
      fetch('https://cbldlpuhmuojdvljdtsk.supabase.co/rest/v1/app_config?config_key=eq.ams_campaign_switch&select=config_value',
        { headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM', Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM' } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) { var v = rows && rows[0] && rows[0].config_value; if (v && typeof v === 'object') { set('ams-campaign-switch', JSON.stringify(v)); if (!cfg) { cfg = v; run(v); } } })
        .catch(function () {});
    } catch (e) {}
  })();

  document.addEventListener('deviceready', initPush, false);

})();

/* v0.76 keyboard lift, for every drawer and form in the app.
   On Android (edge-to-edge, target SDK 36) the app does not shrink when the keyboard opens, so a text field in
   the lower half of the screen ends up under the keyboard. When a field gets focus we check where it is:
   - inside a fixed drawer, bar or pop-up: the drawer slides up until the field sits above the keyboard line;
   - in a normal page: the page scrolls the field into the upper part of the screen (with extra room if needed).
   The keyboard line is the visible screen height when the system reports one (iPhone), otherwise 50% of the
   screen. The two login sheets keep their own handling (.login-input, #gst-veil). Leaving the field undoes it. */
(function () {
  'use strict';
  var TEXT = /^(text|email|search|tel|url|number|password)$/i;
  var moved = null, pad = null, tmr = null, base = window.innerHeight;
  window.addEventListener('orientationchange', function () { setTimeout(function () { base = window.innerHeight; }, 400); });
  function isField(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === 'TEXTAREA') return !el.readOnly;
    if (el.tagName === 'INPUT') return TEXT.test(el.type || 'text') && !el.readOnly;
    return el.isContentEditable;
  }
  function own(el) { return (el.classList && el.classList.contains('login-input')) || (el.closest && el.closest('#gst-veil, .login-overlay')); }
  function fixedHost(el) {
    for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') {
        var r = n.getBoundingClientRect();
        if (r.height < window.innerHeight * 0.92) return n;          /* the drawer or bar itself */
        var c = el; while (c.parentElement && c.parentElement !== n) c = c.parentElement;
        return c;                                                    /* full-screen veil: move its panel */
      }
    }
    return null;
  }
  function line() {
    var vv = window.visualViewport;
    if (vv && vv.height < base * 0.8) return vv.offsetTop + vv.height - 16;   /* the system already reports the keyboard */
    return Math.round(window.innerHeight * 0.5) - 16;
  }
  function undo() {
    if (moved) { moved.el.style.transform = moved.t; moved.el.style.transition = moved.tr; moved = null; }
    if (pad) { document.body.style.paddingBottom = pad.v; pad = null; }
  }
  function lift(el) {
    if (document.activeElement !== el) return;
    var host = fixedHost(el), r = el.getBoundingClientRect(), target = line();
    if (r.bottom <= target) return;
    if (host) {
      if (!moved || moved.el !== host) {
        undo();
        var ct = getComputedStyle(host).transform;                     /* keep a centring transform the drawer already has */
        moved = { el: host, t: host.style.transform, tr: host.style.transition, keep: ct && ct !== 'none' ? ct + ' ' : '', dy: 0 };
      }
      moved.dy -= Math.round(r.bottom - target);
      host.style.transition = 'transform .22s ease';
      host.style.transform = moved.keep + 'translateY(' + moved.dy + 'px)';
    } else {
      if (!pad) { pad = { v: document.body.style.paddingBottom }; document.body.style.paddingBottom = Math.round(window.innerHeight * 0.5) + 'px'; }
      window.scrollBy({ top: Math.round(r.bottom - target), behavior: 'smooth' });
    }
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!isField(el) || own(el)) return;
    clearTimeout(tmr);
    tmr = setTimeout(function () { lift(el); }, 320);
  }, true);
  document.addEventListener('focusout', function () {
    clearTimeout(tmr);
    tmr = setTimeout(function () { var a = document.activeElement; if (!isField(a) || own(a)) undo(); }, 180);
  }, true);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () {
    var a = document.activeElement; if (isField(a) && !own(a)) { clearTimeout(tmr); tmr = setTimeout(function () { lift(a); }, 120); }
  });
})();
