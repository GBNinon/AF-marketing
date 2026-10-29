/* ============================================================
   gate.js - membership gate for gated pages (needs core.js first)
   v2 (1 Oct 2026): one shared Insider sheet, IF.insiderSheet(opts), used by the
   page gates, the welcome sheet (campaign.js), the result frame (match.js) and the Top 100 card.
   ------------------------------------------------------------
   One line per gated page, AFTER core.js:
     <script src="assets/js/gate.js" data-page="babysitters"></script>

   Flow on a gated page:
     1. Reads its page_gates row from Supabase (on/off, look, text).
     2. Asks core.js for membership (RevenueCat inside the app).
     3. Member  -> no gate; fires 'if-member' so the page fetches FULL data.
     4. Non-member -> frost + card over the teaser; full data is NEVER fetched.
     5. Subscribe -> RevenueCat purchase; Restore -> restorePurchases.
        On success the gate dissolves and 'if-member' fires.

   Page contract (member-connected data):
     - On load, fetch only a small teaser (e.g. 5 rows).
     - Full fetch goes inside IF.onMember(function(){ ... }).
   ============================================================ */
(function () {
  'use strict';

  var me = document.currentScript;
  var PAGE = me ? (me.getAttribute('data-page') || '') : '';
  if (!window.IF) { console.warn('gate.js requires core.js'); return; }
  var IF = window.IF;

  /* The membership name (e.g. "Ultimate Islander") is stored ONCE in
     app_config (key='membership_name') so you edit it in one place.
     Any {name} token in the card text is replaced with it. */
  var MEMBERSHIP_NAME = { en: 'membership', nl: 'lidmaatschap' };
  function fillName(s) {
    var n = MEMBERSHIP_NAME[IF.lang()] || MEMBERSHIP_NAME.en || '';
    return (s || '').replace(/\{name\}/g, n);
  }
  function pick(cfg, base) { return fillName(cfg[base + '_' + IF.lang()] || cfg[base + '_en'] || ''); }

  /* ---------- the Insider sheet: ONE design for every membership moment (v3, 7 Oct 2026) ----------
     IF.insiderSheet({ key, chip, n, closable, inline, onMember, blur, tint, layout })
       key    'babysitters' | 'fridge' | 'top100' (lock sheets) or 'family' | 'food' | 'bday' (gift sheets)
       chip   result name on gift sheets ("Zandbak-Sommeliers"); n = real number of picks ({n} in the body)
       inline an element: the same block is drawn inside the page (end of the Top 100 list) instead of a pop-up
     Texts: SHEETS below = her copy (7 Oct). Every text can be overridden without a build in cbldl
     app_config 'ams_member_sheets' ({common:{en:{..},nl:{..}}, babysitters:{en:{..},nl:{..}}, ...}).
     Free trial: when the store product has a free intro offer, button and note switch to the trial texts. */
  var SHEETS = {
    common: {
      en: { lockPill: 'Amsterdam Families Insider', button: 'Unlock for EUR 0,99', pill: 'Member gift',
            benHead: 'Everything in Insider', benHeadGift: 'Plus everything in Insider',
            benShaker: 'The City Shaker', benPlans: 'All 100 family plans', benQuiz: 'Personalised quizzes & tools', benPlaydates: 'Playdates', benFood: 'Kids-proof food assistant', benSitters: 'Access our babysitter network',
            incHead: 'Amsterdam Families Insider includes the best of Amsterdam Families:',
            note: 'EUR 0,99/week, auto-renews · cancel anytime · always 100% ad-free', restore: 'Already a member? Restore',
            renew: 'Renews automatically every week', terms: 'Terms', privacy: 'Privacy',
            trialButton: 'Try {period} for free', trialNote: '{period} free, then EUR 0,99/week · cancel anytime · always 100% ad-free' },
      nl: { lockPill: 'Amsterdam Families Insider', button: 'Ontgrendel voor EUR 0,99', pill: 'Member cadeau',
            benHead: 'Alles van Insider', benHeadGift: 'Plus alles van Insider',
            benShaker: 'De City Shaker', benPlans: 'Alle 100 familieplannen', benQuiz: 'Gepersonaliseerde quizzen & tools', benPlaydates: 'Playdates', benFood: 'Kids-proof food assistant', benSitters: 'Toegang tot ons oppasnetwerk',
            incHead: 'Amsterdam Families Insider bevat het beste van Amsterdam Families:',
            note: 'EUR 0,99/week, verlengt automatisch · opzeggen kan altijd · altijd 100% advertentievrij', restore: 'Al lid? Herstel je aankoop',
            renew: 'Verlengt automatisch elke week', terms: 'Voorwaarden', privacy: 'Privacy',
            trialButton: 'Probeer {period} gratis', trialNote: '{period} gratis, daarna EUR 0,99/week · opzeggen kan altijd · altijd 100% advertentievrij' }
    },
    shaker: { own: 'shaker',
      en: { title: 'Your plans are ready', body: '{n} plans that just fell out of the City Shaker, picked for you.' },
      nl: { title: 'Jullie plannen liggen klaar', body: '{n} plannen die net uit de City Shaker vielen, speciaal voor jullie.' } },
    playdates: { own: 'playdates',
      en: { title: 'Playdates is for Insiders', body: 'Make plans, join other families and chat in the group. Looking around stays free.',
            inc: 'All 100 family plans, personalised quizzes & tools, your kids-proof food assistant, access to our babysitter network & more.' },
      nl: { title: 'Playdates hoort bij Insider', body: 'Plannen maken, aansluiten bij andere gezinnen en chatten in de groep. Rondkijken blijft gratis.',
            inc: 'Alle 100 familieplannen, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant, toegang tot ons oppasnetwerk & meer.' } },
    babysitters: { own: 'sitters',
      en: { title: 'Access our babysitter network', body: 'Browse all babysitter profiles and contact your favourites directly.',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, your kids-proof food assistant & more.' },
      nl: { title: 'Toegang tot ons oppasnetwerk', body: 'Bekijk alle oppasprofielen en neem direct contact op met jouw favorieten.',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant & meer.' } },
    fridge: { own: 'food',
      en: { title: 'Ask the Fridge!', body: 'Simply snap your fridge and get 3 kid-friendly recipes using what you already have.',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, access to our babysitter network & more.' },
      nl: { title: 'Vraag het je koelkast!', body: 'Maak een foto van je koelkast en krijg 3 kids-proof recepten met wat je al in huis hebt.',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, toegang tot ons oppasnetwerk & meer.' } },
    top100: { own: 'plans',
      en: { title: 'See all 100 plans', body: 'Explore our 100 favourite family activities in Amsterdam. Handpicked by parents, for parents.',
            inc: 'Playdates, personalised quizzes & tools, your kids-proof food assistant, access to our babysitter network & more.' },
      nl: { title: 'Bekijk alle 100 plannen', body: 'Bekijk onze 100 allerleukste familieactiviteiten in Amsterdam. Verzameld door ouders, voor ouders.',
            inc: 'Playdates, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant, toegang tot ons oppasnetwerk & meer.' } },
    family: { gift: true, n: 20,
      en: { title: 'Your personal Family Top 20 in Amsterdam!', body: '{n} fun things to do in Amsterdam, selected especially for your family.',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, your kids-proof food assistant, access to our babysitter network & more.' },
      nl: { title: 'Jullie persoonlijke Familie Top 20 in Amsterdam!', body: '{n} leuke dingen in Amsterdam, speciaal geselecteerd voor jouw familie.',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant, toegang tot ons oppasnetwerk & meer.' } },
    food: { gift: true, n: 15,
      en: { title: 'Your Amsterdam Kids-proof Food Spot Map', body: '{n} great family food spots, picked especially for you.', chip: 'Your Little Foodies Map',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, access to our babysitter network & more.' },
      nl: { title: 'Jullie eigen kids-proof foodspots map van Amsterdam', body: '{n} fijne family food spots, speciaal gekozen voor jullie.', chip: 'Jouw Little Foodies Map',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, toegang tot ons oppasnetwerk & meer.' } },
    battery: { gift: true,
      en: { title: 'Your recharge plan: the City Shaker!', body: '',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, your kids-proof food assistant, access to our babysitter network & more.' },
      nl: { title: 'Jullie oplaadplan: de City Shaker!', body: '',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant, toegang tot ons oppasnetwerk & meer.' } },
    bday: { gift: true, n: 6,
      en: { title: 'Your birthday party tips, all in one place', body: '{n} personalised birthday ideas for a party that really suits your child.',
            inc: 'All 100 family plans, Playdates, personalised quizzes & tools, your kids-proof food assistant, access to our babysitter network & more.' },
      nl: { title: 'Jouw verjaardagsfeesttips op een rijtje', body: '{n} persoonlijke verjaardagstips voor dat feestje dat echt bij jullie kind past.',
            inc: 'Alle 100 familieplannen, Playdates, gepersonaliseerde quizzen & tools, jullie kids-proof food assistant, toegang tot ons oppasnetwerk & meer.' } }
  };
  var SHEET_CFG = null;
  try { SHEET_CFG = JSON.parse(localStorage.getItem('ams-member-sheets') || 'null'); } catch (e) {}
  function txt(key, L) {
    var o = {}, c = SHEET_CFG || {};
    function add(src) { if (src) for (var k in src) if (src[k] != null && src[k] !== '') o[k] = src[k]; }
    add(SHEETS.common[L]); add(c.common && c.common[L]);
    add(SHEETS[key] && SHEETS[key][L]); add(c[key] && c[key][L]);
    return o;
  }
  IF.memberSheetText = txt;

  var CSS =
    '#if-gate{position:fixed;inset:0;z-index:5000;display:flex;justify-content:center;align-items:flex-end;}' +
    '#if-gate.center{align-items:center;padding:24px;}' +
    '.ifm{position:relative;background:#fff;text-align:center;font-family:Karla,-apple-system,sans-serif;box-sizing:border-box;}' +
    '#if-gate .ifm{width:100%;max-width:430px;border-radius:24px 24px 0 0;padding:14px 22px calc(18px + env(safe-area-inset-bottom));' +
      'box-shadow:0 12px 40px rgba(90,70,120,0.26);animation:ifGateIn .3s ease-out;max-height:92vh;overflow-y:auto;}' +
    '#if-gate.center .ifm{border-radius:22px;width:min(380px,92vw);padding:22px 22px 18px;}' +
    '.ifm.ifm-inline{width:100%;border-radius:22px;padding:22px 20px 18px;margin:8px 0 4px;box-shadow:0 8px 26px rgba(90,70,120,0.16);}' +
    '@keyframes ifGateIn{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}' +
    '.ifm .ifm-grip{width:40px;height:5px;border-radius:6px;background:#e6ddef;margin:0 auto 14px;}' +
    '.ifm .ifm-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:none;background:#F4EEF7;color:#8E6FA0;display:flex;align-items:center;justify-content:center;cursor:pointer;}' +
    '.ifm .ifm-close svg{width:14px;height:14px;stroke:currentColor;stroke-width:2.4;fill:none;stroke-linecap:round;}' +
    '.ifm .ifm-icon{width:46px;height:46px;border-radius:15px;margin:0 auto 12px;background:linear-gradient(135deg,#B597C1,#E8B0C8);display:flex;align-items:center;justify-content:center;}' +
    '.ifm .ifm-pill{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:linear-gradient(120deg,#8E6FA0,#E8B0C8);border-radius:999px;padding:5px 14px;margin:0 0 10px;}' +
    '.ifm h2{font-family:Karla,-apple-system,sans-serif;font-size:19px;font-weight:800;color:#2f2a38;line-height:1.25;margin:0 auto 6px;letter-spacing:0;max-width:330px;text-wrap:balance;}' +
    '.ifm p.ifm-body{text-align:center;text-wrap:balance;font-size:13.5px;color:#8a7f97;line-height:1.5;margin:0 auto 14px;max-width:330px;}' +
    '.ifm .ifm-chip{display:inline-block;font-size:13.5px;font-weight:800;color:#8E6FA0;background:#F4EEF7;border-radius:999px;padding:6px 14px;margin:-2px 0 14px;}' +
    '.ifm .ifm-btn{display:block;width:100%;height:48px;line-height:20px;box-sizing:border-box;border:none;cursor:pointer;border-radius:14px;padding:14px;' +
      'font-size:15.5px;font-weight:800;font-family:inherit;background:linear-gradient(135deg,#B597C1,#E8B0C8);color:#fff;' +
      'box-shadow:0 4px 14px rgba(181,151,193,0.35);transition:transform .12s;}' +
    '.ifm .ifm-btn:active{transform:scale(.98);}' +
    '.ifm .ifm-btn[disabled]{opacity:.6;}' +
    '.ifm .ifm-head{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8E6FA0;margin:-4px 0 8px;}' +
    '.ifm .ifm-grid{display:flex;flex-direction:column;gap:5px;margin:0 0 14px;text-align:left;}' +
    '.ifm .ifm-grid div{display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:700;color:#3f3649;background:#F7F3FA;border-radius:12px;padding:7px 12px;line-height:1.2;}' +
    '.ifm .ifm-grid div.own{background:#EFE6F5;color:#2f2a38;}' +
    '.ifm .ifm-grid i{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#B597C1,#E8B0C8);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-style:normal;}' +
    '.ifm .ifm-grid div.own i{background:#7A5990;}' +
    '.ifm .ifm-grid svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}' +
    '.ifm .ifm-note{font-size:12px;color:#8a7f97;margin-top:9px;line-height:1.4;text-wrap:balance;}' +
    '.ifm .ifm-restore{display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:#B597C1;background:none;border:none;cursor:pointer;font-family:inherit;}' +
    '.ifm .ifm-err{font-size:12px;color:#E07070;margin-top:10px;display:none;}' +
    '.ifm .ifm-legal{font-size:11px;color:#b0a6bc;margin-top:2px;line-height:1.5;}' +
    '.ifm .ifm-legal a{color:#8f6fa0;font-weight:700;text-decoration:none;}';
  function ensureCss() {
    if (document.getElementById('if-gate-style')) return;
    var st = document.createElement('style'); st.id = 'if-gate-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* words with a hyphen (kids-proof, kid-friendly) never break over two lines */
  function keep(x) { return esc(x).replace(/(\S*[A-Za-z0-9]-[A-Za-z]\S*)/g, '<span style="white-space:nowrap">$1</span>'); }
  function plugin() {
    try { if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Purchases')) return window.Capacitor.Plugins.Purchases; } catch (e) {}
    return null;
  }
  var BEN = {
    plans:   '<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    quiz:    '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    food:    '<svg viewBox="0 0 24 24"><path d="M3 11h18M5 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>',
    sitters: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    playdates: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.2"/><path d="M3.5 19v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v1"/><path d="M16.5 19v-.5a3.5 3.5 0 0 1 4-3.4"/></svg>',
    shaker:  '<svg viewBox="0 0 24 24"><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2M4 9c-1 2-1 4 0 6M20 9c1 2 1 4 0 6"/></svg>'
  };
  var BEN_LABEL = { shaker: 'benShaker', plans: 'benPlans', playdates: 'benPlaydates', quiz: 'benQuiz', food: 'benFood', sitters: 'benSitters' };
  var ICONS = {
    lock: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    gift: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7a3 3 0 1 0-3-3c0 2 3 3 3 3zM12 7a3 3 0 1 1 3-3c0 2-3 3-3 3z"></path></svg>'
  };
  function periodText(intro, L) {
    var n = +(intro.periodNumberOfUnits || intro.cycles || 1), u = String(intro.periodUnit || 'WEEK').toUpperCase();
    if (u === 'WEEK' && n === 1) return L === 'nl' ? '1 week' : '1 week';
    var w = { DAY: ['day', 'days', 'dag', 'dagen'], WEEK: ['week', 'weeks', 'week', 'weken'], MONTH: ['month', 'months', 'maand', 'maanden'], YEAR: ['year', 'years', 'jaar', 'jaar'] }[u] || ['week', 'weeks', 'week', 'weken'];
    return n + ' ' + (L === 'nl' ? (n === 1 ? w[2] : w[3]) : (n === 1 ? w[0] : w[1]));
  }

  function insiderSheet(opts) {
    opts = opts || {};
    var inline = opts.inline && opts.inline.nodeType === 1 ? opts.inline : null;
    if (!inline && document.getElementById('if-gate')) return;
    if (inline && inline.querySelector('.ifm')) return;
    ensureCss();
    var L = IF.lang() === 'nl' ? 'nl' : 'en';
    var key = opts.key || 'top100';
    var meta = SHEETS[key] || {};
    var t = txt(key, L);
    var gift = !!meta.gift;
    var n = (opts.n && opts.n > 0) ? opts.n : meta.n;
    var title = opts.title || t.title, body = (opts.body || t.body || '').replace('{n}', n);
    var chip = gift ? (t.chip || opts.chip || '') : '';

    var card = document.createElement('div');
    card.className = 'ifm' + (inline ? ' ifm-inline' : '');
    card.innerHTML =
      (!inline && (opts.layout || 'sheet') === 'sheet' ? '<div class="ifm-grip"></div>' : '') +
      (!inline && opts.closable ? '<button class="ifm-close" aria-label="close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : '') +
      '<div class="ifm-icon">' + (gift ? ICONS.gift : ICONS.lock) + '</div>' +
      '<div class="ifm-pill">' + esc(gift ? t.pill : t.lockPill) + '</div>' +
      '<h2>' + keep(title) + '</h2>' +
      (body ? '<p class="ifm-body">' + keep(body) + '</p>' : '') +
      (chip ? '<div class="ifm-chip">' + esc(chip) + '</div>' : '') +
      '<div class="ifm-head">' + esc(gift ? t.benHeadGift : t.benHead) + '</div>' +
      '<div class="ifm-grid">' + ['shaker', 'plans', 'playdates', 'quiz', 'food', 'sitters'].sort(function (a, b) { return (b === meta.own) - (a === meta.own); }).map(function (k) {
        return '<div' + (meta.own === k ? ' class="own"' : '') + '><i>' + BEN[k] + '</i><span>' + esc(t[BEN_LABEL[k]]) + '</span></div>';
      }).join('') + '</div>' +
      '<button class="ifm-btn">' + esc(t.button) + '</button>' +
      '<div class="ifm-note">' + esc(t.note) + '</div>' +
      '<button class="ifm-restore">' + esc(t.restore) + '</button>' +
      '<div class="ifm-legal">' +
        '<a href="https://www.amsterdamfamilies.com/terms-and-conditions" target="_blank" rel="noopener">' + esc(t.terms) + '</a> · ' +
        '<a href="https://www.amsterdamfamilies.com/privacy-policy" target="_blank" rel="noopener">' + esc(t.privacy) + '</a></div>' +
      '<div class="ifm-err"></div>';

    var wrap = null;
    if (inline) {
      inline.appendChild(card);
    } else {
      var blur = (opts.blur != null ? opts.blur : 6), tint = (opts.tint != null ? opts.tint : 0.30);
      wrap = document.createElement('div');
      wrap.id = 'if-gate';
      if ((opts.layout || 'sheet') !== 'sheet') wrap.className = 'center';
      wrap.style.cssText = '-webkit-backdrop-filter:blur(' + blur + 'px);backdrop-filter:blur(' + blur + 'px);background:rgba(248,246,250,' + tint + ');';
      wrap.appendChild(card);
      document.body.appendChild(wrap);
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      /* No rubber-band bounce: kill drags on the frost layer itself */
      wrap.addEventListener('touchmove', function (e) { if (!e.target.closest || !e.target.closest('.ifm')) e.preventDefault(); }, { passive: false });
    }

    var btn = card.querySelector('.ifm-btn'), errEl = card.querySelector('.ifm-err');
    function fail(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }
    function remove() {
      if (inline) { if (card.parentNode) card.parentNode.removeChild(card); return; }
      try { document.body.style.overflow = ''; } catch (e) {}
      wrap.style.transition = 'opacity .3s ease'; wrap.style.opacity = '0';
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 320);
    }
    function dissolve() {
      remove();
      var g = document.getElementById('if-gate'); if (g && g !== wrap && g.parentNode) g.parentNode.removeChild(g);
      try { document.body.style.overflow = ''; } catch (e) {}
      document.dispatchEvent(new CustomEvent('if-member'));   // pages fetch full data now
      if (typeof opts.onMember === 'function') { try { opts.onMember(); } catch (e) {} }
    }
    function offerMemberProfile() {
      if (!window.Guest || !IF.sb) return;
      IF.sb.auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        if (!s || !s.user) setTimeout(function () { Guest.open('member'); }, 600);
      }).catch(function () {});
    }
    var closeBtn = card.querySelector('.ifm-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { remove(); if (typeof opts.onClose === 'function') { try { opts.onClose(); } catch (e) {} } });
    if (wrap && opts.closable) wrap.addEventListener('click', function (e) { if (e.target === wrap && closeBtn) closeBtn.click(); });

    /* Free trial: if the store product has a free intro offer, say so on the button and in the note */
    var P0 = plugin();
    if (P0) P0.getOfferings().then(function (res) {
      var current = res && res.offerings ? res.offerings.current : res.current;
      var pkg = current && current.availablePackages && current.availablePackages[0];
      var intro = pkg && pkg.product && (pkg.product.introPrice || (pkg.product.defaultOption && pkg.product.defaultOption.freePhase));
      var free = intro && (intro.price === 0 || intro.priceAmountMicros === 0 || (intro.price && intro.price.amountMicros === 0));
      if (!free) return;
      var per = periodText(intro.billingPeriod ? { periodNumberOfUnits: (intro.billingPeriod.value || 1), periodUnit: intro.billingPeriod.unit } : intro, L);
      btn.textContent = t.trialButton.replace('{period}', per);
      card.querySelector('.ifm-note').textContent = t.trialNote.replace('{period}', per.charAt(0).toUpperCase() + per.slice(1));
    }).catch(function () {});

    btn.addEventListener('click', function () {
      var P = plugin();
      if (!P) { fail(L === 'nl' ? 'Beschikbaar in de app.' : 'Available inside the app.'); return; }
      btn.disabled = true;
      P.getOfferings().then(function (res) {
        var current = res && res.offerings ? res.offerings.current : res.current;
        var pkg = current && current.availablePackages && current.availablePackages[0];
        if (!pkg) throw new Error('no-offering');
        return P.purchasePackage({ aPackage: pkg });
      }).then(function () {
        return IF.refreshMembership();
      }).then(function (m) {
        if (m.isMember) { dissolve(); offerMemberProfile(); }
        else { btn.disabled = false; fail(L === 'nl' ? 'Aankoop niet bevestigd.' : 'Purchase not confirmed.'); }
      }).catch(function (e) {
        var cancelled = e && (e.code === 'PURCHASE_CANCELLED' || /cancel/i.test(e.message || ''));
        /* The store account already has this subscription (bought under an older or deleted login, or on
           another phone): restore it to the person who is logged in now instead of showing an error. */
        /* v0.58: RevenueCat reports this in several shapes (code "6", PRODUCT_ALREADY_PURCHASED, "already active"), so look at the whole error */
        var errText = ''; try { errText = JSON.stringify(e) + ' ' + String(e && e.message || '') + ' ' + String(e && e.code || ''); } catch (x) { errText = String(e && e.message || ''); }
        var owned = e && (/ALREADY_PURCHASED|ALREADY_OWNED|ITEM_ALREADY/i.test(errText) || /already (subscribed|owned|purchased|own|active)/i.test(errText) || String(e.code) === '6');
        if (owned) {
          P.restorePurchases().then(function () { return IF.refreshMembership(); }).then(function (m) {
            btn.disabled = false;
            if (m.isMember) { dissolve(); offerMemberProfile(); }
            else fail(L === 'nl' ? 'Je store-account heeft dit abonnement al. Tik op "Al lid? Herstel je aankoop".' : 'Your store account already has this subscription. Tap "Already a member? Restore".');
          }).catch(function () { btn.disabled = false; fail(L === 'nl' ? 'Herstellen is niet gelukt.' : 'Restore failed.'); });
          return;
        }
        btn.disabled = false;
        if (!cancelled) fail(L === 'nl' ? 'Het is niet gelukt. Probeer het nog een keer.' : 'Could not complete. Please try again.');
      });
    });

    card.querySelector('.ifm-restore').addEventListener('click', function () {
      var P = plugin();
      if (!P) { fail(L === 'nl' ? 'Beschikbaar in de app.' : 'Available inside the app.'); return; }
      P.restorePurchases().then(function () {
        return IF.refreshMembership();
      }).then(function (m) {
        if (m.isMember) { dissolve(); offerMemberProfile(); }
        else fail(L === 'nl' ? 'Geen actief abonnement gevonden.' : 'No active subscription found.');
      }).catch(function () {
        fail(L === 'nl' ? 'Herstellen is niet gelukt.' : 'Restore failed.');
      });
    });
  }
  IF.insiderSheet = insiderSheet;

  /* ---------- page gate = the same sheet, not closable, texts from page_gates ---------- */
  var GATE_KEYS = { ams_babysitters: 'babysitters', ams_foodieyai: 'fridge', ams_top100_plans: 'top100' };
  function applyGate(cfg) {
    var key = GATE_KEYS[PAGE] || GATE_KEYS[cfg.page_name];
    insiderSheet({
      key: key || 'top100',
      title: key ? null : pick(cfg, 'card_title'), body: key ? null : pick(cfg, 'card_body'),
      layout: cfg.layout || 'sheet', blur: cfg.blur_amount, tint: cfg.tint, closable: false
    });
  }
  window.__applyGate = applyGate;

  /* ---------- decide ---------- */
  function decide(cfg) {
    if (!cfg || !cfg.gated) {                       // not gated -> behave as member for data
      document.dispatchEvent(new CustomEvent('if-member'));
      return;
    }
    IF.membership.then(function (m) {
      if (m.isMember) {
        document.dispatchEvent(new CustomEvent('if-member'));   // full data unlocked
      } else {
        applyGate(cfg);                                          // teaser stays; full fetch never fires
      }
    });
  }

  /* member sheet texts from app_config 'ams_member_sheets' (no build needed for copy changes) */
  try {
    fetch('https://cbldlpuhmuojdvljdtsk.supabase.co/rest/v1/app_config?config_key=eq.ams_member_sheets&select=config_value',
      { headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM', Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM' } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { var v = rows && rows[0] && rows[0].config_value; if (v && typeof v === 'object') { SHEET_CFG = v; try { localStorage.setItem('ams-member-sheets', JSON.stringify(v)); } catch (e) {} } })
      .catch(function () {});
  } catch (e) {}

  if (window.GATE_CONFIG) { decide(window.GATE_CONFIG); return; }   // preview override
  if (!PAGE) return;

  /* page_gates + app_config live in the CONTENT project (GBNinon's / cbldl),
     not the users project that core.js points at. Read them from there. */
  var GATE_URL  = 'https://cbldlpuhmuojdvljdtsk.supabase.co';
  var GATE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGRscHVobXVvamR2bGpkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTY5OTUsImV4cCI6MjA3NTczMjk5NX0.HqkbwYs6wpr4Ui78H2AUcGnlIxUWkrvJ2m1JPqACPxM';

  // Fetch the membership name once (Amsterdam key first, shared key as
  // fallback), then the page's gate row.
  fetch(GATE_URL + '/rest/v1/app_config?config_key=in.(ams_membership_name,membership_name)&select=config_key,config_value',
    { headers: { apikey: GATE_ANON, Authorization: 'Bearer ' + GATE_ANON } })
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      var by = {};
      (rows || []).forEach(function (row) { by[row.config_key] = row.config_value; });
      var v = by.ams_membership_name || by.membership_name;
      if (v && (v.en || v.nl || v.es)) {
        MEMBERSHIP_NAME = { en: v.en || v.nl || v.es, nl: v.nl || v.en || v.es };
      }
    })
    .catch(function () {})
    .then(function () {
      return fetch(GATE_URL + '/rest/v1/page_gates?page_name=eq.' + encodeURIComponent(PAGE),
        { headers: { apikey: GATE_ANON, Authorization: 'Bearer ' + GATE_ANON } });
    })
    .then(function (r) { return r.json(); })
    .then(function (rows) { decide(rows && rows[0]); })
    .catch(function () { decide(null); });          // offline/no table -> page shows fully
})();
