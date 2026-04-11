# Enquiry Form Redesign — Design Spec

**Date:** 2026-04-11
**Status:** Approved

---

## Problem

The current enquiry section is a narrow left-aligned column with a contained form box, leaving the right half of the viewport empty. It reads like a login widget, not a section with presence. It has no compositional relationship to the footer below it.

---

## Solution

Two-column full-width layout. Left column: editorial context + address. Right column: form fields, no container box. Fills the viewport, adds credibility context that aids conversion, and bleeds naturally into the footer's caustic gradient.

---

## Layout

- **Section:** Full viewport width, `--space-section` vertical padding top and bottom. Background stays `--color-background` — no special treatment. Footer gradient starts immediately below with no divider.
- **Columns:** Two columns on a `4px` gap — left ~55%, right ~45%. `align-items: start`.
- **No containing box** on either side. Form fields sit flush in the right column.

---

## Left Column

Three elements, `justify-content: space-between` to anchor heading top, address bottom:

1. **Heading:** `"Schedule a Private Viewing"` — `--text-section` scale, weight 300, `--font-display`, `letter-spacing: -0.03em`, `line-height: 1.1`.
2. **Editorial line:** `"Residences available from the 12th floor. Sales office open by appointment."` — `--font-body`, `--text-body`, 60% opacity. Sits below heading with `--space-element` gap.
3. **Address block:** Building name + street + Edgewater, Miami — `--text-ui` scale, 45% opacity, `line-height: 1.8`. Pinned to column bottom. Use a plausible Edgewater address for the spec (e.g. "Aurea Residences / 3900 Biscayne Blvd / Edgewater, Miami FL").

---

## Right Column

Four fields stacked, `1.5rem` gap. All underline style (`border-bottom` only, no box):

| Field     | Type                | Notes                                           |
| --------- | ------------------- | ----------------------------------------------- |
| Full name | `input[type=text]`  | placeholder "Full name"                         |
| Email     | `input[type=email]` | placeholder "Email"                             |
| Phone     | `input[type=tel]`   | placeholder "Phone"                             |
| Bedrooms  | Custom dropdown     | Options: Three Bedroom, Four Bedroom, Penthouse |

- **Timeline field dropped** — sales team qualifies this in the call; fewer fields reduces friction.
- **Bedrooms** gets its own full-width row (no cramped two-column pair).
- **Submit button:** Full column width, existing `Button` component, `type="submit"`, label "Send Enquiry".
- Button sits `3rem` below the last field.

---

## Responsive (< 768px)

- Single column. Left content stacks above form.
- Address block flows directly below editorial line (not pinned to bottom).
- Submit button full width (existing behaviour preserved).

---

## What's Removed

- `rwpaper` wrapper class on fields container
- `enquiry__field-row` two-column split for dropdowns
- Timeline dropdown field entirely
- Max-width constraint on the section (`max-width: 640px` removed)

---

## Files Affected

- `src/components/Enquiry.astro` — markup restructure
- `src/styles/global.css` — `.enquiry` and related rules rewritten
