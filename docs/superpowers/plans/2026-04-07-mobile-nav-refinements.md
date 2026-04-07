# Mobile Nav Refinements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove CTA from mobile top bar, move menu to right with centered AUREA, animate hamburger ↔ X with GSAP.

**Architecture:** CSS grid on mobile nav bar for centering, GSAP timeline for hamburger icon animation, responsive via media query.

**Tech Stack:** Vanilla CSS, GSAP (already installed), TypeScript

---

### Task 1: Mobile Nav Bar Layout (CSS)

**Files:**
- Modify: `src/styles/global.css:146-195` (nav bar rules) and `346-389` (mobile block)

- [ ] **Step 1: Add mobile grid layout and hide CTA**

In the `@media (max-width: 767px)` block in `src/styles/global.css`, add these rules:

```css
.nav-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 4px;
  align-items: stretch;
}

.nav-pill--menu {
  grid-column: 3;
  justify-self: end;
  min-width: auto;
}

.nav-pill--menu span {
  display: none;
}

.nav-pill--cta {
  display: none;
}
```

This puts the wordmark in the center column (auto-sized), menu pill in column 3 (right-aligned), and hides the CTA entirely. Column 1 is empty — the grid ensures perfect centering. The `min-width: auto` overrides the 120px bookend since grid handles centering now.

- [ ] **Step 2: Remove desktop min-width bookends**

In the base (non-media-query) rules, remove `min-width: 120px` from both `.nav-pill--menu` and `.nav-pill--cta`. The bookend approach is no longer needed — mobile uses grid centering, and desktop has all three pills visible with flex:1 on the wordmark.

`.nav-pill--menu` (line ~174) — remove `min-width: 120px;`
`.nav-pill--cta` (line ~192) — remove `min-width: 120px;`

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: mobile nav grid layout — menu right, AUREA centered, CTA hidden"
```

---

### Task 2: Hamburger ↔ X Animation (GSAP)

**Files:**
- Modify: `src/components/Nav.astro` (add data attributes to SVG rects)
- Modify: `src/lib/nav.ts` (add GSAP timeline for icon animation)

- [ ] **Step 1: Add data attributes to SVG rects in Nav.astro**

In `src/components/Nav.astro`, replace the hamburger SVG with data attributes for GSAP targeting:

```html
<svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <rect data-bar="top" x="3" y="5" width="18" height="2" rx="0.5" />
  <rect data-bar="mid" x="3" y="11" width="18" height="2" rx="0.5" />
  <rect data-bar="bot" x="3" y="17" width="18" height="2" rx="0.5" />
</svg>
```

Changes: added `class="nav-icon"`, added `data-bar` attributes to each rect.

- [ ] **Step 2: Add GSAP hamburger timeline to nav.ts**

In `src/lib/nav.ts`, import gsap and create a paused timeline that animates hamburger → X. Replace the entire file with:

```typescript
import gsap from 'gsap';
import { getLenis } from './lenis';

let cleanup: (() => void) | null = null;

function createIconTimeline(toggle: HTMLElement): gsap.core.Timeline {
  const top = toggle.querySelector('[data-bar="top"]');
  const mid = toggle.querySelector('[data-bar="mid"]');
  const bot = toggle.querySelector('[data-bar="bot"]');

  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.4, ease: 'power2.inOut' } });

  tl.to(top, { y: 6, rotation: 45, transformOrigin: 'center center' }, 0)
    .to(bot, { y: -6, rotation: -45, transformOrigin: 'center center' }, 0)
    .to(mid, { autoAlpha: 0, duration: 0.2 }, 0);

  return tl;
}

export function initNav() {
  cleanup?.();

  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!toggle || !panel) return;

  const iconTl = createIconTimeline(toggle);

  function open() {
    toggle!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    iconTl.play();
    getLenis()?.stop();
  }

  function close() {
    toggle!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
    iconTl.reverse();
    getLenis()?.start();
  }

  function handleToggle() {
    const isOpen = toggle!.getAttribute('aria-expanded') === 'true';
    isOpen ? close() : open();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && toggle!.getAttribute('aria-expanded') === 'true') {
      close();
      toggle!.focus();
    }
  }

  function handlePanelClick(e: Event) {
    if ((e.target as HTMLElement).closest('a')) close();
  }

  toggle.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKeydown);
  panel.addEventListener('click', handlePanelClick);

  cleanup = () => {
    close();
    iconTl.kill();
    toggle.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    panel.removeEventListener('click', handlePanelClick);
    cleanup = null;
  };
}

export function destroyNav() {
  cleanup?.();
}
```

Key GSAP practices applied:
- Transform aliases (`y`, `rotation`) instead of raw CSS
- `autoAlpha` for middle bar fade (handles visibility + opacity)
- `transformOrigin: 'center center'` on SVG rects
- Paused timeline, `.play()` / `.reverse()` for toggle
- `.kill()` on cleanup to prevent memory leaks
- `defaults` on timeline for shared duration/ease
- All bars animate from timestamp 0 (concurrent)

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.astro src/lib/nav.ts
git commit -m "feat: GSAP hamburger-to-X icon animation"
```
