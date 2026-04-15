# Cleanup 02 — Type Consolidation Audit

Agent 2 of 8. Research-only pass. No edits made.

## 1. Critical Assessment

The codebase is small and there are **very few hand-rolled types** — only 7 named `interface`/`type` declarations in all of `src/`. This is healthy for an Astro project of this size. Most inline shapes come from content-collection schemas in `src/content.config.ts`, and the vanilla-JS lib modules carry their own local `State` interfaces that exist only to thread `initX()` closures together.

Honest reads:

- **Content collections are used well.** Astro's inferred `CollectionEntry<'x'>` is implicitly consumed everywhere (`Lifestyle.astro`, `Residences.astro`, `Neighbourhood.astro`, `Vision.astro`) and nothing hand-rolls parallel types. No `z.infer` or `CollectionEntry` imports exist — Astro does the work automatically. Good.
- **The one meaningful duplication is navigation data**, not types. `src/components/Footer.astro:7-23` hard-codes `linkGroups` that overlap with `nav.menu` in `src/data/site.ts:9-28`. This is a _data_ duplication that would benefit from a small named type plus a single source of truth, but the types themselves are implicit from `as const`.
- **There is no `src/lib/types.ts`**, and after review **there is no real need for one yet**. The lib `State` interfaces (`NeighbourhoodState`, `SliderState`) are module-private glue, not shared contracts. Lifting them would be ceremony without benefit.
- **`Props` interfaces are well-scoped.** Each `.astro` file defines only the props it needs. Nothing is duplicated across components.
- **`three-shims.d.ts`** is a legitimate module-augmentation file for a real upstream typing gap — not consolidation territory.

The temptation here is to over-engineer: invent a `types.ts`, lift every `State` interface, wrap every nav link in a shared `NavLink`. Most of that is noise. The honest cleanup is narrow.

---

## 2. High-Confidence Consolidations

### 2.1 Single source of truth for nav/footer link lists

**Confidence:** high. Not strictly a type consolidation but it's the one real duplication, and the fix introduces the project's first genuinely shared type.

**Current locations:**

- `src/data/site.ts:9-28` — `nav.menu.cards`, `nav.menu.links`, `nav.menu.secondaryLinks` (+ `cta`), typed via `as const`.
- `src/components/Footer.astro:7-23` — local `linkGroups` array that duplicates "Vision / Residences / Lifestyle / Neighbourhood / Location / The Team / Blog / Terms / Privacy". Same hrefs, same labels, different grouping.
- `src/components/Nav.astro:37-70` — consumes `nav.menu` from `site.ts`. Already correct.

**What to do:**

1. Define a named `NavLink` type (e.g. `{ label: string; href: string }`) next to the nav data in `src/data/site.ts`. No new file needed — `site.ts` is already the home for site-level constants.
2. Add a `footerLinkGroups` (or similar) export to `site.ts` with the Footer's three groups. Footer.astro imports it.
3. This kills the duplication and means adding a nav item only happens in one file.

**Zod schema exists?** No — this is static site chrome, not a content collection, so Zod is inappropriate.

---

### 2.2 Derive `Props` types from content collections where Astro components re-shape entry data

**Confidence:** high for `Neighbourhood.astro`, medium elsewhere.

**Current location:**

- `src/components/Neighbourhood.astro:11-16` — builds `items` via `entries.slice().sort(...).map(entry => ({ id: entry.id, ...entry.data }))`. The resulting object shape is inferred but unnamed, and `item` is passed through five separate `.map()` blocks (tabs, images, text, maps, accordion) with no named type holding the contract.

**What to do:**

- Either type the `items` const explicitly via `CollectionEntry<'neighbourhood'>['data'] & { id: string }`, or
- Drop the spread and use `items = entries.slice().sort(...)` then access `item.id` and `item.data.label` directly. The second option avoids any new type and lets Astro's inference do its job.

The spread pattern is the only thing creating an anonymous shape in the whole components folder. Flattening it would remove the only temptation to hand-roll a type.

**Zod schema exists?** Yes — `src/content.config.ts:4-16` (`neighbourhood` collection). The schema already covers every field except `id`, which Astro adds automatically.

---

## 3. Medium-Confidence — Discuss Tradeoffs

### 3.1 `Country` type and the `COUNTRIES` constant

**Location:** `src/data/countries.ts:1-6`.

**Observation:** `Country` is defined once, used once (inside the `Enquiry.astro` inline `<script>` at line 185), and `COUNTRIES` is a `readonly Country[]`. This is fine as-is. The only thing to flag: this is the **only** hand-rolled data type in the codebase, so if a future `src/lib/types.ts` is created, `Country` is the only type that would belong there. Until a second caller appears, leave it where it is — co-located with its data is the right call.

**Verdict:** no action. Flagged only so Agent 3+ don't "consolidate" it unnecessarily.

---

### 3.2 Lib module `State` interfaces

**Locations:**

- `src/lib/neighbourhood.ts:5-20` — `NeighbourhoodState` (17 fields, all DOM refs + index state)
- `src/lib/lifestyle-slider.ts:9-24` — `SliderState` (16 fields, DOM refs + measurements + Draggable)

**Tradeoff:** Both are module-private. They exist solely so helper functions inside each module can take a single `state` parameter instead of 15 individual args. They are **not exported** and **not referenced anywhere else**. Lifting them into a shared `types.ts` would:

- Increase ceremony (two imports per consumer)
- Leak implementation internals out of the module
- Provide zero reuse benefit — no other code touches these shapes

**Verdict:** leave them local. They are doing exactly what a local interface should do: group a procedural state bag for a single-file state machine.

---

### 3.3 `Props` consolidation for SEO components

**Locations:**

- `src/layouts/BaseLayout.astro:9-12` — `{ title: string; description?: string }`
- `src/components/seo/Head.astro:4-8` — `{ title: string; description?: string; image?: string }`
- `src/components/seo/JsonLd.astro:2-4` — `{ data: Record<string, unknown> }`

**Tradeoff:** `BaseLayout` passes `title` + `description` through to `Head.astro`, which adds `image`. Technically you could define a single `SeoProps` type with optional `image` and reuse it in both, but:

- `BaseLayout` has no concept of `image` (no page passes one in)
- The duplication is 2 lines and 1 identifier
- Astro `Props` interfaces are idiomatically local

**Verdict:** not worth consolidating. The overlap is two primitive fields, and `BaseLayout`'s narrower contract is actually meaningful — it documents that layouts can't set the OG image.

---

### 3.4 Vision destructure could use a named alias

**Location:** `src/components/Vision.astro:10-12`:

```
const vision = await getEntry('pages', 'vision');
if (!vision) throw new Error('Missing content: pages/vision.yaml');
const { label, towerBody, cardCopy, cta, images, captions } = vision.data;
```

**Observation:** The `pages` collection schema (`src/content.config.ts:48-71`) has nested objects (`images.tower.src/alt`, `images.video.src/alt`, `captions.towerNumber`, `cta.label/href`). If a future second page ever consumes this collection with a different shape, the current `pages` schema is a union-unfriendly monolith — every entry has to have the exact Vision shape.

**Tradeoff:** this is a **schema design** concern, not a type consolidation one, and genuinely out of scope. The Vision component itself is fine — Astro's inference already types `vision.data` precisely.

**Verdict:** no action for this pass. Flag for a future pass that looks at content collection architecture if more pages are added.

---

## 4. Rejected — Looks Duplicated, Actually Separate

### 4.1 `FooterShaderModule` type alias

`src/lib/bootstrap.ts:64` — `type FooterShaderModule = typeof import('./footer-shaders');`

Not a duplicate. It's a one-line alias used exactly to type a lazily-awaited dynamic `import()`. Lifting it elsewhere would make the bootstrap file less self-contained.

### 4.2 `Vec2Node` in `footer-shaders.ts`

`src/lib/footer-shaders.ts:58` — `type Vec2Node = ReturnType<typeof vec2>;`

Local shim for a TSL type the library doesn't re-export. Only relevant inside the shader module. Correctly co-located.

### 4.3 `three-shims.d.ts`

Module augmentation for upstream Three.js typing gaps at subpath exports `three/webgpu` and `three/tsl`. Exactly where it belongs. Not a consolidation target.

### 4.4 `Props` interfaces across `.astro` components

Each component defines only the props it uses. None overlap. `BaseLayout.Props`, `Head.Props`, `JsonLd.Props` look similar at a glance because they all use `title`/`description`/`data` style fields, but the shapes are distinct and properly scoped.

### 4.5 Inline object literals in `animations.ts`, `nav.ts`, `vision-scroll.ts`

These files have zero type declarations because every helper takes typed DOM elements + GSAP primitives. Nothing to consolidate.

---

## Summary Table

| #   | Item                                                     | Confidence       | Action                                                                                                                    |
| --- | -------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Footer link groups duplicate `site.ts` nav               | high             | Lift to `site.ts` with a `NavLink` type; introduce `footerLinkGroups` export                                              |
| 2.2 | Neighbourhood `items` spread creates unnamed shape       | high             | Drop the spread, use `entry.id` + `entry.data.*` directly (preferred) or annotate with `CollectionEntry<'neighbourhood'>` |
| 3.1 | `Country` type isolated but fine                         | medium           | Leave as-is                                                                                                               |
| 3.2 | `NeighbourhoodState` / `SliderState`                     | medium           | Leave as-is (module-private glue)                                                                                         |
| 3.3 | SEO `Props` near-duplication                             | medium           | Leave as-is (narrower contracts are meaningful)                                                                           |
| 3.4 | `pages` collection shape monolithic                      | low/out-of-scope | Revisit if more pages added                                                                                               |
| 4.x | FooterShaderModule, Vec2Node, shims, per-component Props | rejected         | No action                                                                                                                 |

## Key File References

- `src/content.config.ts:1-73` — all four content collection schemas
- `src/data/site.ts:1-29` — single source of truth candidate for nav + footer links
- `src/components/Footer.astro:7-23` — hard-coded `linkGroups` duplicating `site.ts`
- `src/components/Neighbourhood.astro:12-15` — `{ id, ...entry.data }` spread creating the only unnamed shape
- `src/data/countries.ts:1-6` — the only standalone hand-rolled data type
- `src/lib/neighbourhood.ts:5-20` / `src/lib/lifestyle-slider.ts:9-24` — module-private state interfaces
- `src/layouts/BaseLayout.astro:9-12`, `src/components/seo/Head.astro:4-8`, `src/components/seo/JsonLd.astro:2-4` — the three Astro `Props` interfaces
- `src/three-shims.d.ts` — legitimate upstream typing shim
