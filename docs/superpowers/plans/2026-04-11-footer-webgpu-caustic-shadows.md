# Footer WebGPU Caustic Shadows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-canvas footer pipeline (Canvas2D haze + WebGL1 shadows) with a single Three.js WebGPU canvas that renders gradient background, caustic light, and palm shadow silhouettes in one TSL pass.

**Architecture:** One `MeshBasicNodeMaterial` with a custom `colorNode` composing three TSL layers — vertical gradient base, three-octave caustic interference pattern, and video-sourced luminance shadow mask. GSAP drives scroll progress and mouse uniforms exactly as before.

**Tech Stack:** Three.js (three/webgpu + three/tsl), GSAP ScrollTrigger, Astro, TypeScript

---

## File Map

| Action  | File                                 | Responsibility                        |
| ------- | ------------------------------------ | ------------------------------------- |
| Install | `package.json`                       | Add `three` dependency                |
| Delete  | `src/lib/footer-haze.ts`             | Removed entirely                      |
| Delete  | `src/components/FooterHaze.astro`    | Removed entirely                      |
| Replace | `src/lib/footer-shadows.ts`          | Full WebGPU/TSL implementation        |
| Edit    | `src/components/FooterShadows.astro` | Remove multiply blend mode            |
| Edit    | `src/components/Footer.astro`        | Remove `<FooterHaze />` import/usage  |
| Edit    | `src/layouts/BaseLayout.astro`       | Remove haze init/destroy script block |

---

## Task 1: Install Three.js

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install three**

```bash
npm install three
```

Expected output: `added N packages` with `three` in `node_modules`.

- [ ] **Step 2: Verify types resolve**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about `three` not found. (Some TSL types may warn — acceptable at this stage.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add three.js dependency for WebGPU footer"
```

---

## Task 2: Remove footer-haze files

**Files:**

- Delete: `src/lib/footer-haze.ts`
- Delete: `src/components/FooterHaze.astro`

- [ ] **Step 1: Delete both files**

```bash
rm src/lib/footer-haze.ts
rm src/components/FooterHaze.astro
```

- [ ] **Step 2: Remove FooterHaze from Footer.astro**

In `src/components/Footer.astro`, remove:

- The import line: `import FooterHaze from '@components/FooterHaze.astro';`
- The component usage: `<FooterHaze />`

The file should import only `FooterShadows` after this change:

```astro
---
import FooterShadows from '@components/FooterShadows.astro';
// ... rest of frontmatter unchanged
---
```

- [ ] **Step 3: Remove haze script block from BaseLayout.astro**

In `src/layouts/BaseLayout.astro`, find and delete this entire `<script>` block:

```astro
<!-- Footer haze gradient -->
<script>
  import { initFooterHaze, destroyFooterHaze } from '@lib/footer-haze';

  document.addEventListener('astro:page-load', initFooterHaze);
  document.addEventListener('astro:before-swap', destroyFooterHaze);
</script>
```

Note: If this block does not exist verbatim (the pull added it conditionally), search `BaseLayout.astro` for any reference to `footer-haze` and remove it.

- [ ] **Step 4: Verify build compiles**

```bash
npm run check
```

Expected: no errors referencing `footer-haze` or `FooterHaze`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.astro src/layouts/BaseLayout.astro
git commit -m "refactor: remove footer haze canvas — replaced by WebGPU shader"
```

---

## Task 3: Stub the new footer-shadows module

**Files:**

- Replace: `src/lib/footer-shadows.ts`

This task replaces the entire file with the module skeleton — state, types, public API stubs, and the resize/destroy boilerplate. No rendering yet.

- [ ] **Step 1: Replace src/lib/footer-shadows.ts with the skeleton**

```typescript
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

/* ── Public API (stubs — renderer init in Task 4) ── */

export async function initFooterShadows(): Promise<void> {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-shadows]');
  if (!canvas) return;
  // Full init wired in Task 4
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
```

- [ ] **Step 2: Update BaseLayout.astro to use async init**

The `initFooterShadows` function is now `async`. The script block in `BaseLayout.astro` calls it — it doesn't need to await, but the call is fine as-is since event listeners don't need await. No change required to `BaseLayout.astro` for this step.

- [ ] **Step 3: Verify build**

```bash
npm run check
```

Expected: no type errors on the new skeleton. Ignore any `three/webgpu` type warnings — they're acceptable.

- [ ] **Step 4: Commit**

```bash
git add src/lib/footer-shadows.ts
git commit -m "refactor: stub WebGPU footer-shadows module (shell only, no render yet)"
```

---

## Task 4: Init Three.js WebGPU renderer and scene

**Files:**

- Modify: `src/lib/footer-shadows.ts`

Wire up the renderer, orthographic camera, and fullscreen quad. No material yet — quad renders black. Confirms WebGPU boots.

- [ ] **Step 1: Add initRenderer function and call it from initFooterShadows**

Replace the `initFooterShadows` stub with the full version, and add the `initRenderer` and render loop functions:

```typescript
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
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev
```

Open browser, scroll to footer. Expected: black canvas where footer background was (renderer booted, no material yet). No console errors about WebGPU.

- [ ] **Step 3: Commit**

```bash
git add src/lib/footer-shadows.ts
git commit -m "feat: boot Three.js WebGPU renderer for footer canvas"
```

---

## Task 5: TSL gradient background layer

**Files:**

- Modify: `src/lib/footer-shadows.ts`

Add the vertical gradient as the base `colorNode`. Canvas should show warm parchment → peach-orange gradient on scroll reveal.

- [ ] **Step 1: Add TSL imports at top of file**

Add after the existing imports:

```typescript
import { uniform, vec2, vec4, float, mix, uv, color, Fn } from 'three/tsl';
```

- [ ] **Step 2: Add uniforms below the state block**

```typescript
/* ── TSL Uniforms ── */
const uProgress = uniform(0);
const uMouse = uniform(new THREE.Vector2(0.5, 0.5));
const uTime = uniform(0);
```

- [ ] **Step 3: Add gradient Fn after uniforms**

```typescript
/* ── TSL: Background gradient ── */
const gradientFn = Fn(() => {
  const bgTop = color(0xf9efe6); // warm parchment — matches --color-background
  const bgBottom = color(0xd95f2a); // deep sunset orange
  // uv().y = 0 at bottom, 1 at top in Three.js
  return mix(bgBottom, bgTop, uv().y);
});
```

- [ ] **Step 4: Wire colorNode in initRenderer after material creation**

Find `material = new THREE.MeshBasicNodeMaterial();` and add below it:

```typescript
material.colorNode = vec4(gradientFn(), uProgress);
material.transparent = true;
```

- [ ] **Step 5: Sync uProgress from state in ensureLoop**

Replace the `ensureLoop` function:

```typescript
function ensureLoop(): void {
  uProgress.value = state.progress;
  uMouse.value.set(state.mouseX, state.mouseY);
  if (!rafId) rafId = requestAnimationFrame(tick);
}
```

- [ ] **Step 6: Update tick to advance uTime**

Replace the `tick` function:

```typescript
let lastTime = 0;

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
```

- [ ] **Step 7: Verify gradient renders**

```bash
npm run dev
```

Scroll to footer. Expected: warm parchment-to-orange gradient fades in as footer reveals. No errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/footer-shadows.ts
git commit -m "feat: TSL gradient background layer in footer WebGPU canvas"
```

---

## Task 6: TSL caustic light layer

**Files:**

- Modify: `src/lib/footer-shadows.ts`

Three-octave sin interference caustics layered over the gradient. Only the `colorNode` composition changes — no new state.

- [ ] **Step 1: Add additional TSL imports**

Extend the existing TSL import line to include:

```typescript
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
```

- [ ] **Step 2: Add causticFn and causticColorFn at module scope, after gradientFn**

Both `Fn` nodes must be at module scope — `causticColorFn` is referenced in Task 7's `finalColorFn`.

```typescript
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
```

- [ ] **Step 3: Update colorNode in initRenderer to composite gradient + caustics**

Replace the `material.colorNode` line:

```typescript
material.colorNode = vec4(gradientFn().add(causticColorFn()), uProgress);
material.transparent = true;
```

- [ ] **Step 4: Verify caustics render**

```bash
npm run dev
```

Scroll to footer. Expected: animated bright patches of warm light moving slowly over the gradient. Should feel like interior light through water glass — slow, organic, not strobing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/footer-shadows.ts
git commit -m "feat: TSL three-octave caustic light layer in footer"
```

---

## Task 7: TSL video shadow mask layer

**Files:**

- Modify: `src/lib/footer-shadows.ts`
- Modify: `src/components/FooterShadows.astro`

Add video texture, luminance threshold shadow mask, composite all three layers.

- [ ] **Step 1: Add texture import**

Add `texture` to the TSL import line:

```typescript
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
  texture,
} from 'three/tsl';
```

- [ ] **Step 2: Add video uniform below the other uniforms**

```typescript
// Video texture uniform — placeholder 1×1 transparent until video loads
const placeholderTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
placeholderTex.needsUpdate = true;
const uVideoTex = uniform(placeholderTex);
```

- [ ] **Step 3: Add shadowMaskFn after causticFn**

```typescript
/* ── TSL: Shadow mask ── */
const THRESHOLD = 0.25;
const SOFTNESS = 0.5;

const shadowMaskFn = Fn(() => {
  // Flip Y — video top-down, UV bottom-up
  const flippedUv = vec2(uv().x, float(1.0).sub(uv().y));
  const texel = texture(uVideoTex, flippedUv);

  // Luminance (Rec. 709)
  const luma = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));

  // Soft threshold — dark areas become shadow (1), light areas become 0
  return float(1.0).sub(smoothstep(float(THRESHOLD - SOFTNESS), float(THRESHOLD + SOFTNESS), luma));
});
```

- [ ] **Step 4: Update colorNode to composite all three layers**

Replace the `material.colorNode` block in `initRenderer`:

```typescript
const shadowColor = color(0x2a1a0a);
const shadowAlpha = 0.32;

const finalColorFn = Fn(() => {
  const bg = gradientFn();
  const shadow = shadowMaskFn();
  const caustic = causticColorFn().mul(float(1.0).sub(shadow)); // caustics suppressed by shadow
  const shadowC = shadowColor.mul(shadow).mul(shadowAlpha);
  return bg.add(caustic).add(shadowC);
});

material.colorNode = vec4(finalColorFn(), uProgress);
material.transparent = true;
```

- [ ] **Step 5: Add video loading logic**

Add this function before `initFooterShadows`:

```typescript
/* ── Video loading ── */

const VIDEO_UPDATE_INTERVAL = 1000 / 15;
let lastVideoUpdate = 0;
let videoReady = false;

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
          videoReady = true;
        });
        ioObserver!.disconnect();
        ioObserver = null;
      }
    },
    { rootMargin: '200px 0px' },
  );
  ioObserver.observe(footer);

  const onReady = () => {
    videoReady = true;
    videoTexture = new THREE.VideoTexture(videoEl!);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    uVideoTex.value = videoTexture;
    ensureLoop();
  };

  videoEl.addEventListener('playing', onReady, { once: true });
  videoEl.addEventListener('canplay', onReady, { once: true });
}
```

- [ ] **Step 6: Add video texture update to tick**

In the `tick` function, add video update before `renderer.renderAsync`:

```typescript
function tick(timestamp: number): void {
  if (!renderer || !scene || !camera) return;

  const delta = lastTime ? (timestamp - lastTime) / 1000 : 0;
  lastTime = timestamp;
  uTime.value += delta * 0.1;

  // Upload video texture at capped rate
  if (videoReady && videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
    const now = performance.now();
    if (now - lastVideoUpdate > VIDEO_UPDATE_INTERVAL) {
      if (videoTexture) videoTexture.needsUpdate = true;
      lastVideoUpdate = now;
    }
  }

  renderer.renderAsync(scene, camera);

  if (state.progress <= 0 && !videoReady) {
    rafId = 0;
    lastTime = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}
```

- [ ] **Step 7: Call initVideo from initFooterShadows**

Add `initVideo();` after `ro.observe(canvas);` in `initFooterShadows`.

- [ ] **Step 8: Add videoTexture dispose to destroyFooterShadows**

In `destroyFooterShadows`, after `renderer?.dispose();`, add:

```typescript
videoTexture?.dispose();
videoTexture = null;
videoReady = false;
lastVideoUpdate = 0;
```

- [ ] **Step 9: Remove mix-blend-mode from FooterShadows.astro**

In `src/components/FooterShadows.astro`, remove `mix-blend-mode: multiply;` from `.footer-shadows` styles:

```astro
<style>
  .footer-shadows__video {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  }

  .footer-shadows {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 10: Verify full effect**

```bash
npm run dev
```

Scroll to footer. Expected:

- Gradient background fades in on scroll reveal
- Caustic light patches animate over gradient
- Once video loads, palm shadow silhouettes appear (dark warm patches, caustics suppressed within them)
- Mouse movement subtly shifts caustic origin
- No `mix-blend-mode` compositing required

- [ ] **Step 11: Commit**

```bash
git add src/lib/footer-shadows.ts src/components/FooterShadows.astro
git commit -m "feat: TSL shadow mask layer — complete three-layer WebGPU footer"
```

---

## Task 8: Cleanup and resize fix

**Files:**

- Modify: `src/lib/footer-shadows.ts`

The PlaneGeometry is sized to the initial viewport. On resize, the geometry needs updating or the camera frustum mismatch leaves black bars.

- [ ] **Step 1: Store mesh reference and update resize to rebuild geometry**

Add at module scope:

```typescript
let quad: THREE.Mesh | null = null;
```

In `initRenderer`, change:

```typescript
const geo = new THREE.PlaneGeometry(w, h);
material = new THREE.MeshBasicNodeMaterial();
// ... colorNode setup ...
quad = new THREE.Mesh(geo, material);
scene.add(quad);
```

Update the `resize` function:

```typescript
function resize(): void {
  if (!canvas || !renderer || !camera || !quad) return;
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
  // Rebuild geometry to match new frustum size
  quad.geometry.dispose();
  quad.geometry = new THREE.PlaneGeometry(w, h);
  ensureLoop();
}
```

- [ ] **Step 2: Add quad cleanup to destroyFooterShadows**

After `renderer?.dispose();`:

```typescript
quad?.geometry.dispose();
quad = null;
```

- [ ] **Step 3: Verify resize**

In dev server: resize the browser window. Footer should fill edge-to-edge without black bars or clipping at any viewport width.

- [ ] **Step 4: Commit**

```bash
git add src/lib/footer-shadows.ts
git commit -m "fix: footer WebGPU canvas resize — rebuild PlaneGeometry on resize"
```

---

## Task 9: Final check and CSS cleanup

**Files:**

- Modify: `src/styles/global.css` (if footer has explicit background color)

- [ ] **Step 1: Check footer CSS for explicit background**

Search for any footer background color set in CSS:

```bash
grep -n "site-footer" src/styles/global.css | grep -i "background\|bg"
```

If a `background` or `background-color` is set on `.site-footer` or `.site-footer__inner`, remove it — the WebGPU canvas is now the background.

- [ ] **Step 2: Check footer content z-index**

The footer content (enquiry form, nav, wordmark) must sit above the canvas. In `global.css`, confirm `.site-footer__content` and `.site-footer__wordmark` have `position: relative` and/or `z-index: 1`. The canvas has `position: absolute; inset: 0` so stacking order is: canvas (bottom) → content (top).

- [ ] **Step 3: Run full build check**

```bash
npm run check && npm run build
```

Expected: clean build, no type errors, no dead imports.

- [ ] **Step 4: Smoke test in browser**

- Scroll to footer on homepage
- Gradient appears on reveal
- Caustics animate slowly (interior light feel, not rapid flickering)
- Palm shadows overlay when video loads (requires `public/video/leaf-shadows.webm`)
- Mouse movement has subtle effect on caustic origin
- Resize window — canvas fills edge-to-edge
- Navigate to another page and back — no console errors (destroy/init lifecycle works)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: footer WebGPU caustic shadows — complete implementation"
```
