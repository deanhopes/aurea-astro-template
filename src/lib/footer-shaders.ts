/**
 * Footer shaders — main-thread orchestrator.
 *
 * Worker path: transfers canvas to a Web Worker that owns the WebGPU
 * renderer + render loop. Main thread handles DOM events (scroll, mouse,
 * video, resize) and posts uniform updates to the worker.
 *
 * Fallback path: if OffscreenCanvas transfer isn't available, builds the
 * scene on the main thread (same visual result, blocks main thread during
 * shader compile).
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { FooterScene } from './footer-shaders-scene';

gsap.registerPlugin(ScrollTrigger);

// ── State ─────────────────────────────────────────────────────────────

let worker: Worker | null = null;
let gsapCtx: gsap.Context | null = null;
let ro: ResizeObserver | null = null;
let ioObserver: IntersectionObserver | null = null;
let mouseHandler: ((e: MouseEvent) => void) | null = null;
let videoPumpTimer: ReturnType<typeof setInterval> | null = null;
let videoEl: HTMLVideoElement | null = null;
let canvas: HTMLCanvasElement | null = null;

// Fallback (main-thread) state
let fallbackScene: FooterScene | null = null;
let fallbackUniforms: {
  uProgress: { value: number };
  uSunX: { value: number };
  uSunY: { value: number };
} | null = null;
let fallbackSceneModule: typeof import('./footer-shaders-scene') | null = null;
let fallbackRafId = 0;

// Shared
const state = { progress: 0, mouseX: 0.34, mouseY: 0.5 };
let mouseQuickToX: gsap.QuickToFunc | null = null;
let mouseQuickToY: gsap.QuickToFunc | null = null;

const VIDEO_FPS = 15;
const VIDEO_INTERVAL = 1000 / VIDEO_FPS;

// ── Worker path ───────────────────────────────────────────────────────

function postWorker(msg: Record<string, unknown>, transfer?: Transferable[]) {
  worker?.postMessage(msg, transfer ?? []);
}

function initWorkerPath(offscreen: OffscreenCanvas, w: number, h: number): Promise<void> {
  return new Promise((resolve, reject) => {
    worker = new Worker(new URL('./footer-shaders.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') resolve();
      else if (e.data.type === 'error') reject(new Error(e.data.message));
    };

    const dpr = Math.min(devicePixelRatio || 1, 2);
    worker.postMessage({ type: 'init', canvas: offscreen, width: w, height: h, dpr }, [offscreen]);
  });
}

// ── Fallback path (main thread) ───────────────────────────────────────

async function initFallbackPath(cvs: HTMLCanvasElement): Promise<boolean> {
  const mod = await import('./footer-shaders-scene');
  const scene = await mod.buildScene(cvs);
  if (!scene) return false;

  fallbackScene = scene;
  fallbackSceneModule = mod;
  fallbackUniforms = { uProgress: mod.uProgress, uSunX: mod.uSunX, uSunY: mod.uSunY };

  const dpr = Math.min(devicePixelRatio || 1, 2);
  scene.renderer.setPixelRatio(dpr);
  scene.renderer.setSize(cvs.clientWidth, cvs.clientHeight, false);

  return true;
}

function fallbackTick(): void {
  if (!fallbackScene || !fallbackUniforms) return;

  fallbackUniforms.uProgress.value = state.progress;
  fallbackUniforms.uSunX.value = state.mouseX;
  fallbackUniforms.uSunY.value = state.mouseY;

  fallbackScene.renderer.render(fallbackScene.scene, fallbackScene.camera);
  fallbackRafId = requestAnimationFrame(fallbackTick);
}

function ensureFallbackLoop(): void {
  if (!fallbackRafId && fallbackScene) fallbackRafId = requestAnimationFrame(fallbackTick);
}

// ── Shared: video lazy-load + frame pump ──────────────────────────────

function initVideo(): void {
  videoEl = document.querySelector<HTMLVideoElement>('[data-footer-shadows-video]');
  if (!videoEl) return;

  const footer = document.querySelector('[data-footer]');
  if (!footer) return;

  ioObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        videoEl!.load();
        videoEl!.play().catch(() => {
          videoEl!.currentTime = 0;
        });
        ioObserver!.disconnect();
        ioObserver = null;
      }
    },
    { rootMargin: '200px 0px' },
  );
  ioObserver.observe(footer);

  if (worker) {
    // Worker path: pump ImageBitmap frames
    const onReady = () => {
      if (!videoEl) return;
      videoPumpTimer = setInterval(() => {
        if (!videoEl || videoEl.readyState < videoEl.HAVE_CURRENT_DATA) return;
        createImageBitmap(videoEl).then((bitmap) => {
          postWorker({ type: 'videoFrame', bitmap }, [bitmap]);
        });
      }, VIDEO_INTERVAL);
    };
    videoEl.addEventListener('playing', onReady, { once: true });
    videoEl.addEventListener('canplay', onReady, { once: true });
  } else if (fallbackScene) {
    // Fallback path: create VideoTexture on first play
    const capturedVideo = videoEl;
    const onReady = async () => {
      if (!capturedVideo || !fallbackScene) return;
      const THREE = await import('three/webgpu');
      const vidTex = new THREE.VideoTexture(capturedVideo);
      vidTex.minFilter = THREE.LinearFilter;
      vidTex.magFilter = THREE.LinearFilter;
      vidTex.format = THREE.RGBAFormat;
      vidTex.colorSpace = THREE.SRGBColorSpace;
      fallbackScene.videoTexNode.value = vidTex;
      ensureFallbackLoop();
    };
    videoEl.addEventListener('playing', onReady, { once: true });
    videoEl.addEventListener('canplay', onReady, { once: true });
  }
}

// ── Shared: resize, scroll, mouse ─────────────────────────────────────

function setupResize() {
  if (!canvas) return;
  ro = new ResizeObserver(() => {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (worker) {
      postWorker({ type: 'resize', width: w, height: h, dpr });
    } else if (fallbackScene) {
      fallbackScene.renderer.setPixelRatio(dpr);
      fallbackScene.renderer.setSize(w, h, false);
    }
  });
  ro.observe(canvas);
}

function setupScrollTrigger() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsapCtx?.revert();
  gsapCtx = gsap.context(() => {
    const footerTrigger = document.querySelector('[data-footer-trigger]');
    if (!footerTrigger) return;

    if (prefersReduced) {
      state.progress = 1;
      if (worker) postWorker({ type: 'progress', value: 1 });
      else ensureFallbackLoop();
      return;
    }

    gsap.to(state, {
      progress: 1,
      ease: 'none',
      onUpdate() {
        if (worker) postWorker({ type: 'progress', value: state.progress });
        else ensureFallbackLoop();
      },
      scrollTrigger: {
        trigger: footerTrigger,
        start: 'top 85%',
        end: 'bottom 50%',
        scrub: 1,
      },
    });
  });
}

function setupMouse() {
  const footer = document.querySelector('[data-footer]') as HTMLElement | null;

  const quickOpts = {
    duration: 0.4,
    ease: 'power2.out',
    onUpdate() {
      if (worker) postWorker({ type: 'mouse', x: state.mouseX, y: state.mouseY });
      else ensureFallbackLoop();
    },
  };

  mouseQuickToX = gsap.quickTo(state, 'mouseX', quickOpts);
  mouseQuickToY = gsap.quickTo(state, 'mouseY', { ...quickOpts, duration: 0.9 });

  mouseHandler = (e: MouseEvent) => {
    mouseQuickToX!(e.clientX / window.innerWidth);
    if (footer) {
      const rect = footer.getBoundingClientRect();
      mouseQuickToY!(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
    }
  };
  window.addEventListener('mousemove', mouseHandler, { passive: true });
}

// ── Debug: uniform setter for tweakpane ──────────────────────────────

export function setUniform(name: string, value: number): void {
  if (worker) {
    postWorker({ type: 'uniform', name, value });
  } else if (fallbackSceneModule) {
    const u = (fallbackSceneModule as unknown as Record<string, { value: number }>)[name];
    if (u && 'value' in u) {
      u.value = value;
      ensureFallbackLoop();
    }
  }
}

// ── Wordmark rasterization ────────────────────────────────────────────

async function rasterizeWordmark(
  canvasWidth: number,
  canvasHeight: number,
): Promise<ImageBitmap | null> {
  // Wait for Test Söhne to load
  try {
    await document.fonts.load('300 100px "Test Sohne"');
  } catch {
    // font may already be loaded
  }

  const offscreen = document.createElement('canvas');
  // Match the aspect ratio of the footer canvas
  const texW = Math.min(canvasWidth * Math.min(devicePixelRatio || 1, 2), 2048);
  const texH = Math.round(texW * (canvasHeight / canvasWidth));
  offscreen.width = texW;
  offscreen.height = texH;

  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  // Clear to black (0 alpha in R channel = no wordmark)
  ctx.clearRect(0, 0, texW, texH);

  // Set font, measure, scale to fit within 90% of texture width
  let fontSize = texH * 0.38;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';

  const applyFont = (size: number) => {
    ctx.font = `300 ${size}px "Test Sohne", sans-serif`;
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${size * 0.15}px`;
    }
  };

  applyFont(fontSize);
  const measured = ctx.measureText('AUREA');
  const maxW = texW * 0.9;
  if (measured.width > maxW) {
    fontSize *= maxW / measured.width;
    applyFont(fontSize);
  }

  // Position: bottom of canvas, matching CSS bottom: -0.05em
  const y = texH - fontSize * 0.05;
  ctx.fillText('AUREA', texW / 2, y);

  return createImageBitmap(offscreen);
}

async function sendWordmark(canvasWidth: number, canvasHeight: number): Promise<void> {
  const bitmap = await rasterizeWordmark(canvasWidth, canvasHeight);
  if (!bitmap) return;

  if (worker) {
    postWorker({ type: 'wordmarkBitmap', bitmap }, [bitmap]);
  } else if (fallbackScene) {
    const THREE = await import('three/webgpu');
    const wmTex = new THREE.Texture(bitmap as unknown as HTMLImageElement);
    wmTex.minFilter = THREE.LinearFilter;
    wmTex.magFilter = THREE.LinearFilter;
    wmTex.format = THREE.RGBAFormat;
    wmTex.needsUpdate = true;
    fallbackScene.wordmarkTexNode.value = wmTex;
    ensureFallbackLoop();
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function initFooterShaders(): Promise<void> {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-shadows]');
  if (!canvas) return;

  const canTransfer = typeof canvas.transferControlToOffscreen === 'function';

  if (canTransfer) {
    try {
      const offscreen = canvas.transferControlToOffscreen();
      await initWorkerPath(offscreen, canvas.clientWidth, canvas.clientHeight);
    } catch {
      worker?.terminate();
      worker = null;
    }
  }

  // Fallback: main-thread rendering
  if (!worker) {
    const ok = await initFallbackPath(canvas);
    if (!ok) return;
  }

  setupResize();
  setupScrollTrigger();
  setupMouse();
  initVideo();
  sendWordmark(canvas.clientWidth, canvas.clientHeight);
}

export function destroyFooterShaders(): void {
  if (videoPumpTimer) {
    clearInterval(videoPumpTimer);
    videoPumpTimer = null;
  }

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

  if (worker) {
    postWorker({ type: 'destroy' });
    worker.terminate();
    worker = null;
  }

  if (fallbackScene) {
    cancelAnimationFrame(fallbackRafId);
    fallbackRafId = 0;
    fallbackScene.renderer.dispose();
    fallbackScene.material.dispose();
    fallbackScene = null;
  }
  fallbackUniforms = null;
  fallbackSceneModule = null;

  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }
  videoEl = null;

  canvas = null;
  state.progress = 0;
  state.mouseX = 0.34;
  state.mouseY = 0.5;
}
