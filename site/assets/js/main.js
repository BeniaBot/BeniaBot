/* BeniaBot landing page: navigation, motion and the small demos inside the cards.
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
  var notes = [];        // hand-drawn annotations
  var notesSeen = {};    // which annotations were already drawn, by i18n key
  var marqueeApi = null;

  initSpotlight();
  initNav();
  initActiveSection();

  var motion = !!(window.gsap && window.ScrollTrigger && window.SplitText) && !reduceMotion && !root.classList.contains('no-anim');
  if (motion) {
    try {
      initMotion();
      clearTimeout(window.__bbFailsafe);
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
    initAnnotations(false);
    document.addEventListener('bb:beforelang', removeAnnotations);
    document.addEventListener('bb:lang', function () { initAnnotations(false); });
  }

  /* ---------- library-free parts ---------- */

  // The light inside a card follows the pointer.
  function initSpotlight() {
    if (!finePointer) return;
    $$('[data-card]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
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

  // The wing in the middle of the screen sets the page accent and the active nav link.
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

  /* ---------- hand-drawn annotations (Rough Notation) ---------- */

  function initAnnotations(animate) {
    if (!window.RoughNotation) return;
    removeAnnotations();
    $$('[data-annotate]').forEach(function (el) {
      var type = el.getAttribute('data-annotate');
      var host = el.closest('[data-i18n]');
      var key = (host && host.getAttribute('data-i18n')) || type;
      var ann = RoughNotation.annotate(el, {
        type: type,
        color: type === 'highlight' ? 'rgba(255, 184, 76, .24)' : '#ffb84c',
        strokeWidth: type === 'highlight' ? 1 : 2,
        padding: type === 'highlight' ? [2, 6] : 2,
        iterations: type === 'highlight' ? 1 : 2,
        multiline: true,
        animate: animate && !notesSeen[key],
        animationDuration: 900
      });
      notes.push(ann);
      if (!animate || notesSeen[key]) { ann.show(); return; }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 78%',
        once: true,
        onEnter: function () { notesSeen[key] = true; ann.show(); }
      });
    });
  }
  function removeAnnotations() {
    notes.forEach(function (a) { a.remove(); });
    notes = [];
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
    tiltShots();
    marqueeApi = marquee();
    cardDemos();
    initAnnotations(true);

    document.addEventListener('bb:beforelang', function () {
      demos.forEach(function (d) { d.finish(); });
      splits.forEach(function (s) { s.destroy(); });
      if (marqueeApi) marqueeApi.destroy();
      removeAnnotations();
    });
    document.addEventListener('bb:lang', function () {
      splits.forEach(function (s) { s.build(); });
      if (marqueeApi) marqueeApi.build();
      initAnnotations(true);
      ScrollTrigger.refresh();
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
        gsap.set('[data-reveal], [data-split], [data-split-hero], [data-hero-item], [data-scramble-title], [data-tilt-in], [data-marquee]', { clearProps: 'opacity,visibility,transform' });
      }
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
      var navH = $('[data-nav]').offsetHeight;
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -navH + 1, duration: 1.3 });
    });
  }

  function heroIntro() {
    var title = $('[data-split-hero]');
    var items = $$('[data-hero-item]');
    var hero = {
      split: null,
      build: function (animate) {
        hero.split = SplitText.create(title, { type: 'words,chars', mask: 'words', wordsClass: 'w', charsClass: 'c' });
        gsap.set(title, { autoAlpha: 1 });
        if (animate) {
          return gsap.from(hero.split.chars, { yPercent: 118, duration: 1.2, ease: 'expo.out', stagger: 0.05 });
        }
      },
      destroy: function () {
        if (!hero.split) return;
        gsap.killTweensOf(hero.split.chars);
        hero.split.revert();
        hero.split = null;
      }
    };
    var tl = gsap.timeline({ delay: 0.1 });
    tl.add(hero.build(true), 0);
    tl.fromTo(items, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09 }, 0.35);
    splits.push({ build: function () { hero.build(false); }, destroy: hero.destroy });
  }

  function reveals() {
    var els = $$('[data-reveal]');
    gsap.set(els, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true });
      }
    });
  }

  // Section titles rise letter by letter when they scroll in.
  function splitReveal(el) {
    var api = { split: null, st: null, done: false };
    api.build = function () {
      api.split = SplitText.create(el, { type: 'words,chars', mask: 'words', wordsClass: 'w', charsClass: 'c' });
      gsap.set(el, { autoAlpha: 1 });
      if (api.done) return;
      gsap.set(api.split.chars, { yPercent: 118 });
      api.st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          api.done = true;
          gsap.to(api.split.chars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035 });
        }
      });
    };
    api.destroy = function () {
      if (api.st) { api.st.kill(); api.st = null; }
      if (api.split) { gsap.killTweensOf(api.split.chars); api.split.revert(); api.split = null; }
    };
    api.build();
    return api;
  }

  // The vibe-coding paragraph lights up word by word with the scroll.
  function scrubWords(el) {
    var api = { split: null, tween: null };
    api.build = function () {
      api.split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
      api.tween = gsap.fromTo(api.split.words, { opacity: 0.16 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 }
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

  // "AI: Absent Intelligence" computes itself into existence.
  function scrambleTitle() {
    var el = $('[data-scramble-title]');
    if (!el) return;
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    if (!window.ScrambleTextPlugin) { gsap.set(el, { autoAlpha: 1 }); return; }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: function () {
        gsap.set(el, { autoAlpha: 1 });
        gsap.to(el, { duration: 1.8, scrambleText: { text: text, chars: 'upperAndLowerCase', revealDelay: 0.35, speed: 0.45 } });
      }
    });
  }

  // Screenshots straighten up from a slight tilt as they scroll into place.
  function tiltShots() {
    $$('[data-tilt-in]').forEach(function (fig) {
      gsap.fromTo(fig, { rotateX: 14, y: 46, scale: 0.95 }, {
        rotateX: 0, y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: fig.closest('.card'), start: 'top 96%', end: 'top 38%', scrub: 0.8 }
      });
    });
  }

  // Endless strip; scrolling fast makes it run faster.
  function marquee() {
    var track = $('[data-marquee]');
    if (!track) return null;
    var api = { loop: null, st: null, clone: null };
    api.build = function () {
      var group = track.firstElementChild;
      api.clone = group.cloneNode(true);
      $$('[data-i18n]', api.clone).forEach(function (n) { n.removeAttribute('data-i18n'); });
      track.appendChild(api.clone);
      var from = isRtl() ? -50 : 0;
      api.loop = gsap.fromTo(track, { xPercent: from }, { xPercent: from + 50 * (isRtl() ? 1 : -1), ease: 'none', duration: 34, repeat: -1 });
      api.st = ScrollTrigger.create({
        trigger: track.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: function (self) { if (self.isActive) api.loop.play(); else api.loop.pause(); },
        onUpdate: function (self) {
          var boost = 1 + Math.min(4, Math.abs(self.getVelocity()) / 500);
          gsap.to(api.loop, { timeScale: boost, duration: 0.25, overwrite: true, onComplete: function () {
            gsap.to(api.loop, { timeScale: 1, duration: 1.2 });
          } });
        }
      });
    };
    api.destroy = function () {
      if (api.st) { api.st.kill(); api.st = null; }
      if (api.loop) { api.loop.kill(); api.loop = null; }
      gsap.set(track, { clearProps: 'transform' });
      if (api.clone) { api.clone.remove(); api.clone = null; }
    };
    api.build();
    return api;
  }

  /* ---------- the demos inside the cards ---------- */

  // Each demo plays when its card scrolls in (together with the card's own fade),
  // and again on hover. Timelines are rebuilt on every play so they always pick
  // up the current language; finish() jumps to the end state before a swap.
  function demo(sel, build) {
    var viz = $(sel);
    if (!viz) return;
    var card = viz.closest('[data-card]');
    var d = { tl: null };
    d.play = function () {
      if (d.tl) {
        if (d.tl.isActive()) return;
        d.tl.progress(1).kill();
      }
      d.tl = build(viz);
    };
    d.finish = function () { if (d.tl) d.tl.progress(1); };
    ScrollTrigger.create({ trigger: card, start: 'top 90%', once: true, onEnter: d.play });
    if (finePointer) card.addEventListener('mouseenter', d.play);
    demos.push(d);
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
        x: function () { return gsap.utils.random(-90, 90); },
        y: function () { return gsap.utils.random(50, 120); },
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
        .from($$('.nick .bar', viz), { scaleX: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 0.3)
        .from($('.local', viz), { autoAlpha: 0, scale: 0.8, duration: 0.4, ease: 'back.out(2)' }, '-=0.2');
    });

    // Websites: a page assembles itself.
    demo('.viz-web', function (viz) {
      return gsap.timeline()
        .from($$('.mb-h, .mb-l', viz), { scaleX: 0, transformOrigin: isRtl() ? '100% 50%' : '0 50%', duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.2)
        .from($$('.mb-grid i', viz), { autoAlpha: 0, y: 12, duration: 0.45, ease: 'power3.out', stagger: 0.1 }, '-=0.3');
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
      return gsap.timeline()
        .set(done, { autoAlpha: 0 })
        .to(btn, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 0.4)
        .fromTo(n, { innerText: 60 }, { innerText: 0, snap: { innerText: 1 }, duration: 1.4, ease: 'power1.in' }, 0.6)
        .to(done, { autoAlpha: 1, duration: 0.35 }, '+=0.2');
    });

    // Lavan Haarami: the parameter count recalculates itself, very seriously.
    demo('.viz-lavan', function (viz) {
      var b = $('[data-params]', viz);
      var tl = gsap.timeline().from($('.lavan-logo', viz), { scale: 0.85, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.8)' }, 0.1);
      if (window.ScrambleTextPlugin) tl.to(b, { duration: 1.4, scrambleText: { text: '97.4T', chars: '0123456789', revealDelay: 0.5, speed: 0.5 } }, 0.2);
      return tl;
    });

    // Tom Riddle's Diary: you type, Word answers.
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
