/* The page backdrop: a slow, warped gradient behind everything (OGL + Flowmap).
   Bright in the opening, dimmed under the content, tinted by the wing in view,
   and stirred by the pointer. Purely decorative: the CSS gradient under it is
   the fallback, so any failure here just leaves that in place. */
import { Renderer, Program, Mesh, Triangle, Flowmap, Vec2 } from '../../vendor/ogl/ogl.min.mjs';

const canvas = document.querySelector('[data-ambient-gl]');
const hero = document.querySelector('.hero');

if (canvas && hero) {
  try { start(); } catch (err) { console.warn('background off:', err); }
}

function start() {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 760px)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const light = small || weak;

  // The noise is soft, so a low internal resolution looks the same and costs far less.
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 2) * (light ? 0.45 : 0.7),
    alpha: false,
    antialias: false,
    powerPreference: 'low-power'
  });
  const gl = renderer.gl;
  gl.clearColor(0.04, 0.04, 0.05, 1);

  const flowmap = new Flowmap(gl, { falloff: 0.26, dissipation: 0.965, alpha: 0.85 });
  const geometry = new Triangle(gl);

  // Wing accents, matching --c-tools / --c-cynic / --c-ai / --c-vibe in style.css.
  const ACCENTS = {
    tools: [1.0, 0.68, 0.28],
    cynic: [1.0, 0.36, 0.48],
    ai: [0.24, 0.9, 0.64],
    vibe: [0.64, 0.57, 1.0]
  };
  const accent = ACCENTS.tools.slice();

  const program = new Program(gl, {
    vertex: /* glsl */ `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    fragment: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform float uDim;
      uniform vec2 uRes;
      uniform vec3 uAccent;
      uniform sampler2D tFlow;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 flow = texture2D(tFlow, vUv).rgb;
        vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
        p -= flow.xy * flow.z * 0.35;

        float t = uTime * 0.035;
        vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 3.1));
        vec2 r = vec2(fbm(p * 1.5 + 2.2 * q + vec2(1.7, 9.2) + t * 1.4),
                      fbm(p * 1.5 + 2.2 * q + vec2(8.3, 2.8) - t));
        float f = fbm(p * 1.1 + 2.6 * r);

        vec3 ink    = vec3(0.040, 0.038, 0.066);
        vec3 indigo = vec3(0.27, 0.19, 0.70);
        vec3 coral  = vec3(0.98, 0.34, 0.47);

        // fbm sits roughly in 0.3..0.7, so the bands below are tuned to that range.
        vec3 col = mix(ink, indigo, smoothstep(0.36, 0.64, f));
        col = mix(col, coral, smoothstep(0.52, 0.70, r.x) * smoothstep(0.44, 0.62, f) * 0.45);
        col = mix(col, uAccent, smoothstep(0.58, 0.76, r.y + 0.22 * f) * 0.62);

        // In the opening: calm toward the bottom and the edges. Under the content:
        // the same colours, held low enough that text always reads first.
        float vig = smoothstep(1.3, 0.1, length((vUv - vec2(0.5, 0.64)) * vec2(1.0, 1.3)));
        vec3 open = mix(col * (0.42 + 0.58 * vig), ink, smoothstep(0.5, 0.0, vUv.y) * 0.8);
        vec3 under = mix(ink, col, 0.42);
        gl_FragColor = vec4(mix(open, under, uDim), 1.0);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uDim: { value: 0 },
      uRes: { value: new Vec2(1, 1) },
      uAccent: { value: accent },
      tFlow: flowmap.uniform
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  // Phones resize the viewport whenever the address bar slides; only reallocate
  // when the size really changed, not on every few pixels.
  let size = [0, 0];
  function resize() {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, document.documentElement.clientHeight);
    if (Math.abs(w - size[0]) < 2 && Math.abs(h - size[1]) < 120) return;
    size = [w, h];
    renderer.setSize(w, h);
    program.uniforms.uRes.value.set(w, h);
    flowmap.aspect = w / h;
  }
  window.addEventListener('resize', resize);
  resize();

  // Pointer → flowmap (position and velocity, both 0..1 in viewport space).
  const mouse = new Vec2(-1);
  const velocity = new Vec2();
  let last = null;
  window.addEventListener('pointermove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = 1 - e.clientY / window.innerHeight;
    const now = performance.now();
    if (last) {
      const dt = Math.max(14, now - last.t);
      velocity.set((x - last.x) / dt * 16, (y - last.y) / dt * 16);
    }
    mouse.set(x, y);
    last = { x, y, t: now };
  }, { passive: true });

  // Bright in the opening, low under the content, and bright again at the
  // closing line, so the page opens and ends on the same colours.
  const outro = document.querySelector('[data-outro]');
  function outroNow() {
    if (!outro) return 0;
    const top = outro.getBoundingClientRect().top;
    const vh = window.innerHeight;
    // Starts only once the closing line reaches the middle of the screen, so
    // the text just above it never sits on a bright patch.
    return Math.min(1, Math.max(0, (vh * 0.55 - top) / (vh * 0.45)));
  }
  function dimNow() {
    const h = hero.offsetHeight || window.innerHeight;
    const opening = Math.min(1, Math.max(0, (window.scrollY - h * 0.15) / (h * 0.7)));
    return opening * (1 - 0.8 * outroNow());
  }

  // The backdrop runs on its own clock, which only advances while frames are
  // drawn, so a pause never ends in a jump.
  let clock = 8000;
  let lastDraw = performance.now();

  function draw(now) {
    const dt = Math.min(now - lastDraw, 100);
    clock += dt;
    lastDraw = now;
    // Ease toward the wing in view (set on <html data-active> by main.js), by
    // time rather than by frame, so it takes the same second at any frame rate.
    const target = ACCENTS[root.getAttribute('data-active')] || ACCENTS.tools;
    const k = 1 - Math.exp(-dt / 350);
    for (let i = 0; i < 3; i++) accent[i] += (target[i] - accent[i]) * k;
    program.uniforms.uDim.value = dimNow();
    flowmap.mouse.copy(mouse);
    flowmap.velocity.lerp(velocity, velocity.len() ? 0.5 : 0.1);
    velocity.multiply(0.9);
    flowmap.update();
    program.uniforms.uTime.value = clock / 1000;
    renderer.render({ scene: mesh });
  }

  let running = false;
  let lastFrame = 0;
  let lastActive = performance.now();

  function bright() {
    return window.scrollY < hero.offsetHeight * 0.85 || outroNow() > 0.3;
  }

  // Full speed in the opening and at the close. Under the content the motion is
  // slow and dim: a lower frame rate looks the same, and while the reader is
  // just reading (no scroll, no pointer) the picture rests completely, so the
  // graphics chip and the battery rest too.
  function frameBudget() {
    if (bright()) return light ? 1000 / 30 : 0;
    return light ? 1000 / 12 : 1000 / 24;
  }

  function settled() {
    const target = ACCENTS[root.getAttribute('data-active')] || ACCENTS.tools;
    return Math.abs(target[0] - accent[0]) + Math.abs(target[1] - accent[1]) + Math.abs(target[2] - accent[2]) < 0.01;
  }

  function frame(now) {
    if (document.hidden) { running = false; return; }
    if (!bright() && now - lastActive > 2500 && settled()) { running = false; return; }
    requestAnimationFrame(frame);
    if (now - lastFrame < frameBudget()) return;
    lastFrame = now;
    draw(now);
  }

  function run() {
    if (running) return;
    running = true;
    lastDraw = performance.now();
    requestAnimationFrame(frame);
  }

  function wake() {
    lastActive = performance.now();
    if (!reduceMotion && !document.hidden) run();
  }

  draw(performance.now());
  canvas.classList.add('is-on');

  if (reduceMotion) {
    // No motion: one frame, redrawn only when the scroll position or wing changes.
    let queued = false;
    const still = () => {
      queued = false;
      for (let i = 0; i < 3; i++) accent[i] = (ACCENTS[root.getAttribute('data-active')] || ACCENTS.tools)[i];
      lastDraw = performance.now();
      draw(lastDraw);
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(still); } }, { passive: true });
    return;
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('resize', wake);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  run();
}
