# Aurea Astro Template — Sitemap

## Architecture

One-pager. Anchor navigation. No page transitions. Lenis smooth scroll site-wide.

## Pages

### `/` — Home (one-pager)

Sections, in order:

- Hero
- Vision
- Residences
- Lifestyle
- Neighbourhood
- Enquiry
- Footer

Each section maps to a component in `src/components/` and is anchored by an `id`
matching its name. The `Nav` component links to those anchors.

### `/terms` — Terms & Conditions

Placeholder legal page. Replace before launch.

### `/privacy` — Privacy Policy

Placeholder legal page. Replace before launch.

### `/404` — Not Found

Static error page. Auto-served by Astro.

## Shared

- `Nav` — fixed/overlay nav, anchor-scroll to sections
- `Footer` — shipped on every page
- `SEO Head` — per-page title/description via `BaseLayout` props
