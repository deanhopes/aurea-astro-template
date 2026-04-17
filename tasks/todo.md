# Aurea Residences — Ship Plan

One-page downloadable Astro template. GitHub repo + Gumroad listing + case study.

**Cleanup pass:** Complete (sections 1-12 all landed). Full audit in `docs/cleanup-audit.md`, per-agent reports in `tasks/cleanup-01..08-*.md`.

**Content migration:** Complete. All four collections (neighbourhood, residences, lifestyle, pages/vision) + countries data extraction done. See `tasks/content-migration-plan.md`.

---

## Phase 1 — Collapse to one-pager

- [x] Delete standalone pages: `vision.astro`, `residences.astro`, `lifestyle.astro`, `location.astro`, `neighbourhood.astro`, `team.astro`
- [x] Update Nav to anchor links (`#vision`, `#residences`, etc.)
- [x] Add `id` attributes to each section component for anchor targets
- [x] Remove page transition animations (`src/lib/page-transition.ts` + related)
- [x] Add `terms.astro` and `privacy.astro` placeholder pages with TODO comments
- [x] Update `src/data/site.ts` nav + footer link groups for one-pager structure
- [x] Delete `src/pages/dev/footer.astro` (dev tool, not part of template)
- [x] Responsive pass (desktop + mobile QA via Chrome DevTools, 2026-04-17)
- [x] Visual verification of collapsed one-pager (2026-04-17)

---

## Phase 2 — Template-ify for GitHub

- [x] Write README (setup, structure, customising content via YAML, Claude Code usage)
- [ ] Update `CLAUDE.md` for one-pager scope
- [x] Update `docs/codebase.md` — remove personal local paths, reflect one-pager structure
- [x] Strip `private: true` from `package.json` (already not present)
- [x] Add OG image + favicon to `public/`
- [x] Write launch checklist for template users (in README "Before you launch" section)
- [ ] Clean up `tasks/` — archive cleanup reports, keep `lessons.md`

---

## Phase 3 — Publish

- [ ] Push to GitHub as public repo
- [ ] Set up Gumroad account
- [ ] Publish on Gumroad (free, links to GitHub)
- [ ] Write case study for personal portfolio
- [ ] Post about it (Substack, Twitter)

---

## Out of scope for this repo

- Gumroad account setup
- Case study writing
- Distribution / social posts
