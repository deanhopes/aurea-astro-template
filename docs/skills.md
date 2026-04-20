# Skills & Techniques

A map of every non-trivial technique used to build this template. Each entry names the technique, where it lives in the codebase, and what to read if you want to understand it properly.

This is the learning layer — if you downloaded this to study how something is built, start here.

---

## CSS

### Fluid type + spacing with `clamp()`

Every font size and spacing token is a fluid `clamp()` value. No breakpoints needed for sizing — values interpolate smoothly between mobile and desktop anchors.

```css
--text-hero: clamp(4rem, 8vw + 1rem, 9rem); /* 64px → 144px */
--space-section: clamp(6rem, 10vw, 10rem);
```

**File:** `src/styles/tokens.css`

---

### CSS `@layer` cascade architecture

Styles are split across 7 named layers with an explicit order declaration. This makes specificity deterministic — a utility class in `layers utilities` always wins over a component style in `layer components`, regardless of selector complexity.

```css
/* global.css */
@layer reset, base, tokens, components, sections, utilities, overrides;

@import './base/reset.css' layer(reset);
@import './components/card.css' layer(components);
@import './utilities/text.css' layer(utilities);
```

**File:** `src/styles/global.css`, `src/styles/tokens.css`

---

### `color-mix()` as a palette system

Every tint, muted text colour, and semi-transparent border derives from the two base tokens via `color-mix()`. Changing `--color-black` or `--color-background` repaints every derived surface automatically.

```css
/* Instead of hardcoding rgba(50, 48, 50, 0.08) */
border: 1px solid color-mix(in srgb, var(--color-black) 8%, transparent);
```

**File:** `src/styles/tokens.css`, `src/styles/components/enquiry.css`  
**Doc:** `docs/ui-craft.md` → `color-mix() as the palette system`

---

### Fixed-reveal footer

The footer sits fixed at `z-index: -1` while the main content slides up over it. No JavaScript — pure CSS stacking. `margin-bottom: 100dvh` on `#main-content` reserves space so the user can scroll far enough to expose the footer.

**File:** `src/styles/components/site-footer.css`  
**Doc:** `docs/components/footer.md` → The fixed-reveal trick

---

### `content-visibility: auto` for rendering performance

Below-fold sections use `content-visibility: auto` to skip layout and paint until the browser needs them. Measurable improvement on long pages with heavy imagery.

**File:** `src/styles/sections/*.css` (applied to each section)

---

### Concentric border radii

When a rounded container holds a rounded child, inner radius = outer radius minus the gap. If the gap is larger than the outer radius, the inner element gets `border-radius: 0`. This is the detail that makes nested cards look considered rather than assembled.

**File:** `src/styles/components/card.css`  
**Doc:** `docs/codebase.md` → Border radius

---

## JavaScript / TypeScript

### Single bootstrap entry point

All client JS flows through `bootstrap.ts`. Heavy modules (footer shaders) are lazy-loaded via `import()` inside a `requestIdleCallback`. Lighter modules init synchronously on page load. This keeps the critical path clean and deferrable work genuinely deferred.

**File:** `src/lib/bootstrap.ts`

---

### GSAP ScrollTrigger pin-scroll with `containerAnimation`

The Vision section pins itself to the viewport and translates a horizontal track as the user scrolls. Nested animations (parallax, reveal) inside the horizontal scroll use `containerAnimation` — they measure progress within the horizontal tween, not page scroll.

```ts
const horizontalScroll = gsap.to(track, { x: ..., scrollTrigger: { pin: true, scrub: 1 } });

gsap.from(el, {
  scrollTrigger: {
    containerAnimation: horizontalScroll, // ← progress tracks horizontal position
    start: 'left 85%',
  },
});
```

**File:** `src/lib/vision-scroll.ts`  
**Doc:** `docs/components/vision.md`

---

### GSAP `matchMedia` for motion-safe, breakpoint-aware animations

The horizontal scroll only activates on desktop with `prefers-reduced-motion: no-preference`. GSAP's `matchMedia` scopes the entire animation context to a media query — no manual resize listeners or feature checks.

```ts
gsap.matchMedia().add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
  setupHorizontalScroll(section, track);
});
```

**File:** `src/lib/vision-scroll.ts`

---

### GSAP `context()` for clean teardown

All GSAP instances created inside `gsap.context()` are tracked. A single `.revert()` call kills every tween, ScrollTrigger, and matchMedia listener in scope. Essential for Astro's view transitions — without it, old page animations bleed into new pages.

**File:** `src/lib/vision-scroll.ts`, `src/lib/animations.ts`

---

### Custom GSAP Draggable slider with infinite wrap

The Lifestyle slider uses GSAP's `Draggable` + `InertiaPlugin` rather than a library slider. The track is doubled (DOM clones appended), and a `wrapX` function teleports the position when it drifts outside one period — imperceptibly, because the second set of slides is visually identical.

The snap function normalises the inertia throw's projected `endValue` into one canonical period before searching for the nearest slide, then re-adds the multi-period offset. This prevents the rubber-band bug where the snap target and the teleport destination disagree.

**File:** `src/lib/lifestyle-slider.ts`  
**Doc:** `docs/components/lifestyle-slider.md`

---

### IntersectionObserver for autoplay gating

The lifestyle slider's autoplay only runs when the section is in the viewport (`threshold: 0.3`). The first entry gets a 3-second delay before starting. This pattern — IntersectionObserver → delayed start → interval — is reused for the footer shader's visibility gating.

**File:** `src/lib/lifestyle-slider.ts`, `src/lib/footer-shaders.ts`

---

### Clone-at-edges infinite card slider

The residence card image sliders use a minimal infinite-wrap technique: clone the last slide to the front, clone the first to the back. Navigate to a clone, then silently teleport to the real counterpart. An `animating` boolean blocks re-entry during tweens.

```
[tailClone | slide0 | slide1 | slide2 | headClone]
```

**File:** `src/lib/card-slider.ts`  
**Doc:** `docs/components/residences.md` → Card slider

---

### Overlay system with `inert`

Overlays use the `inert` HTML attribute rather than `display: none` or `visibility: hidden`. `inert` removes the element from the tab order and accessibility tree while keeping it in the DOM for CSS transitions. Removing `inert` makes it keyboard and screen-reader accessible.

**File:** `src/lib/overlays.ts`, `src/components/Residences.astro`

---

### Lenis smooth scroll + GSAP ScrollTrigger integration

Lenis intercepts native scroll and emits smooth values. GSAP ScrollTrigger must be kept in sync via `ScrollTrigger.update()` on each Lenis frame — otherwise scroll-triggered animations lag behind smooth scroll position.

`data-lenis-prevent` on scrollable panels inside overlays tells Lenis to skip those elements, restoring native scroll inside the panel while the page scroll is locked.

**File:** `src/lib/lenis.ts`

---

## Three.js / WebGPU

### Three.js WebGPU + TSL node graph

The footer background is rendered by a Three.js WebGPU renderer using TSL (Three.js Shading Language) — a node-based shader builder that compiles to WGSL. Instead of writing GLSL, you compose node operations: `mix()`, `mul()`, `step()`, `fbm()`. The graph compiles once at init, then runs every frame.

Three layers composited in one pass: gradient → caustic fbm → video shadow mask.

**File:** `src/lib/footer-shaders-scene.ts`  
**Doc:** `docs/components/footer.md`

---

### OffscreenCanvas + Web Worker

The WebGPU renderer runs in a Web Worker. The canvas control is transferred to the worker via `canvas.transferControlToOffscreen()` — after that, only the worker can touch the canvas. Main thread sends uniform updates (scroll progress, mouse position, video frames) via `postMessage`. All rendering is off the main thread.

**File:** `src/lib/footer-shaders.ts`, `src/lib/footer-shaders.worker.ts`

---

### Adaptive quality via `uQuality` uniform

The shader starts at 2-octave fbm. After 60 frames it measures actual fps — if above 55, it promotes to 3-octave fbm by setting `uQuality = 1`. The third octave is multiplied by `uQuality` in the node graph, so it blends in rather than switching hard. If fps drops below 40, it demotes.

Mobile and touch devices are gated out entirely before the shader loads.

**File:** `src/lib/footer-shaders.ts` → `adaptiveQuality()`  
**Doc:** `docs/components/footer.md` → Adaptive quality

---

### Video frame pump to worker

A `setInterval` at 15fps decodes the current video frame with `createImageBitmap()` and transfers the resulting `ImageBitmap` to the worker. Transfer (not copy) — the main thread gives up ownership, zero serialisation overhead.

```ts
createImageBitmap(videoEl).then((bitmap) => {
  postWorker({ type: 'videoFrame', bitmap }, [bitmap]); // [bitmap] = transfer list
});
```

**File:** `src/lib/footer-shaders.ts` → `initVideo()`

---

## Astro

### Content collections

Residences and lifestyle slides are YAML files in `src/content/`. Astro validates them against a schema at build time — type errors fail the build, not production. The component queries the collection, sorts by `order`, and maps to HTML. Adding a residence means adding one YAML file.

**Files:** `src/content/residences/`, `src/content/lifestyle/`, `src/content.config.ts`  
**Doc:** `docs/components/residences.md` → Content schema

---

### Astro Image component

All images go through `<Image />` from `astro:assets`. It generates multiple sizes, converts to WebP, and emits `srcset` automatically. Images referenced in YAML files are resolved relative to the YAML file's location and processed the same way.

**Files:** `src/components/Vision.astro`, `src/components/Residences.astro`

---

### `data-reveal` scroll fade-up system

Elements with `data-reveal` start invisible (CSS sets `opacity: 0; transform: translateY(20px)`). An `IntersectionObserver` in `bootstrap.ts` adds `revealed` when they enter the viewport, triggering a CSS transition. No GSAP needed for standard reveals.

**File:** `src/lib/bootstrap.ts` → `initReveal()`, `src/styles/base/base.css`

---

### `requestIdleCallback` for deferred heavy modules

The footer shaders are loaded after the browser signals it's idle — not on page load. This keeps Time to Interactive fast even though the footer is the heaviest thing on the page.

```ts
const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1));
idle(() => void loadFooterShaders());
```

**File:** `src/lib/bootstrap.ts` → `scheduleFooterShaders()`
