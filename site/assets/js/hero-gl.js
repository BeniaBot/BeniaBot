/* Hero backdrop: a slow, warped gradient that the pointer can stir (OGL + Flowmap).
   Purely decorative. The CSS gradient under it is the fallback, so any failure
   here just leaves that in place. */
import { Renderer, Program, Mesh, Triangle, Flowmap, Vec2 } from '../../vendor/ogl/ogl.min.mjs';

const canvas = document.querySelector('[data-hero-gl]');
const hero = canvas && canvas.closest('.hero');

if (canvas && hero) {
  try { start(); } catch (err) { console.warn('hero background off:', err); }
}

function start() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 760px)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

  // The noise is soft, so a low internal resolution looks the same and costs far less.
  const scale = small || weak ? 0.5 : 0.75;
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 2) * scale,
    alpha: false,
    antialias: false,
    powerPreference: 'low-power'
  });
  const gl = renderer.gl;
  gl.clearColor(0.04, 0.04, 0.05, 1);

  const flowmap = new Flowmap(gl, { falloff: 0.28, dissipation: 0.965, alpha: 0.9 });
  const geometry = new Triangle(gl);

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
      uniform vec2 uRes;
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
        vec3 amber  = vec3(1.0, 0.68, 0.28);
        vec3 coral  = vec3(0.98, 0.34, 0.47);

        // fbm sits roughly in 0.3..0.7, so the bands below are tuned to that range.
        vec3 col = mix(ink, indigo, smoothstep(0.36, 0.64, f));
        col = mix(col, coral, smoothstep(0.52, 0.70, r.x) * smoothstep(0.44, 0.62, f) * 0.5);
        col = mix(col, amber, smoothstep(0.58, 0.76, r.y + 0.22 * f) * 0.62);

        // Keep the text side calm: darker toward the bottom and the edges.
        float vig = smoothstep(1.3, 0.1, length((vUv - vec2(0.5, 0.64)) * vec2(1.0, 1.3)));
        col *= 0.42 + 0.58 * vig;
        col = mix(col, ink, smoothstep(0.5, 0.0, vUv.y) * 0.8);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new Vec2(1, 1) },
      tFlow: flowmap.uniform
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h);
    program.uniforms.uRes.value.set(w, h);
    flowmap.aspect = w / h;
  }
  window.addEventListener('resize', resize);
  resize();

  // Pointer → flowmap (position and velocity, both 0..1 in hero space).
  const mouse = new Vec2(-1);
  const velocity = new Vec2();
  let last = null;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    const now = performance.now();
    if (last) {
      const dt = Math.max(14, now - last.t);
      velocity.set((x - last.x) / dt * 16, (y - last.y) / dt * 16);
    }
    mouse.set(x, y);
    last = { x, y, t: now };
  }, { passive: true });

  let visible = true;
  let running = false;
  let lastFrame = 0;
  const minFrame = small || weak ? 1000 / 30 : 0;
  const t0 = performance.now() - 8000;

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    if (now - lastFrame < minFrame) return;
    lastFrame = now;
    draw(now);
  }

  function draw(now) {
    flowmap.mouse.copy(mouse);
    flowmap.velocity.lerp(velocity, velocity.len() ? 0.5 : 0.1);
    velocity.multiply(0.9);
    flowmap.update();
    program.uniforms.uTime.value = (now - t0) / 1000;
    renderer.render({ scene: mesh });
  }

  function run() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(frame);
  }

  // One still frame for reduced motion; a live loop otherwise, only while on screen.
  draw(performance.now());
  canvas.classList.add('is-on');
  if (reduceMotion) return;

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) run();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  run();
}
