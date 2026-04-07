# Aurea Residences — Codebase Reference

**What this is:** Spec project. Luxury waterfront residential tower marketing site, Edgewater, Miami.

**Stack:** Astro 5, vanilla CSS (Lightning CSS bundled with Astro), GSAP, Lenis, TypeScript. Static output, Netlify deploy.

**Design context:** Lives in growth-os, not here. Read before building:
- `D:\Beanos\Dev Stuff\growth-os\active\projects\aurea-residences\` — project index, brief, design direction, wireframes
- `D:\Beanos\Dev Stuff\growth-os\archive\aurea-residences-research\` — competitive research, UX pillars, typography, palette, design patterns

---

## Project Structure

```
src/
├── assets/fonts/     # .woff2 font files (Test Söhne + Aktiv Grotesk)
├── components/       # Astro components (Nav, SEO, section components)
├── layouts/          # BaseLayout (Lenis, scroll reveal, View Transitions)
├── lib/              # Utilities, constants
├── pages/            # Route pages (/, /vision, /residences, etc.)
└── styles/
    ├── fonts.css     # @font-face declarations
    └── global.css    # Design tokens, base styles, utilities
```

---

## Code Conventions

**CSS:** Design tokens defined in `global.css` via CSS custom properties. Use semantic class names (`.text-hero`, `.section`, `.nav-link`, `.link-underline`) not inline styles. Accent colours are gradient/atmospheric only, never solid fills. No utility framework. Lightning CSS (bundled with Astro) handles nesting, `color-mix()`, and minification.

**Motion:** One easing curve: `var(--ease-premium)`. Lenis handles smooth scroll. `data-reveal` attribute for scroll-triggered fade-up. GSAP only for choreographed sequences (pinned sections, staggered reveals).

**Typography:** `font-display` for headings (weight 100-300 only). `font-body` for everything else. No bold headlines.

**Responsive type scale:** Fluid `clamp()` values — no breakpoints needed for text sizing. Nav pills step down at mobile via media query.

| Token | Mobile (393px) | Desktop (1440px) | Value |
|---|---|---|---|
| `--text-hero` | 64px | 144px | `clamp(4rem, 8vw + 1rem, 9rem)` |
| `--text-section` | 32px | 64px | `clamp(2rem, 4vw + 0.5rem, 4rem)` |
| `--text-body` | 16px | 18px | `clamp(1rem, 0.5vw + 0.875rem, 1.125rem)` |
| `--text-ui` | 12px | 14px | `clamp(0.75rem, 0.25vw + 0.6875rem, 0.875rem)` |
| Nav pills | 16px | 18px | `1rem` at `<768px`, `1.125rem` base |

**Responsive spacing:** Fluid `clamp()` values, same pattern as type.

| Token | Mobile | Desktop | Value |
|---|---|---|---|
| `--space-section` | 96px | 160px | `clamp(6rem, 10vw, 10rem)` |
| `--space-block` | 48px | 96px | `clamp(3rem, 6vw, 6rem)` |
| `--space-element` | 24px | 48px | `clamp(1.5rem, 3vw, 3rem)` |

**Components:** Astro components by default. Framework components only when client interactivity is required (use `client:visible` or `client:idle`, never `client:load` unless above the fold).

**Pages:** Each page is a scene, not a brochure layout. One idea per section. Generous spacing (`py-section`).

---

## Commands

```
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run check      # Format + lint check
```
