# Aurea — Astro Template for Luxury Real Estate

A production-grade one-pager template for luxury residential marketing sites.
Built in Astro 5, vanilla CSS, GSAP, Lenis, Three.js WebGPU. Designed to be
cloned, rebranded, and shipped as a single development's website.

Ships with full design documentation and a `CLAUDE.md` tuned for Claude Code —
so you (and your AI pair) can customise it without drifting off-spec.

**Live demo:** [aurea-astro-template.netlify.app](https://aurea-astro-template.netlify.app)

---

## What this is (and isn't)

**Is:**

- A single-page site with anchor-scroll navigation
- A design system encoded in `global.css` (tokens, type scale, spacing, motion)
- A set of documented sections (Hero, Vision, Residences, Lifestyle, Neighbourhood, Enquiry)
- A working Three.js WebGPU footer with atmospheric shaders
- SEO and AEO ready — JSON-LD structured data, sitemap, semantic HTML, Open Graph meta
- A `CLAUDE.md` + `docs/` kit so agents stay on-brand when you edit it

**Isn't:**

- A multi-page CMS template (one-pager by design)
- A framework-agnostic boilerplate (Astro-first, components are `.astro`)
- A free-for-all — see [License](#license) before redistributing

---

## Quick start

```bash
git clone https://github.com/deanhopes/aurea-astro-template.git my-site
cd my-site
rm -rf .git && git init
npm install
npm run dev
```

Open `http://localhost:4321`.

### Commands

```bash
npm run dev        # Dev server (Lenis + HMR)
npm run build      # Production static build → dist/
npm run preview    # Preview production build
npm run check      # astro check — type-check templates
npm run lint       # ESLint + Prettier check
npm run fix        # ESLint + Prettier autofix
```

### Deploy

Static output. `netlify.toml` is included — connect the repo on Netlify and
it deploys automatically. For other hosts, set build command `npm run build`
and publish directory `dist`. No serverless required.

---

## Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Framework | Astro 5 (static output)                                     |
| Language  | TypeScript                                                  |
| Styles    | Vanilla CSS + Lightning CSS (nesting, `color-mix`, bundled) |
| Motion    | GSAP 3 + Lenis smooth scroll                                |
| 3D        | Three.js WebGPU + TSL (footer shaders)                      |
| Sitemap   | `@astrojs/sitemap` (auto-generated)                         |
| SEO / AEO | JSON-LD, Open Graph, semantic HTML, `robots.txt`            |
| Linting   | ESLint 9 + Prettier 3 + `astro-eslint-parser`               |

No Tailwind. No runtime framework. No CMS coupling. Content is hard-coded in
section components — ideal for a one-shot development site.

---

## Project structure

```
src/
├── components/       # Section + UI components (.astro)
│   ├── Nav.astro
│   ├── Hero.astro
│   ├── Vision.astro
│   ├── Residences.astro
│   ├── Lifestyle.astro
│   ├── Neighbourhood.astro
│   ├── Enquiry.astro
│   ├── Footer.astro
│   └── seo/Head.astro
├── layouts/
│   └── BaseLayout.astro   # <html>, fonts, Lenis, bootstrap
├── lib/                   # Client JS modules (loaded via bootstrap.ts)
│   ├── bootstrap.ts
│   ├── lenis.ts
│   ├── nav.ts
│   ├── animations.ts
│   ├── footer-shaders.ts
│   └── …
├── pages/
│   ├── index.astro        # The one-pager
│   ├── terms.astro        # Placeholder — replace before launch
│   ├── privacy.astro      # Placeholder — replace before launch
│   └── 404.astro
└── styles/
    ├── fonts.css          # @font-face
    ├── global.css         # @layer declarations + @imports (entry)
    ├── tokens.css         # Design tokens
    ├── base/              # reset, element defaults
    ├── components/        # One file per component (BEM)
    ├── sections/          # One file per page section
    └── utilities/         # Text, grid, link-underline
public/
├── fonts/                 # .woff2 font files
├── video/                 # Background/shader video
├── favicon.svg            # Replace me
├── apple-touch-icon.svg   # Replace me
└── og.jpg                 # Replace me — 1200×630
docs/
├── soul.md                # Design posture, voice, quality standard
├── codebase.md            # Code conventions, CSS architecture
├── sitemap.md             # Section map
└── ui-craft.md            # Component + interaction patterns
CLAUDE.md                  # Agent instructions (Claude Code)
tasks/lessons.md           # Lessons logged during build
```

---

## Customising

### 1. Brand + content

Most visible content lives in section components:

- `Hero.astro` — lead headline, eyebrow, CTA
- `Vision.astro` — architectural philosophy copy + imagery
- `Residences.astro` — unit types, specs, galleries
- `Lifestyle.astro` — amenities slider
- `Neighbourhood.astro` — map, spots, transit
- `Enquiry.astro` — form wiring (hook to your provider)
- `Footer.astro` — wordmark, nav, legal links

Replace copy, swap images in `public/` (or co-locate in `src/assets/`), and
rebuild.

### 2. Design tokens

All visual tokens — colour, type, spacing, radii, easing — live in
`src/styles/tokens.css`. To rebrand:

```css
/* src/styles/tokens.css */
:root {
  --color-background: #f9efe6; /* your parchment */
  --color-black: #323032; /* your ink */
  --color-accent: #ef5d2a; /* your accent */
  --font-display: 'Your Display', serif;
  --font-body: 'Your Body', sans-serif;
}
```

Type scale and spacing are fluid `clamp()` values — no breakpoint tweaking
needed for most rebrands. See `docs/codebase.md` for the full token table.

### 3. Fonts

Default pairing is **Cormorant Garamond** (display) + **DM Sans** (body).
Both are OFL licensed — free for commercial use, no action required.

To swap: replace files in `public/fonts/`, update `src/styles/fonts.css`
`@font-face` declarations, and update the preload links in
`src/layouts/BaseLayout.astro`.

### 4. Sections

Reordering or removing sections:

1. Edit `src/pages/index.astro` — add/remove/reorder `<Component />` tags
2. Update `Nav.astro` anchor links to match
3. Update `docs/sitemap.md` to keep agents aligned

Adding a new section:

1. Create `src/components/YourSection.astro`
2. Give its root element `id="your-section"`
3. Import + place in `index.astro`
4. Add nav link + update sitemap doc

### 5. Footer shaders (optional)

The footer renders a Three.js WebGPU composite (gradient + caustics + video
shadow mask). To disable, remove the `<FooterShadows />` import in
`Footer.astro`. To keep but swap the video, replace
`public/video/leaf-shadows.{webm,mp4}`.

WebGPU gracefully degrades on unsupported browsers — the gradient renders
without shaders.

---

## Using this template with Claude Code

This template is tuned for agentic workflows. If you use Claude Code (or any
agent that respects `CLAUDE.md` + docs):

1. **Read the docs first.** `CLAUDE.md` points agents at `docs/soul.md`,
   `docs/codebase.md`, `docs/sitemap.md`, and `docs/ui-craft.md` on every
   session start. These encode design decisions so agents don't drift.
2. **Update docs as you deviate.** Change the token scale? Update
   `docs/codebase.md`. Add a section? Update `docs/sitemap.md`. The docs are
   the contract between you, the template, and any agent collaborator.
3. **Log lessons.** `tasks/lessons.md` is where recurring corrections land.
   When Claude makes the same mistake twice, the fix is a lesson, not a
   one-off correction.
4. **Plan mode by default.** For non-trivial changes, start in plan mode.
   `CLAUDE.md` already instructs this.

If you're not using Claude Code, delete `CLAUDE.md`, `tasks/`, and keep
`docs/` — they're useful as plain design documentation.

---

## Before you launch

Checklist — don't ship with demo content.

**Content**

- [ ] Replace copy in all section `.astro` components (Hero, Vision, Residences, Lifestyle, Neighbourhood, Enquiry, Footer)
- [ ] Replace images in `src/assets/images/` and video in `public/video/`
- [ ] Edit `src/pages/terms.astro` and `src/pages/privacy.astro` to match your entity and jurisdiction

**Brand**

- [ ] Update tokens in `src/styles/tokens.css` (colours, fonts)
- [ ] Replace `public/favicon.svg`, `public/favicon-dark.svg`, `public/apple-touch-icon.svg`
- [ ] Replace `public/og.jpg` (1200×630, used for social sharing previews)

**Config**

- [ ] Update `site:` in `astro.config.ts` and `url` in `src/data/site.ts` to your production URL
- [ ] Update `src/data/site.ts` — name, description, contact details
- [ ] Update JSON-LD in `BaseLayout.astro` — real unit specs, amenities, address

**Forms**

- [ ] Netlify Forms is pre-wired — just deploy and check the Forms tab in your Netlify dashboard
- [ ] To use a different provider, update `action` and remove the `netlify` attribute in `Enquiry.astro`

**Post-launch**

- [ ] Cookie consent banner (GDPR / ePrivacy — if you're EU/UK)
- [ ] Analytics (Plausible, Fathom, GA4 — your call)
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Lighthouse pass — aim for 95+ across the board

---

## Questions, feedback, hire me

- Template issues / ideas — [open an issue](https://github.com/deanhopes/aurea-astro-template/issues)
- Hire me for a bespoke version — [dean@beanos.io](mailto:dean@beanos.io)
- Work portfolio — [beanos.io](https://beanos.io)

---

## License

Custom license. Short version:

- ✅ Use it to build client and personal sites (commercial use fine)
- ✅ Modify it however you need for those sites
- ❌ Redistribute it as a template, starter, or boilerplate
- ❌ Resell it, bundle it with other products, or repost under a different name

Full text: [LICENSE](./LICENSE).

If you're unsure whether a use is allowed, ask me:
[dean@beanos.io](mailto:dean@beanos.io).

---

Built by [Dean Hope](https://beanos.io). Shipped to teach me something and
hopefully teach you something too.
