# UI Craft — How We Build Clean Interfaces

This is a recipe, not philosophy. It documents the exact decisions made when building the enquiry form — use it to reproduce that level of polish on any component.

---

## The Source of Truth

Before touching code, identify one reference that represents the aesthetic target. For this project it's shadcn/ui — not because we copy it, but because it has a clear, defensible opinion:

- Visible borders, not invisible ones
- Static labels above fields, not floating inside them
- Focus rings, not just color changes
- Muted placeholder text
- Consistent height (`2.5rem`) across all interactive elements

The principle: **steal the structure, replace the aesthetic tokens**. shadcn uses white backgrounds and slate grays. We use warm tinted backgrounds and `color-mix()` from `--color-black`. Same bones, different skin.

---

## The Four Moves That Make UI Look Clean

### 1. One box model for everything interactive

Every input, select, and button trigger shares the same box:

```css
background: color-mix(in srgb, var(--color-black) 3%, transparent);
border: 1px solid color-mix(in srgb, var(--color-black) 14%, transparent);
border-radius: 6px;
height: 2.5rem;
padding: 0 0.75rem;
```

When everything interactive is the same height and uses the same border treatment, the form reads as a system, not a collection of elements.

### 2. Focus ring, not just border darkening

```css
.enquiry__input:focus {
  border-color: color-mix(in srgb, var(--color-black) 40%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-black) 8%, transparent);
}
```

The ring communicates focus without being harsh. `box-shadow` not `outline` — it respects border-radius and doesn't jump.

### 3. Two-tier text hierarchy in menus

Every dropdown option has a name and a meta:

```html
<span class="option-name">Three Bedroom</span> <span class="option-meta">From 12th floor</span>
```

Name is body weight and full opacity. Meta is `--text-ui` and 40% opacity, right-aligned. This communicates more information without adding visual weight.

### 4. Compound inputs share borders

The phone field is two elements that behave as one box. The trick:

```css
/* Country trigger */
border-right: none;
border-radius: 6px 0 0 6px;

/* Phone input */
border-radius: 0 6px 6px 0;
```

They share the left border of the input. When the trigger is focused, use `position: relative; z-index: 1` so its focus ring renders on top of the input's left border.

---

## Popover / Dropdown Pattern

Every popover (country list, residence select) uses the same animation:

```css
opacity: 0;
visibility: hidden;
transform: translateY(-6px);
transition:
  opacity 200ms var(--ease-premium),
  transform 200ms var(--ease-premium),
  visibility 200ms;
```

Open state:

```css
opacity: 1;
visibility: visible;
transform: translateY(0);
```

Rules:

- `visibility` prevents keyboard/screen reader access when closed
- `transform` animates, not `top/margin` — GPU composited, no layout thrash
- Only one popover open at a time — `closeAll()` before opening a new one
- Click outside closes via a single document listener, cleaned up on `astro:before-swap`

---

## `color-mix()` as the palette system

Never hardcode opacity values. Use `color-mix()` from the base tokens:

| Usage                 | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| Input background      | `color-mix(in srgb, var(--color-black) 3%, transparent)`  |
| Border                | `color-mix(in srgb, var(--color-black) 14%, transparent)` |
| Border focused        | `color-mix(in srgb, var(--color-black) 40%, transparent)` |
| Focus ring            | `color-mix(in srgb, var(--color-black) 8%, transparent)`  |
| Placeholder text      | `color-mix(in srgb, var(--color-black) 30%, transparent)` |
| Meta / secondary text | `color-mix(in srgb, var(--color-black) 40%, transparent)` |
| Label text            | `color-mix(in srgb, var(--color-black) 70%, transparent)` |

This means dark mode (or a palette swap) is one token change. It also means the warm background tints every surface automatically — no manual warm-gray mixing.

---

## Avoid These

- `transition: all` — specify properties explicitly
- Floating labels — they look clever and behave badly. Static labels above fields are clearer, more accessible, and never break
- `ease-in-out` on UI elements — use `var(--ease-premium)` (`cubic-bezier(0.19, 1, 0.22, 1)`)
- `outline` for focus — use `box-shadow` to respect border-radius
- `z-index` wars — keep interactive layers at `z-index: 10–20`, popovers at `20`, nav at `100`

---

## The Test

Before calling a component done, look at it and ask:

1. Does every interactive element share the same height and border treatment?
2. Does focus state use a ring, not just a color change?
3. Do dropdowns show two tiers of information (name + meta)?
4. Is there one place in the CSS to change the palette?
5. Would this feel at home on a Stripe or Vercel checkout page?

If yes to all five — ship it.
