# Cleanup 03 — Unused Code, Dependencies, Assets

**Agent 3 / 8** · research-only · no edits made

---

## 1. Critical Assessment

Honest read: **the codebase itself is tight. The dead weight is almost entirely in `src/assets/images/`.**

- **Code:** 1 truly orphaned lib file (`neighbourhood-inertia.ts`, already flagged by Agent 1), 1 orphaned SEO component (`seo/JsonLd.astro`), 3 dead TSL uniform exports, and 2 unused back-compat aliases in `footer-shaders.ts`. That's it.
- **CSS:** ~45 class selectors are dead, dominated by two legacy blocks — the complete 12-column grid utility (`.col-*`, `.col-start-*`) and the old footer enquiry/dropdown markup (`.site-footer__enquiry*`, `.site-footer__dropdown*`). Both are removable as single contiguous chunks.
- **Dependencies:** 1 genuinely unused dep (`@lucide/astro`). `lenis` is a false positive — knip fails to trace `.astro` inline `<script>` imports, so `bootstrap.ts` and every module it imports look dead to knip but aren't.
- **Images:** ~27 of ~53 files in `src/assets/images/` are orphaned, plus a 5MB `temp-screenshot-full.png` in the repo root and a stale `TestSohne-Extraleicht.woff2` in `public/fonts/`. Most of the orphans are the `??` files from git status — AI-generated outputs dumped into the folder that were never wired into content.

A staff engineer glancing at this would say: the code is lean on purpose, somebody just forgot to clean up the image scratchpad. One deletion PR could drop several MB from the working tree with zero risk.

---

## 2. Raw Knip Output

<details>
<summary>knip findings</summary>

```
Unused files (10)
src/lib/animations.ts
src/lib/bootstrap.ts
src/lib/lenis.ts
src/lib/lifestyle-slider.ts
src/lib/nav.ts
src/lib/neighbourhood-inertia.ts
src/lib/neighbourhood.ts
src/lib/page-transition.ts
src/lib/vision-scroll.ts
src/components/seo/JsonLd.astro

Unused dependencies (2)
@lucide/astro  package.json:18:6
lenis          package.json:21:6

Unused exports (6)
uProgress                       src/lib/footer-shaders.ts:83:14
uSunX                           src/lib/footer-shaders.ts:84:14
uSunY                           src/lib/footer-shaders.ts:85:14
destroyFooterShaders  function  src/lib/footer-shaders.ts:493:17
initFooterShadows               src/lib/footer-shaders.ts:542:31
destroyFooterShadows            src/lib/footer-shaders.ts:542:74

Unused exported types (2)
Props    interface  src/components/seo/Head.astro:3:18
Country  type       src/data/countries.ts:1:13
```

Command: `npx --yes knip@latest --no-exit-code`. No knip config present; default ruleset was used.

**Crucial caveat:** knip does not parse `<script>` blocks inside `.astro` files. `BaseLayout.astro` imports `bootstrap` and `initLenis` from inline `<script>`; `dev/footer.astro` does the same with `footer-shaders` and `tweakpane`. This is why the entire `bootstrap.ts` import graph (8 lib files) shows as "unused" — all of them except `neighbourhood-inertia.ts` are genuinely imported.

</details>

---

## 3. High-Confidence Deletions

Verified unreferenced. Safe to remove.

### Code

| Path                                                                                                                                                           | Size     | Verification                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/neighbourhood-inertia.ts`                                                                                                                             | 1 file   | `Grep "initNeighbourhoodInertia\|destroyNeighbourhoodInertia"` returns only the file's own `export function` definitions at lines 9 and 66. Not in `bootstrap.ts`, not in any `.astro` script. Already flagged independently by Agent 1 (`tasks/cleanup-01-dedup.md:39`).                                                                                                       |
| `src/components/seo/JsonLd.astro`                                                                                                                              | 1 file   | `Grep "JsonLd\|seo/JsonLd"` → no matches anywhere in `src/`. Sibling `Head.astro` is the only consumed SEO component (referenced in `BaseLayout.astro:5`).                                                                                                                                                                                                                      |
| `src/lib/footer-shaders.ts:542` — the `export { initFooterShaders as initFooterShadows, destroyFooterShaders as destroyFooterShadows }` back-compat alias line | 1 line   | `Grep "initFooterShadows\|destroyFooterShadows"` returns only that single line. No external caller uses the `*Shadows` spelling; `bootstrap.ts:83,127` uses the canonical `*Shaders` names and `dev/footer.astro:71` imports `initFooterShaders`.                                                                                                                               |
| `src/lib/footer-shaders.ts:83-85` — `export` keyword on `uProgress`, `uSunX`, `uSunY`                                                                          | 3 tokens | All three are referenced only inside `footer-shaders.ts` itself (lines 122, 248-250, 357, 378). Grep across the rest of the repo: no external use. Compare with `uCausticScale`, `uShadowAlpha`, etc. on lines 88-101 which ARE imported by `src/pages/dev/footer.astro:73-82` — those must stay exported. Safe to drop only the `export` keyword, not the uniforms themselves. |

### CSS in `src/styles/global.css`

All verified by substring search across `src/components/**`, `src/pages/**`, `src/lib/**`, `src/layouts/**` — class name does not appear in any attribute, template literal, or JS reference.

**12-column grid utility — entirely unused (24 classes):**

- `.col-1` through `.col-12` (12 classes)
- `.col-start-1` through `.col-start-12` (12 classes)

No `class="col-*"` or `class="col-start-*"` anywhere in `.astro` files. This is a whole-grid system that was never adopted. Layouts use bespoke grid-template-columns per component (`.residences__grid`, `.vision__panel`, etc.).

**Legacy footer markup — replaced but CSS never pruned (15 classes):**

`src/components/Footer.astro` only uses `.site-footer`, `.site-footer__inner`, `.site-footer__content`, `.site-footer__nav`, `.site-footer__links`, `.site-footer__link`, `.site-footer__wordmark`. Every other `.site-footer__*` selector in `global.css` is dead:

- `.site-footer__enquiry` (line 755)
- `.site-footer__enquiry-left` (766)
- `.site-footer__enquiry-heading` (774)
- `.site-footer__enquiry-meta` (783)
- `.site-footer__enquiry-label` (789)
- `.site-footer__enquiry-body` (798)
- `.site-footer__enquiry-divider` (807)
- `.site-footer__enquiry-right` (811)
- `.site-footer__enquiry-form` (815)
- `.site-footer__enquiry-input` (821) + `::placeholder` / `:focus` variants
- `.site-footer__enquiry-row` (844)
- `.site-footer__enquiry-submit` (935) — plus media-query variants at 1571, 3014
- `.site-footer__dropdown` (849) + `.is-open` state variants
- `.site-footer__dropdown-trigger` (854) — plus `.has-value` / `svg` / open-state
- `.site-footer__dropdown-menu` (889) — plus `li`, `:hover`, media query 1576
- `.site-footer__flank` (media query 1550)
- `.site-footer__tagline-row` (media query 1545)

The enquiry form now lives in `src/components/Enquiry.astro` with its own `.enquiry*` BEM namespace. This whole block (roughly lines 755-956 plus the referenced media-query partials) can be deleted as one contiguous removal. Check the diff of `Footer.astro` in commit history — the old inline enquiry was split out but the CSS was left behind.

**Other dead selectors (4 classes):**

- `.text-section` class rule at `global.css:1679` — the CSS variable `--text-section` IS used, but no element ever gets the class. `class="text-section"` does not appear in any .astro file. (`text-hero`, by contrast, IS used on every page hero.)
- `.section--hero` at `global.css:1646` — grep confirms no `class="... section--hero ..."`.
- `.residences__cta` at `global.css:1925` and `1940` — `Residences.astro` uses `.residences__footer` and `.btn.btn--primary` instead. No card has the `__cta` class.
- `.rwpaper` at `global.css:964` — zero references in any `.astro`/`.ts` file.

### Dependencies

- **`@lucide/astro`** (`package.json:18`) — `Grep "lucide"` returns only `lessons.md` documentation noting that icons should come from Lucide for spec rows. Nothing imports `@lucide/astro/*`, no `<Icon />` component is rendered. This was installed for planned icon work that never shipped. Remove from `package.json`.

### Orphaned Assets

**`src/assets/images/`** — unreferenced (no import, no YAML ref, no CSS `url()`):

Untracked (`??` in git status — never committed, safest to delete):

1. `0550f51ba03bc4e494e756a2cfb7d66b.jpg`
2. `Wynwood.jpg`
3. `_urd382m0wxsvv6rsms7m_0.png`
4. `camera_positioned_further_back_from_the_tower_...l3hgea11ru5cuc2h10xj_1.png`
5. `close-up_architectural_detail_..._71gsnblp50ldvspmwo2x_1.png`
6. `close-up_architectural_detail_..._kvpn1ucmffbm2fgclq6b_1.png`
7. `design-district.jpg`
8. `first_person_perspective_..._jn2qccd4edj6h4i2yqpx_0.png`
9. `ice-bath.jpg`
10. `interior_of_a_luxury_apartment_..._liuprhcx9oxcx4pb68l3_0.png`
11. `interior_of_a_luxury_apartment_..._ndqmn6t11a4d5gfkyiac_1.png`
12. `lush_tropical_garden_terrace_..._zbqe5h9jvzi0e47wilxn_1.png`
13. `luxury_master_bedroom_..._sjjkppdw7lokolf4ayru_1.png`
14. `luxury_residential_tower_..._v15ylhhbq9lfv71uxhsk_0.png`
15. `luxury_wellness_spa_..._iev89k5qqrfe4y9uvi60_1.png`
16. `margerat-place-park.jpg`
17. `miami_edgewater_skyline_..._dp2u1hxair0lu4ax55cd_1.png`
18. `omni-1ef4aea1-148c-477a-92eb-10f7c676d07b.png`
19. `private_dining_room_..._ue8m3m7vs8jan34f2hnk_0.png`
20. `private_residents_marina_deck_..._uach7zl76261ybo6cxlj_1.png`
21. `review_image_-_do_a_realism_pass_..._r0zai64m1chjfbvw8q00.png`
22. `rooftop_infinity_edge_pool_..._5673wv3xvrxbjilv2zlk_1.png`
23. `rooftop_infinity_edge_pool_..._930lqlrty6ip6v3a84qe_1.png`
24. `rooftop_infinity_edge_pool_..._o6hsfuz15f8ztpn392jr_0.png`
25. `street_level_view_..._pk98v9jbcdulxf8x4uz4_0.png`
26. `infrared.jpg`
27. `lifestyle-05.jpg`, `lifestyle-06.jpg`, `lifestyle-07.jpg`, `lifestyle-08.jpg`
28. `lifestyle-breathwork.jpg`, `lifestyle-plunge.jpg`
29. `vision-terrace.png`, `vision-tower.png`

Tracked but unreferenced:

- None that I found. The orphans above are all untracked, with the exception of items that appear in git status as `??` (which means untracked). The tracked-and-used set is: `hero.png`, `biscane-bay.jpg`, `spa-suite.jpg`, `menu-{vision,residences,lifestyle}.jpg`, `lifestyle-{neighbourhood,yoga,ice-plunge,red-sauna,04,spa-treatment}.jpg`, `vision-{sunset,interior}.png`, `neighbourhood-{palms,pool,sunset}.png`, `residences-{four-bedroom,penthouse}.png`.

Verification method: enumerated every string ending in `.png|.jpg|.jpeg|.webp` across `src/**/*.{astro,ts,yaml,css}` and `docs/**`, then diffed against `ls src/assets/images/`. Each orphan was double-checked with `Grep <basename>` returning either zero hits or only matches inside `.claude/settings.local.json` / `tasks/*.md` (ignorable).

**`public/fonts/TestSohne-Extraleicht.woff2`** — declared nowhere. `src/styles/fonts.css` only loads `TestSohne-Leicht.woff2` and `TestSohne-Buch.woff2`. `Grep "Extraleicht"` returns no hits.

**`temp-screenshot-full.png`** at project root — 4.95 MB. Tracked in commit `dc50270` ("refactor: CSS audit"). No reference anywhere. Stray debugging artifact; remove from repo.

---

## 4. Medium-Confidence

### `src/data/countries.ts` — `Country` type export

Knip flagged the `Country` type as unused export. Manually verified:

- `src/data/countries.ts:8` uses it internally as `COUNTRIES: readonly Country[]`.
- `src/components/Enquiry.astro:185` imports `COUNTRIES` but does not import `Country` — it infers the shape from usage.
- No other file imports `Country`.

**Recommendation:** drop the `export` keyword (keep `type Country = {...}` as a local type). Low risk, but leave the `export` if future Enquiry refactors might want typed handlers. Medium confidence on removal.

### `src/components/seo/Head.astro` — `Props` interface export

Knip flagged `Props` on line 3 as unused exported type. This is a **false positive in spirit** — Astro's convention is `export interface Props` so the compiler picks it up as the prop-types contract for `Astro.props`. Removing the `export` may work (Astro's component props typing is flexible) but the convention is to keep it. **Do not remove.** See §5.

### `site.ts` references to missing files

Not a deletion candidate, but worth flagging: `src/data/site.ts:5` references `/og.jpg` and `BaseLayout.astro:30` references `/favicon.svg`. Neither file exists in `public/`. These are broken references, not orphans — someone should either add the files or update the references. Out of scope for this agent but dropping it here.

---

## 5. False Positives (knip was wrong)

Every one of these was verified as actively referenced. Do **not** delete.

| knip flag                                                               | Why it's a false positive                                                      | Actual reference                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/bootstrap.ts`                                                  | Imported from `.astro` inline `<script>`                                       | `src/layouts/BaseLayout.astro:88` — `import { bootstrap } from '@lib/bootstrap'`                                                                    |
| `src/lib/lenis.ts`                                                      | Same — inline script import                                                    | `src/layouts/BaseLayout.astro:56` — `import { initLenis } from '@lib/lenis'`; also imported by `bootstrap.ts:13`                                    |
| `src/lib/animations.ts`                                                 | Imported by bootstrap.ts (which knip can't trace)                              | `bootstrap.ts:15`                                                                                                                                   |
| `src/lib/lifestyle-slider.ts`                                           | Same                                                                           | `bootstrap.ts:16`                                                                                                                                   |
| `src/lib/nav.ts`                                                        | Same                                                                           | `bootstrap.ts:14`                                                                                                                                   |
| `src/lib/neighbourhood.ts`                                              | Same                                                                           | `bootstrap.ts:17`                                                                                                                                   |
| `src/lib/page-transition.ts`                                            | Same                                                                           | `bootstrap.ts:19`                                                                                                                                   |
| `src/lib/vision-scroll.ts`                                              | Same                                                                           | `bootstrap.ts:18`                                                                                                                                   |
| `destroyFooterShaders` at `footer-shaders.ts:493` (function, not alias) | Consumed via dynamic import in bootstrap                                       | `bootstrap.ts:127` — `footerModule?.destroyFooterShaders()`. Note: the separate alias export on line 542 (`destroyFooterShadows`) IS dead — see §3. |
| `lenis` dependency                                                      | Real import exists                                                             | `src/lib/lenis.ts:1` — `import Lenis from 'lenis'`                                                                                                  |
| `Props` interface in `seo/Head.astro`                                   | Astro prop-typing convention; Astro compiler picks up `export interface Props` | Astro framework contract — not a normal export                                                                                                      |

The root cause for almost everything in this table is the same: **knip does not follow imports out of `.astro` `<script>` tags.** Once `bootstrap.ts` is invisible to knip, the whole dependency subtree looks orphaned. Configuring knip with Astro-aware entry points (`src/pages/**/*.astro`, `src/layouts/**/*.astro` with script-parsing) would fix most of this, but that's infra work for another agent.

---

## 6. Unused Dependencies (package.json)

Confirmed unused and safe to remove:

- **`@lucide/astro ^1.7.0`** (dependencies, line 18) — zero imports. Icon plans never shipped.

Confirmed used (despite knip flags or not):

- `@astrojs/check` → `npm run check` script (`package.json:12`)
- `@astrojs/sitemap` → `astro.config.ts:2`
- `@astrojs/ts-plugin` → `tsconfig.json:9`
- `astro` → everywhere
- `gsap` → `animations.ts`, `footer-shaders.ts`, `lenis.ts`, `lifestyle-slider.ts` (`Draggable`, `InertiaPlugin`), `nav.ts`, `neighbourhood.ts`, `page-transition.ts`, `vision-scroll.ts`, `neighbourhood-inertia.ts` (orphaned)
- `lenis` → `src/lib/lenis.ts:1` (knip false positive)
- `three` → `src/lib/footer-shaders.ts:27` (`three/webgpu`, `three/tsl`)
- `typescript` → build tooling
- dev deps: `@eslint/js`, `@typescript-eslint/*`, `astro-eslint-parser`, `eslint`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `prettier`, `prettier-plugin-astro` all used in `eslint.config.js` / `.prettierrc`
- `@types/three` → types for `three/webgpu` in `footer-shaders.ts` (also supported by `src/three-shims.d.ts`)
- `tweakpane` → `src/pages/dev/footer.astro:69` — dev-only, kept as devDependency

No dependencies are misplaced between `dependencies` and `devDependencies` from a build-correctness standpoint, though `@astrojs/check` could arguably move to dev since it's only used by `npm run check`.

---

## 7. Orphaned Images / Assets Summary

| Category                             | Count | Location                                                                                                                                                                    | Action                                             |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Untracked AI-generated PNG/JPG dumps | ~25   | `src/assets/images/`                                                                                                                                                        | `rm` — never committed                             |
| Untracked "old naming" JPGs          | ~6    | `src/assets/images/` (`lifestyle-05..08.jpg`, `lifestyle-breathwork.jpg`, `lifestyle-plunge.jpg`, `ice-bath.jpg`, `infrared.jpg`, `vision-terrace.png`, `vision-tower.png`) | `rm` — replaced by current lifestyle/vision naming |
| Stray font                           | 1     | `public/fonts/TestSohne-Extraleicht.woff2`                                                                                                                                  | `rm` — no `@font-face` references it               |
| Stray screenshot                     | 1     | `temp-screenshot-full.png` (repo root, 4.95 MB, tracked)                                                                                                                    | `git rm` and add to `.gitignore` pattern           |

**High level:** the working tree has accumulated a generation scratchpad inside `src/assets/images/`. No asset delete would break any page — verified by enumerating every `.png|.jpg|.jpeg|.webp` reference in source, YAML, and CSS and diffing against the directory listing.

---

## Verification Summary

What I actually checked, so you can trust the table above:

1. **knip run** — clean output, no config, default ruleset.
2. **For every knip "unused file"**: `Grep <basename>` across repo + opened `bootstrap.ts` which imports 7 of the 10. Only `neighbourhood-inertia.ts` and `seo/JsonLd.astro` had zero external references.
3. **For every knip "unused export"**: read `footer-shaders.ts`, traced each uniform to its caller. Distinguished `uProgress/uSunX/uSunY` (internal-only) from `uCausticScale` and friends (consumed by `dev/footer.astro`).
4. **For unused dependencies**: `Grep lucide`, `Grep "from 'lenis"` — confirmed `@lucide/astro` truly unused, `lenis` actively imported.
5. **For CSS classes**: enumerated every `.class-name` in `global.css`, substring-searched the joined content of `src/{components,pages,lib,layouts}/**`. Classes with zero substring hits were further grep-verified in the raw repo to exclude false positives (e.g. `.jpg` caught inside `url('...jpg')`, ruled out).
6. **For images**: enumerated YAML image refs, astro imports, CSS `url(...)`, and dev docs. Built the used-set manually, diffed against `ls src/assets/images/`. Double-checked each orphan candidate with `Grep <basename>` — only doc-file mentions survived, which are ignorable.
7. **For public/ assets**: confirmed video refs (`hero.mp4`, `leaf-shadows.{webm,mp4}`, `vision-drone.mp4`) and font refs (`Leicht`, `Buch`, `Light`, `Regular`, `Medium`). Flagged `Extraleicht.woff2` and the missing `og.jpg`/`favicon.svg`.

---

## Estimated impact if all high-confidence items are removed

- **Files deleted:** 2 orphaned source files + ~32 orphaned images + 1 stray font + 1 stray screenshot ≈ 36 files.
- **Disk (working tree):** ~15-25 MB of orphan PNGs + 4.95 MB screenshot. Dev experience improves because `src/assets/images/` becomes scannable again.
- **CSS LOC:** ~200 lines removable from `global.css` (3098 → ~2900), concentrated in two contiguous regions (lines 755-956 footer-legacy, lines 1646/1679/1925/964 scattered).
- **package.json:** 1 dep removed.
- **Bundle size:** negligible — unused CSS gets tree-shaken by Lightning CSS anyway; dep removal saves `node_modules` weight only. The value is clarity, not bytes.
- **Risk:** near zero if the high-confidence list is followed exactly. Everything listed there was cross-verified with at least two checks.
