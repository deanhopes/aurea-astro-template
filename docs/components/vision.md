# Vision — Horizontal Pin-Scroll

The Vision section pins itself to the viewport while the user scrolls, then translates a horizontal track of panels from right to left. The scroll distance consumed equals the track's overflow width — so the user's vertical scroll gesture maps 1:1 to horizontal movement through the panels.

Inside that horizontal scroll, images have their own parallax: a subtle counter-movement that makes each image feel like it has depth as it crosses the viewport. All of this is driven by a single GSAP `ScrollTrigger` — no scroll listeners, no rAF loops.

---

## Files

```
src/components/Vision.astro           # HTML — three panels, images from content
src/lib/vision-scroll.ts             # All animation logic
src/styles/sections/vision.css       # Layout, panel sizing, card structure
src/content/pages/vision.yaml        # All copy and image references
```

---

## Mental model

### The pin-scroll mechanism

```
[viewport]
  ↑ pinned section fills viewport height
  → track moves left as user scrolls down
```

GSAP ScrollTrigger's `pin: true` freezes the section in place. The scroll distance added to the page (`end: () => +=${track.scrollWidth - window.innerWidth}`) equals exactly the amount of overflow we need to scroll through. So 1px of vertical scroll = 1px of horizontal track movement:

```ts
gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: section,
    pin: section,
    scrub: 1,
    anticipatePin: 1,
    end: () => `+=${track.scrollWidth - window.innerWidth}`,
    invalidateOnRefresh: true,
  },
});
```

`ease: 'none'` is critical — any easing would decouple the track position from scroll progress, making it feel floaty. `scrub: 1` adds 1 second of physical lag (the track "catches up" to scroll position over 1s), which gives it weight.

`invalidateOnRefresh: true` recalculates `end` on resize — without it, the scroll distance would be stale after a window resize.

### `containerAnimation` — nested triggers inside horizontal scroll

This is the non-obvious part. Normally, ScrollTrigger measures vertical scroll position. But inside a pinned horizontal scroll, the elements are moving horizontally — their vertical position never changes.

GSAP solves this with `containerAnimation`: you pass the horizontal scroll tween as a reference, and the nested ScrollTrigger tracks progress within that tween instead of page scroll:

```ts
gsap.from(columns, {
  y: 30,
  opacity: 0,
  scrollTrigger: {
    trigger: '.vision__card',
    containerAnimation: horizontalScroll, // ← the key
    start: 'left 85%', // fires when card's left edge hits 85% of viewport
    once: true,
  },
});
```

`start: 'left 85%'` — the first value is the trigger element's edge (left/right/center), the second is the viewport's position. This reads: "start when the left edge of `.vision__card` crosses 85% of the viewport width."

### Parallax within horizontal scroll

Each image gets two ScrollTriggers attached via `containerAnimation`:

1. **Enter animation** — scale from 1.05 → 1.0 as the image enters view (makes it feel like it's "landing")
2. **Parallax** — translate from `xPercent: +4` → `xPercent: -4` across the full time the image is in view (`start: 'left right'` to `end: 'right left'`)

Alternating direction (`direction = i % 2 === 0 ? -1 : 1`) gives adjacent images a sense of depth relative to each other.

### The `matchMedia` guard

The horizontal scroll only activates on desktop with reduced motion off:

```ts
gsap.matchMedia().add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
  setupHorizontalScroll(section, track);
});
```

On mobile, Vision renders as a normal vertical-scroll section — panels stack, no pinning. This happens automatically because GSAP's matchMedia simply doesn't call `setupHorizontalScroll`. No CSS changes needed, no JS feature checks.

---

## Annotated key code

### Full setup function

```ts
function setupHorizontalScroll(section: HTMLElement, track: HTMLElement) {
  const getScrollDistance = () => track.scrollWidth - window.innerWidth;

  // 1. The primary horizontal tween
  const horizontalScroll = gsap.to(track, {
    x: () => -getScrollDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: section,
      scrub: 1,
      anticipatePin: 1,
      end: () => `+=${getScrollDistance()}`,
      invalidateOnRefresh: true,
    },
  });

  // 2. Animations that live inside the horizontal scroll
  animateCardColumns(section, horizontalScroll);
  animateCardImages(section, horizontalScroll);
  animatePairImages(section, horizontalScroll);
}
```

The tween returned by `gsap.to()` is the handle you pass to nested triggers as `containerAnimation`. Keep that reference — you can't retrieve it from ScrollTrigger after the fact.

### GSAP context for clean teardown

```ts
ctx = gsap.context(() => {
  gsap.matchMedia().add('(min-width: 1025px) and ...', () => {
    setupHorizontalScroll(section!, track!);
  });
});

// On destroy:
ctx?.revert(); // kills all ScrollTriggers, tweens, matchMedia listeners created inside
```

`gsap.context()` scopes all GSAP instances created inside it. `.revert()` kills them all in one call. Without this, ScrollTriggers would leak across Astro page transitions.

---

## What to change

**Change the panels:** Vision has three panels — `vision__panel--intro`, `vision__panel--card`, `vision__panel--images`. Add or remove panels in `Vision.astro`. If you add a panel, the track width grows automatically — ScrollTrigger recalculates on refresh. Make sure `invalidateOnRefresh: true` stays in the config.

**Change the copy:** All text lives in `src/content/pages/vision.yaml`. Fields: `label`, `towerBody`, `cardCopy` (array of paragraphs), `cta`, `captions`.

**Change the images:** `vision.yaml` also holds `images.tower`, `images.interior`, `images.entrance`, `images.video`. Swap the `src` paths. Images are processed by Astro's `<Image />` component — use anything in `src/assets/`.

**Adjust scroll speed / weight:** `scrub: 1` controls lag. Lower = snappier. Higher = more drag. Never use `scrub: true` (no interpolation — it feels mechanical).

**Disable for all screen sizes:** Remove the `matchMedia` wrapper and call `setupHorizontalScroll` directly. Add a CSS fallback for the track layout if you do — currently mobile panels stack via the CSS without any JS.

**Remove parallax:** Delete the `animateCardImages` and `animatePairImages` calls in `setupHorizontalScroll`. The horizontal pin-scroll still works — images just won't have the counter-movement.

---

## Gotchas

- **`anticipatePin: 1` prevents a 1-frame jump.** Without it, the section visually jumps when ScrollTrigger activates pinning. It pre-positions the pin a frame early. Don't remove it.
- **Don't animate `height` or `width` inside the pinned section.** Anything that changes layout inside the pin will break ScrollTrigger's position calculations. Only use `transform` animations inside.
- **`containerAnimation` triggers use horizontal measurement, not vertical.** `start: 'top 80%'` won't work inside a horizontal scroll — use `start: 'left 80%'`. Easy to get wrong when copying ScrollTrigger configs from other sections.
- **Mobile gets a plain vertical layout.** The `.vision__track` CSS makes panels full-width and stacks them on mobile without any JS. If you remove the `matchMedia` guard, you need to also reconsider the CSS — the track is `display: flex; flex-direction: row` which works fine on desktop but needs a column override on mobile if JS doesn't take over.
- **Horizontal scrolling sections don't play well with anchor links.** The `#vision` anchor in the nav jumps to the top of the pin — not the middle of the panels. That's intentional and correct. Don't try to deep-link to specific panels.
