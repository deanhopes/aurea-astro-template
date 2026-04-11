/**
 * Footer caustic shadows — Three.js WebGPU + TSL.
 *
 * Single canvas renders three TSL layers:
 *   1. Vertical gradient background (warm parchment → deep orange)
 *   2. Animated caustic light (three-octave sin interference)
 *   3. Video shadow mask (luminance threshold, palm leaf silhouettes)
 *
 * Scroll progress and mouse position driven by GSAP (same pattern as WebGL1 predecessor).
 */

import * as THREE from 'three/webgpu';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  uniform,
  vec2,
  vec3,
  vec4,
  float,
  mix,
  uv,
  color,
  Fn,
  sin,
  dot,
  smoothstep,
  clamp,
} from 'three/tsl';

gsap.registerPlugin(ScrollTrigger);

/* ── State ── */

let renderer: THREE.WebGPURenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let material: THREE.MeshBasicNodeMaterial | null = null;
let quad: THREE.Mesh | null = null;
let canvas: HTMLCanvasElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let videoTexture: THREE.VideoTexture | null = null;
let gsapCtx: gsap.Context | null = null;
let ro: ResizeObserver | null = null;
let ioObserver: IntersectionObserver | null = null;
let rafId = 0;
let lastTime = 0;
let mouseHandler: ((e: MouseEvent) => void) | null = null;

const state = { progress: 0, mouseX: 0.5, mouseY: 0.5 };
let mouseQuickToX: gsap.QuickToFunc | null = null;
let mouseQuickToY: gsap.QuickToFunc | null = null;

/* ── TSL Uniforms ── */
const uProgress = uniform(0);
const uMouse = uniform(new THREE.Vector2(0.5, 0.5));
const uTime = uniform(0);

/* ── TSL: Background gradient ── */
const gradientFn = Fn(() => {
  const bgTop = color(0xf9efe6); // warm parchment — matches --color-background
  const bgBottom = color(0xd95f2a); // deep sunset orange
  // uv().y = 0 at bottom, 1 at top in Three.js orthographic
  return mix(bgBottom, bgTop, uv().y);
});

/* ── TSL: Caustic light ── */
const causticFn = Fn(() => {
  // Three UV offsets at different rotation angles — simulate multi-angle water refraction
  const p = uv().sub(uMouse.mul(0.04)); // subtle mouse shift on caustic origin

  // Octave 1 — primary interference (0°)
  const oct1 = sin(p.x.mul(6.0).add(uTime.mul(1.0)))
    .add(sin(p.y.mul(6.0).add(uTime.mul(0.8))))
    .mul(0.5);

  // Octave 2 — secondary interference (~45°)
  const p2x = p.x.mul(0.707).sub(p.y.mul(0.707));
  const p2y = p.x.mul(0.707).add(p.y.mul(0.707));
  const oct2 = sin(p2x.mul(7.0).add(uTime.mul(1.3)))
    .add(sin(p2y.mul(5.0).add(uTime.mul(0.6))))
    .mul(0.35);

  // Octave 3 — fine detail (~22°)
  const p3x = p.x.mul(0.924).sub(p.y.mul(0.383));
  const p3y = p.x.mul(0.383).add(p.y.mul(0.924));
  const oct3 = sin(p3x.mul(11.0).add(uTime.mul(1.7)))
    .add(sin(p3y.mul(9.0).add(uTime.mul(1.1))))
    .mul(0.15);

  // Sum octaves → normalize 0–1
  const raw = oct1.add(oct2).add(oct3).mul(0.5).add(0.5);
  // Sharpen: raise to power 3 → bright patches, dark gaps (interior light character)
  const sharpened = raw.pow(3.0);

  // Cap intensity at 0.7 progress — present but not overwhelming at full reveal
  const causticStrength = clamp(uProgress.mul(1.43), float(0.0), float(1.0));
  return sharpened.mul(causticStrength).mul(0.45); // 0.45 = max brightness
});

const causticColorFn = Fn(() => {
  const intensity = causticFn();
  const warmWhite = color(0xfff5e0);
  const warmGold = color(0xffd97a);
  return mix(warmWhite, warmGold, intensity).mul(intensity);
});

/* ── Sizing ── */

function resize(): void {
  if (!canvas || !renderer) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
}

/* ── Render loop ── */

function tick(timestamp: number): void {
  if (!renderer || !scene || !camera) return;

  const delta = lastTime ? (timestamp - lastTime) / 1000 : 0;
  lastTime = timestamp;
  uTime.value += delta * 0.1; // slow clock — caustics animate at ~0.1 units/sec

  renderer.renderAsync(scene, camera);

  if (state.progress <= 0) {
    rafId = 0;
    lastTime = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
  uProgress.value = state.progress;
  uMouse.value.set(state.mouseX, state.mouseY);
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/* ── Renderer init ── */

async function initRenderer(): Promise<boolean> {
  if (!canvas) return false;

  renderer = new THREE.WebGPURenderer({
    canvas,
    alpha: true,
    antialias: false,
  });

  try {
    await renderer.init();
  } catch {
    console.warn('FooterShadows: WebGPU init failed');
    return false;
  }

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // Fullscreen quad — normalized to camera frustum
  const geo = new THREE.PlaneGeometry(2, 2);
  material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = vec4(gradientFn().add(causticColorFn()), uProgress);
  material.transparent = true;
  quad = new THREE.Mesh(geo, material);
  scene.add(quad);

  return true;
}

/* ── Public API ── */

export async function initFooterShadows(): Promise<void> {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-shadows]');
  if (!canvas) return;

  const ok = await initRenderer();
  if (!ok) return;

  ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  const quickOpts = { duration: 0.4, ease: 'power2.out', onUpdate: ensureLoop };
  mouseQuickToX = gsap.quickTo(state, 'mouseX', quickOpts);
  mouseQuickToY = gsap.quickTo(state, 'mouseY', { ...quickOpts, duration: 0.6 });

  const footer = document.querySelector('[data-footer]') as HTMLElement | null;
  mouseHandler = (e: MouseEvent) => {
    mouseQuickToX!(e.clientX / window.innerWidth);
    if (footer) {
      const rect = footer.getBoundingClientRect();
      const yInFooter = (e.clientY - rect.top) / rect.height;
      mouseQuickToY!(Math.max(0, Math.min(1, yInFooter)));
    }
  };
  window.addEventListener('mousemove', mouseHandler, { passive: true });

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsapCtx?.revert();
  gsapCtx = gsap.context(() => {
    const footerTrigger = document.querySelector('[data-footer-trigger]');
    if (!footerTrigger) return;

    if (prefersReduced) {
      state.progress = 1;
      ensureLoop();
      return;
    }

    gsap.to(state, {
      progress: 1,
      ease: 'none',
      onUpdate: ensureLoop,
      scrollTrigger: {
        trigger: footerTrigger,
        start: 'top 130%',
        end: 'bottom 40%',
        scrub: 1,
      },
    });
  });
}

export function destroyFooterShadows(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;
  lastTime = 0;

  ioObserver?.disconnect();
  ioObserver = null;

  ro?.disconnect();
  ro = null;

  gsapCtx?.revert();
  gsapCtx = null;

  if (mouseHandler) {
    window.removeEventListener('mousemove', mouseHandler);
    mouseHandler = null;
  }
  mouseQuickToX = null;
  mouseQuickToY = null;

  renderer?.dispose();
  quad?.geometry.dispose();
  material?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  material = null;
  quad = null;
  canvas = null;

  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }
  videoEl = null;
  videoTexture = null;

  state.progress = 0;
  state.mouseX = 0.5;
  state.mouseY = 0.5;
}
