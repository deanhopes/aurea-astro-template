# Aurea Residences — Next Steps

## Session: 2026-04-07

### Stack switch
- [x] Migrate from Webflow + Vite to Astro 5 + Tailwind 4 + GSAP + Lenis
- [x] Scaffold all 8 pages (Home, Vision, Residences, Lifestyle, Location, Neighbourhood, Team, 404)
- [x] Design system tokens in global.css (palette, type scale, spacing, easing)
- [x] BaseLayout with Lenis smooth scroll + scroll reveal + View Transitions
- [x] Nav component (3 primary links + Enquire CTA)
- [x] SEO component
- [x] ESLint flat config
- [x] Prettier config
- [x] .editorconfig
- [x] Project docs (CLAUDE.md, docs/codebase.md)

### Assets needed
- [ ] **Palm leaf shadow video** — source file at `C:\Users\deanh\Downloads\12394948_3840_2160_24fps.mp4`. Process: downscale to 360p, trim/loop 6-8s, export WebM VP9 (<500KB) + MP4 H.264 fallback → `public/video/leaf-shadows.webm` + `.mp4`. Then test shader compositing and tune threshold/softness/palette.
- [ ] **Favicon** — design and add `public/favicon.svg`
- [ ] **OG image** — create `public/og.jpg` (1200x630, hero render or wordmark on silver)
- [ ] **Font files** — license GT Walsheim + Aktiv Grotesk, add .woff2 to `src/assets/fonts/`, fill in `fonts.css`

### Build: pages
- [ ] Home — hero (full viewport, render + typographic headline), vision teaser, residences teaser, location teaser
- [ ] Vision — architectural philosophy, design concept, facade, tower form
- [ ] Residences — unit types, terrace living, interiors
- [ ] Lifestyle — amenities as experiences (biohacking, cold plunge, private chef)
- [ ] Location — Edgewater on the map, connectivity, the bay
- [ ] Neighbourhood — dining, culture, Margaret Pace Park, Design District, Wynwood
- [ ] Team — architect, developer, interior design credibility
- [ ] 404 — on-brand (already scaffolded, needs polish)

### Build: components
- [ ] Enquire modal (global, persistent CTA in nav)
- [ ] Mobile nav (hamburger + overlay)
- [ ] GSAP scroll sequences (pinned sections, staggered reveals)
- [ ] Page transitions (dark wash fade, 0.8-1.2s)

### Refactor
- [ ] **Merge footer haze + shadows into single WebGL pipeline** — currently Canvas 2D (7-ring gradient) + WebGL (video shadow threshold) on two separate canvases. Combine into one fragment shader: procedural gradient + video texture multiply in a single draw call. Eliminates a compositing layer and unifies scroll/mouse state.

### Polish
- [ ] Responsive breakpoints (all pages)
- [ ] Real renders/photography (replace placeholder copy)
- [ ] Performance audit (Lighthouse, CWV)
- [ ] Case study write-up (after ship)
