/* BeniaBot landing page: navigation, motion, the card swell and the small demos.
   All of it is an extra layer. With this file missing or failing, the page is
   still complete and readable (see the .no-anim rules in style.css). */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var HEB_CHARS = 'אבגדהוזחטיכלמנסעפצקרשת';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function isRtl() { return root.dir === 'rtl'; }

  var lenis = null;
  var splits = [];       // text splits that must be undone before a language swap
  var demos = [];        // the little animations inside the cards
  var hlObserver = null;

  initSpotlight();
  initNav();
  initActiveSection();
  initHighlights();

  var motion = !!(window.gsap && window.ScrollTrigger && window.SplitText) && !reduceMotion && !root.classList.contains('no-anim');
  if (motion) {
    try {
      initMotion();
      clearTimeout(window.__bbFailsafe);
      // i18n.js lifts this itself; if it never loaded, the page must still show.
      root.classList.remove('i18n-wait');
      root.classList.add('anim-ok');
    } catch (err) {
      console.error(err);
      motion = false;
      teardownMotion();
    }
  }
  if (!motion) {
    clearTimeout(window.__bbFailsafe);
    root.classList.remove('i18n-wait');
    root.classList.add('no-anim');
  }
  document.addEventListener('bb:lang', initHighlights);

  /* ---------- library-free parts ---------- */

  // The light inside a card follows the pointer (GSAP's tilt reuses the same variables).
  function initSpotlight() {
    if (!finePointer) return;
    $$('[data-card]').forEach(function (card) {
      var inner = $('.card-inner', card);
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        inner.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        inner.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  function initNav() {
    var nav = $('[data-nav]');
    var bar = $('[data-progress]');
    var queued = false;
    function update() {
      queued = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-scrolled', y > 8);
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  // The wing in the middle of the screen drives the nav colour, the active link
  // and the backdrop tint (ambient-gl.js reads html[data-active]).
  function initActiveSection() {
    if (!('IntersectionObserver' in window)) return;
    var sections = $$('[data-wing]');
    var links = $$('[data-nav-link]');
    var inBand = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inBand.set(en.target, en.isIntersecting); });
      var active = null;
      sections.forEach(function (s) { if (inBand.get(s)) active = s.getAttribute('data-wing'); });
      if (active) root.setAttribute('data-active', active); else root.removeAttribute('data-active');
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav-link') === active); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // The underline under the key words draws itself once it is on screen.
  function initHighlights() {
    var els = $$('.hl');
    if (hlObserver) hlObserver.disconnect();
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    hlObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        hlObserver.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -20% 0px' });
    els.forEach(function (el) { hlObserver.observe(el); });
  }

  /* ---------- motion ---------- */

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    if (window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);

    if (window.Lenis) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.11 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
      initAnchors();
    }

    heroIntro();
    reveals();
    $$('[data-split]').forEach(function (el) { splits.push(splitReveal(el)); });
    var scrub = $('[data-scrub]');
    if (scrub) splits.push(scrubWords(scrub));
    scrambleTitle();
    initFlip();
    cardDemos();
    initSwell();
    initCursor();
    titleRoll();
    magnetic();

    document.addEventListener('bb:beforelang', function () {
      demos.forEach(function (d) { d.finish(); });
      splits.forEach(function (s) { s.destroy(); });
    });
    document.addEventListener('bb:lang', function () {
      splits.forEach(function (s) { s.build(); });
      setCursorText();
      // After the new text has painted, so the switch itself stays one quick frame.
      requestAnimationFrame(function () { ScrollTrigger.refresh(); });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  // If anything throws half-way, put the page back to its plain, visible state.
  function teardownMotion() {
    try {
      if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      splits.forEach(function (s) { s.destroy(); });
      if (lenis) { lenis.destroy(); lenis = null; }
      if (window.gsap) {
        gsap.killTweensOf('*');
        gsap.set('[data-reveal], [data-split], [data-split-hero], [data-hero-item], [data-scramble-title], .card-inner', { clearProps: 'opacity,visibility,transform,pointerEvents' });
      }
      root.classList.remove('tilt-on');
    } catch (e) { /* the .no-anim class below is the real safety net */ }
  }

  // Smooth in-page links through Lenis (the skip link keeps native focus behaviour).
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip')) return;
      var id = a.getAttribute('href');
      var target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (target === 0) { lenis.scrollTo(0, { duration: 1.3 }); return; }
      // The nav's height comes from scroll-padding-top in the CSS, which Lenis
      // reads too, so no offset here. Afterwards behave like a native anchor:
      // the hash in the address bar, and Tab continues from the section.
      try { history.pushState(null, '', id); } catch (err) {}
      lenis.scrollTo(target, {
        duration: 1.3,
        onComplete: function () {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  // Hebrew titles split by words, not letters: letter boxes break the spacing.
  function wordSplit(el) {
    return SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w' });
  }

  function heroIntro() {
    var title = $('[data-split-hero]');
    var items = $$('[data-hero-item]');
    var hero = {
      split: null,
      build: function (animate) {
        // Letters too, so each one can answer the pointer (see heroWeight below).
        hero.split = finePointer
          ? SplitText.create(title, { type: 'words,chars', mask: 'words', wordsClass: 'w', charsClass: 'c' })
          : wordSplit(title);
        gsap.set(title, { autoAlpha: 1 });
        if (animate) {
          return gsap.from(hero.split.words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.12 });
        }
      },
      destroy: function () {
        if (!hero.split) return;
        gsap.killTweensOf(hero.split.words);
        hero.split.revert();
        hero.split = null;
      }
    };
    // On a slow connection the visitor has already waited; show the opening
    // as it is instead of making them wait through an intro as well.
    if (performance.now() > 2500) {
      hero.build(false);
      gsap.set(items, { opacity: 1 });
    } else {
      var tl = gsap.timeline({ delay: 0.1 });
      tl.add(hero.build(true), 0);
      tl.fromTo(items, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09 }, 0.35);
    }
    splits.push({ build: function () { hero.build(false); }, destroy: hero.destroy });
    heroWeight(title);
  }

  // The title's letters thicken toward the pointer and thin out away from it,
  // through the serif's weight axis. Nothing moves until the pointer is near.
  // Weights move in steps of 20 and are written only when the step changes:
  // every new weight means the huge letters are drawn again.
  function heroWeight(title) {
    if (!finePointer) return;
    var section = title.closest('.hero') || title.parentNode;
    var REST = 560, MIN = 470, MAX = 880, R = 300, STEP = 20;
    var letters = null;          // [{ c, x, y, now, goal, shown }]
    var running = false;
    function measure() {
      var prev = new Map((letters || []).map(function (l) { return [l.c, l]; }));
      letters = $$('.c', title).map(function (c) {
        var r = c.getBoundingClientRect();
        var old = prev.get(c);
        return { c: c, x: r.left + r.width / 2, y: r.top + r.height / 2,
                 now: old ? old.now : REST, goal: old ? old.goal : REST, shown: old ? old.shown : REST };
      });
    }
    function tick() {
      var moving = false;
      letters.forEach(function (l) {
        l.now += (l.goal - l.now) * 0.16;
        if (Math.abs(l.goal - l.now) < 1) l.now = l.goal; else moving = true;
        var w = Math.round(l.now / STEP) * STEP;
        if (w !== l.shown) { l.shown = w; l.c.style.setProperty('--wght', w); }
      });
      if (!moving) { gsap.ticker.remove(tick); running = false; }
    }
    function start() { if (!running) { running = true; gsap.ticker.add(tick); } }
    function stale() { if (letters) measure(); }
    window.addEventListener('scroll', stale, { passive: true });
    window.addEventListener('resize', stale);
    document.addEventListener('bb:lang', function () { letters = null; });
    // Measured again on every visit and at most once a second while moving:
    // a measurement taken during the opening's entrance would be off by a line.
    var measuredAt = 0;
    section.addEventListener('pointerenter', function () { measuredAt = 0; });
    section.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = performance.now();
      if (!letters || !letters.length || !letters[0].c.isConnected || t - measuredAt > 1000) { measure(); measuredAt = t; }
      letters.forEach(function (l) {
        var k = Math.max(0, 1 - Math.hypot(e.clientX - l.x, e.clientY - l.y) / R);
        l.goal = MIN + (MAX - MIN) * k * k;
      });
      start();
    });
    section.addEventListener('pointerleave', function () {
      if (!letters) return;
      letters.forEach(function (l) { l.goal = REST; });
      start();
    });
  }

  function reveals() {
    var els = $$('[data-reveal]');
    // Opacity only, never visibility: what is still waiting to rise must stay
    // reachable by Tab and by screen readers.
    // Not clickable while invisible, or a blank strip could open a project.
    gsap.set(els, { opacity: 0, y: 28, pointerEvents: 'none' });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true });
      }
    });
    // Tabbing into something that has not risen yet shows it at once.
    document.addEventListener('focusin', function (e) {
      var el = e.target.closest && e.target.closest('[data-reveal]');
      if (el && parseFloat(getComputedStyle(el).opacity) < 1) gsap.to(el, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.3, overwrite: true });
    });
  }

  // Section titles rise word by word when they scroll in.
  function splitReveal(el) {
    var api = { split: null, st: null, done: false };
    api.build = function () {
      api.split = wordSplit(el);
      gsap.set(el, { autoAlpha: 1 });
      if (api.done) return;
      gsap.set(api.split.words, { yPercent: 110 });
      api.st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          api.done = true;
          gsap.to(api.split.words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 });
        }
      });
    };
    api.destroy = function () {
      if (api.st) { api.st.kill(); api.st = null; }
      if (api.split) { gsap.killTweensOf(api.split.words); api.split.revert(); api.split = null; }
    };
    api.build();
    return api;
  }

  // The vibe-coding paragraph lights up word by word with the scroll.
  function scrubWords(el) {
    var api = { split: null, tween: null };
    api.build = function () {
      // aria 'none': the words stay real text, so a screen reader still reads the paragraph.
      api.split = SplitText.create(el, { type: 'words', wordsClass: 'w', aria: 'none' });
      api.tween = gsap.fromTo(api.split.words, { opacity: 0.28 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 72%', scrub: 0.6 }
      });
    };
    api.destroy = function () {
      if (api.tween) {
        if (api.tween.scrollTrigger) api.tween.scrollTrigger.kill();
        api.tween.kill();
        api.tween = null;
      }
      if (api.split) { api.split.revert(); api.split = null; }
    };
    api.build();
    return api;
  }

  // "AI: Absent Intelligence" computes itself into existence, one word at a
  // time, so the spaces never disappear and the line never reflows.
  function scrambleTitle() {
    var el = $('[data-scramble-title]');
    if (!el) return;
    var words = $$('.sw', el);
    if (!window.ScrambleTextPlugin || !words.length) { gsap.set(el, { autoAlpha: 1 }); return; }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: function () {
        el.style.minHeight = el.offsetHeight + 'px';
        gsap.set(el, { autoAlpha: 1 });
        var tl = gsap.timeline({ onComplete: function () { el.style.minHeight = ''; } });
        words.forEach(function (w, i) {
          tl.to(w, { duration: 1.1, scrambleText: { text: w.textContent, chars: 'upperAndLowerCase', revealDelay: 0.35, speed: 0.45 } }, i * 0.18);
        });
      }
    });
  }

  // Section titles answer the pointer: the words roll over one after another
  // inside their masks, and the AI title computes itself again.
  function titleRoll() {
    if (!finePointer) return;
    $$('.wing-title').forEach(function (t) {
      var busy = false;
      t.addEventListener('mouseenter', function () {
        if (busy) return;
        var tl = gsap.timeline({ onComplete: function () { busy = false; } });
        busy = true;
        if (t.hasAttribute('data-scramble-title')) {
          if (!window.ScrambleTextPlugin) { busy = false; return; }
          $$('.sw', t).forEach(function (w, i) {
            tl.to(w, { duration: 0.8, scrambleText: { text: w.textContent, chars: 'upperAndLowerCase', revealDelay: 0.15, speed: 0.6 } }, i * 0.12);
          });
          return;
        }
        $$('.w', t).forEach(function (w, i) {
          tl.to(w, { yPercent: -110, duration: 0.26, ease: 'power2.in' }, i * 0.07)
            .fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', immediateRender: false }, i * 0.07 + 0.26);
        });
      });
    });
  }

  // Buttons lean toward the pointer and spring back when it leaves.
  function magnetic() {
    if (!finePointer) return;
    $$('.hero-cta .btn, .lang-btn, .icon-btn').forEach(function (el) {
      var cx = 0, cy = 0;
      el.addEventListener('pointerenter', function () {
        var r = el.getBoundingClientRect();
        cx = r.left + r.width / 2 - gsap.getProperty(el, 'x');
        cy = r.top + r.height / 2 - gsap.getProperty(el, 'y');
      });
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        gsap.to(el, { x: (e.clientX - cx) * 0.35, y: (e.clientY - cy) * 0.45, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- the swell ---------- */

  // On a mouse: the card leans toward the pointer and rises toward the viewer,
  // and the layers inside move at their own depth. Touch, keyboard and reduced
  // motion get the plain CSS version.
  function initSwell() {
    var mm = gsap.matchMedia();
    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', function () {
      root.classList.add('tilt-on');
      var offs = [];
      $$('[data-card]').forEach(function (card) {
        var inner = $('.card-inner', card);
        var q = function (el, prop, d) { return gsap.quickTo(el, prop, { duration: d || 0.5, ease: 'power3' }); };
        var rx = q(inner, 'rotationX');
        var ry = q(inner, 'rotationY');
        var lift = q(inner, 'z', 0.45);
        var rise = q(inner, 'y', 0.45);
        var layers = $$('[data-depth]', card).map(function (el) {
          return { d: +el.getAttribute('data-depth'), x: q(el, 'x', 0.6), y: q(el, 'y', 0.6) };
        });
        var zoom = $$('.media-shot, .art', card);
        var rect = null;
        function move(e) {
          if (e.pointerType !== 'mouse') return;
          rect = rect || card.getBoundingClientRect();
          var nx = (e.clientX - rect.left) / rect.width - 0.5;
          var ny = (e.clientY - rect.top) / rect.height - 0.5;
          ry(nx * 9);
          rx(-ny * 9);
          layers.forEach(function (l) { l.x(-nx * l.d); l.y(-ny * l.d); });
        }
        function enter(e) {
          if (e.pointerType !== 'mouse') return;
          rect = null;
          lift(36);
          rise(-6);
          gsap.to(zoom, { scale: 1.05, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
        }
        function leave() {
          rect = null;
          rx(0); ry(0); lift(0); rise(0);
          layers.forEach(function (l) { l.x(0); l.y(0); });
          gsap.to(zoom, { scale: 1, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
        }
        function drop() { rect = null; }
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        window.addEventListener('scroll', drop, { passive: true });
        offs.push(function () {
          card.removeEventListener('pointerenter', enter);
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
          window.removeEventListener('scroll', drop);
        });
      });
      return function () {
        offs.forEach(function (f) { f(); });
        root.classList.remove('tilt-on');
      };
    });
  }

  // A soft cursor that grows over a project and says where it leads (mouse only).
  var cursor = null;
  function initCursor() {
    if (!window.MouseFollower) return;
    var mm = gsap.matchMedia();
    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', function () {
      MouseFollower.registerGSAP(gsap);
      cursor = new MouseFollower({ speed: 0.5, skewing: 0, skewingText: 0, stateDetection: { '-pointer': 'a, button', '-hidden': 'iframe' } });
      setCursorText();
      return function () { if (cursor) { cursor.destroy(); cursor = null; } };
    });
  }
  function setCursorText() {
    var label = window.BB_I18N ? BB_I18N.t('cursor.view') : '';
    // The front of a turning card opens the project too, so it says so as well.
    $$('[data-card] .stretched, [data-card] .face-front').forEach(function (a) {
      if (label) a.setAttribute('data-cursor-text', label);
    });
  }

  /* ---------- the demos inside the cards ---------- */

  // Each demo plays when its card scrolls in (together with the card's own fade),
  // and again on hover. Timelines are rebuilt on every play so they always pick
  // up the current language; finish() jumps to the end state before a swap.
  // On a mouse a card turns over when the pointer rests on it: the demo and the
  // name in front, the description and the links behind. Touch, reduced motion
  // and a page without scripts keep the plain card with everything showing.
  function initFlip() {
    if (!finePointer) return;
    root.classList.add('flip-on');
    $$('[data-card]').forEach(function (card) {
      var inner = $('.card-inner', card);
      var media = $('.media', inner);
      var body = $('.card-body', inner);
      var link = body && $('.stretched', body);
      if (!media || !link) return;
      var flip = document.createElement('div');
      var front = document.createElement('div');
      var back = document.createElement('div');
      var name = document.createElement('p');
      flip.className = 'flip';
      front.className = 'face face-front';
      back.className = 'face face-back';
      name.className = 'front-name';
      name.setAttribute('aria-hidden', 'true');
      front.appendChild(media);
      front.appendChild(name);
      back.appendChild(body);
      flip.appendChild(front);
      flip.appendChild(back);
      inner.appendChild(flip);
      function syncName() { name.textContent = link.textContent.trim(); }
      syncName();
      document.addEventListener('bb:lang', syncName);

      var timer = null;
      function turn(on) { clearTimeout(timer); card.classList.toggle('is-flipped', on); }
      card.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { turn(true); }, 220); });
      card.addEventListener('mouseleave', function () { turn(false); });
      // Keyboard: the link lives on the back, so focus turns the card to it.
      card.addEventListener('focusin', function () { turn(true); });
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) turn(false); });
      // A click before the turn finishes still opens the project.
      front.addEventListener('click', function () { link.click(); });
    });
  }

  function demo(sel, build) {
    $$(sel).forEach(function (viz) {
      var card = viz.closest('[data-card]');
      var d = { tl: null };
      d.play = function () {
        if (d.tl) {
          if (d.tl.isActive()) return;
          d.tl.progress(1).kill();
        }
        d.at = performance.now();
        d.tl = build(viz);
      };
      // A sweep of the mouse across the grid shouldn't restart every demo it touches.
      d.hover = function () { if (!d.at || performance.now() - d.at > 4000) d.play(); };
      d.finish = function () { if (d.tl) d.tl.progress(1); };
      ScrollTrigger.create({ trigger: card, start: 'top 90%', once: true, onEnter: d.play });
      // A turning card shows its demo again as it comes back to the front.
      if (finePointer) card.addEventListener(root.classList.contains('flip-on') ? 'mouseleave' : 'mouseenter', d.hover);
      demos.push(d);
    });
  }

  function scramble(el, text, duration) {
    if (window.ScrambleTextPlugin) {
      return gsap.to(el, { duration: duration, scrambleText: { text: text, chars: isRtl() ? HEB_CHARS : 'upperAndLowerCase', revealDelay: 0.2, speed: 0.6 } });
    }
    return gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
  }

  function cardDemos() {
    // Offline store: the three stops light up in order.
    demo('.viz-flow', function (viz) {
      return gsap.timeline().from($$('.node', viz), { scale: 0.6, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.18 });
    });

    // Room planner: everyone flies into a room.
    demo('.viz-rooms', function (viz) {
      return gsap.timeline().from($$('.room i', viz), {
        x: function () { return gsap.utils.random(-80, 80); },
        y: function () { return gsap.utils.random(40, 100); },
        scale: 0.3,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'back.out(1.4)',
        stagger: { each: 0.04, from: 'random' }
      }, 0.15);
    });

    // Csharf: the menu prints line by line.
    demo('.viz-term', function (viz) {
      return gsap.timeline().from($$('.t-line', viz), { autoAlpha: 0, x: isRtl() ? 10 : -10, duration: 0.3, ease: 'power2.out', stagger: 0.3 }, 0.2);
    });

    // Tik-Nick: cards fill in.
    demo('.viz-nicks', function (viz) {
      return gsap.timeline()
        .from($$('.nick', viz), { autoAlpha: 0, y: 14, duration: 0.45, ease: 'power3.out', stagger: 0.12 }, 0.1)
        .from($$('.nick .bar', viz), { scaleX: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 0.3);
    });

    // ovpn-kit: the config prints itself, nothing more.
    demo('.viz-spec', function (viz) {
      return gsap.timeline().from($$('p', viz), { autoAlpha: 0, duration: 0.25, stagger: 0.12 }, 0.2);
    });

    // not-free: 0% → 99%, a long pause, and the truth.
    demo('.viz-bypass', function (viz) {
      var num = $('[data-bp-num]', viz);
      var bar = $('[data-bp-bar]', viz);
      var out = $('[data-bp-out]', viz);
      var finalText = out.textContent;
      return gsap.timeline()
        .set(out, { autoAlpha: 0 })
        .fromTo(bar, { width: '0%' }, { width: '99%', duration: 1.9, ease: 'power2.out' }, 0.2)
        .fromTo(num, { innerText: 0 }, { innerText: 99, snap: { innerText: 1 }, duration: 1.9, ease: 'power2.out' }, 0.2)
        .set(out, { autoAlpha: 1 }, '+=0.8')
        .add(scramble(out, finalText, 1));
    });

    // 2049: the last tile is an 8… until it isn't.
    demo('.viz-2049', function (viz) {
      var tiles = $$('.tile', viz);
      var prev = $('[data-tile-prev]', viz);
      var last = $('[data-tile-last]', viz);
      return gsap.timeline()
        .set(prev, { autoAlpha: 1 })
        .from(tiles, { scale: 0.4, autoAlpha: 0, duration: 0.45, ease: 'back.out(2)', stagger: 0.1 }, 0.1)
        .to(last, { scale: 1.16, duration: 0.14, ease: 'power2.out' }, '+=0.6')
        .to(prev, { autoAlpha: 0, duration: 0.12 }, '<')
        .to(last, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    });

    // biTime: an hour leaves your account and does not come back.
    demo('.viz-phone', function (viz) {
      var n = $('[data-bt-n]', viz);
      var done = $('[data-bt-done]', viz);
      var btn = $('.ph-btn', viz);
      // Everything on the screen except the confirmation, so the two never overlap.
      var screen = $$('.phone > :not([data-bt-done])', viz);
      return gsap.timeline()
        .set(done, { autoAlpha: 0 })
        .set(screen, { autoAlpha: 1 })
        .to(btn, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 0.4)
        .fromTo(n, { innerText: 60 }, { innerText: 0, snap: { innerText: 1 }, duration: 1.4, ease: 'power1.in' }, 0.6)
        .to(screen, { autoAlpha: 0, duration: 0.2 }, '+=0.25')
        .fromTo(done, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    });

    // Lavan Haarami: the parameter count recalculates itself, very seriously.
    demo('.viz-lavan', function (viz) {
      var b = $('[data-params]', viz);
      var tl = gsap.timeline().from($('.lavan-logo', viz), { scale: 0.85, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.8)' }, 0.1);
      if (window.ScrambleTextPlugin) tl.to(b, { duration: 1.4, scrambleText: { text: '97.4T', chars: '0123456789', revealDelay: 0.5, speed: 0.5 } }, 0.2);
      return tl;
    });

    // Tom Riddle's Diary: you type, Word answers, and the board fills.
    demo('.viz-word', function (viz) {
      var q = $('[data-type]', viz);
      var a = $('.w-a', viz);
      var marks = $$('.ttt i', viz).filter(function (i) { return i.textContent.trim(); });
      var full = q.textContent;
      var p = { n: 0 };
      return gsap.timeline()
        .set([a].concat(marks), { autoAlpha: 0 })
        .fromTo(p, { n: 0 }, {
          n: full.length,
          duration: full.length * 0.075,
          ease: 'none',
          onUpdate: function () { q.textContent = full.slice(0, Math.round(p.n)); }
        }, 0.3)
        .to(a, { autoAlpha: 1, duration: 0.3 }, '+=0.35')
        .to(marks, { autoAlpha: 1, duration: 0.2, stagger: 0.16 }, '+=0.3');
    });
  }
})();
