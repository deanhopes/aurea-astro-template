# Content Migration Plan — Astro Content Collections

**Decision:** Astro Content Collections. No external CMS, no React island, no hosted service.

**Why:** Aurea is a spec piece. Content is edited by Dean in git. A web admin UI has no user. Content Collections give type-safe schemas, git history, and zero new dependencies — and they don't cascade React into a codebase that's deliberately vanilla GSAP + Three.js. If Aurea becomes a live client project later, Decap or Keystatic can bolt on top of the same file structure with minimal churn.

**Status:** Neighbourhood migrated. Four more migrations queued.

---

## Done

- [x] `src/content.config.ts` created with `neighbourhood` collection + image schema
- [x] `src/content/neighbourhood/{wynwood,design-district,the-bay,margaret-pace}.yaml`
- [x] `Neighbourhood.astro` rewired to `getCollection('neighbourhood')`
- [x] Dining removed (brand-asset concern)
- [x] Images live in `src/assets/images/` (PNG), referenced via `image()` schema

---

## Tomorrow — migration queue

### 1. Residences → collection

- Move `public/images/vision-{interior,tower,sunset}.jpg` → `src/assets/images/residences-{three-bedroom,four-bedroom,penthouse}.jpg` (`git mv` to preserve history)
- Extend `content.config.ts` with `residences` collection: `order`, `name`, `detail`, `image`, `alt`, `specs` (nested `{label, value}[]`)
- Create `src/content/residences/{three-bedroom,four-bedroom,penthouse}.yaml`
- Rewrite `Residences.astro` to use `getCollection('residences')` + `<Image>` component (replaces plain `<img>`)

### 2. Lifestyle slider → collection

- Move `public/images/lifestyle-*.jpg` → `src/assets/images/`
- Extend `content.config.ts` with `lifestyle` collection: `order`, `image`, `alt`, `top`, `bottom`
- Create `src/content/lifestyle/{01..08}-*.yaml`
- Rewrite `Lifestyle.astro`, verify `lifestyle-slider.ts` drag still works unchanged

### 3. Vision → MDX single entry

Vision is one editorial page with three panels — a collection is the wrong shape. One MDX file with frontmatter for label/cta/images/captions, prose body for the long copy.

- Create `src/content/pages/vision.mdx` with frontmatter (label, tower body, card copy, cta, image refs + alts + captions)
- Extend `content.config.ts` with `pages` collection (MDX loader)
- Rewrite `Vision.astro` frontmatter to `getEntry('pages', 'vision')`

### 4. COUNTRIES list → typed data file

Not a collection — reference data. Extract the 26-country array in `Enquiry.astro` to `src/data/countries.ts` as a typed const, import back in.

### 5. Verify

- `npx astro check` — verify no new errors beyond the 7 pre-existing baseline (Enquiry null checks, Hero unused import, lifestyle-slider Draggable casing, neighbourhood.ts closure narrowing, dev/footer.astro import conflict)
- Visual smoke test at `/` — all sections render, images load, no console errors
- `git commit` per-section (Residences / Lifestyle / Vision / Countries) for clean history

---

## Conventions for the migration

- **YAML over MD** for data-only entries (faster to hand-edit, no frontmatter/body split)
- **MDX** only when a single entry has meaningful prose body
- **Image paths** relative to the YAML file, resolved by the `image()` schema helper — no string paths to `public/`
- **File naming:** `kebab-case.yaml`, prefixed with `order-` only if alphabetical order has to match display order (lifestyle slider)
- **Schema shape:** `order: number` for anything that has a display order. Sort in the component frontmatter, flatten back to expected shape before passing to the template.

---

## Git workflow

Working branch `master`. Commit this migration in logical slices:

1. Neighbourhood migration + dining removal + CSS polish (done today)
2. Residences migration
3. Lifestyle migration
4. Vision migration
5. Countries extraction + final astro check

No CMS branch needed — content collections is the Astro default path, no install to gate.
