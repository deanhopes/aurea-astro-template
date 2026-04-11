# Footer Shader Improvements — Design Spec

**Date:** 2026-04-11
**Branch:** worktree-footer-caustics-fix
**File:** `src/lib/footer-shaders.ts`

---

## Overview

Two improvements to the footer WebGPU/TSL shader:

1. **fBm caustics** — replace three sin-wave octaves with fractal Brownian motion for organic, deep-water light pools
2. **Radial bloom gradient** — replace flat linear gradient with a progress-driven vertical cone bloom in Aurea palette colours

Compositing layer order and all public API (uniforms, `initFooterShaders`, `destroyFooterShaders`) remain unchanged.

---

## 1. fBm Caustics

### Problem

Current approach: three sin waves at fixed angles (0°, ~45°, ~22°) interfere to produce a caustic pattern. The waves are too regular — the grid structure is visible and it reads as "noise shader" rather than water light.

### Solution

Replace `causticFn` with a 4-octave fBm pipeline:

1. **Hash / pseudo-random** — a deterministic 2D hash (`sin`-based, standard in TSL) to seed value noise
2. **Value noise** — bilinear interpolation of hashed corner values per cell
3. **fBm** — 4 octaves of value noise, each at 2× frequency and 0.5× amplitude, accumulated
4. **Domain warp** — sample fBm twice with offset coordinates to warp the input UV before the final fBm sample, breaking grid regularity
5. **Caustic sharpen** — `abs(sin(warpedFbm * PI))` raised to `uCausticPower` produces the characteristic bright-vein / dark-gap pattern

### TSL implementation notes

- All steps expressed as `Fn()` nodes — hash, valueNoise, fbm, domainWarp are separate named functions
- `uTime` drives a slow drift: added to UV before hash so the pattern animates
- `uCausticScale` scales the UV input to fbm (controls cell size)
- `uCausticSpeed` already drives `uTime` accumulation rate in `tick()` — no change needed
- `uCausticPower` passed to the sharpen `pow()` — higher = tighter veins
- `uCausticBrightness` multiplied onto final intensity — no change
- Domain warp strength hardcoded at `0.3` (a new `uCausticWarp` uniform exposed in tweakpane for tuning)

### Uniforms added

| Uniform | Default | Range | Purpose |
|---|---|---|---|
| `uCausticWarp` | `0.3` | `0–1` | Domain warp strength |

### Uniforms removed

None — all existing caustic uniforms carry over.

---

## 2. Radial Bloom Gradient

### Problem

Current gradient: `mix(bgBottom, bgTop, uv().y)` — flat vertical lerp, static, no relationship to scroll progress.

### Solution

A radial cone bloom anchored at bottom-centre, scaling upward as `uProgress` increases:

1. **Compressed UV** — `scaledY = uv().y / max(uProgress, 0.001)` compresses the Y axis. At `progress = 0` the cone is infinitely squashed (invisible). At `progress = 1` it fills the full height.
2. **Cone distance** — distance from current UV to bottom-centre point `(0.5, 0)` in the compressed space, weighted to be elongated vertically (multiply X distance by `uGradientWidth` aspect factor)
3. **Colour stops** — four stops mapped via `smoothstep` chains on cone distance:
   - `0.0–0.15` → `#ef5d2a` (color-orange) — hot core
   - `0.15–0.45` → `#f0c4a8` (color-peach) — warm mid
   - `0.45–0.75` → `#f9efe6` (color-background) — parchment outer glow
   - `0.75–1.0` → `#323032` (color-black) — dark edges/background
4. **Edge clamp** — beyond the cone boundary, hard `#323032`

### TSL implementation notes

- `gradientFn` is replaced entirely — same function signature, same return type (`vec3`)
- `uProgress` already exists — reused directly, no new dependency
- Cone distance computed in `gradientFn` scope, not a separate `Fn`
- `uGradientWidth` controls horizontal spread of cone (how wide vs tall)

### Uniforms added

| Uniform | Default | Range | Purpose |
|---|---|---|---|
| `uGradientWidth` | `1.8` | `0.5–4` | Cone horizontal spread relative to height |

---

## 3. Compositing — No Changes

`finalColorFn` composition order stays identical:

```
bg (gradient) + caustic * (1 - shadow) + shadowColor * shadow * uShadowAlpha
```

Alpha channel still driven by `uProgress`. Shadow mask, video texture pipeline, resize, GSAP scroll — all unchanged.

---

## 4. Tweakpane Dev Page

Two new bindings added to `/dev/footer.astro`:

- **Caustics folder**: add `warp` slider (0–1, step 0.01, label 'Warp')
- **Gradient folder** (new): add `width` slider (0.5–4, step 0.1, label 'Width')

---

## 5. Out of Scope

- No changes to shadow mask
- No breathing / time-based gradient animation
- No changes to video pipeline
- No changes to public `initFooterShaders` / `destroyFooterShaders` API
- No changes to `footer-shadows.ts` (main repo) — improvements land in worktree only, merged when approved
