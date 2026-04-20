# Lessons

## Astro Content Collections + Images

**Stale `.astro/content-assets.mjs` cache**
When YAML image paths change, the generated cache goes stale. Symptoms: `ImageNotFound` or `LocalImageUsedWrongly` errors even though the file exists. Fix: delete `.astro/content-assets.mjs` and restart dev server.

**Schema key must match YAML key exactly**
If you rename a YAML key (e.g. `video:` → `bay:`), update `content.config.ts` schema in the same edit or the app crashes with `Cannot read properties of undefined (reading 'src')`.

**`image()` helper required for content images**
Gallery/image fields in content YAML must use `z.object({ src: image(), alt: z.string() })` in the schema — not `z.string()` — or Astro throws `LocalImageUsedWrongly` at build time.

**Semantic naming convention**
Stock images get semantic names before wiring into YAMLs: `res-ph-*`, `res-4b-*`, `res-3b-*`. Copy the unsplash original to the semantic name; don't rename in-place (preserves the original).

**Deleting source before creating destination**
If you delete an image that a semantic copy hasn't been created from yet, restore from git: `git show HEAD:path/to/file > destination`. Don't `cp` a `.png` with a `.jpg` extension.

---

## Vibecheck / Code Quality

**`no-god-function` has no `eslint-disable` suppression**
The vibecheck `no-god-function` rule does not honour `eslint-disable` comments. The only fix is to actually reduce the function below 80 lines by extracting helpers.

**Three-batch fix strategy for vibecheck**
Fix in order of risk: (1) trivial swaps (`innerHTML` → `replaceChildren`), (2) nesting extractions, (3) god-function splits. Reduces regression risk vs doing everything at once.

**TS closure narrowing**
After `if (!x) return`, TypeScript loses the narrowing inside nested functions/closures that close over `x`. Use non-null assertion (`x!`) or capture into a `const` with a narrowed type before the closure.

**Unused params in refactored signatures**
When extracting a helper function from an existing one, check that all params in the new signature are actually used. Unused params cause TS `TS6133` errors.

**`replaceChildren()` vs `innerHTML = ''`**
`container.replaceChildren()` (no args) is the safe, XSS-clean way to clear a container's children. `innerHTML = ''` is flagged by vibecheck's `no-innerhtml` rule.

---

## Git / Workflow

**Verify pre-existing TS errors before claiming regressions**
Use `git stash` + `tsc --noEmit` to establish a baseline before fixing TS errors introduced during refactoring. Avoids mistaking pre-existing issues for self-inflicted ones.
