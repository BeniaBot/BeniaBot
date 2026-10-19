/* Hebrew lives in index.html; this file holds the English and swaps it in.
   Every [data-i18n] key below must exist in the HTML. */
(function () {
  'use strict';

  var EN = {
    'skip': 'Skip to the work',
    'nav.label': 'Page sections',
    'nav.tools': 'Tools',
    'nav.cynic': 'Cynical wing',
    'nav.vibe': 'Vibe coding',

    'hero.title': 'BeniaBot',
    'hero.c1': 'Windows tools',
    'hero.c2': 'Websites & landing pages',
    'hero.c3': 'Hebrew-first',
    'hero.c4': 'Offline-first',
    'hero.quote': 'If it needs a network connection, a complicated setup, or an <span class="nw">English-only</span> interface – it’s probably not here.',
    'hero.cta': 'See the work',

    'intro.eyebrow': 'Three wings',
    'intro.text': 'The real tools, the cynical wing and <bdi>AI: Absent Intelligence</bdi> are <span class="hl">kept apart on purpose</span>, so no joke misleads you about the standard of the work.',

    'tools.title': 'Real tools',
    'tools.sub': 'Written from scratch, with stubborn perfectionism and no compromises.',
    'act.code': 'Code',
    'subtext.name': 'Subtext',
    'subtext.alt': '',
    'subtext.desc': 'A full subtitle editor for Windows. Zero installs, zero internet, proper Hebrew.',
    'winapps.name': 'Offline App Store',
    'winapps.desc': 'A catalog of full installers for disconnected machines. One installer, one USB stick, done.',
    'act.catalog': 'Catalog',
    'pill.winapps': 'Open the Offline App Store catalog',
    'wsc.name': 'Dorm Room Planner',
    'wsc.desc': '150 boys, dozens of rooms, and rules about who must not share one. One click seats everyone and prints the floor sheet.',
    'act.open': 'Open it',
    'pill.wsc': 'Open the Dorm Room Planner',
    'cs.l1': 'High performance mode',
    'cs.l2': 'Free up space & clean up the system',
    'cs.l3': 'Repair system files',
    'cs.ok': 'Done. Back to the menu',
    'cs.desc': 'Windows tweaking and maintenance in a single file.',
    'tk.local': 'Local',
    'tk.name': 'Tik-Nick',
    'tk.desc': 'Managing and tracking forum usernames. Everything stays on your own machine.',
    'ov.desc': 'OpenVPN for Windows, scripts only: tun, <span class="nw">AES-256-GCM</span>, <span class="nw">tls-crypt</span>, 0/1 and 128/1 route cleanup, failover to <span class="nw">TCP 443</span>.',
    'web.name': 'Websites & landing pages, too',
    'web.desc': 'Most are client work, so they are not here. <strong>This one is.</strong>',

    'cynic.title': 'The cynical wing',
    'cynic.sub': 'Cynicism is a standard component of the average Bnei Brak resident. If it doesn’t make you laugh – you’re probably not one of us.',
    'g2049.desc': 'The game you know, plus hidden helper keys.',
    'act.play': 'Play',
    'pill.2049': 'Play 2049',
    'ho.a': 'Block',
    'ho.b': 'Clear',
    'ho.badge': 'Derivative work · not my engine',
    'ho.name': 'Hosmim o Mefanim',
    'ho.desc': 'A two-sided 3D protest simulator. Full credit to the original author is in the repo.',
    'nf.label': 'Bypassing the filter…',
    'nf.out': 'Gotcha.',
    'nf.desc': 'A filter-bypass tool that bypasses nothing.',
    'bt.l': 'Send time',
    'bt.u': 'min',
    'bt.btn': 'Send',
    'bt.done': 'Sent. No refunds.',
    'bt.name': 'biTime',
    'bt.alt': '',
    'bt.desc': 'Transfer time in one tap. Got spare time? Someone doesn’t. Instant, final and irreversible.',
    'act.try': 'Try it',
    'pill.bt': 'Try biTime',

    'ai.sub': 'They all talk to you. Nobody’s home.',
    'eliza.name': 'ELIZA',
    'eliza.desc': 'In 1966 people told her secrets. Inside: a few dozen hand-written rules. Rebuilt for Windows, identical to the original.',
    'act.download': 'Download',
    'pill.eliza': 'Download ELIZA',
    'lv.params': 'parameters',
    'lv.name': 'Lavan Haarami',
    'lv.desc': 'Groundbreaking local AI. 97.4 trillion parameters, runs without a GPU and without any connection to reality.',
    'act.see': 'See for yourself',
    'pill.lv': 'See Lavan Haarami for yourself',
    'tr.q': 'Who are you',
    'tr.a': 'Your new digital assistant! Ask me anything. :)',
    'tr.name': 'Tom Riddle’s Diary',
    'tr.desc': 'A chatbot and an unbeatable <span class="nw">tic-tac-toe</span> game, both inside a Word document. No macros, all 1,120 board states pre-mapped.',

    'vibe.eyebrow': 'And yes, all of it is vibe coded',
    'vibe.big': 'Every line here was written with AI. Anyone who thinks that is a shortcut is welcome to try shipping a finished product that way.',
    'vibe.lead': 'AI hands you exactly what you asked for. So you have to arrive with two answers ready:',
    'vibe.a1': 'What you actually want.',
    'vibe.a2': 'The right way to build it.',
    'vibe.note': 'Without the second one you get something that survives the demo and falls apart after it. That is precisely what makes it a teacher: you are forced to understand the route before you ask, and to spot the moment you were handed something else.',

    'outro.eyebrow': 'Bottom line',
    'outro.big': 'A good joke demands code just as precise as a working tool. Otherwise it’s simply a broken app.',
    'outro.sign': 'So the jokes here were built with <span class="hl">the same rigor</span> as the tools.',

    'foot.made': 'This page too: vibe coded.',
    'foot.find': 'Find me',
    'foot.mm': 'mitmachim.top'
  };

  // Strings that only scripts use (the hover label of the cursor).
  var LIVE = {
    he: { 'cursor.view': 'לפרויקט' },
    en: { 'cursor.view': 'Open' }
  };

  var META = {
    he: { title: 'בני הבוט · BeniaBot – כלים לווינדוס, אתרים ודפי נחיתה', btn: 'EN', btnLang: 'en', btnLabel: 'Switch to English', path: '' },
    en: { title: 'BeniaBot – Windows tools, websites and well-built jokes', btn: 'עברית', btnLang: 'he', btnLabel: 'מעבר לעברית', path: '?lang=en',
          desc: 'Windows tools, websites and landing pages, and cynical projects built with the same rigor. Hebrew-first, offline-first, all vibe coded.' }
  };

  var root = document.documentElement;
  var canonical = document.querySelector('link[rel="canonical"]');
  var canonicalBase = canonical ? canonical.getAttribute('href') : '';
  var description = document.querySelector('meta[name="description"]');
  var heDescription = description ? description.getAttribute('content') : '';
  var he = { text: new Map(), alt: new Map(), aria: new Map(), img: new Map() };
  var textEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  var altEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n-alt]'));
  var ariaEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n-aria]'));
  var imgEls = Array.prototype.slice.call(document.querySelectorAll('img[data-en-src]'));

  textEls.forEach(function (el) { he.text.set(el, el.innerHTML); });
  altEls.forEach(function (el) { he.alt.set(el, el.getAttribute('alt')); });
  ariaEls.forEach(function (el) { he.aria.set(el, el.getAttribute('aria-label')); });
  imgEls.forEach(function (el) { he.img.set(el, { src: el.getAttribute('src'), srcset: el.getAttribute('srcset') }); });

  var current = root.lang === 'en' ? 'en' : 'he';

  function pick(map, el, key, lang) {
    return lang === 'en' && Object.prototype.hasOwnProperty.call(EN, key) ? EN[key] : map.get(el);
  }

  function apply(lang) {
    var en = lang === 'en';
    root.lang = lang;
    root.dir = en ? 'ltr' : 'rtl';

    textEls.forEach(function (el) {
      var html = pick(he.text, el, el.getAttribute('data-i18n'), lang);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
    altEls.forEach(function (el) { el.setAttribute('alt', pick(he.alt, el, el.getAttribute('data-i18n-alt'), lang)); });
    ariaEls.forEach(function (el) { el.setAttribute('aria-label', pick(he.aria, el, el.getAttribute('data-i18n-aria'), lang)); });
    imgEls.forEach(function (el) {
      var orig = he.img.get(el);
      el.setAttribute('src', en ? el.getAttribute('data-en-src') : orig.src);
      if (orig.srcset) el.setAttribute('srcset', en ? el.getAttribute('data-en-srcset') : orig.srcset);
    });

    var m = META[lang];
    document.title = m.title;
    // Search engines read the rendered page, so the canonical address and the
    // description follow the language too.
    if (canonical) canonical.setAttribute('href', canonicalBase + m.path);
    if (description) description.setAttribute('content', m.desc || heDescription);
    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', m.btnLabel);
      btn.setAttribute('lang', m.btnLang);
      btn.textContent = m.btn;
    });
    current = lang;
    root.classList.remove('i18n-wait');
    root.classList.add('i18n-on');
  }

  function remember(lang) {
    try { localStorage.setItem('bb-lang', lang); } catch (e) {}
    try {
      var url = new URL(location.href);
      if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function swap(lang) {
    pending = null;
    document.dispatchEvent(new CustomEvent('bb:beforelang', { detail: { lang: lang } }));
    apply(lang);
    remember(lang);
    document.dispatchEvent(new CustomEvent('bb:lang', { detail: { lang: lang } }));
  }

  // The language the page is heading to. During a cross-fade it differs from
  // `current` for a moment, and quick repeat clicks must count from it.
  var pending = null;

  function set(lang) {
    if (lang === (pending || current)) return;
    pending = lang;
    // A soft cross-fade where the browser can do it; an instant swap elsewhere.
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !calm) {
      try { document.startViewTransition(function () { swap(lang); }); return; } catch (e) {}
    }
    swap(lang);
  }

  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { set((pending || current) === 'en' ? 'he' : 'en'); });
  });

  window.BB_I18N = {
    get lang() { return current; },
    set: set,
    t: function (key) { return (LIVE[current] && LIVE[current][key]) || ''; }
  };

  apply(current);
})();
