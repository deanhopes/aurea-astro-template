# Cleanup 07 — Legacy / Deprecated / Fallback Sweep

Agent 7 of 8. Research-only pass. No edits made.

---

## 1. Critical assessment

**The codebase is effectively free of legacy sediment.** There are no polyfills, no `@supports` queries, no feature-detect fallbacks for universally supported APIs, no commented-out "old" code blocks, no versioned filenames (`foo.v2.ts`), no back-compat shims for browser APIs. The IntersectionObservers, ResizeObservers, `matchMedia`, `color-mix()`, CSS nesting, CSS `@layer`, `dvh` units, view transitions and `fetchpriority` are all used directly with no fallback path. That is correct for a modern-browser target.

The only items that look legacy are:

1. **One orphan file** (`lib/neighbourhood-inertia.ts`) — already flagged by Agent 4.
2. **Two back-compat export aliases** in `lib/footer-shaders.ts` — unused.
3. **One self-labeled "legacy name" CSS token** (`--radius-cta`).
4. **A double-reveal anti-pattern** (IntersectionObserver `[data-reveal]` + a GSAP `gsap.from` for the same sections) that's more of a structural overlap than a legacy fallback, but violates the lesson in `tasks/lessons.md` line 11 and is the strongest "two implementations of the same feature" signal in the tree.

The legit runtime branches (WebGPU init, reduced-motion, touch vs hover, `requestIdleCallback`, video mask presence) are all real and should be kept.

---

## 2. High-confidence removals

### 2.1 `src/lib/footer-shaders.ts:541-542` — unused back-compat aliases

```ts
// Back-compat aliases
export { initFooterShaders as initFooterShadows, destroyFooterShaders as destroyFooterShadows };
```

The aliases are labeled "Back-compat" but a repo-wide grep for `initFooterShadows` / `destroyFooterShadows` returns **zero** call sites — the only matches are the alias export itself at line 542. `bootstrap.ts` and `pages/dev/footer.astro` both import the canonical names (`initFooterShaders` / `destroyFooterShaders`). Dead exports.

**Single clean path:** delete the two aliases. Canonical names stay.

---

### 2.2 `src/lib/neighbourhood-inertia.ts` — entire 70-line file orphaned

Whole file is unreferenced. Grep confirms (`Grep: neighbourhood-inertia | initNeighbourhoodInertia | destroyNeighbourhoodInertia` → only self-matches). `bootstrap.ts` wires `neighbourhood.ts`, not this file. Agent 4 (`tasks/cleanup-04-cycles.md:171`) already noted the same thing as an orphan from a dependency-graph perspective and explicitly kicked it to "whichever agent is handling dead-code sweeps." That agent is me.

It reads as an abandoned first attempt at the neighbourhood section — cursor-driven spring inertia with `gsap.quickTo` — superseded by the tabbed crossfade implementation in `lib/neighbourhood.ts`. The file even starts with its own matchMedia guard (`max-width: 1024px`), confirming it was a desktop-only parallax effect that no longer has a corresponding DOM (the `.neighbourhood__image` class exists but the rest of the module's assumptions — multiple absolute-positioned images — don't match the current tabbed layout).

**Single clean path:** delete `src/lib/neighbourhood-inertia.ts`. No imports to update.

---

### 2.3 `src/components/FooterShadows.astro:29-57` — `<style>` block violates the single-source CSS rule

Not legacy in the "old browser fallback" sense, but a migration leftover: `docs/codebase.md` says

> All styles live in `src/styles/global.css`. No `<style>` blocks in `.astro` files — ever. Scoped styles cause split-brain.

`FooterShadows.astro` has a 28-line scoped `<style>` block with `.footer-shadows__video`, `.footer-shadows`, and `.footer-shadows__overlay`. It's the only `.astro` file in the component tree that violates this rule (I checked the others — Hero/Vision/Neighbourhood/Residences/Lifestyle/Enquiry/Footer/Nav all obey it). The dev testbed `pages/dev/footer.astro` also has a `<style>` block, but that one is explicitly a noindex'd testbed with its own justification comment.

**Single clean path:** move the three selectors into `global.css` under `@layer components`, drop the `<style>` block from `FooterShadows.astro`.

---

## 3. Medium-confidence

### 3.1 Double reveal system — `[data-reveal]` IO observer + GSAP `gsap.from` on the same sections

This is the "two implementations of the same feature" pattern the brief asks about. Two independent systems fade sections in:

**System A** — `src/lib/bootstrap.ts:23-48` + `src/styles/global.css:151-162`:

```
[data-reveal] { opacity: 0; transform: translateY(1.5rem); transition: var(--transition-reveal); }
[data-reveal].revealed { opacity: 1; transform: translateY(0); }
```

Triggered by `IntersectionObserver` at `threshold: 0.1, rootMargin: '0px 0px -50px 0px'`.

**System B** — `src/lib/animations.ts:58-94`, `gsap.from` with ScrollTrigger per element:

- `.lifestyle__label`, `.lifestyle__copy p`
- `.residences__label`, `.residences__card`
- plus `.lifestyle__pair img` staggered entry

The overlap hits in two concrete places:

- `src/components/Lifestyle.astro:12` — `<section class="lifestyle" data-reveal>` fades the whole section via IO. Inside, `animateLifestyleText` (animations.ts:58-75) also `gsap.from`s `.lifestyle__label` and `.lifestyle__copy p` from `opacity: 0`. So the label/copy paint twice: parent opacity rising from 0→1 while the GSAP tween is also rising from 0→1 on the child. Exactly the "Don't double-fade with parent + children" anti-pattern in `tasks/lessons.md:10`.

- `src/components/Residences.astro:11` — same story. `<section class="residences" data-reveal>` + `animateResidencesReveals` (animations.ts:77-94) fades `.residences__label` and `.residences__card` again.

Either system works on its own. The question is which one to keep:

- **IO system pros:** cheap, no GSAP dependency for reveals, reduced-motion handled by the `transition` token, already wired for 404 and every page hero (`pages/*.astro`), so it has to stay regardless.
- **GSAP system pros:** `ease: 'expo.out'` + `stagger` for labels/cards; prettier in isolation. But it's only used by three hand-picked sections (lifestyle, residences, vision) and vision-scroll already has its own GSAP reveals.

**Proposed single path:** keep the `[data-reveal]` IO system as the global reveal primitive. Remove the overlapping `gsap.from` calls from `animations.ts` — specifically `animateLifestyleText` and `animateResidencesReveals` (lines 58-94) — and remove `data-reveal` from the wrapper `<section>`s in `Lifestyle.astro:12` and `Residences.astro:11` if per-child stagger is preferred, OR remove the GSAP calls and keep the wrapper reveal. Either direction collapses to one pass. Given the `animations.ts` version uses `gsap.matchMedia` to gate on `prefers-reduced-motion: no-preference`, preserving it would mean the reduced-motion branch silently falls back to System A anyway — which is another argument for just standardising on System A.

`animateLifestylePairImages` (animations.ts:24-40) and `animateContainedParallax` (42-56) are doing different work (scale + parallax) and should stay.

Medium-confidence because "fix the double-fade" is really a design decision about section choreography, not a pure dead-code removal. Flagging, not prescribing.

---

### 3.2 `src/styles/global.css:80` — `--radius-cta: var(--radius-md); /* alias, legacy name */`

Self-labeled "legacy name." Used at three sites (`global.css:251, 269, 944`), all CTA buttons (`.nav-pill--cta`, `.btn`, and the enquiry submit button). Pure alias — no media query override, no dark-mode branch, no fallback.

Two defensible reads:

1. **Remove** — inline `var(--radius-md)` at the three call sites, drop the token. The comment already labels it legacy, and the token name doesn't add semantic value (`--radius-md` already encodes "the default 4px button/input radius" in codebase.md's radius convention).
2. **Keep and de-legacy** — strip the "legacy name" comment. There's weak semantic value in "CTA buttons use this specific token" if you ever wanted CTA radius to diverge from default button radius.

**Recommendation:** remove. Three inlines is cheap, the comment is already confessing it's a hang-over, and the radius is unlikely to diverge given the 4px-is-the-standard rule in codebase.md.

---

### 3.3 `src/styles/global.css:2491, 2632` — "removed" comments

```css
/* mobile lifestyle override removed — --space-edge handles all breakpoints */
/* mobile residences override removed — --space-edge handles all breakpoints */
```

Historical markers that document the absence of a deleted rule. Zero functional impact; mild noise. Could be deleted since the lines they refer to no longer exist and the next developer doesn't need to know what was once there. Low priority.

---

## 4. Keep — looks legacy, is actually a real runtime branch

- **`src/lib/footer-shaders.ts:267-272`** — `try { await renderer.init() } catch { console.warn('WebGPU init failed'); return false }`. This is the WebGPU feature detection that `docs/codebase.md` explicitly describes. If init throws, `initFooterShaders` early-returns — the footer stays on its CSS gradient overlay. Real runtime branch. Keep.

- **`src/lib/footer-shaders.ts:230, 393-429`** — the video readiness guards (`videoEl.readyState >= HAVE_CURRENT_DATA`, `videoTexNode.value = placeholderTex`). Per codebase.md: "System works without the video — shadow mask is transparent, gradient + caustics still render." This is the designed fallback path, not dead weight. Keep.

- **`src/lib/bootstrap.ts:71-77`** — `typeof window.requestIdleCallback === 'function'` with a `setTimeout(cb, 1)` fallback. Safari shipped `requestIdleCallback` in 17.4 (April 2024); users on older Safari 16/17.0-17.3 still hit the fallback. Real runtime branch. Keep.

- **`src/lib/nav.ts:97`** — `if (!window.matchMedia('(hover: hover)').matches) return () => {}`. Touch-vs-hover detection, not feature fallback. Keep.

- **`src/lib/neighbourhood.ts:350-354`** — `if (document.fonts?.ready)` with a sync fallback. Not strictly needed on any modern browser (FontFaceSet is universal) but the cost is 4 lines and the branch is harmless. Marginal; safe to leave.

- **`src/lib/page-transition.ts:27-29, 88-92`** — `prefersReducedMotion()` checks and `navigationType === 'traverse'` branch. Accessibility + correct back/forward behaviour, not legacy. Keep.

- **`src/lib/vision-scroll.ts:114`** + **`src/lib/neighbourhood-inertia.ts:17-18`** (if the file isn't deleted) — `gsap.matchMedia().add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)')`. Reduced-motion gating. Keep.

- **`src/components/FooterShadows.astro:18-19`** — `.webm` + `.mp4` dual `<source>`. Both are universally supported on the target browsers in 2026, so in principle redundant — but `docs/codebase.md:80` explicitly calls out "`leaf-shadows.webm` + `.mp4` fallback" as a requirement. Both files are present in `public/video/`. Intent is documented, keep.

- **`src/three-shims.d.ts`** — looks like a compat shim but it's a live type shim for `three@0.183`'s missing `types` condition on `three/webgpu` / `three/tsl` subpath exports. Not legacy; still required by the current `three` version. Keep until three.js ships the subpath types itself.

- **`src/layouts/BaseLayout.astro:62-64`** — `<script is:inline>delete window.onscrollend</script>` with a "known Astro ClientRouter conflict" comment. That's a live workaround for an upstream bug, not legacy code. Keep (until the upstream fix lands).

- **`src/lib/lenis.ts:19`** — the comment `// The old 1.2s duration made the page feel locked...` references historical tuning, not dead code. Purely documentation.

---

## Summary table

| #   | File:line                                                                                                                                                     | Verdict              | Action                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- |
| 1   | `lib/footer-shaders.ts:541-542`                                                                                                                               | High-confidence dead | Delete alias exports          |
| 2   | `lib/neighbourhood-inertia.ts:1-71`                                                                                                                           | High-confidence dead | Delete file                   |
| 3   | `components/FooterShadows.astro:29-57`                                                                                                                        | Convention violation | Move to `global.css`          |
| 4   | Lifestyle + Residences double-reveal (`lib/animations.ts:58-94`, `components/Lifestyle.astro:12`, `components/Residences.astro:11`, `lib/bootstrap.ts:23-48`) | Medium — design call | Collapse to one reveal system |
| 5   | `styles/global.css:80` `--radius-cta` alias                                                                                                                   | Medium               | Inline and delete token       |
| 6   | `styles/global.css:2491, 2632` historical comments                                                                                                            | Low                  | Delete comments               |

Items 1, 2, 3 are mechanical cleanups with zero runtime impact. Item 4 is the only substantial finding — same thing the lesson in `tasks/lessons.md:10` warns about, manifesting in two sections. Items 5 and 6 are cosmetic.

Everything else that could look legacy — WebGPU init, video fallback, `requestIdleCallback`, `matchMedia('(hover: hover)')`, `.webm`+`.mp4`, `three-shims.d.ts`, the `window.onscrollend` delete — is load-bearing runtime code and must stay.
