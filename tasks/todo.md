# Aurea Residences — Ship Plan

**Frame:** Spec piece / creative dev sandbox. Single-page site. The homepage scroll IS the site. Other routes get redirected to anchors. Ship within the week.

**The real gate:** Renders. Everything else is unblocking the ship, not building more.

---

## 1. Kill the wrong ideas

- [x] Decided: no React island for the footer shader (already optimal as vanilla module script)
- [x] Decided: no component library / Relume. Homepage sections are the site. Route pages become anchor targets.

---

## 2. Enquire — section + modal as one thing

The enquire section and the modal are the same component with two triggers. Current `Enquiry.astro` (345 lines) becomes the modal. The inline section becomes a trigger band.

- [ ] Refactor `Enquiry.astro` into a modal dialog (portal/fixed positioning, backdrop, focus trap, Esc to close)
- [ ] Replace inline enquiry section on homepage with a minimal trigger band: headline ("Schedule a private viewing") + single CTA button
- [ ] Wire nav-bar Enquire CTA to open the same modal
- [ ] Remove Enquire link from the menu overlay sidebar (check `src/data/site.ts` nav config)
- [ ] Polish modal finish to match the UI craft doc — shared box model, focus ring, color-mix tokens

---

## 3. Startup perf pass ✅

**The real problem was startup time, not runtime FPS.** Focused on what runs before first paint and first interaction.

- [x] **Consolidated 8 script islands into one bootstrap entry point** (`src/lib/bootstrap.ts`). Single `astro:page-load` / `astro:before-swap` / `astro:after-swap` handler chain. ClientRouter re-fires on every nav — one bootstrap beats 8.
- [x] **`three/webgpu` deferred via dynamic import.** `bootstrap.ts` does `await import('./footer-shaders')` only when needed. Vite splits it into its own 790KB chunk that no longer blocks first paint.
- [x] **Footer shader gated on idle + IO.** `IntersectionObserver` with `800px` rootMargin on `[data-footer]`, then `requestIdleCallback` (with `setTimeout` fallback) before the dynamic import fires. Brand-tint overlay is the fallback while loading.
- [x] **GSAP `registerPlugin` audit.** Vite already dedups the gsap chunk; multiple `registerPlugin(ScrollTrigger)` calls are idempotent. Left in place — moving them centrally would risk module-load-order bugs for tiny gain.
- [x] **Fonts moved to `/public/fonts/`** for stable URLs, preloaded `TestSohne-Leicht.woff2` (display 300, hero) + `AktivGrotesk-Regular.woff2` (body 400) via `<link rel="preload">`. `font-display: swap` already in place.
- [ ] **Measure.** Run Lighthouse on the deployed/dev build. Critical JS dropped from ~871KB → ~81KB (10×). Watch TBT and LCP improvements; the shader load shows up later in the trace as a deferred chunk.

---

## 4. Renders & videos (user-owned, parallel track)

Longest lead. Start immediately, cook while other tasks run.

- [ ] 3 lightweight videos: nav preview clips, hero ambient, one other (TBD)
- [ ] Hero still — Edgewater golden hour, north-facing bay, architectural language, amber palette matching footer gradient
- [ ] Vision section imagery (facade, tower form)
- [ ] Residences section imagery (interiors, terrace views)
- [ ] Lifestyle section imagery (amenities as experiences)
- [ ] Neighbourhood section imagery (already has some — audit gaps)
- [ ] Favicon + OG image

---

## 5. Route pages → anchor redirects

- [ ] Convert nav links from `/vision`, `/residences`, etc. to `/#vision`, `/#residences`
- [ ] Add anchor IDs to homepage sections
- [ ] Replace `src/pages/vision.astro`, `residences.astro`, `lifestyle.astro`, `location.astro`, `neighbourhood.astro`, `team.astro` with redirect stubs (meta refresh to `/#section` or 301 via Netlify `_redirects`)
- [ ] Smooth-scroll to anchor on click (Lenis handles this natively — verify)
- [ ] Keep `404.astro`

---

## 5b. Content — Astro Content Collections (decided)

**Decision:** No external CMS. Content Collections only. Reasons and full migration queue in `tasks/content-migration-plan.md`.

- [x] Neighbourhood migrated to `src/content/neighbourhood/*.yaml` + `content.config.ts`
- [x] Dining removed from Neighbourhood (brand-asset concern)
- [ ] Residences → collection (`src/content/residences/*.yaml`, move JPGs into `src/assets/images/`)
- [ ] Lifestyle slider → collection (`src/content/lifestyle/*.yaml`, move JPGs into `src/assets/images/`)
- [ ] Vision → single MDX entry (`src/content/pages/vision.mdx`, pages collection)
- [ ] Extract COUNTRIES from `Enquiry.astro` → `src/data/countries.ts`
- [ ] `npx astro check` — verify no new errors beyond the 7 pre-existing baseline
- [ ] Commit per slice (Residences / Lifestyle / Vision / Countries)

**Not doing:** Keystatic / Decap / Sanity. Aurea is a spec piece — no client, no editorial rhythm, no React island in a vanilla GSAP + Three.js codebase. If it becomes a live client later, any git-based CMS can bolt on top of the same collection file structure with minimal churn.

---

## 6. Ship

- [ ] Final pass on homepage scroll (read top-to-bottom, cut anything forgettable)
- [ ] Deploy to Netlify
- [ ] Case study write-up — lead with the footer shader technique (physical model, fBm height field, refraction, directional lighting)
- [ ] Post to portfolio / Read.cv / Twitter
- [ ] Send to 3 Miami dev marketing contacts

---

## Cut (no longer shipping)

These were on the old todo. They're not blockers for the spec piece frame.

- ~~Build out Vision, Residences, Lifestyle, Location, Neighbourhood, Team as separate routes~~ → anchors on homepage
- ~~Mobile nav (hamburger + overlay)~~ → already exists in `Nav.astro` + `nav.ts`, just needs finish pass if broken
- ~~GSAP scroll sequences (pinned sections)~~ → already done where needed
- ~~Page transitions (dark wash fade)~~ → curtain wipe already in place via `page-transition.ts`
- ~~Merge footer haze + shadows into single WebGL pipeline~~ → already done, superseded by WebGPU TSL implementation
- ~~Palm leaf shadow video processing~~ → done
- ~~Font licensing~~ → done, paid fonts in place
