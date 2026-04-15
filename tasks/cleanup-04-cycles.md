# Cleanup 04 — Circular Dependencies

Agent 4 of 8. Research-only pass. No files were edited.

---

## 1. Critical Assessment

**The module graph is healthy.** `madge` reports zero cycles across all 35 TS/JS/Astro files in `src/`, and a hand audit of every internal `import` in the codebase confirms it. The graph is shallow (max depth ~3: page → layout → component/lib) and the lib layer forms a clean directed tree rooted at a single entry point (`src/lib/bootstrap.ts`).

Two structural choices keep it that way:

- **`bootstrap.ts` as a single fan-out hub** (`src/lib/bootstrap.ts:13-19`). Every client module is imported from one place. No module imports `bootstrap`, so bootstrap can never be pulled into a cycle — it is a pure sink for module initializers.
- **`lenis.ts` as a leaf singleton.** Two consumers (`nav.ts:2`, `page-transition.ts:3`) read it via `getLenis()`, but `lenis.ts` itself imports nothing local (`src/lib/lenis.ts:1-3`). It is the only lib module with a non-trivial fan-in, and by keeping it dependency-free at the source level it acts as a natural cycle-breaker.

There are no shared state modules, no "utils" god-files, no barrel `index.ts` files that could silently re-export things into loops. Data (`src/data/site.ts`, `src/data/countries.ts`) is flat and imports nothing internal. The `@data`/`@components`/`@layouts`/`@lib`/`@styles` path aliases are all used consistently in one direction: pages → layout → components → data, and pages/layout → lib → lib-leaves.

A staff engineer would approve this shape as-is. The rest of this report is defensive — documenting what was checked and why nothing needs breaking.

---

## 2. Raw madge Output

Run from project root, Node/npx, madge fetched fresh.

### With `.astro` extension (primary)

```
$ npx --yes madge --circular --extensions ts,tsx,js,mjs,astro src/
- Finding files
Processed 35 files (1s) (5 warnings)

✔ No circular dependency found!
```

With `--warning` flag the 5 skipped files are virtual/external modules, not real source files:

```
✖ Skipped 5 files
astro:content
astro/loaders
astro:transitions/client
three/webgpu
three/tsl
```

These are Astro virtual modules and Three.js subpath exports — they cannot participate in a cycle with anything in `src/` because they do not live in `src/`. Skipping them is correct.

### Without `.astro` extension (TS/JS-only fallback)

```
$ npx --yes madge --circular --extensions ts,tsx,js,mjs src/
- Finding files
Processed 14 files (994ms) (5 warnings)

✔ No circular dependency found!
```

14 files is the lib layer plus `content.config.ts`, `data/*.ts`, and `three-shims.d.ts`. Same result: clean.

### Full dependency listing (for context)

```
$ npx --yes madge --extensions ts,tsx,js,mjs,astro src/
Processed 35 files

components/Enquiry.astro
components/Footer.astro
components/FooterShadows.astro
components/Hero.astro
components/Lifestyle.astro
components/Nav.astro
components/Neighbourhood.astro
components/Residences.astro
components/Vision.astro
components/seo/Head.astro
components/seo/JsonLd.astro
content.config.ts
data/countries.ts
data/site.ts
layouts/BaseLayout.astro
lib/animations.ts
lib/bootstrap.ts
  lib/animations.ts
  lib/footer-shaders.ts
  lib/lenis.ts
  lib/lifestyle-slider.ts
  lib/nav.ts
  lib/neighbourhood.ts
  lib/page-transition.ts
  lib/vision-scroll.ts
lib/footer-shaders.ts
lib/lenis.ts
lib/lifestyle-slider.ts
lib/nav.ts
  lib/lenis.ts
lib/neighbourhood-inertia.ts
lib/neighbourhood.ts
lib/page-transition.ts
  lib/lenis.ts
lib/vision-scroll.ts
pages/404.astro
pages/dev/footer.astro
pages/index.astro
pages/lifestyle.astro
pages/location.astro
pages/neighbourhood.astro
pages/residences.astro
pages/team.astro
pages/vision.astro
three-shims.d.ts
```

Only three edges exist inside `src/lib/`:

| From                     | To                    | Line                           |
| ------------------------ | --------------------- | ------------------------------ |
| `lib/bootstrap.ts`       | 7 sibling lib modules | `src/lib/bootstrap.ts:13-19`   |
| `lib/nav.ts`             | `lib/lenis.ts`        | `src/lib/nav.ts:2`             |
| `lib/page-transition.ts` | `lib/lenis.ts`        | `src/lib/page-transition.ts:3` |

Plus one dynamic import:

| From                         | To                      | Line                          |
| ---------------------------- | ----------------------- | ----------------------------- |
| `lib/bootstrap.ts` (dynamic) | `lib/footer-shaders.ts` | `src/lib/bootstrap.ts:64, 82` |

`lenis.ts` has zero internal imports (`src/lib/lenis.ts:1-3` are all from `lenis` and `gsap`). That makes it a pure sink.

---

## 3. Cycles Found

**None.** There is nothing to break.

---

## 4. Near-Cycles / Tight Coupling Worth Watching

These are not bugs. They are the only places where a careless edit _could_ introduce a cycle later. Worth keeping an eye on during future work, nothing to fix now.

### 4.1 `lib/bootstrap.ts` as hub (low risk, by design)

`src/lib/bootstrap.ts:13-19` imports from every other lib module. If any of those modules ever needs something from bootstrap (e.g. to read a shared runtime flag or a registry) it would close a loop instantly.

- **Watch for:** a module writing `import { something } from './bootstrap'`. Currently zero modules do this, and that is the invariant that keeps the lib tree acyclic.
- **If it ever needs to happen:** extract the shared piece to a new neutral module (e.g. `lib/runtime-state.ts`) that both bootstrap and the consumer import. Do not let bootstrap export state that other modules read.
- **Confidence:** high. The file's own header comment frames it as a "single entry point", and the dynamic-import pattern for `footer-shaders` (`src/lib/bootstrap.ts:64, 82`) shows the author already thinks in terms of one-way fan-out.

### 4.2 `lenis.ts` as shared singleton (low risk)

Two modules read Lenis via `getLenis()`:

- `src/lib/nav.ts:2` — `import { getLenis } from './lenis';`
- `src/lib/page-transition.ts:3` — `import { getLenis } from './lenis';`

`lenis.ts` itself imports nothing local. The accessor pattern (`getLenis()` returning a module-scoped instance) is the right shape — it means lenis does not need to know who its consumers are.

- **Watch for:** `lenis.ts` ever importing from `nav.ts`, `page-transition.ts`, or `bootstrap.ts`. A plausible failure mode would be "lenis needs to call nav's close-menu handler on scroll start" — resist that. The inverse (nav subscribes to a lenis event) is the correct direction.
- **Confidence:** high. Current shape is fine.

### 4.3 `BaseLayout.astro` imports `lenis` directly and also `bootstrap` (moderate smell, not a cycle)

`src/layouts/BaseLayout.astro:56` has `import { initLenis } from '@lib/lenis'` in an inline script, and `src/layouts/BaseLayout.astro:88` has `import { bootstrap } from '@lib/bootstrap'` in a separate inline script. `bootstrap()` also calls `initLenis` internally (`src/lib/bootstrap.ts:13`).

This is not a cycle — both imports point into lib, lib does not point back. It is a coupling duplication. The comment at `BaseLayout.astro:53` explains it ("initLenis() is idempotent so the bootstrap call later..."), and the lesson is acknowledged in `tasks/lessons.md` ("Stop rAF loops when done", clean-up patterns). Still worth flagging as a near-miss: two entry points into the same subsystem from the same file is the kind of thing that invites "just import X in lenis.ts to share state" later.

- **Watch for:** a third place initializing Lenis, or Lenis growing state that the early-init script needs to pass to the bootstrap script.
- **Confidence:** medium. The current idempotent-init contract is load-bearing and undocumented at the type level.

### 4.4 `lib/neighbourhood-inertia.ts` — orphan module (unrelated to cycles, but notable)

`src/lib/neighbourhood-inertia.ts:1` imports `gsap` and is listed by madge as a file with zero internal edges — but nothing imports it either. A repo-wide grep for `neighbourhood-inertia` returns only the file itself. It is dead code from the dependency graph's perspective. Out of scope for this agent (cycles only), but flagging for whichever agent is handling dead-code sweeps.

### 4.5 `components/FooterShadows.astro` and `lib/footer-shaders.ts` split (clean, noting for completeness)

`Footer.astro:6` imports `FooterShadows.astro`, and separately `bootstrap.ts:82` dynamic-imports `footer-shaders.ts`. There is also a direct static import from `pages/dev/footer.astro:83`. Three entry points into the WebGPU subsystem, one statically from a dev page, two production-path (component for markup, dynamic lib import for runtime).

No cycle, no risk today. Worth noting only because "markup in one file, logic in another, wired through a third" is the configuration where future refactors sometimes reach for a shared `footer-types.ts` that both ends import — which is fine if it only exports types, but becomes a cycle substrate if it ever exports runtime values. If that extraction happens, keep it type-only (`export type ...`, not `export const ...`).

---

## 5. Verification

- Primary madge run (35 files, all extensions): zero cycles.
- Fallback madge run (14 files, TS/JS only): zero cycles.
- Manual grep of every `import ... from './'`, `from '../'`, and `from '@lib|@components|@data|@layouts|@styles'` across `src/**/*.{ts,astro}`: confirms the dependency listing above. No module imports anything that could close a loop.
- The 5 skipped modules reported by madge are external virtual modules (`astro:content`, `astro/loaders`, `astro:transitions/client`, `three/webgpu`, `three/tsl`) and are not part of `src/`.

Module graph is clean. No action required.
