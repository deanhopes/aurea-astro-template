/**
 * Footer shaders — Three.js WebGPU + TSL.
 *
 * Physical model: sunlit water surface, viewer looking down through warm water.
 *
 * Composite (fullscreen quad, orthographic):
 *   1. Smooth fBm height field (water surface shape) — domain-warped value noise,
 *      continuous and nonzero everywhere so the finite-difference gradient is
 *      meaningful at every pixel.
 *   2. Surface normal from 4-tap central differences on the height field.
 *   3. Caustic brightness = |∇h|² — bright where the surface is steep, which is
 *      where refracted light physically concentrates. No "thin filament" sampling
 *      problem; the signal is smooth across the whole field.
 *   4. Refraction: n.xy offsets the UV at which the gradient and shadow mask are
 *      sampled, so the warm palette and palm leaf silhouettes visibly distort
 *      around caustic regions as if seen through rippling water.
 *   5. Directional lighting: half-lambert [0.75..1.25] modulates the gradient.
 *      Lit slopes brighten, shaded slopes gently dim. Plus a tight specular
 *      gated by caustic brightness — bright glints only on slope peaks.
 *   6. Video shadow mask: cool-to-warm burnt-umber tint under palm leaves.
 *
 * Mouse position drives the virtual sun direction (X horizontal, Y subtle vertical
 * breathing), so moving the cursor makes the light dance across the slopes without
 * the underlying pattern changing. Progress drives the scroll reveal fade.
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
  max,
  dot,
  floor,
  fract,
  normalize,
  pow,
  smoothstep,
  clamp,
  texture,
  time,
} from 'three/tsl';

gsap.registerPlugin(ScrollTrigger);

// Local alias for vec2-shaped TSL nodes — every Fn in this file takes a UV/vec2
// as its single parameter. The TSL types don't re-export the Node<"vec2"> type
// directly, so we recover it from the constructor's return type.
type Vec2Node = ReturnType<typeof vec2>;

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
let mouseHandler: ((e: MouseEvent) => void) | null = null;
let videoReady = false;
let lastVideoUpdate = 0;

const state = { progress: 0, mouseX: 0.34, mouseY: 0.5 };
let mouseQuickToX: gsap.QuickToFunc | null = null;
let mouseQuickToY: gsap.QuickToFunc | null = null;

const uProgress = uniform(0);
const uSunX = uniform(0.34);
const uSunY = uniform(0.5);

export const uCausticScale = uniform(2.3);
export const uCausticSpeed = uniform(0.14);
export const uCausticSharpness = uniform(2.5);
export const uCausticHeight = uniform(2.0);

export const uShadowThreshold = uniform(0.0);
export const uShadowSoftness = uniform(2.0);
export const uShadowAlpha = uniform(0.54);

export const uRefraction = uniform(0.02);
export const uSpecStrength = uniform(0.9);
export const uSpecSharp = uniform(128.0);

let placeholderTex: THREE.Texture | null = null;
let videoTexNode: ReturnType<typeof texture> | null = null;

/* Vertical 5-stop ramp with a horizontal sine ripple so the bands read as a
 * painted blend, not a hard ramp. Progress compresses the Y axis so at 0
 * nothing is lit and at 1 the full cone shows. Parameterised by UV so the
 * fragment can sample it at a refracted position. */
const gradientFn = Fn(([sampleUV]: [Vec2Node]) => {
  const cDeep = color(0xc94020);
  const cOrange = color(0xef5d2a);
  const cCoral = color(0xf0a080);
  const cPeach = color(0xf0c4a8);
  const cParchment = color(0xf9efe6);

  const safeProgress = clamp(uProgress, float(0.001), float(1.0));
  const ripple = sin(sampleUV.x.mul(6.0).add(time.mul(0.3))).mul(0.03);
  const t = clamp(sampleUV.y.div(safeProgress).add(ripple), float(0.0), float(1.0));

  const c01 = mix(cDeep, cOrange, smoothstep(float(0.0), float(0.45), t));
  const c12 = mix(c01, cCoral, smoothstep(float(0.2), float(0.65), t));
  const c23 = mix(c12, cPeach, smoothstep(float(0.45), float(0.85), t));
  const c34 = mix(c23, cParchment, smoothstep(float(0.65), float(1.0), t));

  return c34;
});

/* Three-octave domain-warped fBm. A continuous, nonzero-everywhere scalar
 * field representing the rippling water surface (not caustic brightness —
 * that comes from the gradient of this field).
 *
 * Why not Voronoi edges? F2−F1 produces thin filaments that are near-zero
 * everywhere except on a 1-pixel-wide crease. Finite-difference sampling
 * (eps ≈ a few pixels) misses the crease 99% of the time so the derived
 * normal is flat almost everywhere and lighting doesn't register.
 *
 * fBm gives smooth slopes nonzero across the whole field. |∇h| is high where
 * the surface is steep — which is where physical caustics form. Same field
 * provides (a) a smooth normal for lighting + refraction and (b) caustic
 * brightness from the gradient. */
const hash2 = Fn(([p]: [Vec2Node]) => {
  return fract(sin(p.x.mul(127.1).add(p.y.mul(311.7))).mul(43758.5453));
});

const valueNoise = Fn(([p]: [Vec2Node]) => {
  const i = floor(p);
  const f = fract(p);

  // Quintic smoothstep — smoother derivatives at cell boundaries
  const u = f
    .mul(f)
    .mul(f)
    .mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0));

  const a = hash2(i);
  const b = hash2(i.add(vec2(1.0, 0.0)));
  const c = hash2(i.add(vec2(0.0, 1.0)));
  const d = hash2(i.add(vec2(1.0, 1.0)));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

const fbm = Fn(([p]: [Vec2Node]) => {
  const n1 = valueNoise(p);
  const n2 = valueNoise(p.mul(2.0)).mul(0.5);
  const n3 = valueNoise(p.mul(4.0)).mul(0.25);
  return n1.add(n2).add(n3).mul(0.571); // normalise to [0, 1]
});

const causticHeightFn = Fn(([sampleUV]: [Vec2Node]) => {
  const t = time.mul(uCausticSpeed);
  const p = sampleUV.mul(uCausticScale);

  // Domain warp destroys the grid structure of valueNoise → flowing forms
  const warpX = fbm(p.add(vec2(t, float(0.0))));
  const warpY = fbm(p.add(vec2(float(0.0), t.mul(0.8))));
  const warped = p.add(vec2(warpX, warpY).mul(1.5)).add(vec2(t.mul(0.3), t.mul(-0.2)));

  return fbm(warped);
});

/* Dark video pixels (leaf silhouettes) → shadow = 1. Bright pixels → 0.
 * Sampled at an arbitrary UV so the refraction pass can displace it. */
const shadowMaskFn = Fn(([sampleUV]: [Vec2Node]) => {
  // Video texture is Y-flipped relative to canvas UV convention
  const flipped = vec2(sampleUV.x, float(1.0).sub(sampleUV.y));
  // TSL clones with referenceNode so `.value =` swaps still apply to this sample
  const videoRgb = texture(videoTexNode!, flipped).rgb;
  const luma = dot(videoRgb, vec3(0.2126, 0.7152, 0.0722));
  return smoothstep(
    uShadowThreshold.sub(uShadowSoftness),
    uShadowThreshold.add(uShadowSoftness),
    float(1.0).sub(luma),
  );
});

function resize(): void {
  if (!canvas || !renderer) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
}

const VIDEO_UPDATE_INTERVAL = 1000 / 15;

function tick(_timestamp: number): void {
  if (!renderer || !scene || !camera) return;

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
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
  uProgress.value = state.progress;
  uSunX.value = state.mouseX;
  uSunY.value = state.mouseY;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/** Dev/tweakpane: override progress directly (bypasses scroll state). */
export function setProgress(v: number): void {
  state.progress = v;
  ensureLoop();
}

async function initRenderer(): Promise<boolean> {
  if (!canvas) return false;

  renderer = new THREE.WebGPURenderer({ canvas, alpha: true, antialias: false });

  try {
    await renderer.init();
  } catch {
    console.warn('FooterShaders: WebGPU init failed');
    return false;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // Placeholder 1×1 canvas texture for videoTexNode until the video plays.
  // Must have pixel data — empty canvas → CopyExternalImageToTexture error on WebGPU.
  if (!placeholderTex) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    c.getContext('2d')!.fillRect(0, 0, 1, 1);
    placeholderTex = new THREE.CanvasTexture(c);
    placeholderTex.colorSpace = THREE.SRGBColorSpace;
  }

  // Build the base TextureNode once with no UV. Samples elsewhere use
  // texture(videoTexNode, customUV) which clones with a referenceNode —
  // so swapping `.value` to the real VideoTexture still updates every sample.
  videoTexNode = texture(placeholderTex);

  const geo = new THREE.PlaneGeometry(2, 2);
  material = new THREE.MeshBasicNodeMaterial();

  // Warm shadow tint — deep burnt umber reads as shade without going cold.
  // A blue-grey here pulls the whole palette away from the brand's warmth.
  const shadowTint = color(0x5a2818);
  // Warm specular tint — sunlight glint on caustic peaks
  const specTint = color(0xfff4d8);

  /* Treat the caustic field as a height map. Sample it at four neighbouring
   * points; central differences give a surface normal. From that normal:
   *
   *  1. Refraction — n.xy displaces where we sample the gradient and shadow
   *     mask, so the underlying image distorts around caustic regions.
   *  2. Diffuse — n · sunDir, centred above 1.0 so slopes facing the sun
   *     brighten the gradient rather than only shading darker.
   *  3. Specular — pow(n · sunDir, hard) weighted by |∇h|², so only steep
   *     slopes facing the sun sparkle. Tied to sun direction → moves with mouse.
   *
   * One field drives the whole composite, no layer-on-layer fighting. */
  const finalColorFn = Fn(() => {
    const baseUV = uv();

    // Finite-difference epsilon. fBm at modest scale has slopes ~0.1/unit-UV,
    // so we need enough separation to see a meaningful difference.
    const eps = float(0.008);

    // Four-tap central differences give symmetric normals with no bias.
    const hL = causticHeightFn(baseUV.sub(vec2(eps, float(0.0))));
    const hR = causticHeightFn(baseUV.add(vec2(eps, float(0.0))));
    const hD = causticHeightFn(baseUV.sub(vec2(float(0.0), eps)));
    const hU = causticHeightFn(baseUV.add(vec2(float(0.0), eps)));

    // Gradient in UV space — slopes of the height field
    const dhdx = hR.sub(hL).mul(uCausticHeight);
    const dhdy = hU.sub(hD).mul(uCausticHeight);

    // Surface normal. Smaller z = more dramatic tilts → stronger lighting response.
    const n = normalize(vec3(dhdx.negate(), dhdy.negate(), float(0.04)));

    // Caustic brightness = |∇h|². Bright where the surface is steep, which
    // is where refracted light physically concentrates. Smooth falloff.
    const slopeSq = dhdx.mul(dhdx).add(dhdy.mul(dhdy));
    const causticBright = clamp(slopeSq.mul(8.0), float(0.0), float(1.0)).pow(uCausticSharpness);

    // Refraction — tilt direction offsets where we sample the underlying image
    const refractOffset = n.xy.mul(uRefraction);
    const refractedUV = baseUV.add(refractOffset);

    const grad = gradientFn(refractedUV);
    const shadow = shadowMaskFn(refractedUV);

    // Sun direction — horizontal tracks mouseX, vertical tilts with mouseY
    // in a narrow [0.35, 0.65] range so the light "breathes" as the cursor
    // moves without ever looking like a control surface.
    const sunDir = normalize(vec3(uSunX.mul(2.0).sub(1.0), uSunY.mul(0.3).add(0.35), float(0.7)));

    // Diffuse lighting — centred above 1.0 so lit slopes *brighten* the
    // underlying gradient (range [0.75..1.25]). A symmetric [0.5..1.0]
    // half-lambert darkens more than it lights, which fights the brand palette.
    const nDotL = max(dot(n, sunDir), float(0.0));
    const diffuse = nDotL.mul(0.5).add(0.75);

    // Specular — tight highlight on slopes facing the sun, gated by caustic brightness
    const spec = pow(nDotL, uSpecSharp).mul(causticBright).mul(uSpecStrength);

    // Base lit surface — gradient modulated by diffuse, with warm caustic glow
    // added where |∇h| is high. Specular is the bright glint.
    const causticGlow = specTint.mul(causticBright).mul(0.55);
    const lit = grad.mul(diffuse).add(causticGlow).add(specTint.mul(spec));

    // Shadow overlay — warm burnt umber where leaves block the sun
    const shaded = mix(lit, shadowTint, shadow.mul(uShadowAlpha));

    // Progress fades in from the flat un-refracted gradient
    const flatGrad = gradientFn(baseUV);
    return mix(flatGrad, shaded, clamp(uProgress.mul(1.2), float(0.0), float(1.0)));
  });

  // Alpha = 1: the canvas is always opaque. Progress only drives the composite
  // fade inside finalColorFn — easier to diagnose scroll pipeline issues.
  material.colorNode = vec4(finalColorFn(), float(1.0));
  material.transparent = false;
  quad = new THREE.Mesh(geo, material);
  scene.add(quad);

  return true;
}

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

  const onReady = () => {
    if (!videoEl || !videoTexNode) return;
    videoReady = true;
    videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexNode.value = videoTexture;
    ensureLoop();
  };

  videoEl.addEventListener('playing', onReady, { once: true });
  videoEl.addEventListener('canplay', onReady, { once: true });
}

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
  // Longer duration on Y — vertical cursor motion is usually incidental, so
  // a lazier lag makes the sun feel like it's drifting rather than tracking.
  mouseQuickToY = gsap.quickTo(state, 'mouseY', { ...quickOpts, duration: 0.9 });

  const footer = document.querySelector('[data-footer]') as HTMLElement | null;
  mouseHandler = (e: MouseEvent) => {
    mouseQuickToX!(e.clientX / window.innerWidth);
    if (footer) {
      const rect = footer.getBoundingClientRect();
      mouseQuickToY!(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
    }
  };
  window.addEventListener('mousemove', mouseHandler, { passive: true });

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
        start: 'top 85%',
        end: 'bottom 50%',
        scrub: 1,
      },
    });
  });
}

export function destroyFooterShaders(): void {
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
  if (videoTexNode && placeholderTex) videoTexNode.value = placeholderTex;
  videoTexNode = null;
  videoReady = false;
  lastVideoUpdate = 0;

  state.progress = 0;
  state.mouseX = 0.34;
  state.mouseY = 0.5;
}
