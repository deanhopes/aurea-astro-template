# Cleanup 01 — Duplication & DRY Consolidation

Research-only pass. No edits made.

## 1. Critical assessment

The codebase is mostly DRY where it counts. Content is already collection-driven (Residences, Lifestyle, Neighbourhood, Vision), GSAP lifecycle is centralised through `bootstrap.ts`, design tokens live in `:root`, and one easing curve (`--ease-premium`) is honoured. That's the bones of a clean spec piece.

Where it slips is three places, and they're all the same story: **this codebase was built section-by-section before a system was imposed, and the seams never got cleaned up.** Specifically:

1. **CSS has parallel BEM'd copies** of the same "section eyebrow + section heading" pattern across four components (`.vision__`, `.lifestyle__`, `.residences__`, `.neighbourhood__`, `.enquiry__`). Some were already pulled into a group selector (labels — `global.css:1693-1704`), but headings were missed. The same four-rule block is pasted four times verbatim.
2. **A large chunk of dead CSS survived from an earlier footer design.** `.site-footer__enquiry*` and `.site-footer__dropdown*` were replaced by `.enquiry__*` in `Enquiry.astro` but the old rules (roughly 200 lines) are still shipped.
3. **The six stub pages are pure copy-paste.** Six `.astro` files render the same `BaseLayout > section.section.section--inner > .content-narrow > h1.text-hero + p.text-body-muted.content-text.mt-md` skeleton with one word swapped.

Everything else I flag is smaller. The GSAP code has duplicated `scrollTrigger: { start: 'top 85%', once: true }` blocks, but only four of them — within the ceiling where DRY starts hurting readability. I'd leave most of those alone.

The codebase is not bloated. It's ~6.4k lines total, of which ~3.1k is CSS. Consolidating the five items below removes ~350 lines without touching any live behaviour.

## 2. High-confidence recommendations

### H1. Delete dead CSS: `.site-footer__enquiry*` / `.site-footer__dropdown*` / `.rwpaper`

**Where:** `src/styles/global.css:754-960` (enquiry block), `:962-968` (`.rwpaper`), `:1571-1578` (footer-shadows submit/dropdown mobile overrides), `:3012-3036` (footer enquiry responsive)

**Why:** Grep across the codebase: zero `.astro` files reference any `.site-footer__enquiry*`, `.site-footer__dropdown*`, or `.rwpaper` class. The enquiry section was refactored into `.enquiry__*` in `Enquiry.astro` and these rules are the previous implementation left behind.

**Shape of fix:** Delete. ~210 lines removed. No visual change.

### H2. Delete dead CSS: `.section--hero`

**Where:** `src/styles/global.css:1646-1652`

**Why:** No `.astro` file applies `section--hero`. `.section--inner` and `.section--center` are used; `section--hero` is orphan.

### H3. Delete dead module: `neighbourhood-inertia.ts`

**Where:** `src/lib/neighbourhood-inertia.ts` (70 lines)

**Why:** `initNeighbourhoodInertia` / `destroyNeighbourhoodInertia` are exported but never imported — not in `bootstrap.ts`, not anywhere. Grep confirms the symbols appear only in their own definitions. Either this was WIP abandoned, or neighbourhood-hover-parallax was removed from the design and the file got orphaned.

**Shape of fix:** Delete the file. If the parallax-on-hover was intentional and forgotten, that's a different task and belongs in the UX agent's bucket — but as shipped, it is dead code in the bundle graph (actually pruned by Vite since it's never imported, but still live source noise).

### H4. Delete dead animation handlers in `animations.ts`

**Where:** `src/lib/animations.ts:24-40` (`animateLifestylePairImages`) and `src/lib/animations.ts:42-56` (`animateContainedParallax`)

**Why:**

- `animateLifestylePairImages` targets `.lifestyle__pair-image` and `.lifestyle__pair` — neither class exists in any `.astro` file. The Lifestyle section uses `.lifestyle__slider` / `.lifestyle__slide`, handled by `lifestyle-slider.ts`.
- `animateContainedParallax` targets `[data-parallax]` — zero usages in any component.

Both are called from `initAnimations()` (lines 101, 103) but bail on empty query. Dead but loaded every page.

**Shape of fix:** Delete both functions and their `initAnimations` call sites.

### H5. Eliminate `<style>` block in `FooterShadows.astro` (violates CLAUDE.md convention)

**Where:** `src/components/FooterShadows.astro:29-57`

**Why:** `CLAUDE.md` / `docs/codebase.md` require all CSS in `global.css`. The component embeds a scoped `<style>` block — and worse, two of the three rules (`.footer-shadows__video`, `.footer-shadows`) are **already duplicated** in `global.css:695-710`. So this is both a convention break and a true duplicate. The only rule that lives exclusively in the `<style>` block is `.footer-shadows__overlay` (:47-56), which needs to move to `global.css`.

**Shape of fix:** Move `.footer-shadows__overlay` into `global.css` alongside its siblings (~line 710). Delete the `<style>` block. No visual change.

### H6. Parameterise the six stub pages

**Where:** `src/pages/vision.astro`, `residences.astro`, `lifestyle.astro`, `neighbourhood.astro`, `location.astro`, `team.astro` (16-19 lines each, ~100 lines total)

**Why:** All six are the exact same 12 lines of JSX with three strings swapped (title, heading, body). The diff between vision.astro and location.astro is: two string literals. Nothing else. This is the textbook parameterisation candidate.

**Shape of fix:** One of two approaches, both clean:

Option A — single dynamic route:

```
src/pages/[stub].astro
```

with `getStaticPaths()` returning the six slugs and their copy pulled from `src/data/pages.ts` (or a new `stubs` collection if you want content-collection consistency). Pages become data, not files.

Option B — shared `StubPage.astro` component:

```astro
<StubPage title="Vision" heading="Vision" body="Architectural philosophy…" />
```

and each file becomes three lines. Slightly less elegant than A but keeps per-page `.astro` files if you want them for future custom work.

I'd recommend A. These pages are placeholders waiting for real content — each one will grow its own layout eventually, and when that happens you fork it out of the dynamic route into a named page. Until then, one file instead of six.

**Confidence:** High, but pause briefly to confirm the stubs really are stubs (vs. "we'll flesh this out this week and then A gets in the way"). If the plan is to replace all six with bespoke pages in the next sprint, skip this — the work will undo itself.

### H7. Merge `.enquiry__heading`, `.lifestyle__heading`, `.residences__heading`, `.neighbourhood__heading`

**Where:** `global.css:1007-1014`, `:2299-2306`, `:2507-2517`, `:2664-2672`

**Why:** All four blocks have identical bodies:

```css
font-family: var(--font-display);
font-weight: 300;
font-size: clamp(2rem, 3vw + 1rem, 3.5rem);
letter-spacing: -0.03em;
line-height: 1.1;
color: var(--color-black);
```

(The `residences__heading` adds `text-align: center; margin-top: 1rem; margin-bottom: var(--space-block);` which is presentation-context, not type.) The typography is shared; only alignment/margin differs by context.

**Shape of fix:** Promote the six-property body to a utility class — naming convention already exists for this: add `.text-section-heading` next to `.text-hero` / `.text-section` in `@layer utilities` (~line 1680). Apply it in the four component templates, keep only the context-specific overrides (text-align, margin-top) on the BEM class. Mirrors how `.vision__label, .lifestyle__label, .residences__label, .neighbourhood__label` was already grouped on line 1693.

### H8. Merge section eyebrow/label into the existing grouped selector

**Where:** `global.css:1693-1704` (existing group), plus `:999-1005` (`.enquiry__eyebrow`), `:1627-1634` (`.hero__label`)

**Why:** The grouped `.vision__label, .lifestyle__label, .residences__label, .neighbourhood__label` is _already_ the consolidation. But `.enquiry__eyebrow` and `.hero__label` have functionally identical styling (uppercase, 500 weight, 0.875rem, 0.16em tracking, muted color) and were missed. The pattern exists; just extend it.

**Shape of fix:** Either add those two selectors to the existing group, or (cleaner) promote the rule body to a new utility class `.text-eyebrow` and apply it across all six components. Latter is more robust — `.hero__label` currently has no color rule because it inherits from `hero__content`'s `color: var(--color-background)`, so the utility class path needs a color override on the hero case. Minor.

## 3. Medium-confidence recommendations

### M1. Unify the nav link source of truth

**Where:** `src/data/site.ts:11-27` (`nav.menu.cards/links/secondaryLinks`) vs `src/components/Footer.astro:7-23` (`linkGroups`)

**Why:** Same destinations encoded twice. The footer's `linkGroups` hard-codes `/vision`, `/residences`, `/lifestyle`, `/neighbourhood`, `/location`, `/team`, `/blog`, `/terms`, `/privacy`. Meanwhile `site.ts` holds `cards` (vision/residences/lifestyle), `links` (neighbourhood/location/team), `secondaryLinks` (blog/terms/privacy). The groupings are _almost_ the same but not quite — Neighbourhood sits in cards-group of the footer but links-group of the nav. So the footer groups are slightly different ordering.

**Tradeoff:** The nav and footer genuinely group differently (nav foregrounds three feature cards; footer gets four primary + three secondary). Forcing them to share one array means adding a `footerGroup` field or a separate export, which is more indirection than it saves. But two hard-coded URL lists that can drift is also not great.

**Shape of fix:** Export a flat `pages` array from `site.ts` with `{ label, href, navGroup, footerGroup }` and project it in both components. Mid confidence because the abstraction may be more code than the copy it removes — worth discussing whether the drift risk justifies the indirection.

### M2. Factor the "reveal-on-scroll-up" animation pattern in `animations.ts`

**Where:** `src/lib/animations.ts:58-94`

**Why:** Inside `animateLifestyleText` and `animateResidencesReveals` the same tween shape repeats four times:

```js
gsap.from(el, {
  y: 20|30|40, opacity: 0, duration: 0.9-1, ease: 'expo.out', [stagger],
  scrollTrigger: { trigger: X, start: 'top 85%', once: true },
});
```

It's the scroll-reveal version of `[data-reveal]` — a GSAP variant used when you need stagger that CSS can't do.

**Tradeoff:** This is four calls. Three would be fine, four starts to itch, but a helper (`reveal(el, { stagger, y, trigger })`) only saves ~3 lines per call and adds one layer of indirection. Worth it only if you expect more of these as the other pages get built out.

**Shape of fix:** If yes → add a `revealUp()` helper in `animations.ts`. If no → leave it; don't pre-abstract.

### M3. Collapse Vision's two near-identical `@media` blocks

**Where:** `global.css:2168-2233` (`@media (max-width: 1023px)`) and `:2236-2275` (`@media (prefers-reduced-motion: reduce)`)

**Why:** The reduced-motion block flattens the horizontal scroll to a vertical stack — basically the same thing as the tablet/mobile layout. Nine of the twelve rules in the reduced-motion block are byte-identical to the 1023px block (`.vision__sticky { height: auto; overflow: visible }`, `.vision__track { flex-direction: column… }`, `.vision__panel { width: 100% !important }`, etc.).

**Tradeoff:** You could combine them with a comma selector:

```css
@media (max-width: 1023px), (prefers-reduced-motion: reduce) { ... }
```

and then keep the small tablet-only deltas in a second block. That's ~35 lines saved but makes the intent slightly fuzzier to a reader who doesn't know both conditions force the same layout.

**Shape of fix:** Use the OR media query. Document the intent in a short comment. Medium confidence because "tablet layout" and "reduced-motion fallback" drifting apart is a real possibility — if you ever want the reduced-motion desktop version to keep the horizontal panels but cut the scrub animation, the merged block becomes a constraint.

### M4. Unify dropdown popover styling for phone + residence selects

**Where:** `global.css:1211-1234` (`.enquiry__phone-popover`) and `:1356-1381` (`.enquiry__select-menu`)

**Why:** Both popovers share: absolute positioning, `top: calc(100% + 4px)`, `background: var(--color-background)`, same border, same radius, same opacity/visibility transition, same shadow. Only width differs (phone = fixed 280px, select = `left: 0; right: 0`).

**Tradeoff:** Abstracting makes the HTML template messier — each popover class is BEM'd to its parent and re-parenting to a shared `.popover` utility would need ARIA and positioning adjustments in `Enquiry.astro` script.

**Shape of fix:** Shared `.popover` + `.popover--fixed-width` modifier, or just a `@extend`-style group selector:

```css
.enquiry__phone-popover,
.enquiry__select-menu {
  /* shared body */
}
.enquiry__phone-popover {
  width: 280px;
}
.enquiry__select-menu {
  left: 0;
  right: 0;
}
```

Latter is simpler and doesn't require touching the template. ~25 lines saved.

### M5. Share the Vision/Lifestyle/Residences/Neighbourhood section-intro block as an Astro component

**Where:** 4 components each render a `(label, heading)` pair with near-identical markup.

**Why:** Each component's top-of-section contains some variant of:

```astro
<p class="X__label">Label</p>
<h2 class="X__heading">Heading</h2>
```

With H7 + H8 from above the CSS gets DRY'd. You could then collapse the markup to:

```astro
<SectionIntro label="The Lifestyle" heading="A sanctuary calibrated..." align="left|center" />
```

**Tradeoff:** This is one layer of indirection for five lines of markup. In editorial code, being able to see the literal `<h2>` in the component file is worth more than the DRY. I would **not** do this unless the intro block grows more machinery (decorative rule, animation hook, icon) — at that point the component pays for itself.

**Shape of fix:** Leave markup per-component. Do the CSS consolidation (H7, H8) only.

## 4. Rejected candidates

### R1. GSAP `gsap.context(() => { gsap.matchMedia().add(...) })` setup boilerplate

Every module (`animations.ts`, `vision-scroll.ts`, `neighbourhood-inertia.ts`) opens with the same `let ctx; ctx = gsap.context(() => { matchMedia().add(...) })` scaffolding. Looks duplicated — but the scaffolding is GSAP's prescribed cleanup pattern for each distinct lifecycle scope. Abstracting it into a `withGsapContext(fn)` helper would save 4-5 lines per module at the cost of one more thing to understand. The GSAP cleanup idiom is standard enough that any engineer reading these files already knows it. **Leave alone.**

### R2. `scrollTrigger: { start: 'top 85%', once: true }` repeated in `animations.ts`

Four usages. Could be a `const REVEAL_TRIGGER = { start: 'top 85%', once: true }`. I didn't flag it in H because four repetitions is the line where explicit wins over clever — a constant saves zero cognitive load on the reader, and the inline version reads more directly ("at 85% of viewport, fire once") than a named constant ever will. **Leave inline.**

### R3. Neighbourhood `crossfadeImages` / `crossfadeMaps` / `crossfadeText`

Three functions in `neighbourhood.ts:22-164`. Each crossfades one channel (image / iframe / text panel) with slightly different semantics (images animate scale, maps deal with lazy-load + iframe state, text animates children stagger). Looks like three copies of a single "swap active element" routine, but the behaviours actually diverge enough that a unified helper would end up with three boolean/mode flags. Explicit triplet is clearer. **Leave alone.**

### R4. Content collection schemas in `content.config.ts`

Four `defineCollection` blocks with `image()`, `alt`, `order`. Could share a base shape. But the collections only share `order: z.number()` as a true universal — everything else diverges (residences has `specs`, neighbourhood has `mapEmbed`, lifestyle has `top`/`bottom`). A base schema saves three lines and loses clarity. **Leave alone.**

### R5. Hero `<video>` vs Vision `<video>` markup

Both use `autoplay muted loop playsinline` with similar attributes. Two instances is not duplication. Three would be. **Leave alone.**

### R6. `.btn` component styling overlap with `.enquiry__submit` / `.site-footer__enquiry-submit`

`site-footer__enquiry-submit` replicates `.btn.btn--primary` verbatim — but it's in the dead CSS block being removed by H1, so the "duplication" disappears when that dies. Not a separate recommendation. Enquiry's submit button already uses `.btn.btn--primary` correctly (`Enquiry.astro:171`). **Covered by H1.**

### R7. Reveal observer in `bootstrap.ts` and GSAP-based reveals in `animations.ts`

Two reveal mechanisms coexist: CSS `[data-reveal]` transitions wired to an `IntersectionObserver` in `bootstrap.ts:25-48`, and GSAP `gsap.from(..., scrollTrigger: ...)` calls in `animations.ts`. Could be unified. Rejected because they serve different needs: `[data-reveal]` is lightweight, stateless, and used dozens of times across components (cheap); the GSAP calls do stagger + custom distances that CSS can't. Two tools for two jobs. **Leave alone.**

### R8. `transition: X 300ms var(--ease-premium)` repeated ~40 times across global.css

Could become a `.transition-color-default` utility or a custom property like `--transition-default: 300ms var(--ease-premium)`. I looked at it — the transitions actually vary in which property is being animated (color vs border-color vs transform vs opacity), and the current tokens `--transition-reveal` / `--transition-color` already handle the two cases that genuinely repeat. Any further abstraction gets into "utility class soup" territory. **Leave alone.**

---

## Summary

**Delete (high confidence):** H1, H2, H3, H4 — ~290 lines of dead code, zero risk.

**Consolidate (high confidence):** H5 (move style block), H6 (stub pages), H7 (heading utility), H8 (eyebrow utility) — ~100 lines saved, structural improvements.

**Discuss first (medium confidence):** M1 (nav source of truth), M2 (reveal helper), M3 (vision media query merge), M4 (popover shared rules).

**Rejected:** 8 candidates. The most important rejection is R5 — I resisted abstracting the 4 components' intro blocks into `<SectionIntro>`, because the editorial readability of seeing literal `<h2>` tags in each section is worth more than the ~20 lines of repetition it saves.

Net impact if all high-confidence items land: ~390 lines removed from a 6.4k-line codebase, no behaviour change, one convention violation fixed (`<style>` in `.astro`), six stub pages collapsed to one.
