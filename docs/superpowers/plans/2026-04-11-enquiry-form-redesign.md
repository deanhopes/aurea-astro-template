# Enquiry Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the enquiry section from a narrow left-aligned form widget into a full-width two-column layout with editorial context on the left and form fields on the right.

**Architecture:** Rewrite `Enquiry.astro` markup to a two-column grid structure. Replace `.enquiry` CSS rules in `global.css` entirely — remove the `max-width` constraint, `rwpaper` wrapper, two-column dropdown row, and timeline field. Left column uses `justify-content: space-between` to pin heading top and address bottom. Right column is bare form fields with underline style.

**Tech Stack:** Astro 5, vanilla CSS (Lightning CSS), existing Button component, existing custom dropdown JS (preserved unchanged).

---

### Task 1: Rewrite Enquiry.astro markup

**Files:**

- Modify: `src/components/Enquiry.astro`

- [ ] **Step 1: Replace the component markup**

Open `src/components/Enquiry.astro` and replace the entire file content with the following:

```astro
---
/**
 * Enquiry — "Schedule a Private Viewing" section.
 * Reusable between pages. Anchored as #enquire for nav CTAs.
 */
import Button from '@components/Button.astro';
---

<section class="enquiry" id="enquire">
  <div class="enquiry__left">
    <div class="enquiry__left-top">
      <h2 class="enquiry__heading">Schedule a<br />Private Viewing</h2>
      <p class="enquiry__editorial">
        Residences available from the 12th floor.<br />Sales office open by appointment.
      </p>
    </div>
    <address class="enquiry__address">
      Aurea Residences<br />
      3900 Biscayne Blvd<br />
      Edgewater, Miami FL
    </address>
  </div>

  <form class="enquiry__form" action="#" method="post">
    <div class="enquiry__fields">
      <input type="text" name="name" required class="enquiry__input" placeholder="Full name" />
      <input type="email" name="email" required class="enquiry__input" placeholder="Email" />
      <input type="tel" name="phone" required class="enquiry__input" placeholder="Phone" />

      <div class="enquiry__dropdown" data-dropdown>
        <button type="button" class="enquiry__dropdown-trigger" data-dropdown-trigger>
          <span data-dropdown-value>Bedrooms</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg
          >
        </button>
        <input type="hidden" name="bedrooms" value="" />
        <ul class="enquiry__dropdown-menu" data-dropdown-menu>
          <li data-value="3">Three Bedroom</li>
          <li data-value="4">Four Bedroom</li>
          <li data-value="penthouse">Penthouse</li>
        </ul>
      </div>
    </div>

    <Button type="submit" class="enquiry__submit">Send Enquiry</Button>
  </form>
</section>

<script>
  document.addEventListener('astro:page-load', () => {
    const enquiry = document.querySelector<HTMLElement>('.enquiry');
    if (!enquiry) return;

    enquiry.querySelectorAll<HTMLElement>('[data-dropdown]').forEach((dropdown) => {
      const trigger = dropdown.querySelector<HTMLButtonElement>('[data-dropdown-trigger]')!;
      const menu = dropdown.querySelector<HTMLUListElement>('[data-dropdown-menu]')!;
      const valueSpan = dropdown.querySelector<HTMLSpanElement>('[data-dropdown-value]')!;
      const hiddenInput = dropdown.querySelector<HTMLInputElement>('input[type="hidden"]')!;

      trigger.addEventListener('click', () => {
        const isOpen = dropdown.classList.contains('is-open');
        enquiry
          .querySelectorAll('[data-dropdown].is-open')
          .forEach((d) => d.classList.remove('is-open'));
        if (!isOpen) dropdown.classList.add('is-open');
      });

      menu.querySelectorAll<HTMLLIElement>('li').forEach((item) => {
        item.addEventListener('click', () => {
          valueSpan.textContent = item.textContent;
          hiddenInput.value = item.dataset.value || '';
          dropdown.classList.remove('is-open');
          trigger.classList.add('has-value');
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.enquiry [data-dropdown]')) {
        enquiry
          .querySelectorAll('[data-dropdown].is-open')
          .forEach((d) => d.classList.remove('is-open'));
      }
    });
  });
</script>
```

Key changes from previous markup:

- Added `.enquiry__left` wrapper with `.enquiry__left-top` (heading + editorial) and `.enquiry__address` at bottom
- Removed `rwpaper` class from fields wrapper
- Removed `enquiry__field` wrappers (fields are direct children of `.enquiry__fields`)
- Removed `enquiry__field-row` two-column pair
- Removed timeline dropdown entirely
- Bedrooms dropdown is now a direct sibling of inputs (full width)
- Added `class="enquiry__submit"` to Button for full-width targeting

- [ ] **Step 2: Verify the file saved correctly**

Run: `npm run check`

Expected: No TypeScript or lint errors. If there are errors, check that the Button import path is `@components/Button.astro` and that all template syntax is valid Astro.

- [ ] **Step 3: Commit**

```bash
cd "D:/Beanos/Dev Stuff/aurea-residences/.worktrees/ui-work"
git add src/components/Enquiry.astro
git commit -m "refactor: rewrite Enquiry markup — two-column layout, drop timeline field"
```

---

### Task 2: Replace .enquiry CSS rules in global.css

**Files:**

- Modify: `src/styles/global.css`

The existing `.enquiry` block runs from approximately line 955 to line 1115 in `global.css`. Replace the entire block.

- [ ] **Step 1: Locate the existing enquiry CSS block**

Find the start and end of the existing `.enquiry` rules. They begin at `.enquiry {` (around line 955) and end after the `@media (max-width: 767px)` block for `.enquiry__form .btn` (around line 1115). The block ends just before the next unrelated section.

- [ ] **Step 2: Replace the enquiry CSS block**

Replace everything from `.enquiry {` through the closing `}` of the mobile media query block with:

```css
.enquiry {
  position: relative;
  z-index: 1;
  padding: var(--space-section) var(--space-edge);
  background: var(--color-background);
  display: grid;
  grid-template-columns: 55fr 45fr;
  gap: var(--space-gap);
  align-items: stretch;
}

.enquiry__left {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: var(--space-element);
}

.enquiry__left-top {
  display: flex;
  flex-direction: column;
  gap: var(--space-element);
}

.enquiry__heading {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: var(--text-section);
  letter-spacing: -0.03em;
  line-height: var(--leading-section);
  color: var(--color-black);
}

.enquiry__editorial {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  color: color-mix(in srgb, var(--color-black) 60%, transparent);
}

.enquiry__address {
  font-family: var(--font-body);
  font-style: normal;
  font-size: var(--text-ui);
  line-height: 1.8;
  letter-spacing: var(--tracking-ui);
  color: color-mix(in srgb, var(--color-black) 45%, transparent);
  margin-top: var(--space-block);
}

.enquiry__form {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.enquiry__fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.enquiry__input {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 1rem;
  color: var(--color-black);
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--color-black) 12%, transparent);
  padding: 0.5rem 0;
  outline: none;
  transition: border-color 400ms var(--ease-premium);
  border-radius: 0;
  appearance: none;
  width: 100%;
}

.enquiry__input::placeholder {
  color: color-mix(in srgb, var(--color-black) 28%, transparent);
}

.enquiry__input:focus {
  border-bottom-color: color-mix(in srgb, var(--color-black) 45%, transparent);
}

.enquiry__dropdown {
  position: relative;
  width: 100%;
}

.enquiry__dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 1rem;
  color: color-mix(in srgb, var(--color-black) 28%, transparent);
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--color-black) 12%, transparent);
  padding: 0.5rem 0;
  cursor: pointer;
  transition: border-color 400ms var(--ease-premium);
}

.enquiry__dropdown-trigger.has-value {
  color: var(--color-black);
}

.enquiry__dropdown-trigger svg {
  flex-shrink: 0;
  color: color-mix(in srgb, var(--color-black) 30%, transparent);
  transition: transform 300ms var(--ease-premium);
}

.enquiry__dropdown.is-open .enquiry__dropdown-trigger svg {
  transform: rotate(180deg);
}

.enquiry__dropdown.is-open .enquiry__dropdown-trigger {
  border-bottom-color: color-mix(in srgb, var(--color-black) 45%, transparent);
}

.enquiry__dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  list-style: none;
  background: var(--color-background);
  border: 1px solid color-mix(in srgb, var(--color-black) 10%, transparent);
  border-radius: 4px;
  padding: 0.25rem 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 200ms var(--ease-premium),
    transform 200ms var(--ease-premium),
    visibility 200ms;
  z-index: 10;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--color-black) 6%, transparent);
}

.enquiry__dropdown.is-open .enquiry__dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.enquiry__dropdown-menu li {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 0.9375rem;
  color: color-mix(in srgb, var(--color-black) 60%, transparent);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition:
    color 200ms var(--ease-premium),
    background 200ms var(--ease-premium);
}

@media (hover: hover) {
  .enquiry__dropdown-menu li:hover {
    color: var(--color-black);
    background: color-mix(in srgb, var(--color-black) 4%, transparent);
  }
}

.enquiry__submit {
  width: 100%;
}

@media (max-width: 767px) {
  .enquiry {
    grid-template-columns: 1fr;
  }

  .enquiry__left {
    min-height: unset;
    padding-right: 0;
    margin-bottom: var(--space-block);
  }

  .enquiry__address {
    margin-top: var(--space-element);
  }
}
```

- [ ] **Step 3: Check the build**

Run: `npm run dev`

Open `http://localhost:4321` in browser. Verify:

- Enquiry section spans full viewport width
- Two columns visible on desktop: heading + editorial + address left, form fields right
- No containing box around form fields
- Single column on mobile (resize to < 768px)
- Address block appears below editorial copy on mobile
- Submit button is full width of the right column on desktop, full viewport width on mobile

- [ ] **Step 4: Commit**

```bash
cd "D:/Beanos/Dev Stuff/aurea-residences/.worktrees/ui-work"
git add src/styles/global.css
git commit -m "style: rewrite enquiry section — two-column layout, full-width, drop timeline"
```
