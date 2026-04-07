# Mobile Nav Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix wordmark centering and replace cramped mobile card stack with a hero + thumbnails layout.

**Architecture:** Pure CSS changes in `global.css`. Equal `min-width` on nav bookend pills for centering. CSS grid on `.menu-cards` at mobile breakpoint for hero + row layout. Overlay label treatment for thumbnail cards.

**Tech Stack:** Vanilla CSS (Lightning CSS via Astro)

**Spec:** `docs/superpowers/specs/2026-04-07-mobile-nav-layout-design.md`

---

### Task 1: Equal-Width Bookend Pills

**Files:**
- Modify: `src/styles/global.css:174-193` (`.nav-pill--menu` and `.nav-pill--cta`)

- [ ] **Step 1: Add matching min-width to both bookend pills**

In `src/styles/global.css`, add `min-width: 120px;` to both `.nav-pill--menu` and `.nav-pill--cta`:

```css
.nav-pill--menu {
  min-width: 120px;
  background: var(--color-silver);
  color: var(--color-charcoal);
}
```

```css
.nav-pill--cta {
  min-width: 120px;
  background: var(--color-charcoal);
  color: var(--color-silver);
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Open at 393px width. AUREA should now sit dead center between the two pills.

If 120px isn't quite right (one pill overflows or there's too much padding), inspect in devtools and adjust the value — the goal is both pills render at the same width.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "fix: equal-width nav bookends for centered wordmark"
```

---

### Task 2: Mobile Card Layout — Hero + Thumbnails

**Files:**
- Modify: `src/styles/global.css:344-378` (`@media (max-width: 767px)` and `@media (max-width: 480px)` blocks)

- [ ] **Step 1: Replace the mobile menu-cards layout**

In the `@media (max-width: 767px)` block, replace the existing `.menu-cards` rule:

```css
/* Before */
.menu-cards {
  flex: 1;
  min-height: 0;
}
```

```css
/* After */
.menu-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  flex: 1;
  min-height: 0;
}
```

- [ ] **Step 2: Add hero card sizing (first child spans full width)**

In the same `@media (max-width: 767px)` block, add:

```css
.menu-card:first-child {
  grid-column: 1 / -1;
  min-height: 220px;
}

.menu-card:not(:first-child) {
  min-height: 140px;
}
```

- [ ] **Step 3: Add overlay label treatment for thumbnail cards**

In the same `@media (max-width: 767px)` block, add:

```css
.menu-card:not(:first-child) .menu-card__label {
  bottom: 0;
  left: 0;
  right: 0;
  height: auto;
  padding: 24px 8px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
  border: none;
  color: var(--color-silver);
}
```

This overrides the default `.menu-card__label` (which has `bottom: 4px`, `left: 4px`, `right: 4px`, `height: 72px`, silver background, and border). The overlay sits flush to the card edges with a gradient scrim.

- [ ] **Step 4: Remove the 480px breakpoint block**

Delete the entire `@media (max-width: 480px)` block (lines ~366-378):

```css
/* DELETE THIS ENTIRE BLOCK */
@media (max-width: 480px) {
  .menu-cards {
    flex-direction: column;
  }

  .menu-card {
    min-height: 120px;
  }

  .nav-pill span {
    display: none;
  }
}
```

This block is no longer needed — the grid layout handles card arrangement, and the equal-width bookends solve centering without hiding labels.

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`

Check at 393px (iPhone 14 Pro):
- Hero card (Vision) spans full width, ~220px tall, with bottom label bar
- Residences and Lifestyle sit side-by-side below, ~140px tall, with overlay text labels on gradient scrim
- Links section has breathing room below
- AUREA still centered (from Task 1)

Check at 768px+:
- Desktop layout unchanged (horizontal cards with sidebar)

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: hero + thumbnails mobile card layout with overlay labels"
```
