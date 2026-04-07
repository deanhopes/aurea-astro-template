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
├── assets/fonts/     # .woff2 font files (GT Walsheim + Aktiv Grotesk)
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
