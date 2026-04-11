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

gsap.registerPlugin(ScrollTrigger);

/* ── State ── */

let renderer: THREE.WebGPURenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let material: THREE.MeshBasicNodeMaterial | null = null;
let canvas: HTMLCanvasElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let videoTexture: THREE.VideoTexture | null = null;
let gsapCtx: gsap.Context | null = null;
let ro: ResizeObserver | null = null;
let ioObserver: IntersectionObserver | null = null;
let rafId = 0;
let mouseHandler: ((e: MouseEvent) => void) | null = null;

const state = { progress: 0, mouseX: 0.5, mouseY: 0.5 };
let mouseQuickToX: gsap.QuickToFunc | null = null;
let mouseQuickToY: gsap.QuickToFunc | null = null;

/* ── Sizing ── */

function resize(): void {
  if (!canvas || !renderer || !camera) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.left = -w / 2;
  camera.right = w / 2;
  camera.top = h / 2;
  camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
}

/* ── Render loop ── */

function tick(): void {
  if (!renderer || !scene || !camera) return;
  renderer.renderAsync(scene, camera);

  if (state.progress <= 0) {
    rafId = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
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

  camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 10);
  camera.position.z = 1;

  // Fullscreen quad — sized in world units matching camera frustum
  const geo = new THREE.PlaneGeometry(w, h);
  material = new THREE.MeshBasicNodeMaterial();
  // colorNode wired in Task 5
  const mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);

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
  renderer = null;
  scene = null;
  camera = null;
  material = null;
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
