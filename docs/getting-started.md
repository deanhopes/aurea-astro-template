# Getting Started

You cloned Aurea. Here's what to know before touching anything.

---

## The map

```
src/
├── components/       # One .astro file per section
├── content/          # YAML data — residences, lifestyle slides, vision copy
├── lib/              # Client JS — one module per feature
├── styles/
│   ├── tokens.css    # Start here to rebrand
│   └── global.css    # Layer imports (order matters — don't reorder blindly)
docs/
├── soul.md           # Design posture — read before changing anything visual
├── codebase.md       # Code conventions + token tables
└── components/       # Deep-dives on the complex pieces
CLAUDE.md             # Agent instructions — keep in sync with docs/
```

The site is a single page (`src/pages/index.astro`) with anchor navigation. Each section is an Astro component. Content flows from YAML files in `src/content/` via Astro's content collections.

---

## The three edits to make it yours

### 1. Brand tokens — `src/styles/tokens.css`

```css
:root {
  --color-background: #f9efe6; /* page background */
  --color-black: #323032; /* text + borders */
  --color-accent: #ef5d2a; /* eyebrows, CTAs */
  --font-display: 'Test Sohne', serif; /* headings */
  --font-body: 'Aktiv Grotesk', sans-serif; /* everything else */
}
```

Change these five properties. Typography scale, spacing, motion, and radius all cascade from them. You don't need to touch anything else for a basic rebrand.

### 2. Demo content — `src/content/`

```
src/content/
├── residences/        # three-bedroom.yaml, four-bedroom.yaml, penthouse.yaml
├── lifestyle/         # 01-edgewater.yaml … 08-residents-lounge.yaml
└── pages/
    └── vision.yaml    # copy for the Vision section
```

Each YAML file is self-documenting — the fields map directly to what appears on screen. Start with `residences/three-bedroom.yaml` to understand the schema, then edit the others. See `docs/components/residences.md` for the full schema breakdown.

Section copy that isn't in YAML (Hero headline, Neighbourhood headers, Enquiry form labels) lives directly in the relevant `.astro` component.

### 3. Fonts — `public/fonts/` + `src/styles/fonts.css`

The defaults (Test Söhne + Aktiv Grotesk) are paid licenses — you need your own files. Replace the `.woff2` files in `public/fonts/`, update the `@font-face` declarations in `src/styles/fonts.css`, and update the preload links in `src/layouts/BaseLayout.astro`.

Any pairing works. The template is designed for a light-weight display font (weight 300) paired with a workhorse body font (weights 300, 400, 500).

---

## Before you launch

Don't ship with these:

- [ ] Placeholder legal copy — edit `src/pages/terms.astro` and `src/pages/privacy.astro`
- [ ] Demo fonts — replace or confirm you hold the license
- [ ] Placeholder favicons — `public/favicon.svg`, `public/apple-touch-icon.svg`
- [ ] Placeholder OG image — `public/og.jpg` (1200×630)
- [ ] Unconnected enquiry form — wire `Enquiry.astro` to Formspree, Netlify Forms, Resend, or your backend
- [ ] Wrong production URL — update `site:` in `astro.config.ts` (needed for sitemap)

---

## Deploy

```bash
npm run build     # produces dist/
```

`dist/` is a fully static site. Drop it anywhere:

- **Netlify** — connect the repo, set build command `npm run build`, publish dir `dist`
- **Vercel** — same, or `vercel deploy`
- **Cloudflare Pages** — same settings
- **Anywhere else** — it's just files

No serverless functions, no backend, no runtime.

---

## Development commands

```bash
npm run dev        # dev server at localhost:4321
npm run build      # production build
npm run preview    # preview the production build
npm run check      # astro type-check
npm run fix        # eslint + prettier autofix
```

---

## What the complex pieces do

The template has four components that go beyond a simple Astro component. Each has its own explainer in `docs/components/`:

| Component        | What makes it complex                                             | Doc                                   |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------- |
| Footer           | Three.js WebGPU shader — gradient + caustics + video mask         | `docs/components/footer.md`           |
| Vision           | Horizontal pin-scroll with nested parallax via GSAP ScrollTrigger | `docs/components/vision.md`           |
| Lifestyle slider | Custom GSAP Draggable with infinite wrap + snap normalisation     | `docs/components/lifestyle-slider.md` |
| Residences       | Content collections + infinite card image slider + overlay system | `docs/components/residences.md`       |

If you want to understand how something works before changing it — start there.

---

## Using this with Claude Code

The `CLAUDE.md` at the project root orients agents on session start. It points at `docs/soul.md` (design standards), `docs/codebase.md` (code conventions), `docs/sitemap.md` (section map), and `docs/ui-craft.md` (interaction patterns).

When you make significant changes, keep the docs in sync. If you change the token scale, update `docs/codebase.md`. If you add a section, update `docs/sitemap.md`. The docs are the memory — without them, agents drift.

`tasks/lessons.md` is where recurring mistakes get logged. Worth reading before a long session.
