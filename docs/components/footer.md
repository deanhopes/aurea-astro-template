# Footer

The footer is a fixed-position element that reveals as you scroll off the main content — the page slides up to expose it, like lifting a sheet of paper. Behind the content sits a live Three.js WebGPU canvas: a warm gradient, a caustic light interference pattern, and a palm-leaf shadow mask driven by video, all composited in a single shader pass.

This is the heaviest component in the template. It's also the most educational — it demonstrates WebGPU + TSL node graphs, OffscreenCanvas worker offloading, adaptive quality scaling, and visibility gating, in under 700 lines of TypeScript.

---

## Files

```
src/components/Footer.astro              # HTML structure + data
src/components/FooterShadows.astro       # Canvas element + CSS fallback
src/lib/footer-shaders.ts               # Main-thread orchestrator
src/lib/footer-shaders.worker.ts        # Worker — owns the WebGPU renderer
src/lib/footer-shaders-scene.ts         # Three.js scene + TSL node graph
src/styles/components/site-footer.css   # Layout, typography, fixed-reveal
src/styles/components/footer-shadows.css # CSS gradient fallback
```

---

## Mental model

### The fixed-reveal trick

The footer doesn't scroll — the page above it does. The CSS that makes this work:

```css
/* main content pushes itself above the footer */
#main-content {
  position: relative;
  z-index: 1;
  margin-bottom: 100dvh;
}

/* footer sits fixed underneath */
.site-footer {
  position: fixed;
  bottom: 0;
  z-index: -1;
  width: 100%;
  height: 100dvh;
}
```

As the user scrolls past the last section, `#main-content` slides up to reveal the footer underneath. No JavaScript needed for this effect — it's pure CSS stacking.

### Three layers in one shader pass

Inside `.site-footer__inner`, there are two children:

1. **`<canvas>` (the background)** — a WebGPU canvas that fills the entire footer. It IS the background. No `z-index` trickery or `mix-blend-mode`. The canvas is opaque.
2. **`.site-footer__content` (`z-index: 1`)** — the address, nav links, and AUREA wordmark sit above the canvas.

The canvas renders three layers composited in a single TSL node graph (`footer-shaders-scene.ts`):

| Layer       | What it is                                                           | Driven by                       |
| ----------- | -------------------------------------------------------------------- | ------------------------------- |
| Gradient    | Warm parchment `#f9efe6` → sunset orange `#d95f2a`, vertical         | `uv.y` (static)                 |
| Caustics    | Fractional Brownian Motion interference — light through water glass  | `uProgress` (scroll) + `uMouse` |
| Shadow mask | Palm leaf silhouettes — video frames decoded via luminance threshold | `[data-footer-shadows-video]`   |

All three are multiplied together in the TSL graph. One render call per frame.

### Worker vs main thread

The renderer lives in a Web Worker. The canvas control is transferred to the worker via `transferControlToOffscreen()` — after that, the main thread can't touch the canvas pixels. All rendering happens off the main thread.

Main thread responsibilities:

- Scroll progress → `uProgress` (GSAP ScrollTrigger)
- Mouse position → `uMouse` (GSAP `quickTo`)
- Video frames → `ImageBitmap` pumped at 15fps via `setInterval`
- Resize → `ResizeObserver` posting dimensions to worker

If `OffscreenCanvas` isn't available (rare, old browsers), it falls back to main-thread rendering automatically — same visual output, slightly more main-thread budget.

### Adaptive quality

The shader starts at quality 0 (2-octave fbm, DPR 1). After 60 rendered frames, it measures the actual fps. If the GPU is holding 55+, it promotes to quality 1 (3-octave fbm) by setting `uQuality = 1` — the third octave is multiplied by `uQuality` in the node graph, so it blends in rather than switching hard. If fps drops below 40 after promotion, it demotes back.

```
Quality 0: 2 octaves × 3 fbm calls × 5 height samples = 30 noise evals/pixel
Quality 1: 3 octaves × 3 fbm calls × 5 height samples = 45 noise evals/pixel
```

Before mobile or touch devices even get this far, `bootstrap.ts` gates them out entirely — `canRunShaders()` returns false for `pointer: coarse`, and the CSS gradient fallback activates instead.

---

## Annotated key code

### The TSL node graph (simplified)

```ts
// footer-shaders-scene.ts
const gradient = mix(colorA, colorB, uv.y);

const caustic = fbm(uv.add(uMouse).add(uProgress));

const shadowLuminance = videoTexNode.sample(uv).r;
const shadowMask = step(uShadowThreshold, shadowLuminance);

const composite = gradient.mul(caustic).mul(shadowMask);
material.colorNode = composite;
```

TSL (Three.js Shading Language) is a node-based shader builder — you compose nodes rather than writing GLSL. `mul()`, `add()`, `step()` are node operations. The graph compiles to WGSL at init time.

### Visibility gating

```ts
// footer-shaders.ts
visibilityObserver = new IntersectionObserver(
  (entries) => {
    footerVisible = !!entries[0]?.isIntersecting;
    if (worker) {
      postWorker({ type: 'visibility', visible: footerVisible });
    }
  },
  { rootMargin: '100px 0px' },
);
```

The worker stops its render loop when `visible: false`. Without this, the shader ran permanently from idle-load onward, burning GPU even when the user was at the top of the page.

### Video frame pump

```ts
videoPumpTimer = setInterval(() => {
  if (!videoEl || videoEl.readyState < videoEl.HAVE_CURRENT_DATA) return;
  createImageBitmap(videoEl).then((bitmap) => {
    postWorker({ type: 'videoFrame', bitmap }, [bitmap]);
  });
}, 1000 / 15); // 15fps cap
```

`createImageBitmap` decodes the current video frame off the main thread. The bitmap is transferred (not copied) to the worker, which uploads it as a texture. Capped at 15fps — shadow silhouettes don't need more.

---

## What to change

**Swap the video shadow:** Replace `public/video/leaf-shadows.webm` (and `.mp4` fallback). Aim for 360p, 6–8s seamless loop, <500KB WebM. High-contrast subjects (dark silhouettes on light background) work best — the shader thresholds on luminance.

**Remove the shader entirely:** In `Footer.astro`, delete `<FooterShadows />`. The footer still renders with the CSS gradient fallback from `footer-shadows.css`. No JS loaded, no performance cost.

**Change the gradient colours:** In `footer-shaders-scene.ts`, find `colorA` and `colorB` (parchment and sunset orange). Change them. If you remove shaders but keep the footer, update the equivalent stops in `footer-shadows.css` to match.

**Change footer links:** Data lives in `src/data/site.ts` → `footerLinkGroups`. Array of arrays — each inner array is a column of links.

**Change contact info:** Same file — `contact.address`, `contact.phone`, `contact.mapUrl`.

**Adjust scroll trigger timing:** In `footer-shaders.ts` → `setupScrollTrigger()`, the `start` and `end` values control when `uProgress` animates from 0 to 1. `start: 'top 85%'` means caustics start animating when the footer trigger is 85% from the top of the viewport.

**Adjust wordmark position:** `uWordmarkX` and `uWordmarkY` in `footer-shaders-scene.ts` control the wordmark offset (UV space, 0–1). Current values: `x: 0.010`, `y: 0.05`. Positive X shifts right, negative shifts left. To dial these in visually, uncomment the Tweakpane block in `bootstrap.ts`:

```ts
// src/lib/bootstrap.ts — inside loadFooterShaders(), after initFooterShaders()
if (import.meta.env.DEV) {
  const { initFooterDebug } = await import('./footer-debug');
  initFooterDebug();
}
```

The panel appears top-right in dev. Re-comment when done and copy the final values back to `footer-shaders-scene.ts`.

---

## Gotchas

- **Don't set DPR above 1 for the canvas.** The shader is expensive. DPR 2 on retina with 3-octave fbm was ~5× the cost of the current setup. It's hardcoded to 1 intentionally.
- **`transferControlToOffscreen` is one-way.** Once transferred, the main thread can't read or write canvas pixels. All canvas operations must go through the worker message protocol.
- **Lenis doesn't affect ScrollTrigger here.** GSAP ScrollTrigger reads scroll position from the native scroll events. Lenis and ScrollTrigger are wired together in `lenis.ts` via `ScrollTrigger.update()` — if you break that bridge, the progress uniform stops updating.
- **CSS gradient fallback must match the shader colours.** If the shader fails to init (WebGPU unsupported, mobile, `?noshaders`), the CSS gradient in `footer-shadows.css` shows instead. Keep them in sync.
- **ResizeObserver must be disconnected on destroy.** `destroyFooterShaders()` handles this. If you add new observers, add them to the destroy function — otherwise you'll leak on Astro page transitions.
