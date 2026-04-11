# Footer WebGPU Caustic Shadows — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Replace the two-canvas footer rendering pipeline (Canvas2D haze + WebGL1 shadow) with a single Three.js WebGPU canvas using TSL. The new canvas is the footer background — it renders the gradient, caustic light, and shadow silhouettes in one pass. No separate haze canvas. No CSS background needed.

---

## What Gets Removed

- `src/lib/footer-haze.ts` — deleted
- `src/components/FooterHaze.astro` — deleted
- `<FooterHaze />` in `Footer.astro` — removed
- Haze init/destroy calls in `BaseLayout.astro` — removed
- `mix-blend-mode: multiply` on the shadow canvas — removed (canvas is now opaque background)

---

## Single Canvas Architecture

One `<canvas data-footer-shadows>` fills the footer. Rendered by a Three.js WebGPU renderer with an orthographic camera and a fullscreen quad (`PlaneGeometry` sized to viewport). Material: `MeshBasicNodeMaterial` with a custom `colorNode` built entirely in TSL.

DPR capped at 2. ResizeObserver handles canvas sizing. Scroll progress and mouse position flow in as uniforms via GSAP (same pattern as current).

---

## TSL colorNode — Three Layers

### Layer 1: Background Gradient

Vertical gradient driven by `uv.y`. Top of footer is warm parchment, bottom is deep peach-orange.

```js
const bgTop = color('#f9efe6'); // matches --color-background token
const bgBottom = color('#d95f2a'); // deep sunset orange at footer base
const bg = mix(bgBottom, bgTop, uv.y);
```

Scroll `progress` uniform fades the whole canvas in from transparent (same reveal as current).

### Layer 2: Caustic Light

Three-octave interference pattern simulating interior light through water glass. Each octave: offset UV rotated to a different angle, animated by `time` at a slow speed (0.08–0.12 units/sec). Octaves summed, normalized, and `smoothstep`-ed to a 0–1 scalar.

```js
const causticIntensity = causticFn(uv, time); // Fn() — three octave sin interference
const causticColor = mix(color('#fff5e0'), color('#ffd97a'), causticIntensity);
```

Caustics only render in non-shadow areas: multiplied by `(1 - shadowMask)`. Intensity peaks at `progress ~0.7`, then holds — they're present but not overwhelming at full reveal.

Mouse uniform (`uMouse.x`, `uMouse.y`) shifts the caustic UV origin slightly — subtle, ~0.04 units influence. GSAP `quickTo` with 0.6s duration.

### Layer 3: Shadow Mask

Same approach as current WebGL1 shader:

- Video texture (`leaf-shadows.webm` / `.mp4`) sampled via `texture(videoTex, flippedUv)`
- Luminance (Rec. 709 weights)
- `smoothstep` threshold → `shadowMask` scalar (0 = lit, 1 = full shadow)
- Shadow color: `#2a1a0a` at `alphaMax ~0.32` — warm dark brown, not black

Shadow areas suppress caustics. Caustic areas suppress shadow render (they're mutually exclusive by physics).

### Composite

```
colorNode = (bg + causticColor * causticIntensity * (1.0 - shadowMask) + shadowColor * shadowMask) * progress
```

Single alpha output. Canvas has no CSS blend mode — it is the background.

---

## Uniforms

| Uniform      | Type    | Source                          |
| ------------ | ------- | ------------------------------- |
| `uProgress`  | float   | GSAP ScrollTrigger scrub        |
| `uTime`      | float   | `renderer` clock / frame delta  |
| `uMouse`     | vec2    | GSAP `quickTo` on `mousemove`   |
| `uThreshold` | float   | static param + mouse offset     |
| `uSoftness`  | float   | static param                    |
| `uVideo`     | texture | `VideoTexture`, uploaded ~15fps |

---

## Video Loading

Unchanged from current:

- `<video data-footer-shadows-video>` hidden in DOM, `preload="none"`
- `IntersectionObserver` with 200px rootMargin triggers `.load()` + `.play()`
- Graceful fallback: transparent if video unavailable (shadow mask = 0, caustics + bg still render)
- Texture upload capped at 15fps via timestamp check

---

## Scroll & Animation

- GSAP ScrollTrigger on `[data-footer-trigger]`
- `start: 'top 130%'`, `end: 'bottom 40%'`, `scrub: 1`
- Drives `uProgress` 0→1
- `prefers-reduced-motion`: skip scroll animation, set `uProgress = 1` immediately

---

## Destroy / Cleanup

- `cancelAnimationFrame`
- `ResizeObserver.disconnect()`
- `IntersectionObserver.disconnect()`
- GSAP context revert
- `mousemove` listener removal
- `renderer.dispose()` + `renderer.domElement` removal
- Video pause + src clear

---

## Files Changed

| Action  | File                                 |
| ------- | ------------------------------------ |
| Delete  | `src/lib/footer-haze.ts`             |
| Delete  | `src/components/FooterHaze.astro`    |
| Replace | `src/lib/footer-shadows.ts`          |
| Edit    | `src/components/FooterShadows.astro` |
| Edit    | `src/components/Footer.astro`        |
| Edit    | `src/layouts/BaseLayout.astro`       |

---

## Dependencies

Three.js is **not yet installed** — `npm install three` required before implementation. Import from `three/webgpu` and `three/tsl`.
