# Cleanup Audit — April 2026

Consolidated findings from an 8-agent research pass on the codebase. Every item below was verified by at least two checks (grep + manual read, or tool output + cross-reference). Full per-agent reports live in `tasks/cleanup-01..08-*.md`.

**Headline:** the codebase is tighter than it looked going in. No circular dependencies. One `as any` in the entire repo. Zero defensive try/catch theater. Comment discipline above average. The real dead weight is CSS (~390 lines) and images (~32 files, ~20MB).

---

## 1. Critical Assessment

**The pattern.** This codebase was built section-by-section, then had a system imposed on it. The system works — one global CSS file, one bootstrap entry point, one easing curve, one reveal primitive. What slipped through are the seams where older decisions were replaced but their carcasses weren't removed:

- Footer was refactored into `Enquiry.astro` — ~210 lines of old `.site-footer__enquiry*` / `.site-footer__dropdown*` CSS were left behind.
- A 12-column grid utility was added but never adopted — all 24 `.col-*` / `.col-start-*` classes are dead.
- `neighbourhood-inertia.ts` was superseded by the tabbed `neighbourhood.ts` implementation but the old file survives as an orphan.
- Two reveal systems coexist: `[data-reveal]` IntersectionObserver (global, cheap) and per-section `gsap.from` calls in `animations.ts` (scoped, staggered). They double-fire on Lifestyle and Residences, triggering the parent+children double-fade anti-pattern documented in `tasks/lessons.md:10`.
- Six stub pages are literal copy-paste of one 12-line template.
- `src/assets/images/` has accumulated ~25 untracked AI-generated PNGs and ~6 legacy-named JPGs that no YAML references.

**What's NOT broken:**

- Content collections are well-used (no parallel hand-rolled types).
- Module graph is acyclic and shallow — `bootstrap.ts` is a clean one-way fan-out hub, `lenis.ts` is a leaf singleton.
- TypeScript is on `astro/tsconfigs/strictest` — exactly one `as any` across `src/`, zero `@ts-ignore`, zero `Record<string, any>`.
- Defensive programming is disciplined — only four try/catch sites, three are genuinely load-bearing (WebGPU init, video autoplay, font readiness).
- GSAP cleanup patterns, ResizeObserver lifecycle, rAF loop management all respect the lessons in `tasks/lessons.md`.

**Grade: A−** for type safety, B+ for CSS hygiene (the legacy sediment drags it down), A for module architecture.

---

## 2. Cross-Agent Overlaps

Three items flagged by multiple agents — converging findings, not conflicts:

| Item                                              | Flagged by        | Action                                                             |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| `src/lib/neighbourhood-inertia.ts` orphan         | Agents 1, 3, 4, 7 | Delete                                                             |
| `footer-shaders.ts:541-542` back-compat aliases   | Agents 3, 7       | Delete                                                             |
| `FooterShadows.astro:29-57` `<style>` block       | Agents 1, 7       | Move to `global.css`                                               |
| Double-reveal (Lifestyle/Residences) anti-pattern | Agents 1, 7       | Standardise on `[data-reveal]` IO, remove overlapping GSAP reveals |

---

## 3. High-Confidence Findings by Category

### 3.1 Dead CSS (Agent 1, Agent 3)

Roughly **390 lines** removable from `src/styles/global.css`, zero visual change:

- **`.site-footer__enquiry*` / `.site-footer__dropdown*` block** — lines 754-960 plus media-query partials at 1571-1578 and 3012-3036. Replaced by `.enquiry__*` namespace. ~210 lines.
- **12-column grid utility** — `.col-1..12`, `.col-start-1..12`. Never applied anywhere. 24 classes, ~60 lines.
- **`.section--hero`** — line 1646. Unused.
- **`.text-section`** class rule — line 1679. The CSS custom property `--text-section` IS used, but the class is not.
- **`.residences__cta`** — lines 1925, 1940. Replaced by `.residences__footer` + `.btn.btn--primary`.
- **`.rwpaper`** — line 964. Orphan, unknown provenance.

### 3.2 Dead Code (Agent 1, Agent 3, Agent 7)

- **`src/lib/neighbourhood-inertia.ts`** (70 lines). Orphaned. Nothing imports it. Superseded by `neighbourhood.ts`.
- **`src/components/seo/JsonLd.astro`**. Zero references. `BaseLayout` only uses `Head.astro`.
- **`src/lib/animations.ts:24-40`** — `animateLifestylePairImages`. Targets `.lifestyle__pair-image` / `.lifestyle__pair` — neither class exists.
- **`src/lib/animations.ts:42-56`** — `animateContainedParallax`. Targets `[data-parallax]` — zero DOM usages.
- **`src/lib/footer-shaders.ts:541-542`** — `initFooterShadows` / `destroyFooterShadows` back-compat alias exports. Zero callers.
- **`src/lib/footer-shaders.ts:83-85`** — `export` keyword on `uProgress`, `uSunX`, `uSunY`. Internal-only usage; the uniforms themselves must stay but their exports can drop. (Compare with `uCausticScale` etc. on lines 88-101 which ARE imported by `dev/footer.astro` — those must stay exported.)

### 3.3 Dead Dependencies (Agent 3)

- **`@lucide/astro`** in `package.json:18`. Zero imports. Installed for planned icon work that never shipped.

### 3.4 Dead Assets (Agent 3)

- **~25 untracked AI-generated PNGs** in `src/assets/images/` — all the `??` files from git status. Never committed. Delete with `rm`.
- **~6 untracked legacy JPGs** — `lifestyle-05..08.jpg`, `lifestyle-breathwork.jpg`, `lifestyle-plunge.jpg`, `ice-bath.jpg`, `infrared.jpg`, `vision-terrace.png`, `vision-tower.png`. Replaced by current naming.
- **`public/fonts/TestSohne-Extraleicht.woff2`** — no `@font-face` declaration references it.
- **`temp-screenshot-full.png`** at repo root — 4.95 MB, tracked in commit `dc50270`. Stray debug artifact.

Total disk savings: ~20 MB.

### 3.5 Convention Violations (Agent 1, Agent 7)

- **`src/components/FooterShadows.astro:29-57`** — 28-line scoped `<style>` block. Violates "all CSS in `global.css`" rule. Two of three rules (`.footer-shadows__video`, `.footer-shadows`) are already duplicated in `global.css:695-710`. Only `.footer-shadows__overlay` is unique and needs moving.

### 3.6 Weak Types (Agent 5)

- **`src/pages/dev/footer.astro:88`** — the only `as any` in the repo. Root cause: `tweakpane@4.0.5` extends `FolderApi` from `@tweakpane/core`, which is not installed. Fix: add `@tweakpane/core` as devDependency, then `new Pane(...)` resolves to `FolderApi` with full `addFolder`/`addBinding`/`TpChangeEvent<T>` inference.
- **`src/pages/dev/footer.astro:94-164`** — 11 `uniform.value as number` casts. TSL's `uniform(0.14)` already returns `UniformNode<number>` with typed `.value`. Drop all 11 casts once the Pane type lands.
- **`src/lib/lifestyle-slider.ts:55, 104, 123`** — `gsap.getProperty(..., 'x') as number`. GSAP's signature returns `string | number`. Replace with a one-time `getX(el): number` helper.
- **`src/lib/lifestyle-slider.ts:207, 216`** — `Array.from(track.children) as HTMLElement[]`. `HTMLCollection` yields `Element`. Replace with `track.querySelectorAll<HTMLElement>(':scope > *')` — matches the convention elsewhere in the file.
- **`src/lib/neighbourhood.ts:47`** — `iframe as HTMLIFrameElement & { _loaded?: boolean }`. Working hack. Replace with module-scope `WeakSet<HTMLIFrameElement>`.

### 3.7 Defensive try/catch (Agent 6)

Only four try/catch sites across `src/`. Three are load-bearing (keep), one is structurally redundant:

- **`src/lib/neighbourhood.ts:64-80`** — iframe cross-origin loaded-state probe. Both `try` and `catch` branches do identical work. Collapse to the existing `if (iframe.src && iframe.contentWindow)` guard; delete the `void contentWindow.location` throwaway.
- **Keep:** `footer-shaders.ts:267-272` (WebGPU init with real CSS fallback), `footer-shaders.ts:404-406` (video autoplay reset), `neighbourhood.ts:351` (font-ready feature-detect fallback).

### 3.8 Legacy Tokens and Comments (Agent 7)

- **`src/styles/global.css:80`** — `--radius-cta: var(--radius-md); /* alias, legacy name */`. Self-labeled legacy. Three call sites. Inline and delete.
- **`src/styles/global.css:2491, 2632`** — two "mobile override removed — ..." historical comments. Cosmetic, delete.

### 3.9 Type Consolidation (Agent 2)

- **Footer link duplication** — `src/components/Footer.astro:7-23` hard-codes `linkGroups` that duplicate `nav.menu` in `src/data/site.ts:9-28`. Define a named `NavLink` type in `site.ts`, export a `footerLinkGroups` alongside `nav`, consume from Footer.
- **Neighbourhood spread** — `src/components/Neighbourhood.astro:12-15` builds `items = entries.map(entry => ({ id: entry.id, ...entry.data }))`, creating the only unnamed shape in the codebase. Drop the spread, use `entry.id` + `entry.data.*` directly. No new type needed — `CollectionEntry<'neighbourhood'>` already covers it.

### 3.10 AI Slop / Comment Hygiene (Agent 8)

Counts:

- ~129 line-comments across 10 TS/Astro files
- ~120 block comments in `global.css`
- **~55 DELETE** (file-level JSDoc banners on every component, section-banner dividers, narration restating the next line)
- **~25 REWRITE** (collapse multi-paragraph WHY blocks to one line)
- **~15 KEEP** (footer shader physics model, `onscrollend` workaround note, TS-inexpressible contracts like `data-layout='a'/'b'`, `html[data-booting]` curtain pin coupling, "hotel-form pattern" design note)

Biggest wins:

1. Delete the `/** ComponentName — description */` headers on all 9 Astro components (pure larp).
2. Strip section-banner dividers from `footer-shaders.ts`, `page-transition.ts`, `bootstrap.ts`, `Enquiry.astro`, `dev/footer.astro`.
3. Flatten ~60 section-label CSS comments in `global.css` (`/* Header */`, `/* Hero */`, etc.) that sit directly above selectors of the same name.
4. Collapse multi-line narration in `lenis.ts`, `bootstrap.ts`, `neighbourhood.ts`, `page-transition.ts`, and `BaseLayout.astro` head scripts into single lines.

### 3.11 Structural Consolidation (Agent 1)

- **Six stub pages** (`vision`, `residences`, `lifestyle`, `neighbourhood`, `location`, `team`) — pure copy-paste, ~100 lines total. All six are going to be replaced by anchor redirects per `tasks/todo.md` section 5 anyway — the real fix is Section 5 of the ship plan (convert to meta-refresh or Netlify `_redirects`), not a dynamic stub route.
- **`.text-section-heading` utility** — Agent 1 H7. Four components duplicate the same six-property heading body (`font-display`, weight 300, clamp font-size, -0.03em tracking, 1.1 line-height, black). Promote to a utility class next to `.text-hero` / `.text-section`.
- **`.text-eyebrow` utility** — Agent 1 H8. Label grouping at `global.css:1693-1704` already consolidated four variants, but `.enquiry__eyebrow` and `.hero__label` were missed. Extend the group or promote to a utility.

---

## 4. Broken References (flagged, not cleanup)

Agent 3 noted these exist but are missing — **user has flagged to handle later**:

- `src/data/site.ts:5` → `/og.jpg` — missing from `public/`
- `src/layouts/BaseLayout.astro:30` → `/favicon.svg` — missing from `public/`

---

## 5. Rejected Candidates (Deliberate)

Things that looked like duplication but are legitimately separate. Agents resisted over-abstraction:

- **`<SectionIntro>` component** — four components render `(label, heading)` pairs with near-identical markup. Agent 1 resisted the `<SectionIntro label=... heading=... />` abstraction because editorial readability of literal `<h2>` tags beats the ~20 lines it saves. CSS consolidation (H7, H8) only. The markup stays per-component.
- **Content collection base schema** — all four `defineCollection` blocks share `order: z.number()` but everything else diverges. Shared base schema saves three lines, loses clarity.
- **GSAP `gsap.context` scaffolding** — every lib module opens with the same `ctx = gsap.context(() => ...)` pattern. That IS the GSAP cleanup idiom. Abstracting it hides the convention.
- **`scrollTrigger: { start: 'top 85%', once: true }` repetition** — four usages. Inlining is clearer than a named constant at this count.
- **Three neighbourhood crossfade helpers** — look duplicated, but the behaviours actually diverge (images scale, maps handle iframe lazy-load, text staggers children). Explicit triplet is clearer than a unified helper with three mode flags.
- **Per-component `Props` interfaces** — properly scoped, no overlap. BaseLayout's narrower `{title, description}` vs Head's `{title, description, image}` is a meaningful contract, not duplication.
- **Lib module `State` interfaces** (`NeighbourhoodState`, `SliderState`) — module-private closure glue, not shared contracts. Lifting them to a `types.ts` would leak internals.
- **DOM event-target casts** (`e.target as HTMLElement`, etc.) — not weak-type escapes; standard narrowing in the direction the DOM types should already have flowed.

---

## 6. Estimated Net Impact

If every high-confidence item lands:

- **~390 lines** removed from `global.css`
- **~80 lines** removed from `src/lib/` (dead functions, orphan file, alias exports)
- **~100 lines** removed from stub pages (if collapsed via redirects per Section 5)
- **~32 files** deleted from `src/assets/images/` + 1 font + 1 screenshot ≈ **~20 MB** working tree
- **1 dep removed** (`@lucide/astro`)
- **1 dep added** (`@tweakpane/core` as devDep — unlocks the last `as any` removal)
- **~55 slop comments** deleted, **~25** rewritten to one line, **~15** kept as real WHY documentation
- **Zero behaviour change** on the shipped site (modulo a visual-verification pass on the Lifestyle/Residences double-reveal fix)

---

## 7. Per-Agent Report Index

- `tasks/cleanup-01-dedup.md` — duplication and DRY consolidation
- `tasks/cleanup-02-types.md` — type consolidation
- `tasks/cleanup-03-unused.md` — unused code, dependencies, assets (knip + manual verification)
- `tasks/cleanup-04-cycles.md` — circular dependencies (madge) — zero cycles found
- `tasks/cleanup-05-types-weak.md` — weak types (`any`, `unknown`, casts)
- `tasks/cleanup-06-trycatch.md` — defensive try/catch audit
- `tasks/cleanup-07-legacy.md` — deprecated, legacy, fallback code
- `tasks/cleanup-08-slop.md` — AI slop, stubs, unhelpful comments
