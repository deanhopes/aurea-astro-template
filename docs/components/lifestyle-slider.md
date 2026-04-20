# Lifestyle Slider

The Lifestyle section is a full-width draggable slider — click and throw to spin through lifestyle images. It wraps infinitely in both directions, snaps to slide centers on release, and auto-advances every 6 seconds when the section is in view.

This is a custom implementation using GSAP's `Draggable` + `InertiaPlugin`. It doesn't use a library slider — the interesting parts (infinite wrap, snap period-normalisation, auto-play gating) are all hand-written and worth reading if you want to understand how production-grade sliders actually work.

---

## Files

```
src/components/Lifestyle.astro          # HTML structure, slides from content
src/lib/lifestyle-slider.ts            # All slider logic (~300 lines)
src/styles/sections/lifestyle.css      # Layout, slide sizing, marker cursor
src/content/lifestyle/                 # YAML files — one per slide
```

---

## Mental model

### Infinite wrap via DOM duplication

On init, every slide in the track is cloned and appended to the end of the track. The track now has two full sets of slides — `[A B C D E F G H | A' B' C' D' E' F' G' H']` — and the total width of one set is stored as `setWidth`.

The track position is always constrained to `(-setWidth, 0]`. When it drifts outside that range (either direction), `wrapX` teleports it back by exactly one `setWidth`:

```ts
function wrapX(state: SliderState) {
  let x = getX(state.track);
  if (x < -state.setWidth || x > 0) {
    x = ((x % state.setWidth) + state.setWidth) % state.setWidth;
    if (x > 0) x -= state.setWidth;
    gsap.set(state.track, { x });
    state.draggable.update(); // tell Draggable its position changed
  }
}
```

Because the second set of slides is visually identical to the first, the teleport is imperceptible. The user sees a seamless loop.

### The snap problem — and the fix

GSAP's `InertiaPlugin` evaluates the `snap.x` function **once**, at throw start, against the projected `endValue` — the position where physics says the track would come to rest without snapping. It then animates to that snapped position.

The problem: if a user throws hard to the left, the projected `endValue` might be something like `-2.3 × setWidth`. The naive snap implementation searches for the nearest slide center and finds one — but it's a full period away from where `wrapX` will teleport the track mid-throw. Result: the track snaps to a position that's no longer valid, and the animation rubber-bands.

The fix is to normalise the `endValue` into one canonical period before searching, then re-add the multi-period offset:

```ts
function snapX(state: SliderState, endValue: number): number {
  const mx = markerX(state);
  const w = state.setWidth;

  // Fold endValue into (-w, 0] — one canonical period
  const wrapped = ((endValue % w) - w) % w;

  let best = wrapped;
  let bestDist = Infinity;
  for (let i = 0; i < state.slideCount; i++) {
    const target = -(state.slideOffsets[i]! + state.slideWidths[i]! / 2 - mx);
    const dist = Math.abs(target - wrapped);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  // Re-add the multi-period offset — throw lands in the right direction
  return best + (endValue - wrapped);
}
```

`endValue - wrapped` is the multi-period component (the "how many full laps" part). Adding it back means the inertia animation travels in the correct direction, and `wrapX` teleports at the right moment without the track position ever disagreeing with the snap target.

### The marker cursor

`.lifestyle__marker` is an absolutely-positioned custom cursor element that appears when the pointer enters the slider. It follows the mouse and indicates the drag affordance. It shows on `pointerenter`, hides on `pointerleave` (unless dragging — dragging keeps it visible until `onThrowComplete`).

The `is-pulling` class animates the marker during auto-advance — a CSS animation signals to the user that the slider is about to move. It's cancelled and reset at the start of each auto-advance cycle via `getAnimations().forEach(a => a.cancel())` before re-adding the class, which forces the animation to restart.

### Auto-play lifecycle

```
Section enters viewport (30% threshold)
  → 3 second delay (first entry only)
  → setInterval every 6 seconds → advanceToNext()

Section leaves viewport → clearInterval

User drags → clearInterval immediately
User releases (onThrowComplete) → resetAutoPlay (restart interval)
```

The 3-second delay on first entry prevents the slider from advancing before the user has had time to register the section exists.

`advanceToNext` picks the nearest candidate from `[targetX, targetX + setWidth, targetX - setWidth]` — always advancing to whichever copy of the next slide requires the least travel. This prevents the track from jumping a full lap just to reach the next slide.

---

## Annotated key code

### State object

```ts
interface SliderState {
  track: HTMLElement;
  allSlides: HTMLElement[]; // originals + clones
  slideCount: number; // original count only
  setWidth: number; // total width of one set (px)
  slideWidths: number[]; // per-slide widths (px)
  slideOffsets: number[]; // per-slide left offsets within one set (px)
  activeIndex: number; // index into allSlides (includes clones)
  activeOrigIndex: number; // index into originals (0..slideCount-1)
  marker: HTMLElement | null;
  isDragging: boolean;
  autoTimer: ReturnType<typeof setInterval> | null;
  draggable: Draggable;
}
```

`slideOffsets` and `slideWidths` are measured from the DOM after init. The marker position (`markerX`) is `60% of container width - paddingLeft` — the notional "centre" the slider snaps to.

### Draggable config

```ts
Draggable.create(state.track, {
  type: 'x',
  inertia: true,
  snap: { x: (v: number) => snapX(state, v) },
  onDragStart() {
    stopAutoPlay(state);
  },
  onDrag() {
    wrapX(state);
    updateActive(state);
  },
  onThrowUpdate() {
    wrapX(state);
    updateActive(state);
  },
  onThrowComplete() {
    wrapX(state);
    updateActive(state);
    resetAutoPlay(state);
  },
});
```

`wrapX` runs on every drag frame and throw frame — not just at the end. This keeps `activeIndex` accurate throughout the throw, so the `is-active` class always reflects which slide is actually centred.

---

## What to change

**Add or remove slides:** Add or remove YAML files in `src/content/lifestyle/`. Filename order doesn't matter — slides are sorted by the `order` field in the YAML. The slider measures everything from the DOM after init, so slide count is flexible.

**Change slide content:** Each YAML file in `src/content/lifestyle/` has: `order` (sort position), `image` (path to image asset), `alt`, `top` (caption line above image), `bottom` (caption line below image).

**Change auto-advance speed:** In `lifestyle-slider.ts` → `startAutoPlay`, change `6000` (ms). The initial delay before first advance is the `3000` in the `setTimeout` inside the IntersectionObserver callback.

**Change slide width:** In `lifestyle.css`, `.lifestyle__slide` has a `width` or `flex` value. Changing it changes how many slides are visible at once. The JS measures from the DOM, so it adapts automatically.

**Remove auto-play:** Delete `startAutoPlay(state)` calls and the IntersectionObserver block. The slider still works as a manual drag-only component.

**Change the marker position:** `markerX` returns `container.offsetWidth * 0.6 - paddingLeft`. The `0.6` puts the snap point at 60% across the container. Adjust this to shift where slides snap to.

---

## Gotchas

- **`state.draggable.update()` after `gsap.set`** — whenever you teleport the track position with `gsap.set`, Draggable's internal position is stale. Call `draggable.update()` immediately after, or Draggable will snap back to where it thought the track was on the next interaction.
- **Clones must be cleaned up on destroy.** The cleanup function removes clones by trimming `track.children` back to `slideCount`. If you add or remove slides dynamically, you need to re-run `initLifestyleSlider()` — it calls `cleanup?.()` first.
- **Gaps are measured from computed style, not CSS.** `getGap()` reads `getComputedStyle(track).gap` — this handles fluid gap values correctly. Don't hardcode gap in the JS.
- **InertiaPlugin must be registered before Draggable.** The import order in `lifestyle-slider.ts` matters — `gsap.registerPlugin(Draggable, InertiaPlugin)` at the top. Both plugins must be registered for `inertia: true` to work.
- **The snap function is called once per throw, not per frame.** Don't put side-effects in `snapX`. It's a pure function: takes `endValue`, returns snapped `x`. All state updates go in `onThrowUpdate` and `onThrowComplete`.
