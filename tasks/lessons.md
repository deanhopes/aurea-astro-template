# Aurea Residences — Lessons & Rules

Rules discovered through mistakes. Read at session start.

---

## Code

- **Never animate `filter: blur()` in GSAP.** Composites every frame, expensive on mobile. Use opacity + scale for the same "materialise" feel.
- **Don't double-fade with parent + children.** If you're fading out children individually, don't also fade the parent — the opacity compounds and things vanish too early.
- **Use `scrub: 1`, not `scrub: 0.6` or `scrub: true`.** `1` gives physical weight. `true` has no interpolation. Fractional values feel twitchy.
- **One ScrollTrigger per animation group.** Don't create two ScrollTriggers watching the same element at the same point — merge into one timeline with position parameters.
- **Stop rAF loops when done.** Canvas rAF loops must stop when their animation reaches final state. Use an `ensureLoop()` pattern to restart on demand (e.g., scroll-back).
- **Clean up ResizeObservers.** Store the observer reference at module scope and `.disconnect()` in the destroy function. Otherwise it's a memory leak on page transitions.
- **Cap WebGL canvas DPR at 2.** Soft effects (shadows, blurs) don't benefit from 3x rendering. Saves significant GPU fill rate.

## Design

- **Equal-width nav bookends for centred logo.** If left and right nav items have different widths, the logo shifts. Match them with min-width.
- **Procedural bezier paths can't match real shadow realism.** For organic effects like leaf shadows, use real video footage processed through a shader — not generated geometry. The organic edge quality, overlapping translucency, and non-uniform blur falloff are what sell it.
- **Video + shader > video overlay.** A raw video overlay looks like a filter. Running it through a luminance threshold shader with palette mapping makes it feel like part of the design system.
- **Native `<select>` can't be styled.** The dropdown highlight is OS-controlled. Use custom dropdown components with hidden inputs for brand-consistent forms.
- **Numbered editorial captions don't work on product cards.** `(1) (2) (3)` creates a curated magazine feel in editorial sections but implies ranking on product cards — card 3 looks worst.
- **Specs belong in icon rows, not detail lines.** Sq ft and bed counts read like listings when inline. Lucide icons + structured rows feel editorial.
- **Type hierarchy via opacity tiers.** Footer uses 80% (tagline) → 45% (nav links, hover to full) → 30% (flanks) to create visual hierarchy without different sizes.
