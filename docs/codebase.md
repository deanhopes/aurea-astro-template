# Aurea Astro Template — Codebase Reference

**What this is:** Astro template for luxury real estate marketing sites. Aurea Residences is the demo content — a fictional waterfront residential tower — shipped so the template works out of the box.

**Stack:** Astro 5, vanilla CSS (Lightning CSS bundled with Astro), GSAP, Lenis, TypeScript. Static output. Deploys anywhere (Netlify, Vercel, Cloudflare Pages).

**Design context:** All design decisions for this template live in `docs/`:

- `docs/soul.md` — design posture, quality standard, voice
- `docs/ui-craft.md` — component and interaction patterns
- `docs/sitemap.md` — page structure and section map
- `README.md` — setup, structure, customisation, Claude Code usage

---

## Project Structure

```
src/
├── assets/fonts/     # .woff2 font files (Cormorant Garamond + DM Sans, OFL licensed)
├── components/       # Astro components (Nav, SEO, section components)
├── layouts/          # BaseLayout (Lenis, scroll reveal, View Transitions)
├── lib/              # Utilities, constants
├── pages/            # Route pages (/, /terms, /privacy, /404)
└── styles/
    ├── fonts.css     # @font-face declarations
    └── global.css    # Design tokens, base styles, utilities
```

---

## Code Conventions

**CSS architecture:** Styles split across `src/styles/` by layer and component. Entry point `global.css` declares the layer order and `@import`s each file with a `layer()` qualifier. No `<style>` blocks in `.astro` files — ever. Scoped styles cause split-brain: the same class can be defined in two places with different rules, and the browser merges them silently. Organising by file is fine; duplicating a selector across files is not.

```
src/styles/
  global.css                 @layer decl + @imports only
  tokens.css                 design tokens (custom properties)
  base/
    reset.css                box-sizing, margin/padding zero
    base.css                 html, body, h1-h3, p, a, ::selection, [data-reveal]
  components/                one file per component, BEM-named
    header.css  nav.css  button.css  site-footer.css  footer-shadows.css
    enquiry.css  overlay.css  calendar.css  detail.css
  sections/                  one file per page section
    section.css  hero.css  vision.css  lifestyle.css  residences.css  neighbourhood.css
  utilities/
    text.css  grid.css  content.css  link-underline.css
```

Import order within a layer matters — `global.css` preserves the cascade. When adding a new component, append its import at the bottom of the component block unless you know it needs to override an existing one.

**CSS:** Design tokens defined in `global.css` via CSS custom properties. Use semantic class names (`.text-hero`, `.section`, `.nav-link`, `.link-underline`) not inline styles. Accent colours are gradient/atmospheric only, never solid fills. No utility framework. Lightning CSS (bundled with Astro) handles nesting, `color-mix()`, and minification.

**Border radius:** 5-step scale — `--radius-sm` (2px), `--radius-md` (4px, default), `--radius-lg` (6px), `--radius-xl` (8px), `--radius-2xl` (12px). Nested elements must use concentric radii — inner radius = outer radius minus the gap between them. If padding ≥ outer radius, inner element gets `0`.

**Motion:** One easing curve: `var(--ease-premium)` — `cubic-bezier(0.19, 1, 0.22, 1)`. Two composite transitions: `--transition-reveal` (opacity+transform 0.8s) and `--transition-color` (color+border 0.3s). Lenis handles smooth scroll. `data-reveal` attribute for scroll-triggered fade-up. GSAP only for choreographed sequences (pinned sections, staggered reveals).

**Typography:** `--font-display` (Cormorant Garamond) for headings (weight 400). `--font-body` (DM Sans) for everything else (weights 300, 400, 500). No bold headlines.

**Responsive type scale:** Fluid `clamp()` values — no breakpoints needed for text sizing. Nav pills step down at mobile via media query.

| Token            | Mobile (393px) | Desktop (1440px) | Value                                          |
| ---------------- | -------------- | ---------------- | ---------------------------------------------- |
| `--text-hero`    | 64px           | 144px            | `clamp(4rem, 8vw + 1rem, 9rem)`                |
| `--text-section` | 40px           | 64px             | `clamp(2.5rem, 4vw + 0.5rem, 4rem)`            |
| `--text-body`    | 16px           | 18px             | `clamp(1rem, 0.5vw + 0.875rem, 1.125rem)`      |
| `--text-ui`      | 12px           | 14px             | `clamp(0.75rem, 0.25vw + 0.6875rem, 0.875rem)` |
| Nav pills        | 16px           | 18px             | `1rem` at `<768px`, `1.125rem` base            |

**Responsive spacing:** Fluid `clamp()` values, same pattern as type.

| Token             | Mobile | Desktop | Value                                          |
| ----------------- | ------ | ------- | ---------------------------------------------- |
| `--space-section` | 96px   | 160px   | `clamp(6rem, 10vw, 10rem)`                     |
| `--space-block`   | 48px   | 96px    | `clamp(3rem, 6vw, 6rem)`                       |
| `--space-element` | 24px   | 48px    | `clamp(1.5rem, 3vw, 3rem)`                     |
| `--space-edge`    | 4px    | 4px     | `4px` — viewport-edge inset for all sections   |
| `--space-gap`     | 4px    | 4px     | `4px` — standard gap between adjacent elements |

**Colour:** Warm parchment palette. `--color-background` (#f9efe6), `--color-black` (#323032), `--color-accent` (#ef5d2a). Ink opacity scale (`--ink-08` thru `--ink-70`) via `color-mix(in srgb, var(--color-black) N%, transparent)`. `srgb` chosen deliberately — achromatic charcoal-to-transparent mixing has no gamut benefit from oklch. Button hover states use `oklch()` lightness shifts for perceptual accuracy where chroma matters.

**Components:** Astro components by default. Framework components only when client interactivity is required (use `client:visible` or `client:idle`, never `client:load` unless above the fold).

**Pages:** Each page is a scene, not a brochure layout. One idea per section. Generous spacing (`py-section`).

---

## CSS Architecture Reference

**Layer order:** `@layer reset, base, tokens, components, sections, utilities, overrides;`

Each layer's role:

| Layer        | Purpose                                                              | Rough line count |
| ------------ | -------------------------------------------------------------------- | ---------------- |
| `reset`      | Box-sizing, margin/padding zero                                      | ~5               |
| `base`       | html defaults, heading resets, `[data-reveal]` system, `::selection` | ~30              |
| `tokens`     | Custom properties — colour, type, spacing, radii, easing             | ~60              |
| `components` | Header/nav, menu panel, buttons, footer, enquiry form                | ~1200            |
| `sections`   | Hero, vision, lifestyle, residences, neighbourhood                   | ~800             |
| `utilities`  | Text presets, 12-col grid, link-underline animation                  | ~120             |
| `overrides`  | Reserved, currently empty                                            | 0                |

**Patterns used throughout:**

- All hover effects gated by `@media (hover: hover)` — no sticky-hover on touch
- Touch targets gated by `@media (pointer: coarse)` → `min-height: 44px`
- `content-visibility: auto` on below-fold sections for rendering perf
- `prefers-reduced-motion: reduce` fallback on vision section
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs
- Flat selectors with BEM-like naming — no CSS nesting used
- State classes: `.is-active`, `.is-open`, `.is-done`, `.is-submitting` (set via JS)
- Mobile breakpoints: `767px` (phone), `1023px` (tablet), `1279px` (small desktop)

**Deliberate omissions (audited, decided against):**

- **CSS nesting** — would reduce line count ~30% but touching 2500 lines of working CSS for DX alone isn't worth it mid-project.
- **Logical properties** — LTR-only luxury site. No i18n planned. Physical properties are correct.
- **`@property` registration** — GSAP handles complex animations. CSS transitions use composite shorthands, not animating custom properties directly.
- **`:has()` selectors** — state classes (`.is-active`, etc.) are set by JS for good reason (GSAP timelines, drag interactions, form logic).
- **`@scope`** — BEM prefixes work. `@scope` browser support (Baseline 2025) too fresh for production spec piece.
- **`forced-colors` support** — not scoped for this project, but worth adding if accessibility audit is requested.

---

## Component References

The four complex components each have a dedicated doc in `docs/components/`. Read before editing — they explain the mechanism, not just the API.

| Component                                    | What to read before touching it       |
| -------------------------------------------- | ------------------------------------- |
| Footer (WebGPU shader)                       | `docs/components/footer.md`           |
| Vision (horizontal pin-scroll)               | `docs/components/vision.md`           |
| Lifestyle slider (Draggable + infinite wrap) | `docs/components/lifestyle-slider.md` |
| Residences (content collections + overlays)  | `docs/components/residences.md`       |

**First time in the codebase?** Start with `docs/getting-started.md`.

---

## Commands

```
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run check      # Astro type-check
npm run lint       # ESLint + Prettier check (run before build)
npm run fix        # ESLint --fix + Prettier --write (auto-fix what can be fixed)
```

Run `npm run lint` before every build. If it errors, fix before merging — warnings (complexity, max-lines) are informational and won't block.

The config enforces: import order, no hex colors in TS/Astro, no floating promises, no implicit coercion, no param reassign, typed TS rules (`prefer-nullish-coalescing`, `prefer-optional-chain`, `no-misused-promises`), and jsx-a11y on Astro files. Prettier normalises formatting — run `npm run fix` after bulk edits.
