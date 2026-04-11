/**
 * Footer shaders — Three.js WebGPU + TSL.
 *
 * Single canvas renders three TSL layers:
 *   1. Radial bloom gradient (progress-driven cone: orange core → peach → parchment → dark edges)
 *   2. Animated caustic light (4-octave fBm with domain warp — deep water diffuse pools)
 *   3. Video shadow mask (luminance threshold, palm leaf silhouettes)
 *
 * Scroll progress and mouse position driven by GSAP.
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
  abs,
  dot,
  floor,
  fract,
  smoothstep,
  clamp,
  texture,
  PI,
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
let videoReady = false;
let lastVideoUpdate = 0;

const state = { progress: 0, mouseX: 0.5, mouseY: 0.5 };
let mouseQuickToX: gsap.QuickToFunc | null = null;
let mouseQuickToY: gsap.QuickToFunc | null = null;

/* ── TSL Uniforms ── */
export const uProgress = uniform(0);
export const uMouse = uniform(new THREE.Vector2(0.5, 0.5));
export const uTime = uniform(0);

// Caustic tuning uniforms — exposed for tweakpane
export const uCausticScale = uniform(3.0);
export const uCausticSpeed = uniform(0.5);
export const uCausticPower = uniform(2.0);
export const uCausticBrightness = uniform(0.5);
export const uMouseInfluence = uniform(0.2);

// Shadow tuning uniforms
export const uShadowThreshold = uniform(0.41);
export const uShadowSoftness = uniform(1.0);
export const uShadowAlpha = uniform(0.2);

// Gradient tuning
export const uGradientWidth = uniform(1.8);   // cone horizontal spread

// Caustic fBm tuning
export const uCausticWarp = uniform(0.3);     // domain warp strength

// videoTexNode is a TextureNode bound to a 1×1 CanvasTexture placeholder at build.
// When the video is ready, we swap `.value` to the real VideoTexture — TextureNode's
// setter rebinds the sampler without rebuilding the shader graph.
let placeholderTex: THREE.Texture | null = null;
let videoTexNode: ReturnType<typeof texture> | null = null;

/* ── TSL: Gradient reveal ── */
const gradientFn = Fn(() => {
  const cOrange    = color(0xef5d2a); // --color-orange   bottom
  const cParchment = color(0xf9efe6); // --color-background top

  // progress drives how much of the gradient is revealed from the bottom up.
  // At progress=0: scaledY always >= 1, whole canvas maps to cOrange.
  // At progress=1: full 0→1 gradient visible — parchment at top, orange at bottom.
  // Like a blind being raised: warm light floods in from the bottom.
  const safeProgress = clamp(uProgress, float(0.001), float(1.0));

  // Ripple: distort the reveal edge with a slow horizontal sine wave
  // so it looks like the gradient is spreading like a disturbance in water
  const ripple = sin(uv().x.mul(6.0).add(uTime.mul(0.3))).mul(0.03);
  const scaledY = clamp(uv().y.div(safeProgress).add(ripple), float(0.0), float(1.0));

  return mix(cOrange, cParchment, scaledY);
});

/* ── TSL: fBm caustics ── */

// Inline hash: dot-based pseudo-random float from vec2
// Avoids Fn parameter passing issues — inlined directly where needed
const hashInline = (px: any, py: any) =>
  fract(sin(px.mul(127.1).add(py.mul(311.7))).mul(43758.5453));

const causticFn = Fn(() => {
  const p = uv().sub(uMouse.mul(uMouseInfluence)).mul(uCausticScale);
  const animP = p.add(uTime);

  // Inline 2-octave value noise — no Fn param passing, all inlined
  const noiseAt = (cx: any, cy: any) => {
    const ix = floor(cx);
    const iy = floor(cy);
    const fx = fract(cx);
    const fy = fract(cy);
    const ux = fx.mul(fx).mul(float(3.0).sub(fx.mul(2.0)));
    const uy = fy.mul(fy).mul(float(3.0).sub(fy.mul(2.0)));
    const a = hashInline(ix,            iy           );
    const b = hashInline(ix.add(1.0),   iy           );
    const c = hashInline(ix,            iy.add(1.0)  );
    const d = hashInline(ix.add(1.0),   iy.add(1.0)  );
    return mix(mix(a, b, ux), mix(c, d, ux), uy);
  };

  const px = animP.x;
  const py = animP.y;

  // 3 octaves inlined
  const n1 = noiseAt(px,          py         );
  const n2 = noiseAt(px.mul(2.0), py.mul(2.0)).mul(0.5);
  const n3 = noiseAt(px.mul(4.0), py.mul(4.0)).mul(0.25);
  const n = clamp(n1.add(n2).add(n3).mul(0.571), float(0.0), float(1.0));

  // Caustic sharpen: abs(sin(n * PI)) → bright veins, dark gaps
  const sharpened = abs(sin(n.mul(PI))).pow(uCausticPower);

  // 1.43 = ramp-in overshoot scale — reaches full strength at ~70% progress
  const causticStrength = clamp(uProgress.mul(1.43), float(0.0), float(1.0));
  return sharpened.mul(causticStrength).mul(uCausticBrightness);
});


const causticColorFn = Fn(() => {
  const intensity = causticFn();
  // Caustics tint toward orange-gold — blends with the gradient rather than blowing it out
  const causticTint = color(0xd96030);
  return causticTint.mul(intensity);
});

/* ── TSL: Shadow mask ── */
const shadowMaskFn = Fn(() => {
  // Bright video pixels (lit leaves) = shadow=1. Dark pixels = shadow=0.
  // Placeholder is opaque black → luminance=0 → shadow=0 → no shadow until video loads.
  // Invert luminance — dark areas of video (leaf shapes) become shadow=1
  const luma = dot(videoTexNode!.rgb, vec3(0.2126, 0.7152, 0.0722));
  return smoothstep(
    uShadowThreshold.sub(uShadowSoftness),
    uShadowThreshold.add(uShadowSoftness),
    float(1.0).sub(luma),
  );
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

const VIDEO_UPDATE_INTERVAL = 1000 / 15;


function tick(timestamp: number): void {
  if (!renderer || !scene || !camera) return;

  const delta = lastTime ? (timestamp - lastTime) / 1000 : 0;
  lastTime = timestamp;
  uTime.value += delta * uCausticSpeed.value;

  // Upload video texture at capped rate (~15fps)
  if (videoReady && videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
    const now = performance.now();
    if (now - lastVideoUpdate > VIDEO_UPDATE_INTERVAL) {
      if (videoTexture) videoTexture.needsUpdate = true;
      lastVideoUpdate = now;
    }
  }

  renderer.render(scene, camera);

  if (state.progress <= 0 && !videoReady) {
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

/** Dev/tweakpane: override progress directly (bypasses scroll state). */
export function setProgress(v: number): void {
  state.progress = v;
  ensureLoop();
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
    console.warn('FooterShaders: WebGPU init failed');
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

  // Initialise video placeholder here (not at module scope) so document is available.
  // A 1×1 CanvasTexture is the minimal valid THREE.Texture for TSL's texture() node.
  if (!placeholderTex) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    c.getContext('2d')!.fillRect(0, 0, 1, 1); // ensure canvas has pixel data — empty canvas → CopyExternalImageToTexture error
    placeholderTex = new THREE.CanvasTexture(c);
    placeholderTex.colorSpace = THREE.SRGBColorSpace;
  }

  // Build the TextureNode once, bound to the placeholder. Later we swap
  // `videoTexNode.value` to the real VideoTexture — no graph rebuild needed.
  videoTexNode = texture(placeholderTex, vec2(uv().x, float(1.0).sub(uv().y)));

  // Fullscreen quad — normalized to camera frustum
  const geo = new THREE.PlaneGeometry(2, 2);
  material = new THREE.MeshBasicNodeMaterial();

  const finalColorFn = Fn(() => {
    const bg = gradientFn();
    const shadow = shadowMaskFn();
    const caustic = causticColorFn().mul(float(1.0).sub(shadow.mul(0.8)));
    const shadowDarken = bg.mul(shadow.mul(uShadowAlpha));
    return bg.add(caustic).sub(shadowDarken);
  });

  material.colorNode = vec4(finalColorFn(), uProgress);
  material.transparent = true;
  quad = new THREE.Mesh(geo, material);
  scene.add(quad);

  return true;
}

/* ── Video loading ── */

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
          // Autoplay blocked — shadow mask stays transparent (placeholder texture).
          // Do not set videoReady: the loop stop condition stays correct.
          videoEl!.currentTime = 0;
        });
        ioObserver!.disconnect();
        ioObserver = null;
      }
    },
    { rootMargin: '200px 0px' },
  );
  ioObserver.observe(footer);

  const onReady = () => {
    if (!videoEl || !videoTexNode) return; // destroyed before event fired
    videoReady = true;
    videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    // Swap the TextureNode's bound texture — sampler rebinds, graph stays intact.
    videoTexNode.value = videoTexture;
    ensureLoop();
  };

  videoEl.addEventListener('playing', onReady, { once: true });
  videoEl.addEventListener('canplay', onReady, { once: true });
}

/* ── Public API ── */

export async function initFooterShaders(opts?: { staticProgress?: number }): Promise<void> {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-shadows]');
  if (!canvas) return;

  const ok = await initRenderer();
  if (!ok) return;

  ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  initVideo();

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

  // Dev / static mode: skip ScrollTrigger, lock progress at provided value
  if (opts?.staticProgress !== undefined) {
    state.progress = opts.staticProgress;
    ensureLoop();
    return;
  }

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

export function destroyFooterShaders(): void {
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
  videoTexture?.dispose();
  videoTexture = null;
  // Rebind the TextureNode to the placeholder so a subsequent init won't sample a disposed texture.
  if (videoTexNode && placeholderTex) videoTexNode.value = placeholderTex;
  videoTexNode = null;
  videoReady = false;
  lastVideoUpdate = 0;

  state.progress = 0;
  state.mouseX = 0.5;
  state.mouseY = 0.5;
}

// Back-compat aliases so BaseLayout doesn't need updating until we're ready to clean up
export { initFooterShaders as initFooterShadows, destroyFooterShaders as destroyFooterShadows };
