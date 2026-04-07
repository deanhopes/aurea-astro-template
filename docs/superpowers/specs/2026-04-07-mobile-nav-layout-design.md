# Mobile Nav Layout Redesign

**Date:** 2026-04-07
**Scope:** Mobile menu panel layout (< 768px) and top bar centering fix

---

## Problems

1. **AUREA wordmark not centered** — Menu and Enquire pills have different content widths, pushing the wordmark off-center.
2. **Cards cramped on mobile** — Three cards stacked vertically at ~120px each wastes the cards as a navigational/visual element. They should be the hero of the menu.

## Design

### Top Bar — Equal-Width Bookends

Apply matching `min-width` to `.nav-pill--menu` and `.nav-pill--cta` so the wordmark sits dead center regardless of label length. The value should be set to whichever pill is naturally wider (likely Enquire at ~120px — verify in browser) so both bookends match. This follows the existing lesson in `tasks/lessons.md`.

Remove the `@media (max-width: 480px)` rule that hides `.nav-pill span` — it's no longer needed since the equal-width approach solves centering at all sizes.

### Menu Panel — Card Layout (< 768px)

Replace the current equal-height vertical stack with a hero + thumbnails layout:

```
+------------------------------------------+
|                                          |
|              VISION (hero)               |
|          full-width, ~220px tall         |
|          bottom label bar (72px)         |
|                                          |
+--------------------+---------------------+
|                    |                     |
|    RESIDENCES      |     LIFESTYLE       |
|   ~50% width       |    ~50% width      |
|   ~140px tall      |    ~140px tall     |
|   overlay label    |    overlay label    |
+--------------------+---------------------+
```

**Hero card (first card):**
- Full width of the cards container
- ~220px height
- Keeps the existing `.menu-card__label` bottom bar treatment (72px bar, silver background, border)

**Thumbnail cards (second and third cards):**
- Side-by-side row, each ~50% width minus gap
- ~140px height
- Label overlays the image directly — no separate bar
- Subtle gradient scrim from bottom (`linear-gradient(to top, rgba(0,0,0,0.5), transparent)`) behind white text for legibility
- Label text centered horizontally, positioned near the bottom with padding

### Menu Panel — Links Area

No structural changes. The sidebar links, divider, secondary links, and Enquire CTA remain as-is. With the cards taking appropriate space above, the links area has room to breathe naturally.

### Breakpoints

- **< 768px:** Hero + thumbnails layout activates, panel is full-height column
- **< 480px:** Remove the rule hiding `.nav-pill span` (no longer needed). The card layout stays the same (hero + side-by-side thumbnails work fine at 320px+)

## What Does Not Change

- Desktop layout (cards side-by-side horizontally with sidebar)
- Menu open/close animation and transition behavior
- Data structure in `site.ts` (no new fields)
- Nav.ts interaction logic
- The 4px gap system

## CSS Changes Summary

1. Add `min-width` to `.nav-pill--menu` and `.nav-pill--cta` (matching value)
2. In `@media (max-width: 767px)`: change `.menu-cards` from single column to hero + row layout using CSS grid or flexbox wrap
3. Add `.menu-card:first-child` styles for hero sizing
4. Add `.menu-card:not(:first-child) .menu-card__label` styles for overlay treatment (absolute positioning over image, gradient scrim, white text)
5. Remove `@media (max-width: 480px)` block that hides pill labels and sets card min-height
