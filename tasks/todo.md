# Aurea Residences — Cleanup Pass

Sequenced implementation plan for the April 2026 cleanup audit. Full findings in `docs/cleanup-audit.md`; per-agent reports in `tasks/cleanup-01..08-*.md`.

**Frame:** read-only research is done. This is the implementation punch list. Each section is ordered lowest-risk-first so the diff stays reviewable and each step is easy to revert in isolation.

**Not doing here:** broken `/og.jpg` and `/favicon.svg` references (user handling separately). Stub pages are being replaced by anchor redirects per the ship plan, so no dynamic `[stub].astro` route — those six pages get killed during Section 5 of the ship, not this pass.

---

## 1. Dead assets + orphan files

Lowest risk. No code behaviour touched. Biggest filesystem win.

- [x] Delete untracked AI-generated PNGs in `src/assets/images/` (the `??` files from git status — ~25 files, starting with `0550f51ba03bc4e494e756a2cfb7d66b.jpg`, `Wynwood.jpg`, `_urd382m0wxsvv6rsms7m_0.png`, all the `close-up_architectural_detail_*`, `camera_positioned_further_back_*`, `first_person_perspective_*`, `interior_of_a_luxury_apartment_*`, `lush_tropical_garden_*`, `luxury_master_bedroom_*`, `luxury_residential_tower_*`, `luxury_wellness_spa_*`, `miami_edgewater_skyline_*`, `omni-*`, `private_dining_room_*`, `private_residents_marina_deck_*`, `review_image_*`, `rooftop_infinity_edge_pool_*` × 3, `street_level_view_*`, `margerat-place-park.jpg`, `design-district.jpg`)
- [x] Delete untracked legacy JPGs: `ice-bath.jpg`, `infrared.jpg`, `lifestyle-05.jpg`, `lifestyle-06.jpg`, `lifestyle-07.jpg`, `lifestyle-08.jpg`, `lifestyle-breathwork.jpg`, `lifestyle-plunge.jpg`, `vision-terrace.png`, `vision-tower.png`
- [x] Delete `src/lib/neighbourhood-inertia.ts` (orphan, superseded by `neighbourhood.ts`)
- [x] Delete `src/components/seo/JsonLd.astro` (zero references)
- [x] Delete `public/fonts/TestSohne-Extraleicht.woff2` (no `@font-face` reference)
- [x] `git rm temp-screenshot-full.png` at repo root (4.95 MB, tracked in `dc50270`, stray debug artifact)
- [x] Verify `npm run build` still succeeds

---

## 2. Dead CSS (`src/styles/global.css`)

Pure deletions. No markup touched. Run a visual diff on the homepage after.

- [x] Delete `.site-footer__enquiry*` and `.site-footer__dropdown*` block — lines 754-960
- [x] Delete footer enquiry/dropdown media-query partials at lines 1571-1578 and 3012-3036
- [x] Delete `.rwpaper` — line 964
- [x] Delete 12-column grid utility: `.col-1` through `.col-12` and `.col-start-1` through `.col-start-12` (~24 selectors)
- [x] Delete `.section--hero` — line 1646
- [x] Delete `.text-section` class rule — line 1679 (the `--text-section` custom property stays; only the unused `.text-section` class goes)
- [x] Delete `.residences__cta` — lines 1925 and 1940 (was inside deleted enquiry block — auto-gone)
- [x] Inline `--radius-cta` → `var(--radius-md)` at its three call sites, then delete the `--radius-cta` token
- [x] Delete the "mobile lifestyle override removed" comment
- [x] Delete the "mobile residences override removed" comment
- [ ] Visual spot-check the homepage in Chrome — Hero, Vision, Residences, Lifestyle, Neighbourhood, Enquiry, Footer — nothing should have shifted (user eyes required)

---

## 3. Dead code in `src/lib/`

- [x] Delete `animateLifestylePairImages` in `src/lib/animations.ts:24-40` (targets `.lifestyle__pair-image` / `.lifestyle__pair` — neither exists)
- [x] Delete `animateContainedParallax` in `src/lib/animations.ts:42-56` (targets `[data-parallax]` — zero DOM usages)
- [x] Remove the two call sites for the above in `initAnimations()` (around lines 101, 103)
- [x] Delete the back-compat aliases at `src/lib/footer-shaders.ts:541-542` (`initFooterShadows` / `destroyFooterShadows` — zero callers)
- [x] Drop the `export` keyword from `uProgress`, `uSunX`, `uSunY` at `src/lib/footer-shaders.ts:83-85` (internal-only — these three differ from `uCausticScale` etc. on 88-101 which ARE imported by `dev/footer.astro` and must stay exported)
- [x] `npm run build` + `npm run check`

---

## 4. Convention violation — `FooterShadows.astro` `<style>` block

- [x] Move `.footer-shadows__overlay` from `src/components/FooterShadows.astro:29-57` into `src/styles/global.css` alongside its siblings (~line 710, under the existing `.footer-shadows` / `.footer-shadows__video` rules)
- [x] Confirm `.footer-shadows__video` and `.footer-shadows` in the component's `<style>` block are byte-identical to the `global.css` versions — byte-identical, dropped
- [x] Delete the entire `<style>` block from `FooterShadows.astro`
- [ ] Visual spot-check the footer — gradient, caustics, palm leaf shadow mask (user eyes)

---

## 5. Remove defensive try/catch — `neighbourhood.ts` iframe probe

- [x] Collapse `src/lib/neighbourhood.ts:64-80` (iframe loaded-state probe) into the existing `if (iframe.src && iframe.contentWindow)` guard. Both branches of the current try/catch do identical work — `void contentWindow.location` is throwaway. Keep only:
  ```ts
  if (iframe.src && iframe.contentWindow) {
    ext._loaded = true;
    gsap.set(panel, { opacity: 1 });
    panel.classList.add('is-active');
    return;
  }
  ```
- [ ] Test neighbourhood tab switching — click through Margaret Pace, The Bay, etc., and verify the map iframes still fade in correctly on first click and show immediately on repeat clicks (user eyes)

---

## 6. Weak type fixes

One `as any` in the whole repo. Fix at the root.

- [x] Add `"@tweakpane/core": "^2.0.5"` to `devDependencies` in `package.json`
- [x] `npm install`
- [x] At `src/pages/dev/footer.astro:88`, replace `new Pane(...) as any` with a typed binding:
  ```ts
  import { Pane, type FolderApi } from 'tweakpane';
  const pane: FolderApi = new Pane({ container: document.getElementById('tp-root')! });
  ```
- [x] Delete all 11 `uniform.value as number` casts at `src/pages/dev/footer.astro:94-98, 135-137, 162-164` — TSL's `uniform()` already returns a typed node
- [x] Delete the `({ value }: { value: number })` annotations on the Tweakpane change handlers — they become inferred once `FolderApi` resolves
- [x] Introduce a `getX(el: HTMLElement): number` helper at the top of `src/lib/lifestyle-slider.ts`:
  ```ts
  function getX(el: HTMLElement): number {
    const v = gsap.getProperty(el, 'x');
    return typeof v === 'number' ? v : parseFloat(v);
  }
  ```
  Replace the three `gsap.getProperty(..., 'x') as number` casts at lines 55, 104, 123
- [x] At `src/lib/lifestyle-slider.ts:207, 216`, replace `Array.from(track.children) as HTMLElement[]` with `Array.from(track.querySelectorAll<HTMLElement>(':scope > *'))` — matches the convention used elsewhere in the same file
- [x] At `src/lib/neighbourhood.ts:47`, replace the `HTMLIFrameElement & { _loaded?: boolean }` intersection cast with a module-scope `const loadedIframes = new WeakSet<HTMLIFrameElement>();` — update the read/write sites accordingly
- [x] `npm run check` — this pass should drop the `as any` count to zero

---

## 7. Type consolidation — nav/footer link source of truth

- [x] In `src/data/site.ts`, define a `NavLink` type next to the existing `nav` export:
  ```ts
  export type NavLink = { label: string; href: string };
  ```
- [x] Add a `footerLinkGroups` export to `site.ts` — three groups matching the current Footer hard-coded shape (primary cards: Vision/Residences/Lifestyle/Neighbourhood; secondary: Location/The Team/Blog; legal: Terms/Privacy)
- [x] In `src/components/Footer.astro:7-23`, delete the local `linkGroups` array and import `footerLinkGroups` from `@data/site`
- [ ] Visual spot-check the footer link columns still group and order as before (user eyes)
- [x] Flatten the `items` construction in `src/components/Neighbourhood.astro:12-15` — drop the `{ id: entry.id, ...entry.data }` spread. Use `item.id` and `item.data.*` directly through the downstream maps. `CollectionEntry<'neighbourhood'>` is already inferred by Astro, so no new type is needed
- [x] `npm run check`

---

## 8. Double-reveal untangle — Lifestyle + Residences

The one substantial behavioural fix. Matches the "parent + children double-fade" anti-pattern in `tasks/lessons.md:10`. **Visual verification required after** — test in Chrome before marking done.

- [x] Delete `animateLifestyleText` (`src/lib/animations.ts:58-75`) — the `.lifestyle__label` and `.lifestyle__copy p` reveals are already handled by the `data-reveal` on `<section class="lifestyle">` at `Lifestyle.astro:12`
- [x] Delete `animateResidencesReveals` (`src/lib/animations.ts:77-94`) — same story for `.residences__label` and `.residences__card`
- [x] Remove the two `initAnimations()` call sites for the deleted helpers
- [ ] Open the homepage in Chrome, scroll through Lifestyle and Residences sections, verify:
  - Label + copy/cards fade in cleanly (single system, not double)
  - No visible opacity stutter or early-vanish
  - Reduced-motion still works (`System Preferences → Accessibility → Reduce Motion` toggled on)
- [ ] If the `[data-reveal]` single-pass feels too uniform and you want stagger back on the cards specifically, do it by adding a small `transition-delay` cascade in CSS — **do not** reintroduce a second JS reveal system

---

## 9. Consolidate shared heading/eyebrow CSS

- [x] Add a `.text-section-heading` utility to `src/styles/global.css` (near `.text-hero` / `.text-section`, around line 1680):
  ```css
  .text-section-heading {
    font-family: var(--font-display);
    font-weight: 300;
    font-size: clamp(2rem, 3vw + 1rem, 3.5rem);
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: var(--color-black);
  }
  ```
- [x] Replace the identical bodies inside `.lifestyle__heading`, `.residences__heading`, `.neighbourhood__heading` with just their context-specific deltas — `.enquiry__heading` skipped (different size ramp)
- [x] Apply `text-section-heading` in the three component markups
- [~] Label group extension — skipped: existing 4-selector group already covers shared labels; `.hero__label` and `.enquiry__eyebrow` have divergent color/tracking, consolidation would regress
- [ ] Visual spot-check — all four section intros should be pixel-identical to before

---

## 10. Remove `@lucide/astro` dep

- [ ] Confirm zero usage with a final grep for `lucide`
- [ ] `npm uninstall @lucide/astro`
- [ ] `npm run build`

---

## 11. Comment hygiene pass

Lowest priority, cosmetic. Save for last so the diff stays tight.

- [ ] Delete the nine file-level `/** ComponentName — description */` banners in `src/components/*.astro` and `src/pages/dev/footer.astro`. The filename already says it. See `tasks/cleanup-08-slop.md` §2 for the file:line list
- [ ] Strip section-banner dividers (`/* ── State ── */`, `// ── Caustics ──`, etc.) from `src/lib/footer-shaders.ts`, `src/lib/page-transition.ts`, `src/lib/bootstrap.ts`, `src/components/Enquiry.astro`, `src/pages/dev/footer.astro`
- [ ] Flatten section-label comments in `src/styles/global.css` that sit directly above selectors of the same name (`/* Header */` above `.header`, `/* Nav bar */` above `.nav-bar`, `/* Menu panel */` above `.menu-panel`, and similar ~60 sites). See `cleanup-08-slop.md` §2 "CSS section labels"
- [ ] Delete all `/* end @layer X */` sentinel comments (`global.css:89, 101, 163, 1580, 1665, 1946, 3037, 3089, 3098`) — editor folding + `@layer` blocks make them redundant
- [ ] Delete narration-style inline comments (`// Reset the unused axis`, `// Freeze scroll immediately`, `// Close nav menu if open`, etc.) that restate the next line. Full list in `cleanup-08-slop.md` §2
- [ ] Rewrite multi-paragraph WHY blocks in `src/lib/lenis.ts`, `src/lib/bootstrap.ts`, `src/lib/neighbourhood.ts`, `src/lib/page-transition.ts`, and the `BaseLayout.astro` head scripts to one-line maximums
- [ ] **Keep these** (doing real work — do NOT touch):
  - `footer-shaders.ts:1-25` file-level physics model
  - `footer-shaders.ts:134-148` fBm-vs-Voronoi rejection rationale
  - `footer-shaders.ts:201` video Y-flip gotcha
  - `BaseLayout.astro:61` `delete window.onscrollend` Lenis workaround
  - `global.css:2878-2880` `data-layout='a'/'b'` contract
  - `global.css:3063-3065` `html[data-booting]` curtain pin coupling
  - `global.css:76-80` per-radius-token intent comments
  - `global.css:1079-1081` "hotel-form pattern, not shadcn pattern" design note
- [ ] `npm run check`

---

## 12. Verification gate

- [ ] `npm run build` clean
- [ ] `npm run check` clean (no new TS errors beyond the 7 pre-existing baseline)
- [ ] `grep -rn "as any" src/` returns zero results
- [ ] Homepage visual spot-check in Chrome — scroll top to bottom, check each section: Hero, Vision, Residences, Lifestyle, Neighbourhood, Enquiry, Footer
- [ ] Footer WebGPU canvas renders (gradient + caustics + shadow mask)
- [ ] Nav menu opens and closes cleanly
- [ ] Reduced-motion mode still respects the curtain fade and section reveals
- [ ] Neighbourhood tab switching works on first click and repeat click (map iframes)
- [ ] Lifestyle draggable slider still drags, wraps, and snaps correctly

---

## Separate, user-handled

These are out of scope for this cleanup pass — user will handle later:

- `src/data/site.ts:5` → `/og.jpg` (file missing from `public/`)
- `src/layouts/BaseLayout.astro:30` → `/favicon.svg` (file missing from `public/`)

---

## Review (fill in after each section lands)

- Section 1 — dead assets: 34 images + orphan lib + unused component + stray font + tracked screenshot removed. `npm run build` clean (9 pages, ~8.5s). Zero grep refs confirmed before each delete.
- Section 2 — dead CSS: ~390 lines removed from global.css. `.site-footer__enquiry/__dropdown` block + `.rwpaper` (~216 lines), `.col-*`/`.col-start-*` grid utility (~150 lines), `.section--hero`, `.text-section` class, mobile-override comments, `--radius-cta` token inlined. `.residences__cta` was inside the enquiry block → auto-gone. Build clean (9 pages, 5.3s). Visual spot-check pending user eyes.
- Section 3 — dead lib code: 2 dead animation helpers + call sites removed, back-compat aliases dropped, 3 internal uniforms de-exported. Build clean. `npm run check` shows 7 pre-existing baseline errors, no new.
- Section 4 — FooterShadows style block: `__overlay` rule moved to global.css alongside siblings. `.footer-shadows`/`__video` confirmed byte-identical with existing global.css rules, dropped. Component `<style>` block gone. Also dropped file-level JSDoc banner (convention, section 11 already flags).
- Section 5 — neighbourhood try/catch: try/catch block collapsed to single guard. Both branches did identical work. Build clean.
- Section 6 — weak type fixes: @tweakpane/core devDep added → FolderApi resolves → `as any` gone, all 11 `.value as number` casts removed, all 12 change-handler annotations inferred. `getX()` helper replaces 3 gsap.getProperty casts. HTMLCollection casts swapped for `querySelectorAll<HTMLElement>(':scope > *')`. Iframe `_loaded` intersection cast replaced by module WeakSet. `grep "as any" src/` returns zero. 7 pre-existing baseline errors unchanged.
- Section 7 — nav/footer link consolidation: NavLink type + footerLinkGroups exported from site.ts. Footer.astro imports, deletes local hard-code (+ drops JSDoc banner). Neighbourhood.astro `items` flatten — now sorted `CollectionEntry<'neighbourhood'>[]`, all downstream accesses via `item.id`/`item.data.*`. Build + check clean.
- Section 8 — double-reveal untangle: `animateLifestyleText` + `animateResidencesReveals` deleted from `src/lib/animations.ts`; `initAnimations()` now runs only `animateHeroParallax()`. File 91 → 37 lines. Parent `[data-reveal]` on `.lifestyle` + `.residences` is now single source. Build + astro-check clean (7 baseline errors unchanged). **Chrome visual verification pending** — user to spot-check Lifestyle/Residences reveals + reduced-motion.
- Section 9 — heading CSS: Added `.text-section-heading` utility to typography layer in `src/styles/global.css`. Stripped shared type props from `.lifestyle__heading` (deleted outright — zero deltas), `.residences__heading` (kept text-align + margins), `.neighbourhood__heading` (kept `margin: 0`). Applied class in 3 components. `.enquiry__heading` deliberately skipped — uses different font-size ramp (`var(--text-section)` vs hard clamp), not byte-identical, forcing consolidation would regress. Label consolidation also skipped — existing 4-selector group rule already covers vision/lifestyle/residences/neighbourhood; `.hero__label` + `.enquiry__eyebrow` differ in color + tracking so they stay separate. Build + check clean.
- Section 10 — @lucide/astro removal:
- Section 11 — comment hygiene:
- Section 12 — verification:
