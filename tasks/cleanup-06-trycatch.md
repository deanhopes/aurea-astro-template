# Cleanup 06 — try/catch audit

## 1. Critical assessment

Defensive theater in this codebase is essentially **zero**. The entire `src/` tree contains exactly **two** `try` blocks and **two** `.catch()` calls. Of those four sites, three are defensibly legitimate and one is worth a small cleanup.

This is a small surface area and the code is already disciplined — no `catch (e) { console.warn(...) }` sprinkled across modules, no "just in case" wrappers around known-safe code, no fallback values where an invariant is expected.

Only one item (the iframe cross-origin probe in `neighbourhood.ts`) is worth rewriting — not because it's "defensive theater" in the swallowing sense, but because it's using `try/catch` as primary control flow when a feature-detect would be more honest. The WebGPU init catch has one cosmetic issue (`console.warn` without actionable context) but the fallback path itself is correct.

Total try/catch sites: **4**

- High-confidence remove: **0**
- Medium-confidence (refactor, not remove): **1**
- Keep as-is: **3**

---

## 2. High-confidence removals

None.

---

## 3. Medium-confidence — worth discussing

### 3.1 `src/lib/neighbourhood.ts:64-80` — iframe loaded-state probe

Current code:

```ts
if (iframe.src && iframe.contentWindow) {
  try {
    // If we can access contentWindow without error, it's loaded
    // (cross-origin will throw, but that means it loaded)
    void iframe.contentWindow.location;
    ext._loaded = true;
    gsap.set(panel, { opacity: 1 });
    panel.classList.add('is-active');
    return;
  } catch {
    // Cross-origin = loaded
    ext._loaded = true;
    gsap.set(panel, { opacity: 1 });
    panel.classList.add('is-active');
    return;
  }
}
```

**Assessment.** Both branches do the exact same thing. The `try` branch and `catch` branch set identical state. The only reason this is a try/catch is that _reading_ `contentWindow.location` on a cross-origin Google Maps iframe throws a `SecurityError` — and the author is using the throw as evidence that the iframe has, in fact, loaded.

This isn't "defensive theater" in the swallowing sense — the author is using throw-as-control-flow. But because both branches do the same work, the `try/catch` is structurally pointless. If both outcomes are the same, the probe itself is the test: `iframe.src && iframe.contentWindow` is already enough to decide "treat as loaded." The `void contentWindow.location` line does nothing meaningful and can be deleted.

**Proposed replacement.**

```ts
if (iframe.src && iframe.contentWindow) {
  ext._loaded = true;
  gsap.set(panel, { opacity: 1 });
  panel.classList.add('is-active');
  return;
}
```

**Why.** `contentWindow` is non-null for same-origin _and_ cross-origin iframes once the document has committed, so the `src + contentWindow` check alone is sufficient. Removing the try/catch also removes a confusing comment ("Cross-origin = loaded") that reads like a workaround when it's actually the intended path.

---

## 4. Keep

### 4.1 `src/lib/footer-shaders.ts:267-272` — WebGPU init

```ts
try {
  await renderer.init();
} catch {
  console.warn('FooterShaders: WebGPU init failed');
  return false;
}
```

**Keep.** Hardware may not support WebGPU (Safari, older Chrome, low-end GPUs, headless CI). `renderer.init()` rejects on adapter request failure or device-loss during adapter creation, and there's a real fallback — `initFooterShaders` returns without installing the renderer, the footer still renders with the static gradient from CSS, and `bootstrap.ts:150` has a 2500ms hard timeout on `firstLoadCurtain` so a broken shader can never trap the user.

**Optional nit:** the `console.warn` carries no error object. Either pass `err` through for debuggability or delete the warn entirely. Minor craft improvement, not a correctness fix.

### 4.2 `src/lib/footer-shaders.ts:404-406` — `videoEl.play().catch(...)`

```ts
videoEl!.play().catch(() => {
  videoEl!.currentTime = 0;
});
```

**Keep.** Video `.play()` rejects for autoplay-policy reasons. The action in the catch isn't "swallow" — it resets `currentTime` so the next play attempt starts from frame 0. Real runtime constraint, meaningful reaction, and the video is decorative (shader pipeline handles a missing mask gracefully per `docs/codebase.md:80`).

### 4.3 `src/lib/neighbourhood.ts:351` — `document.fonts.ready.then(...).catch(measureIfDesktop)`

```ts
if (document.fonts?.ready) {
  document.fonts.ready.then(measureIfDesktop).catch(measureIfDesktop);
} else {
  measureIfDesktop();
}
```

**Keep.** Structurally a feature detect: `document.fonts.ready` can reject on some browsers / network font failures, and the reaction is to run the same measurement path. The alternative would be an unhandled rejection when a web font 404s. Legitimate fallback.

---

## Relevant files

- `src/lib/footer-shaders.ts` (lines 267-272, 404-406)
- `src/lib/neighbourhood.ts` (lines 64-80, 351)
- `src/lib/bootstrap.ts` (lines 79-90, 146-151) — verifies the WebGPU failure path has a real downstream handler
