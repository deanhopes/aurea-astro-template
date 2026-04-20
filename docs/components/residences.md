# Residences

The Residences section renders a grid of property cards from a content collection. Each card has an image slider (arrow-navigated, infinite wrap), and two buttons that open overlays — a booking calendar and a room detail panel. All three pieces (card slider, calendar overlay, detail overlay) are driven by small, independent JS modules that share no state.

---

## Files

```
src/components/Residences.astro           # Grid + overlay HTML, reads collection
src/content/residences/                   # YAML — one file per residence
src/lib/card-slider.ts                   # Per-card image slider
src/lib/overlays.ts                      # Open/close overlay logic
src/lib/calendar.ts                      # Date picker inside calendar overlay
src/styles/components/card.css           # Card layout + slider + arrows
src/styles/components/overlay.css        # Overlay panel + backdrop
src/styles/components/calendar.css       # Calendar date picker
src/styles/components/detail.css         # Detail panel layout
src/styles/sections/residences.css       # Section grid layout
```

---

## Mental model

### Content collections

Each residence is a YAML file. Astro reads the collection at build time — no runtime data fetching. The component queries the collection, sorts by `order`, and maps over the results:

```ts
// Residences.astro
const residences = (await getCollection('residences')).sort((a, b) => a.data.order - b.data.order);
```

The content schema is defined in `src/content.config.ts`. YAML fields map directly to TypeScript types — if a field is missing or wrong type, the build fails. This is intentional: content errors are caught at build time, not in production.

### Card slider — clone-at-edges infinite wrap

Each card's image area is `[data-card-slider]`. On init, `card-slider.ts` reads the slides inside, clones the first slide to the end and the last slide to the front, then sets `xPercent: -100` to show real slide 0:

```
DOM after init: [tailClone | slide0 | slide1 | slide2 | headClone]
                               ↑ starts here (xPercent: -100)
```

Navigation is arrow-button only (no drag). Prev and next each check if they're at a boundary:

- **Next from last slide:** animate to `headClone` (`xPercent: -(total+1)*100`), then snap back to real slide 0 (`xPercent: -100`). The snap is imperceptible because headClone and slide0 are identical.
- **Prev from slide 0:** animate to `tailClone` (`xPercent: 0`), then snap back to real last (`xPercent: -total*100`).

An `animating` boolean blocks re-entry while a tween is running — rapid clicking can't corrupt the position.

### Overlay system

Each card has two trigger buttons with `data-overlay-trigger` attributes:

```html
<button data-overlay-trigger="calendar" data-residence="three-bedroom">View Rates</button>
<button data-overlay-trigger="detail" data-residence="three-bedroom">View Details</button>
```

`overlays.ts` listens for clicks on `[data-overlay-trigger]`, finds the matching `[data-overlay]` element, and toggles it open. The calendar overlay is shared (one instance, updated with the selected residence). Detail overlays are per-residence (one `[data-overlay-residence]` per YAML file).

Overlays use the `inert` attribute when closed — this removes them from tab order and screen reader tree without `display: none`. Open state removes `inert` and traps focus inside the panel.

Lenis is stopped when any overlay is open (prevents scroll-behind). The scrollable detail panel uses `data-lenis-prevent` to restore native scroll inside it — without this, Lenis intercepts wheel events even when it's "stopped".

### Calendar

The calendar inside the booking overlay is a fully custom date picker — no library. It renders two month grids side by side and tracks check-in / check-out as a date range. "Flexible dates" mode switches to a night-count stepper + month selector grid.

The CTA button links to an external booking engine (currently `cloudbeds.com` — replace with your actual booking URL).

---

## Content schema

Full YAML schema for a residence file:

```yaml
order: 1 # Sort order in the grid (1, 2, 3…)
name: Three Bedroom # Short name — eyebrow on card, heading in detail
heading: Light on the Water # Card heading (h3)
slug: three-bedroom # Used to link card buttons to the right overlay
detail: East over the bay… # One-line description on card
description: Full room description for the detail panel

gallery: # Card image slider + detail panel gallery
  - src: ../../assets/images/… # Path relative to the YAML file
    alt: Alt text

roomOverview: # Left column of the specs table in detail panel
  - label: Bedrooms
    value: '3'

bedsAndBedding: # Right column of specs table
  - label: Master
    value: 1 King
```

Image paths use `../../assets/images/` because the YAML files sit two levels deep inside `src/content/residences/`. Astro resolves these relative paths at build time and runs them through the image optimisation pipeline.

---

## What to change

**Add a residence:** Create a new YAML file in `src/content/residences/` following the schema above. Give it a unique `slug` and the next `order` value. A new card and a new detail overlay are generated automatically — no changes needed in the component.

**Remove a residence:** Delete its YAML file. Done.

**Change card copy:** Edit the YAML fields — `heading`, `detail`, `name`. The card uses `r.name` as the eyebrow, `r.heading` as the h3, and `r.detail` as the description paragraph.

**Change gallery images:** Edit the `gallery` array in the YAML. Add or remove entries — the card slider and detail gallery both read from this array. More than 5 images works fine; the card slider handles any count.

**Wire up the booking CTA:** In `Residences.astro`, find the two `<a href="https://www.cloudbeds.com"` elements (one in the calendar overlay, one in the detail overlay). Replace with your booking engine URL. If you need to pass the selected residence or dates, do it via query params on that URL.

**Change the grid layout:** `residences.css` → `.residences__grid`. Currently a 3-column CSS grid. Adjust `grid-template-columns` for a different count. On mobile it's already 1-column via a breakpoint.

**Disable the card slider:** In `card-slider.ts`, `initCard` returns early if `total < 2`. So: put only one image in each residence's `gallery` array, and the slider initialises to a no-op. The arrows won't appear (CSS hides them when there's no hover on the image, and JS never attaches the click listeners).

---

## Gotchas

- **`slug` must be unique across all residence files.** It's the key that links `data-overlay-trigger` buttons to `data-overlay-residence` panels. Duplicate slugs = wrong overlay opens.
- **Image paths are relative to the YAML file, not the project root.** `../../assets/images/foo.jpg` from `src/content/residences/three-bedroom.yaml` resolves to `src/assets/images/foo.jpg`. Don't use `/` or `@` paths in YAML — Astro's content layer resolves these at build time using the file's own location.
- **Overlays must live outside the residences `<section>`.** They use `position: fixed`. If they're inside a section with a GSAP `transform`, `position: fixed` becomes relative to the transformed ancestor, not the viewport. The current structure puts overlays after the closing `</section>` tag — keep them there.
- **`inert` is the right tool, not `display: none`.** Removing `inert` is what opens an overlay to keyboard and screen reader access. Don't toggle `display` or `visibility` — the CSS transitions on the overlay use `opacity` + `transform`, and `display: none` would cut the animation.
- **`data-lenis-prevent` on the scrollable detail panel is load-bearing.** The detail overlay has a long spec sheet that can overflow. Without `data-lenis-prevent`, Lenis intercepts wheel events inside the overlay even when the page scroll is stopped, breaking the panel's own scroll.
