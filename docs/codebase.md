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

**Border radius:** 4px standard (`border-radius: 4px`). Nested elements must use concentric radii — inner radius = outer radius minus the gap between them. If padding ≥ outer radius, inner element gets `0`.

**Motion:** One easing curve: `var(--ease-premium)`. Lenis handles smooth scroll. `data-reveal` attribute for scroll-triggered fade-up. GSAP only for choreographed sequences (pinned sections, staggered reveals). Footer shadows use raw WebGL (no p5.js/Three.js) to keep the bundle lean.

**Typography:** `font-display` for headings (weight 100-300 only). `font-body` for everything else. No bold headlines.

**Responsive type scale:** Fluid `clamp()` values — no breakpoints needed for text sizing. Nav pills step down at mobile via media query.

| Token            | Mobile (393px) | Desktop (1440px) | Value                                          |
| ---------------- | -------------- | ---------------- | ---------------------------------------------- |
| `--text-hero`    | 64px           | 144px            | `clamp(4rem, 8vw + 1rem, 9rem)`                |
| `--text-section` | 32px           | 64px             | `clamp(2rem, 4vw + 0.5rem, 4rem)`              |
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

**Components:** Astro components by default. Framework components only when client interactivity is required (use `client:visible` or `client:idle`, never `client:load` unless above the fold).

**Pages:** Each page is a scene, not a brochure layout. One idea per section. Generous spacing (`py-section`).

---

## Footer Rendering Pipeline

The footer uses a fixed-reveal pattern (`z-index: -1`, `margin-bottom: 100dvh` on `#main-content`). It has two visual layers inside `.site-footer__inner`:

1. **WebGPU canvas** (`footer-shadows.ts`) — Three.js WebGPU + TSL. Single opaque canvas that IS the footer background. Three TSL layers composited in one pass:
   - Vertical gradient (warm parchment `#f9efe6` → sunset orange `#d95f2a`) driven by `uv.y`
   - Three-octave caustic light interference pattern (interior light through water glass)
   - Video shadow mask: palm leaf silhouettes via luminance threshold shader
2. **Content** — enquiry form (two-column card), nav links, AUREA wordmark (`z-index: 1`, above canvas)

Scroll progress (`uProgress`) and mouse position (`uMouse`) driven by GSAP ScrollTrigger + `quickTo` on `[data-footer-trigger]`. Mouse shifts the caustic UV origin subtly. No `mix-blend-mode` — canvas is opaque background.

**Shadow video requirements:** `public/video/leaf-shadows.webm` + `.mp4` fallback. Palm/monstera leaf shadows on a warm wall. 360p, 6-8s seamless loop, <500KB WebM. Lazy-loaded via IntersectionObserver (200px rootMargin). Texture upload capped at 15fps. System works without the video — shadow mask is transparent, gradient + caustics still render.

---

## Commands

```
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run check      # Format + lint check
```
