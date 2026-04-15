# Cleanup Pass 05 — Weak Types

**Scope:** `src/**/*.{ts,astro}` — hunt for `any`, `unknown`, untyped params, `@ts-ignore`, loose Records, unnecessary casts, and anywhere the actual library type would be stronger.

**Tooling baseline:** `tsconfig.json` extends `astro/tsconfigs/strictest` — so `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noImplicitThis`, `noFallthroughCasesInSwitch`, etc. are all on. Any "implicit any" would fail `astro check` at build. That constrains the surface area significantly — most of the theoretical holes this pass looks for can't exist in this codebase without the compiler screaming.

---

## 1. Critical assessment

**Honest grade: A−.** This codebase is unusually type-tight for a spec site. There is exactly **one** `as any` in the entire repo. Zero `: any`, zero `any[]`, zero `Record<string, any>`, zero `@ts-ignore`, zero `@ts-expect-error`, zero `@ts-nocheck`. No implicit-any is reachable because `strictest` is active.

The author went out of their way to narrow properly:

- `src/lib/footer-shaders.ts` hand-rolls a `Vec2Node = ReturnType<typeof vec2>` alias (line 58) because TSL's `Node<"vec2">` type isn't re-exported — and then threads it through every `Fn(([uv]: [Vec2Node]) => …)` signature. That's exactly the right move.
- `src/three-shims.d.ts` exists precisely to paper over three@0.183's missing `types` condition for `three/webgpu` and `three/tsl` subpath exports, pulling the real declarations from `@types/three/src/Three.WebGPU.Nodes.js` / `Three.TSL.js`. So `WebGPURenderer`, `MeshBasicNodeMaterial`, `uniform`, `Fn`, etc. are all fully typed inside `footer-shaders.ts` — not stubbed.
- Module-level state uses discriminated null (`let renderer: THREE.WebGPURenderer | null = null`), not `!` or `any`.
- `src/lib/lifestyle-slider.ts` defines an explicit `SliderState` interface rather than stashing loose object state.
- Astro component Props interfaces use real types (`title: string; description?: string`).
- Content collections use Zod schemas — consumers get `z.infer` flow automatically via `getCollection()`/`getEntry()`, and pages pull typed data without hand-rolling any adapter types.
- ESLint is wired with `@typescript-eslint/recommended`.

The weaknesses that remain are either (a) load-bearing library quirks the author already documented, or (b) a single third-party types gap for `tweakpane`. There is no systemic rot here.

---

## 2. High-confidence replacements

### 2.1 `src/pages/dev/footer.astro:88` — `as any` on Tweakpane

```ts
const pane = new Pane({ container: document.getElementById('tp-root')! }) as any;
```

**Current type after cast:** `any` — which then infects every `pane.addFolder(...)` / `caustics.addBinding(...)` / `.on('change', …)` callback below it.

**Root cause:** `tweakpane@4.0.5`'s `dist/types/pane/pane.d.ts` declares `export declare class Pane extends RootApi`, and `RootApi` extends `FolderApi` from `@tweakpane/core`. But **`@tweakpane/core` is not listed in `package.json` and is not installed in `node_modules`** (the runtime code is inlined into `tweakpane.js`). So TypeScript cannot resolve the `FolderApi` base, which means `Pane.addFolder` / `addBinding` don't exist on the type — hence the `as any` bail-out.

**Proposed strong type:**

```ts
import { Pane, type FolderApi, type BindingApi } from 'tweakpane';

const pane: FolderApi = new Pane({ container: document.getElementById('tp-root')! });
```

…combined with adding `"@tweakpane/core": "^2.0.5"` to `devDependencies` so `FolderApi` actually resolves. Once the base class resolves, `pane.addFolder({...})` returns `FolderApi`, `.addBinding(obj, key, opts)` returns `BindingApi<unknown, T>`, and the `.on('change', ({ value }) => …)` callback is typed as `TpChangeEvent<T>` — `value` narrows to the literal binding type (`number` here) without any manual annotation.

**Justification:** Tweakpane's public API already ships full types through `FolderApi`/`BindingApi`/`TpChangeEvent` — the gap is purely a missing peer package, not a library limitation. This is a 1-line dependency fix that deletes the `any` cast and lets the 12 `({ value }: { value: number })` annotations in the file become inferred.

**Secondary benefit:** Once fixed, the `{ scale: uCausticScale.value as number, … }` state-object casts on lines 94–98, 135–137, 162–164 become redundant too — TSL's `uniform()` returns a typed node whose `.value` is already typed.

### 2.2 `src/pages/dev/footer.astro:94–98, 135–137, 162–164` — `uniform.value as number`

```ts
const cState = {
  scale: uCausticScale.value as number,
  speed: uCausticSpeed.value as number,
  // …
};
```

**Current type after cast:** `number`.

**Actual inferred type:** TSL's `uniform(initial: number)` returns a `UniformNode<number>` where `.value: number`. The cast is unnecessary — confirmed in `@types/three/src/nodes/core/UniformNode.d.ts` via the shim. Drop the `as number`:

```ts
const cState = {
  scale: uCausticScale.value,
  speed: uCausticSpeed.value,
  // …
};
```

**Justification:** The cast exists only because the author was defensive about TSL's type flow, but `uniform(0.14)`'s return type already propagates `number`. Removing the cast is purely noise reduction.

---

## 3. Medium-confidence replacements

### 3.1 `src/lib/lifestyle-slider.ts:55, 104, 123` — `gsap.getProperty(..) as number`

```ts
const currentX = gsap.getProperty(state.track, 'x') as number;
```

**Current return type:** `string | number` (confirmed in `node_modules/gsap/types/gsap-core.d.ts:369`):

```ts
function getProperty(target: TweenTarget, property: string, unit?: string): string | number;
```

**This is legitimate but ugly.** GSAP doesn't provide a generic getProperty signature keyed on the property name, so there's no way to tell TS that `'x'` always returns a number. The options are:

1. **Keep `as number`** — what's there now. Fastest, pragmatic, mildly unsafe if the property ever returns a string with a unit.
2. **Runtime parse:** `const currentX = parseFloat(String(gsap.getProperty(state.track, 'x')));` — safer (handles `"35px"` if GSAP ever returns that), no cast.
3. **Hoist a tiny wrapper once:**
   ```ts
   function getX(el: HTMLElement): number {
     const v = gsap.getProperty(el, 'x');
     return typeof v === 'number' ? v : parseFloat(v);
   }
   ```
   Then `const currentX = getX(state.track);` — no cast, no per-call parse, one source of truth.

**Recommendation:** Option 3 — one 4-line helper replaces three casts and is actually safer. This is medium-confidence because GSAP in practice always returns a number for `x` on an HTMLElement (the CSSPlugin normalises it), so the current cast doesn't crash; it's just type-unsafe by the letter.

### 3.2 `src/lib/lifestyle-slider.ts:207, 216` — `Array.from(track.children) as HTMLElement[]`

```ts
const originals = Array.from(track.children) as HTMLElement[];
```

**Current type after cast:** `HTMLElement[]`.

**Actual type of `Array.from(track.children)`:** `Element[]` — because `HTMLCollection` yields `Element`, not `HTMLElement`.

**Proposed strong type:** Narrow the query instead:

```ts
const originals = Array.from(track.children).filter(
  (el): el is HTMLElement => el instanceof HTMLElement,
);
```

or, if the template guarantees divs (it does — `.lifestyle__slide` is authored in `Lifestyle.astro` as a `<div>`):

```ts
const originals = track.querySelectorAll<HTMLElement>(':scope > *');
// returns NodeListOf<HTMLElement>, no cast needed
```

Then:

```ts
const allSlides: HTMLElement[] = Array.from(track.querySelectorAll<HTMLElement>(':scope > *'));
```

**Justification:** `Array.from(HTMLCollection)` genuinely produces `Element[]` per lib.dom.d.ts — the cast skips runtime validation and would silently break if a text node ever appeared. The `:scope > *` form with the NodeList generic is the standard fix used everywhere else in this codebase (e.g., `lifestyle-slider.ts:202-204`, `neighbourhood.ts:301-306`).

### 3.3 `src/lib/neighbourhood.ts:47` — iframe `_loaded` marker

```ts
const ext = iframe as HTMLIFrameElement & { _loaded?: boolean };
```

**Current type:** `HTMLIFrameElement & { _loaded?: boolean }`.

This is actually a _good_ intersection cast, not a weak one — it's stashing a private flag on the element without polluting the global HTMLIFrameElement interface. But the convention leaks: the `_loaded` flag is per-iframe state, not a DOM fact.

**Proposed strong type:** Lift it out of the DOM entirely:

```ts
const loadedIframes = new WeakSet<HTMLIFrameElement>();

function fadeInOnLoad(iframe: HTMLIFrameElement, panel: HTMLElement, instant: boolean) {
  if (loadedIframes.has(iframe)) {
    /* …already-loaded path… */
    return;
  }
  // on success:
  loadedIframes.add(iframe);
}
```

**Justification:** A module-scope `WeakSet<HTMLIFrameElement>` expresses exactly the same semantics with no cast, no intersection type, and auto-GC when the iframe is removed. The current pattern is a working hack but surfaces in grep as a type widening, so it reads like weakness on review.

---

## 4. Legitimate `unknown` / pragmatic casts that should stay

These match the pass's search patterns but are the correct call.

### 4.1 `src/components/seo/JsonLd.astro:3` — `Record<string, unknown>`

```ts
interface Props {
  data: Record<string, unknown>;
}
```

**Keep as-is.** This component serialises arbitrary JSON-LD via `JSON.stringify`. The shape is genuinely open — schema.org types run to thousands of subtypes, and the point of this component is to be schema-agnostic. `Record<string, unknown>` is the _correct_ type: any tighter shape would require every caller to cast through `unknown` first, which is strictly worse. `unknown` (not `any`) is right because it forces callers to build a real object literal, not spread in some untyped blob.

If more safety were needed, the right move would be `import type { Thing, WithContext } from 'schema-dts'` and typing as `WithContext<Thing>`. That's a dependency add for a use case the site doesn't exercise yet — out of scope.

### 4.2 `src/lib/page-transition.ts:172` — `as EventListener`

```ts
document.addEventListener('astro:before-preparation', onBeforePreparation as EventListener);
```

**Keep as-is.** `onBeforePreparation` is typed as `(event: TransitionBeforePreparationEvent) => void` (the first-party Astro type from `astro:transitions/client`). `addEventListener` for a non-standard event name (`astro:before-preparation` isn't in the `DocumentEventMap`) expects an `EventListener` which is `(event: Event) => void`. The cast is the idiomatic narrowing when the event type is known-tighter than the DOM's generic Event.

A stronger fix would be a module augmentation:

```ts
declare global {
  interface DocumentEventMap {
    'astro:before-preparation': TransitionBeforePreparationEvent;
  }
}
```

…but Astro already ships that augmentation in recent versions (`astro:transitions/client`). If `astro check` currently passes without it here, it's because Astro's published types don't include the augmentation yet — the `as EventListener` is the correct bridge until they do. Not a refactor target.

### 4.3 Event-target casts across `nav.ts`, `neighbourhood.ts`, `Enquiry.astro`

```ts
(e.currentTarget as HTMLElement).dataset.neighbourhoodTab(e.target as HTMLElement).closest('a');
e.relatedTarget as Node | null;
```

**Keep all of these.** DOM `Event.target`/`currentTarget`/`relatedTarget` are typed as `EventTarget | null`, which has no `dataset`/`closest`/`contains` methods. The narrowing cast to `HTMLElement`/`Node` is the standard, safe pattern because:

- Listeners are attached with `HTMLElement.addEventListener`, so `currentTarget` _is_ that element at runtime — the DOM type is just conservatively wide.
- There's no cleaner form short of writing a custom typed-listener helper, which adds ceremony for no new safety.

These aren't weak-type escapes; they're narrowing assertions in the direction the type system should already have flowed.

### 4.4 `src/lib/footer-shaders.ts:58` — `type Vec2Node = ReturnType<typeof vec2>`

```ts
type Vec2Node = ReturnType<typeof vec2>;
```

**Keep as-is and noted as exemplary.** TSL does not publicly re-export the `Node<"vec2">` parameterised type. Rather than casting every `Fn` parameter to `any`, the author recovers the exact node type from the factory function's return. This is the _correct_ pattern for TSL until three.js publishes a cleaner node-type surface, and it's how the Three.js docs themselves handle it in examples.

### 4.5 `uniform(N).value` reads for scroll state

`footer-shaders.ts:248–250` reads `uProgress.value = state.progress` etc. These are `UniformNode<number>`; `.value` is typed. No cast present, no cast needed — listed only because this is the kind of surface a weak-types audit will pass over and assume is loose when it isn't.

---

## 5. Summary of action items

| Action                                                                         | File:line                                            | Effort | Payoff                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Add `@tweakpane/core` devDep, delete `as any`                                  | `src/pages/dev/footer.astro:88`                      | 5 min  | Removes the only `any` in the repo, types all downstream bindings |
| Drop `.value as number` casts on uniforms (11 sites)                           | `src/pages/dev/footer.astro:94–98, 135–137, 162–164` | 5 min  | Noise reduction, depends on 5.1                                   |
| Introduce `getX()` helper, drop 3 `as number` casts                            | `src/lib/lifestyle-slider.ts:55, 104, 123`           | 10 min | Safer than blind cast, one source of truth                        |
| Replace `Array.from(children) as HTMLElement[]` with scoped `querySelectorAll` | `src/lib/lifestyle-slider.ts:207, 216`               | 5 min  | Matches codebase convention, removes runtime-lie cast             |
| Swap iframe intersection cast for module `WeakSet`                             | `src/lib/neighbourhood.ts:47`                        | 10 min | Cleaner type surface, same semantics                              |

**Not action items (keep):** `JsonLd` `Record<string, unknown>`, `page-transition` `as EventListener`, DOM event-target casts, `Vec2Node` alias in footer-shaders, `uniform.value` reads in footer-shaders scroll state.

**Total engineering cost to land everything in section 2–3:** ~35 minutes. The codebase is already type-tight; this pass is about polishing the last few corners, not rescuing anything.
