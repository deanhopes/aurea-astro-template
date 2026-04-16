# Content Migration Plan — Astro Content Collections

**Decision:** Astro Content Collections. No external CMS, no React island, no hosted service.

**Why:** Aurea is a spec piece. Content is edited by Dean in git. A web admin UI has no user. Content Collections give type-safe schemas, git history, and zero new dependencies — and they don't cascade React into a codebase that's deliberately vanilla GSAP + Three.js. If Aurea becomes a live client project later, Decap or Keystatic can bolt on top of the same file structure with minimal churn.

**Status:** Complete. All collections migrated.

---

## Done

- [x] `src/content.config.ts` created with all collection schemas
- [x] `src/content/neighbourhood/{wynwood,design-district,the-bay,margaret-pace}.yaml`
- [x] `Neighbourhood.astro` rewired to `getCollection('neighbourhood')`
- [x] Dining removed (brand-asset concern)
- [x] `src/content/residences/{three-bedroom,four-bedroom,penthouse}.yaml`
- [x] `Residences.astro` rewired to `getCollection('residences')`
- [x] `src/content/lifestyle/{01..08}-*.yaml` (8 slider entries)
- [x] `Lifestyle.astro` rewired to `getCollection('lifestyle')`
- [x] `src/content/pages/vision.yaml` (single entry with typed schema)
- [x] `Vision.astro` rewired to `getEntry('pages', 'vision')`
- [x] Countries extracted to `src/data/countries.ts`
- [x] Images live in `src/assets/images/`, referenced via `image()` schema

---

## Conventions

- **YAML over MD** for data-only entries (faster to hand-edit, no frontmatter/body split)
- **MDX** only when a single entry has meaningful prose body
- **Image paths** relative to the YAML file, resolved by the `image()` schema helper — no string paths to `public/`
- **File naming:** `kebab-case.yaml`, prefixed with `order-` only if alphabetical order has to match display order (lifestyle slider)
- **Schema shape:** `order: number` for anything that has a display order. Sort in the component frontmatter, flatten back to expected shape before passing to the template.
