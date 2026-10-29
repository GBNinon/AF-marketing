/* ============================================================
   guest.js — guest mode sign-up sheet (needs core.js first)
   ------------------------------------------------------------
   Lets visitors browse without an account (App Store 5.1.1(v))
   and turns personal actions into a friendly sign-up moment.
   Include after core.js:
     <script src="assets/js/guest.js"></script>
   On the home page add data-nudge="1" to arm the 10s invite.
   Contexts: nudge | favorite | playdates | profile | member
   ============================================================ */
(function () {
  'use strict';
  if (window.Guest) return;
  if (!window.IF || !IF.sb) { window.Guest = null; return; }

  var REVIEWER_EMAIL = 'appreview@ibizafamilies.com';
  var REVIEWER_CODE = '246810';
  var REVIEWER_PASS = 'IbizaReview2026!';

  function lang() { try { return localStorage.getItem('ams-lang') === 'nl' ? 'nl' : 'en'; } catch (e) { return 'en'; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var T = {
    en: {
      titles: { nudge: 'Your own family profile', favorite: 'Save favorites?', playdates: 'Join playdates?', profile: 'Your profile', member: "Let's make your family profile", quiz: 'Did our quiz?' },
      kicker: "You're in!",
      body: 'Create your free account.',
      quizBody: 'Log in with the same email and your personal list appears right here.',
      memBody: 'One tiny step to save your favorites, playdates and all the best features.',
      email: 'e-mail address', btn: 'Create my free account', memBtn: "Let's do it!",
      hint: '<b>Just did our quiz?</b> Use the same email so we can connect your results.',
      codeT: 'Check your inbox!', codeB1: 'We just mailed a login code to ', codeB2: ". Fill it in below and you're in!",
      codeBtn: "Let's go!", codePh: 'code from the email', sending: 'Sending...', verifying: 'Verifying...',
      errEmail: 'Please enter a valid email', errCode: 'Please enter the code from your email',
      errMail: 'The email service is not responding. Please try again in a few minutes.',
      errCodeBad: 'That code did not work. Check the email and try again.',
      resend: 'Send a new code', resent: 'New code sent!'
    },
    nl: {
      titles: { nudge: 'Jouw Amsterdam Families profiel', favorite: 'Favorites bewaren?', playdates: 'Meedoen met playdates?', profile: 'Jouw profiel', member: 'Jouw familie profiel', quiz: 'Onze quiz gedaan?' },
      kicker: 'Done!',
      body: 'Maak je gratis account aan.',
      quizBody: 'Log in met hetzelfde e-mailadres, dan staat jouw persoonlijke lijst hier klaar.',
      memBody: 'Een klein stapje nog voor toegang tot al jouw favorites & profile tools.',
      email: 'e-mailadres', btn: 'Maak mijn gratis account', memBtn: "Let's do it!",
      hint: '<b>Net onze quiz gedaan?</b> Gebruik hetzelfde e-mailadres om je quizresultaat te koppelen.',
      codeT: 'Check je inbox!', codeB1: 'We hebben net een logincode gemaild naar ', codeB2: '. Vul hem hieronder in en je bent binnen!',
      codeBtn: "Let's go!", codePh: 'code uit de e-mail', sending: 'Versturen...', verifying: 'Bevestigen...',
      errEmail: 'Vul een geldig e-mailadres in', errCode: 'Vul de code uit je e-mail in',
      errMail: 'De mailservice reageert even niet. Probeer het over een paar minuten nog een keer.',
      errCodeBad: 'Die code klopte niet. Check de e-mail en probeer opnieuw.',
      resend: 'Stuur een nieuwe code', resent: 'Nieuwe code verstuurd!'
    }
  };

  var ICONS = {
    nudge: '&#9825;', favorite: '&#9825;', playdates: '&#9786;', profile: '&#9786;', member: '&#10024;', quiz: '&#10024;'
  };

  /* ---------- session ---------- */
  function getSession() {
    return IF.sb.auth.getSession().then(function (r) {
      return (r && r.data && r.data.session && r.data.session.user) ? r.data.session : null;
    }).catch(function () { return null; });
  }

  /* ---------- campaign recognition (web quiz -> app) ----------
     After a successful login we look for the newest unconsumed
     onboarding_intents row for this email (RLS: own email only). Found:
     keep the payload for the landing page, mark the row consumed and return
     the page to open instead of the tour. Not found: null (today's flow). */
  var CAMPAIGN_PAGES = {
    family_quiz: 'top100-plans.html',
    food_map: 'family-food-spots.html',
    battery: 'city-shaker.html',
    fridge_rescue: 'foodieyai.html',
    birthday: 'birthdays.html'
  };
  function claimCampaignIntent(user) {
    if (!user || !user.email || isReviewer(user.email)) return Promise.resolve(null);
    /* v0.58: a different (or re-created) account on this phone never inherits the previous account's quiz result */
    try {
      var prevUid = localStorage.getItem('ams-uid');
      if (prevUid !== user.id) { localStorage.removeItem('ams-campaign'); localStorage.setItem('ams-uid', user.id); }
    } catch (e) {}
    return Promise.resolve(IF.sb.from('onboarding_intents')
      .select('id,source,result_type,payload,lang,campaign,utm_content')
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)).then(function (r) {
        var row = r && r.data && r.data[0];
        if (!row || !CAMPAIGN_PAGES[row.source]) return null;
        try {
          localStorage.setItem('ams-campaign', JSON.stringify({
            id: row.id, source: row.source, result_type: row.result_type,
            payload: row.payload || {}, campaign: row.campaign, utm_content: row.utm_content,
            claimed_at: Date.now()
          }));
        } catch (e) {}
        /* v0.43: a quiz arrival lands calmly on the result. The app takes the quiz language,
           and the quick tour is skipped (it stays available in Profile, View Tour). */
        var qlang = (row.lang === 'nl' || row.lang === 'en') ? row.lang : null;
        try {
          if (qlang) localStorage.setItem('ams-lang', qlang);
          localStorage.setItem('onboarding_done', '1');
          localStorage.setItem('ams-first-open', localStorage.getItem('ams-first-open') || String(Date.now()));
        } catch (e) {}
        var prof = { onboarding_completed: true, updated_at: new Date().toISOString() };
        if (qlang) prof.language = qlang;
        Promise.resolve(IF.sb.from('ams_profiles').update(prof).eq('id', user.id)).catch(function () {});
        return Promise.resolve(IF.sb.from('onboarding_intents')
          .update({ consumed_at: new Date().toISOString(), user_id: user.id })
          .eq('id', row.id)).catch(function () {}).then(function () {
            return CAMPAIGN_PAGES[row.source] + '#campaign';
          });
      }).catch(function () { return null; });
  }

  /* ---------- UI ---------- */
  var built = false, ctx = 'nudge', pendingEmail = '', lockPage = false;

  function buildUI() {
    if (built) return; built = true;
    var css = [
      '.gst-veil{position:fixed;inset:0;z-index:9500;background:rgba(47,42,56,.42);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s;}',
      '.gst-veil.on{opacity:1;}',
      '.gst{width:100%;max-width:430px;background:#fff;border-radius:24px 24px 0 0;padding:16px 22px calc(26px + env(safe-area-inset-bottom,0px));position:relative;box-shadow:0 -8px 30px rgba(60,40,90,.25);transform:translateY(30px);transition:transform .28s cubic-bezier(.22,1,.36,1);font-family:Karla,-apple-system,sans-serif;color:#2f2a38;}',
      '.gst-veil.on .gst{transform:translateY(0);}',
      '.gst-x{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;background:#F7F2FA;border:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#CDBFD8;cursor:pointer;font-family:inherit;padding:0;}',
      '.gst-x::after{content:"";position:absolute;inset:-10px;}',
      '.gst-grip{width:40px;height:5px;border-radius:6px;background:#e0d8ea;margin:0 auto 12px;}',
      '.gst-ic{width:42px;height:42px;border-radius:13px;margin:2px auto 10px;background:linear-gradient(135deg,#B597C1,#E8B0C8);display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff;}',
      '.gst-k{font-size:11px;font-weight:800;letter-spacing:1px;color:#6FA284;text-transform:uppercase;text-align:center;margin-bottom:2px;display:none;}',
      '.gst-t{font-family:Pacifico,cursive;font-weight:400;font-size:20px;text-align:center;line-height:1.3;}',
      '.gst-p{font-size:13px;line-height:1.55;color:#5a5266;text-align:center;margin-top:8px;}',
      '.gst-p b{color:#2f2a38;}',
      '.gst-err{display:none;font-size:12px;font-weight:700;color:#E0705C;text-align:center;margin-top:8px;}',
      '.gst-in{margin-top:14px;width:100%;background:#fff;border:1.5px solid #B597C1;border-radius:16px;padding:12px 14px;font-size:14px;color:#2f2a38;box-shadow:0 4px 12px rgba(181,151,193,.15);font-family:inherit;outline:none;text-align:left;}',
      '.gst-in::placeholder{color:#a79dbb;}',
      '.gst-hint{font-size:11px;line-height:1.45;color:#8a7f97;text-align:center;margin-top:8px;}',
      '.gst-hint b{color:#2f6b45;}',
      '.gst-in.code{text-align:center;letter-spacing:4px;font-weight:800;font-size:17px;}',
      '.gst-btn{margin-top:12px;width:100%;border:none;border-radius:16px;padding:13px;text-align:center;font-size:14px;font-weight:800;color:#fff;background:linear-gradient(135deg,#B597C1,#E8B0C8);cursor:pointer;font-family:inherit;}',
      '.gst-btn:disabled{opacity:.6;}',
      /* v0.67: keyboard open, the sheet slides down from the top so the field stays visible */
      '.gst-veil.kb{align-items:flex-start;}',
      '.gst-veil.kb .gst{border-radius:0 0 24px 24px;padding-top:calc(14px + env(safe-area-inset-top,0px));padding-bottom:18px;box-shadow:0 8px 30px rgba(60,40,90,.25);animation:gstDrop .3s cubic-bezier(.22,1,.36,1);}',
      '.gst-veil.kb .gst-grip,.gst-veil.kb .gst-ic{display:none;}',
      '.gst-veil.kb .gst-x{top:calc(10px + env(safe-area-inset-top,0px));}',
      '@keyframes gstDrop{from{transform:translateY(-40px);opacity:.6}to{transform:none;opacity:1}}',
      '.gst-resend{display:none;margin:10px auto 0;background:none;border:none;font-size:12px;font-weight:700;color:#9a90a8;text-decoration:underline;cursor:pointer;font-family:inherit;display:block;}'
    ].join('');
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var veil = document.createElement('div');
    veil.className = 'gst-veil'; veil.id = 'gst-veil'; veil.style.display = 'none';
    veil.innerHTML =
      '<div class="gst">' +
      '<div class="gst-grip"></div>' +
      '<button class="gst-x" id="gst-x" aria-label="Close">&#10005;</button>' +
      '<div class="gst-ic" id="gst-ic">&#9825;</div>' +
      '<div class="gst-k" id="gst-k"></div>' +
      '<div class="gst-t" id="gst-t"></div>' +
      '<p class="gst-p" id="gst-p"></p>' +
      '<div class="gst-err" id="gst-err"></div>' +
      '<input class="gst-in" id="gst-email" type="email" autocomplete="email" inputmode="email">' +
      '<p class="gst-hint" id="gst-hint"></p>' +
      '<input class="gst-in code" id="gst-code" type="text" inputmode="numeric" maxlength="10" autocomplete="one-time-code" style="display:none">' +
      '<button class="gst-btn" id="gst-go"></button>' +
      '<button class="gst-resend" id="gst-resend"></button>' +
      '</div>';
    document.body.appendChild(veil);
    document.getElementById('gst-x').addEventListener('click', close);
    /* v0.67b: ignore the tap that focused a field (the sheet may have moved under the finger) */
    veil.addEventListener('click', function (e) { if (e.target === veil && Date.now() - (veil._focusAt || 0) > 900) close(); });
    document.getElementById('gst-go').addEventListener('click', onGo);
    document.getElementById('gst-resend').addEventListener('click', onResend);
    /* v0.67: keyboard covers the bottom sheet on phones, so move it to the top while typing */
    var kbT = null;
    veil.addEventListener('focusin', function (e) {
      if (!e.target.classList || !e.target.classList.contains('gst-in')) return;
      veil._focusAt = Date.now(); clearTimeout(kbT);
      /* v0.67b: move only after the tap has finished, otherwise the click lands on the backdrop and closes the sheet */
      var field = e.target;
      kbT = setTimeout(function () {
        if (document.activeElement !== field) return;
        veil.classList.add('kb');
        setTimeout(function () { try { if (document.activeElement !== field) field.focus(); } catch (x) {} }, 60);
      }, 350);
    });
    veil.addEventListener('focusout', function () {
      clearTimeout(kbT);
      kbT = setTimeout(function () {
        var a = document.activeElement;
        if (!(a && a.classList && a.classList.contains('gst-in'))) veil.classList.remove('kb');
      }, 180);
    });
  }

  var step = 1;
  function render() {
    var t = T[lang()];
    document.getElementById('gst-ic').innerHTML = ICONS[ctx] || '&#9825;';
    var k = document.getElementById('gst-k');
    k.style.display = ctx === 'member' ? 'block' : 'none';
    k.textContent = t.kicker;
    var err = document.getElementById('gst-err'); err.style.display = 'none';
    var email = document.getElementById('gst-email');
    var code = document.getElementById('gst-code');
    var go = document.getElementById('gst-go');
    var rs = document.getElementById('gst-resend');
    if (rs) { rs.style.display = step === 2 ? 'block' : 'none'; rs.textContent = t.resend; rs.disabled = false; }
    if (step === 1) {
      document.getElementById('gst-t').textContent = t.titles[ctx] || t.titles.nudge;
      document.getElementById('gst-p').innerHTML = ctx === 'member' ? t.memBody : (ctx === 'quiz' ? t.quizBody : t.body);
      email.style.display = 'block'; email.placeholder = t.email;
      var hint = document.getElementById('gst-hint');
      if (hint) { hint.style.display = (ctx === 'member' || ctx === 'quiz') ? 'none' : 'block'; hint.innerHTML = t.hint; }
      code.style.display = 'none';
      go.textContent = ctx === 'member' ? t.memBtn : t.btn;
    } else {
      document.getElementById('gst-t').textContent = t.codeT;
      document.getElementById('gst-p').innerHTML = t.codeB1 + '<b>' + pendingEmail + '</b>' + t.codeB2;
      email.style.display = 'none';
      var hint2 = document.getElementById('gst-hint');
      if (hint2) hint2.style.display = 'none';
      code.style.display = 'block'; code.placeholder = t.codePh; code.value = '';
      go.textContent = t.codeBtn;
      setTimeout(function () { try { code.focus(); } catch (e) {} }, 250);
    }
    go.disabled = false;
  }

  function showErr(msg) {
    var err = document.getElementById('gst-err');
    err.textContent = msg; err.style.display = 'block';
  }

  function open(context, opts) {
    ctx = context || 'nudge';
    lockPage = !!(opts && opts.lock);
    buildUI();
    step = 1; pendingEmail = '';
    render();
    var veil = document.getElementById('gst-veil');
    veil.style.display = 'flex';
    requestAnimationFrame(function () { veil.classList.add('on'); });
    if (ctx === 'nudge' || ctx === 'member' || ctx === 'quiz') {
      try { sessionStorage.setItem('ams-nudge-done', '1'); } catch (e) {}
      if (ctx === 'nudge') ls('ams-nudge-ts', Date.now().toString());
    }
  }

  function close() {
    if (lockPage) { window.location.replace('index.html'); return; }
    var veil = document.getElementById('gst-veil');
    if (!veil) return;
    veil.classList.remove('on');
    setTimeout(function () { veil.style.display = 'none'; }, 260);
  }

  /* ---------- auth flow ---------- */
  function isReviewer(email) { return (email || '').trim().toLowerCase() === REVIEWER_EMAIL; }

  function sendCode(email) {
    /* Same two-channel send as the classic login: branded email first,
       Supabase's own OTP email as the safety net. */
    /* v0.54: never wait more than 10 s on the branded email; then the standard login email takes over */
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var tmr = ctl ? setTimeout(function () { ctl.abort(); }, 10000) : null;
    return fetch(IF.SUPABASE_URL + '/functions/v1/ams-login-email', {
      signal: ctl ? ctl.signal : undefined,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: IF.SUPABASE_ANON, Authorization: 'Bearer ' + IF.SUPABASE_ANON },
      body: JSON.stringify({ email: email, lang: lang() })
    }).then(function (r) {
      if (tmr) clearTimeout(tmr);
      if (r.ok) return { error: null };
      throw new Error('edge-failed');
    }).catch(function () {
      return IF.sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
    }).then(function (res) {
      if (res && res.error) throw res.error;
    });
  }

  function backupSession(session) {
    try {
      if (session && session.access_token && session.refresh_token) {
        try { sessionStorage.setItem('sb_backup_access', session.access_token); sessionStorage.setItem('sb_backup_refresh', session.refresh_token); } catch (e) {}
        ls('sb_backup_access', session.access_token);
        ls('sb_backup_refresh', session.refresh_token);
        ls('sb_backup_ts', Date.now().toString());
      }
    } catch (e) {}
  }

  function onResend() {
    var t = T[lang()];
    var rs = document.getElementById('gst-resend');
    if (!pendingEmail || isReviewer(pendingEmail)) return;
    rs.disabled = true; rs.textContent = t.sending;
    sendCode(pendingEmail).then(function () {
      rs.textContent = t.resent;
      setTimeout(function () { rs.textContent = t.resend; rs.disabled = false; }, 30000);
    }).catch(function () {
      rs.textContent = t.resend; rs.disabled = false;
      showErr(t.errMail);
    });
  }

  function onGo() {
    var t = T[lang()];
    var go = document.getElementById('gst-go');
    if (step === 1) {
      var email = (document.getElementById('gst-email').value || '').trim();
      if (isReviewer(email)) { pendingEmail = REVIEWER_EMAIL; step = 2; render(); return; }
      if (!email || email.indexOf('@') < 1) { showErr(t.errEmail); return; }
      go.disabled = true; go.textContent = t.sending;
      sendCode(email).then(function () {
        pendingEmail = email; step = 2; render();
      }).catch(function () {
        go.disabled = false; go.textContent = ctx === 'member' ? t.memBtn : t.btn;
        showErr(t.errMail);
      });
      return;
    }
    /* step 2: verify */
    var code = (document.getElementById('gst-code').value || '').trim();
    if (!code || code.length < 6) { showErr(t.errCode); return; }
    go.disabled = true; go.textContent = t.verifying;
    var p;
    if (isReviewer(pendingEmail) && code === REVIEWER_CODE) {
      p = IF.sb.auth.signInWithPassword({ email: REVIEWER_EMAIL, password: REVIEWER_PASS });
    } else {
      p = IF.sb.auth.verifyOtp({ email: pendingEmail.toLowerCase(), token: code, type: 'email' })
        .then(function (r1) {
          if (!r1.error) return r1;
          return IF.sb.auth.verifyOtp({ email: pendingEmail.toLowerCase(), token: code, type: 'magiclink' })
            .then(function (r2) { return r2.error ? r1 : r2; });
        });
    }
    p.then(function (result) {
      if (result.error) throw result.error;
      var user = result.data && result.data.user;
      var session = result.data && result.data.session;
      if (!user) throw new Error('no-user');
      if (session) backupSession(session);
      /* profile row (same as the classic login flow) */
      return Promise.resolve(IF.sb.from('ams_profiles').upsert({
        id: user.id,
        email: (user.email || pendingEmail).toLowerCase(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id', ignoreDuplicates: false })).catch(function () {}).then(function () { return user; });
    }).then(function (user) {
      /* campaign recognition: is a quiz result waiting for this email?
         (onboarding_intents, written by the web quiz pages via quiz-intent) */
      return claimCampaignIntent(user).then(function (landing) {
        /* v0.65: a waiting quiz result opens straight away (that is why they installed);
           the quick tour follows once, the first time they open Home (index.html, ams-tour-pending) */
        if (landing && ctx !== 'member') {
          ls('ams-tour-pending', '1');
          close();
          window.location.replace(landing);
          return;
        }
        if (landing) {
          close();
          window.location.replace(landing);
          return;
        }
        if (ctx === 'member') {
          /* RevenueCat links the purchase to this account via core.js onAuthStateChange */
          close();
          setTimeout(function () { try { window.location.reload(); } catch (e) {} }, 900);
        } else if (/^(playdates|favorite|quiz)$/.test(ctx) && !/^(index\.html)?$/.test(location.pathname.split('/').pop() || '')) {
          /* v0.69: logged in from inside a tool (Playdates gate, a heart, the quiz sheet): stay on this page.
             The quick tour follows once, the first time they open Home. */
          ls('ams-tour-pending', '1');
          close();
          setTimeout(function () { try { window.location.reload(); } catch (e) {} }, 300);
        } else {
          /* v0.65: came in through a campaign link or a Play Store campaign install (ams-deeplink,
             set by core.js within the last 3 days)? Then that tool opens straight away; the quick tour
             follows the first time they open Home (onboarding is not done yet, so index.html starts it). */
          try {
            var dl = JSON.parse(localStorage.getItem('ams-deeplink') || 'null');
            if (dl && dl.page && dl.page !== 'index.html' && (Date.now() - (dl.at || 0)) < 3 * 86400000) { close(); window.location.replace(dl.page); return; }
          } catch (e) {}
          ls('tour_trigger', Date.now().toString());
          window.location.replace('quick-tour.html#triggered');
        }
      });
    }).catch(function (err) {
      go.disabled = false; go.textContent = t.codeBtn;
      var detail = err && err.message ? ' (' + String(err.message).slice(0, 80) + ')' : '';
      showErr(t.errCodeBad + detail);
    });
  }

  /* ---------- nudge + link interception ---------- */
  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  function armNudge() {
    var sessDone = false;
    try { sessDone = sessionStorage.getItem('ams-nudge-done') === '1'; } catch (e) {}
    /* Android can recreate the webview mid-use, which wipes sessionStorage.
       A localStorage timestamp keeps the guest sheet to once per hour no matter what. */
    var last = parseInt(ls('ams-nudge-ts') || '0', 10);
    var withinHour = !!(last && (Date.now() - last) < 3600000);
    setTimeout(function () {
      getSession().then(function (s) {
        if (s) return;
        var veil = document.getElementById('gst-veil');
        if (veil && veil.style.display !== 'none') return;
        /* Paying member without a linked email: keep asking, once per app open. */
        var mp = (window.IF && IF.membership && typeof IF.membership.then === 'function')
          ? IF.membership : Promise.resolve({ isMember: false });
        mp.then(function (m) {
          if (m && m.isMember) { if (!sessDone) open('member'); return; }
          if (sessDone || withinHour) return;
          open('nudge');
        }).catch(function () {
          if (!sessDone && !withinHour) open('nudge');
        });
      });
    }, 3000);
  }

  function interceptProfileLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href*="user-profile"]') : null;
      if (!a) return;
      e.preventDefault(); e.stopPropagation();
      getSession().then(function (s) {
        if (s) { window.location.href = a.getAttribute('href'); }
        else { open('profile'); }
      });
    }, true);
  }

  window.Guest = {
    open: open,
    close: close,
    armNudge: armNudge,
    isGuest: function () { return getSession().then(function (s) { return !s; }); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    getSession().then(function (s) {
      if (s) return;
      interceptProfileLinks();
      /* v0.69: campaign arrivals (custom store listing, Play install referrer or a campaign link, stored by
         core.js as ams-deeplink in the last 3 days) who land on a quiz result page get the login drawer first,
         so their quiz result is connected. Normal visitors of these pages do not see it. */
      var here = (location.pathname.split('/').pop() || '').toLowerCase();
      var qa = false; try { qa = sessionStorage.getItem('ams-quiz-ask') === '1'; } catch (e) {}
      var fromCampaign = false;
      try { var dl0 = JSON.parse(localStorage.getItem('ams-deeplink') || 'null'); fromCampaign = !!(dl0 && dl0.page && (Date.now() - (dl0.at || 0)) < 3 * 86400000 && String(dl0.page).toLowerCase() === here); } catch (e) {}
      if (!qa && fromCampaign && /^(top100-plans|family-food-spots|birthdays)\.html$/.test(here)) {
        try { sessionStorage.setItem('ams-quiz-ask', '1'); } catch (e) {}
        setTimeout(function () { var v = document.getElementById('gst-veil'); if (!v || v.style.display === 'none') open('quiz'); }, 1200);
      }
      armNudge();
      if (window.location.hash === '#signup-profile') {
        history.replaceState(null, '', window.location.pathname);
        setTimeout(function () { open('profile'); }, 400);
      }
    });
  });
})();
