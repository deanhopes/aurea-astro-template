# Cleanup 08 — AI Slop / Comment Hygiene

Research-only pass. No files edited.

---

## 1. Critical Assessment

**The codebase is in pretty good shape, actually.** This is not a slop-drenched vibecoded project. The comment discipline is better than average for a spec build — the footer shader file in particular has earned its comments (physical model explanations, finite-difference reasoning, domain-warp rationale). The `lessons.md` rules are clearly being applied.

The real slop lives in three pockets:

1. **Astro file-level JSDoc banners** on every component (`Hero.astro`, `Footer.astro`, `Residences.astro`, etc.) that restate the component name in prose. These are pure larp — the filename already tells you what the component is.
2. **Section-banner comments** (`// ── Phone country selector ─────`, `/* ── State ── */`, `/* ── DOM refs ── */`) scattered across `footer-shaders.ts`, `page-transition.ts`, `bootstrap.ts`, `Enquiry.astro`, and the dev footer page. These are decorative. They violate the "no section banners" rule.
3. **Narration-style inline comments** that restate what the next line does in English (`// Reset the unused axis`, `// Freeze scroll immediately`, `// Close nav menu if open`, `// Measure text panel heights for stable layout`). Code reads fine without them.

Everything under `src/lib/footer-shaders.ts:107–390` (the shader TSL) is mostly load-bearing and should largely survive — the physics explanations are exactly the "shader math / why a magic number" case the standard says to keep. The section banners inside that file (`/* ── State ── */`, `/* ── TSL Uniforms ── */`, `/* ── Sizing ── */`, `/* ── Render loop ── */`, `/* ── Public API ── */`) should go.

Global.css has a healthy amount of `/* end @layer X */` markers and restatement comments (`/* Header */`, `/* Nav bar */`, `/* Menu panel */`, `/* Menu cards */`). CSS tolerates this better than TS, but most of these comments are still just section labels above a class that has the same name. Trim aggressively.

Rough counts:

- **129** line-comment occurrences across 10 source files
- **~120** block/CSS comments in `global.css` alone
- Estimated **~55–65** comments are DELETE-worthy, **~15** should be REWRITE (tightened), and ~**25–30** should stay.

No TODO/FIXME/HACK/XXX/stub markers found anywhere. No emoji comments. No "Added for issue #X" rot.

---

## 2. High-Confidence Deletions

Format: `file:line — current text`

### Astro file-level JSDoc banners (all pure larp — filename carries the info)

- `src/components/Hero.astro:2–5` — `/** Hero — full-viewport image with bottom-centre text overlay. 4px radius, clipped. Placeholder gradient until real render is dropped in. */`
- `src/components/Footer.astro:2–5` — `/** Footer — fixed behind content, revealed as page scrolls past. Nav links + giant AUREA wordmark. Enquiry lives in Enquiry.astro above. */`
- `src/components/FooterShadows.astro:2–6` — `/** FooterShadows — WebGPU canvas for video shadow silhouettes + lighting. ... See src/lib/footer-shaders.ts for the model. */`
- `src/components/Lifestyle.astro:2–5` — `/** Lifestyle — editorial section with draggable image slider. ... */`
- `src/components/Neighbourhood.astro:2–7` — `/** Neighbourhood — tabbed section. Tabs across the top ... */` (describes layout the code demonstrates; "content from collection" line is also restatement of the `getCollection` call on line 11)
- `src/components/Residences.astro:2–4` — `/** Residences — three-card editorial teaser. */`
- `src/components/Vision.astro:2–6` — `/** Vision — horizontal scroll section. Sticky container with GSAP ScrollTrigger scrub. Track translates left as user scrolls vertically. */`
- `src/components/Enquiry.astro:2–5` — `/** Enquiry — "Schedule a Private Viewing" section. Reusable between pages. Anchored as #enquire for nav CTAs. */`
- `src/pages/dev/footer.astro:2–6` — `/** /dev/footer — isolated footer shader testbed. ... */`

### Section banners inside files (decorative dividers)

- `src/components/Enquiry.astro:191` — `// ── Phone country selector ────────────────────`
- `src/components/Enquiry.astro:246` — `// ── Residence select ──────────────────────────`
- `src/components/Enquiry.astro:275` — `// ── Close all ─────────────────────────────────`
- `src/components/Enquiry.astro:299` — `// ── Form submission ───────────────────────────`
- `src/lib/bootstrap.ts:21` — `/* ── Scroll reveal observer (was inline in BaseLayout) ── */` (also contains "was inline in" — deleted-behavior reference)
- `src/lib/bootstrap.ts:132` — `/* ── Lifecycle ── */`
- `src/lib/footer-shaders.ts:60` — `/* ── State ── */`
- `src/lib/footer-shaders.ts:82` — `/* ── TSL Uniforms ── */`
- `src/lib/footer-shaders.ts:214` — `/* ── Sizing ── */`
- `src/lib/footer-shaders.ts:223` — `/* ── Render loop ── */`
- `src/lib/footer-shaders.ts:260` — `/* ── Renderer init ── */`
- `src/lib/footer-shaders.ts:391` — `/* ── Video loading ── */`
- `src/lib/footer-shaders.ts:431` — `/* ── Public API ── */`
- `src/lib/footer-shaders.ts:87` — `// Caustic tuning — exposed for tweakpane`
- `src/lib/footer-shaders.ts:93` — `// Shadow mask tuning`
- `src/lib/footer-shaders.ts:98` — `// Lighting`
- `src/lib/footer-shaders.ts:541` — `// Back-compat aliases` (followed by `export { ... as ... }` — rename the consumer instead; this comment just papers over an API duplicate)
- `src/lib/page-transition.ts:5` — `/* ── Constants ── */`
- `src/lib/page-transition.ts:10` — `/* ── State ── */`
- `src/lib/page-transition.ts:13` — `/* ── DOM refs ── */`
- `src/lib/page-transition.ts:31` — `/* ── Curtain Close (cover the viewport) ── */`
- `src/lib/page-transition.ts:53` — `/* ── Curtain Snap Closed (no animation, for first load) ── */`
- `src/lib/page-transition.ts:62` — `/* ── Curtain Open (reveal the page) ── */`
- `src/lib/page-transition.ts:85` — `/* ── Lifecycle Handlers ── */`
- `src/lib/page-transition.ts:169` — `/* ── Init (called once, listeners persist across navigations) ── */`
- `src/pages/dev/footer.astro:90` — `// ── Caustics ────────────────────────────────────────────`
- `src/pages/dev/footer.astro:131` — `// ── Shadow mask ──────────────────────────────────────────`
- `src/pages/dev/footer.astro:158` — `// ── Lighting ─────────────────────────────────────────`

### Narration (restates what the next line does)

- `src/lib/page-transition.ts:43` — `// Reset the unused axis in case viewport changed since last navigation` (the `gsap.set([...], { [resetAxis]: 0 })` is self-explanatory; the "in case viewport changed" reason is the only meaningful part — if kept, rewrite. See §3.)
- `src/lib/page-transition.ts:88` — `// Back/forward: skip curtains, instant swap` (immediately followed by `if (event.navigationType === 'traverse') return;` — the check name says it)
- `src/lib/page-transition.ts:91` — `// Respect reduced motion`
- `src/lib/page-transition.ts:94` — `// Prevent overlapping navigations`
- `src/lib/page-transition.ts:102` — `// Freeze scroll immediately`
- `src/lib/page-transition.ts:105` — `// Close nav menu if open`
- `src/lib/page-transition.ts:111` — `// Wrap Astro's loader: animate curtains closed while page fetches in parallel` (the `Promise.all([...])` two lines below says exactly this)
- `src/lib/page-transition.ts:137` — `// Reduced motion: reveal immediately, no wait.`
- `src/lib/neighbourhood.ts:50` — `// Already loaded from a previous visit — show immediately`
- `src/lib/neighbourhood.ts:82` — `// Keep hidden until the iframe content loads`
- `src/lib/neighbourhood.ts:99` — `// Lazy-load iframe src on first activation`
- `src/lib/neighbourhood.ts:317` — `// Build layout map from tab data attributes`
- `src/lib/neighbourhood.ts:343` — `// Measure text panel heights for stable layout`
- `src/lib/neighbourhood.ts:395` — `// Desktop: preload map iframe on tab hover so it's ready by click`
- `src/lib/neighbourhood.ts:407` — `// Desktop: tab clicks`
- `src/lib/neighbourhood.ts:418` — `// Mobile: accordion clicks`
- `src/lib/neighbourhood.ts:427` — `// Respond to breakpoint crossing`
- `src/lib/neighbourhood.ts:435` — `// Reposition indicator on resize`
- `src/lib/neighbourhood.ts:443` — `// Visibility restore`
- `src/lib/neighbourhood-inertia.ts:16` — `// Only on desktop (absolute-positioned images)`
- `src/lib/neighbourhood-inertia.ts:24` — `// Create quickTo tweens for each image — spring-like follow`
- `src/lib/neighbourhood-inertia.ts:26` — `// Alternate intensity so images feel layered`
- `src/lib/neighbourhood-inertia.ts:37` — `// Normalise cursor pos to -1…1 relative to section centre`
- `src/lib/neighbourhood-inertia.ts:48` — `// Spring back to origin`
- `src/lib/nav.ts:27` — `// Mobile: all items are flat text links — stagger as one sequence`
- `src/lib/nav.ts:38` — `// Desktop: cards with images + sidebar links`
- `src/lib/footer-shaders.ts:158` — `// Quintic smoothstep for smoother derivatives at cell boundaries` (the `.mul(f)...add(10.0)` below IS the quintic polynomial, but "smoother derivatives" is the only non-obvious bit — see §3)
- `src/lib/footer-shaders.ts:153` — `// Smooth value noise — bilinear interp of 4 hashed corners, quintic smooth` (restates the function name `valueNoise` + what the body clearly does)
- `src/lib/footer-shaders.ts:172` — `// 3-octave fBm — sum of value noise at doubling frequencies, halving amplitudes` (restates function name + body)
- `src/lib/footer-shaders.ts:180` — `// The scalar height field. Domain-warped so it flows rather than obviously tiles.` (the long header block at lines 134–148 already covers this)
- `src/lib/footer-shaders.ts:191` — `// Final sample — smooth animated field ∈ [0, 1]`
- `src/lib/footer-shaders.ts:283–284` — `// Placeholder 1×1 canvas texture for videoTexNode until the video plays. // Must have pixel data — empty canvas → CopyExternalImageToTexture error on WebGPU.` — KEEP the second line as the WHY; delete the first. (Handled in §3 rewrite.)
- `src/pages/dev/footer.astro:85` — `// Boot shaders at full reveal — staticProgress bypasses ScrollTrigger entirely`
- `src/pages/dev/footer.astro:61` — `<!-- Scroll trigger stub — progress driven by tweakpane slider instead -->` (the attribute `data-footer-trigger` + empty div + `aria-hidden="true"` all already scream "stub")

### CSS section labels (component name duplicated above selector)

From `src/styles/global.css` — delete these pure-label comments:

- `global.css:14` — `/* ─── Custom Properties ─── */` (already inside `@layer tokens`)
- `global.css:18` — `/* Core palette */`
- `global.css:23` — `/* Grays */`
- `global.css:34` — `/* Font families */`
- `global.css:38` — `/* Type scale */`
- `global.css:53` — `/* Spacing scale */`
- `global.css:60` — `/* Surfaces */`
- `global.css:82` — `/* The easing */`
- `global.css:85` — `/* Transitions */`
- `global.css:89,101,163,1580,1665,1946,3037,3089,3098` — all `/* end @layer X */` sentinels. Editor folding + `@layer` blocks make these redundant.
- `global.css:91` — `/* ─── Reset ─── */`
- `global.css:103` — `/* ─── Base ─── */`
- `global.css:123` — `/* ─── Display type defaults ─── */`
- `global.css:137` — `/* ─── Selection ─── */`
- `global.css:144` — `/* ─── Links ─── */` (generic `a { ... }`)
- `global.css:151` — `/* ─── Scroll reveal ─── */`
- `global.css:165` — `/* ─── Component styles ─── */`
- `global.css:168` — `/* Header */` (directly above `.header { ... }`)
- `global.css:189` — `/* Nav bar */` (above `.nav-bar`)
- `global.css:262` — `/* ─── Button component ─── */` (above `.btn`)
- `global.css:307` — `/* Menu panel */` (above `.menu-panel`)
- `global.css:322` — `/* Menu cards */` (above `.menu-cards`)
- `global.css:391` — `/* Menu sidebar */` (above `.menu-sidebar`)
- `global.css:436` — `/* Mobile menu */`
- `global.css:472` — `/* Panel: simple vertical list, no image cards */`
- `global.css:480` — `/* Hide card images, convert cards to text links */`
- `global.css:526` — `/* Override hover styles */`
- `global.css:537` — `/* Sidebar: same text-link style, flush with cards */`
- `global.css:575` — `/* Divider between primary and secondary */`
- `global.css:581` — `/* Secondary links: smaller, muted */`
- `global.css:618` — `/* Tablet + small desktop menu */`
- `global.css:662` — `/* Narrow tablet: 2-col cards */`
- `global.css:693` — `/* ─── Footer shadows ─── */`
- `global.css:712` — `/* ─── Footer (fixed reveal) ─── */`
- `global.css:740` — `/* Content wrapper — centres icon, tagline, nav */`
- `global.css:753–754` — `/* Icon */` and `/* Footer enquiry form */` (orphaned `Icon` label above `.site-footer__enquiry` which is the form block, not an icon — actively misleading)
- `global.css:962` — `/* ─── Enquiry section ─── */`
- `global.css:970` — `/* ── Enquiry ──────────────────────────────────── */` (duplicate of above, 8 lines apart)
- `global.css:1053` — `/* Card surface for the form */` (above `.enquiry__card`)
- `global.css:1210` — `/* Popover */` (above `.enquiry__phone-popover`)
- `global.css:1307` — `/* ── Residence select ─────────────────────────────── */`
- `global.css:1462` — `/* Nav links row */`
- `global.css:1508` — `/* Giant wordmark */`
- `global.css:1525` — `/* Footer responsive */`
- `global.css:1582` — `/* ─── Page layout ─── */`
- `global.css:1591` — `/* Hero */`
- `global.css:1667` — `/* ─── Typography ─── */`
- `global.css:1692` — `/* Section label (shared across vision, lifestyle, residences, neighbourhood) */` (the selector list that follows IS this list)
- `global.css:1710` — `/* ─── Grid System ─── */`
- `global.css:1737` — `/* Span utilities — desktop 12-col */`
- `global.css:1775` — `/* Start utilities — desktop 12-col */`
- `global.css:1813` — `/* Tablet — items span full width of 3-col grid by default */`
- `global.css:1846` — `/* Mobile — everything full width */`
- `global.css:1864` — `/* ─── Content containers ─── */`
- `global.css:1874` — `/* ─── Spacing ─── */`
- `global.css:1883` — `/* ─── Links ─── */`
- `global.css:1948` — `/* ─── Vision (horizontal scroll) ─── */`
- `global.css:1970` — `/* Panels */`
- `global.css:1994` — `/* Tower text block */`
- `global.css:2013` — `/* Editorial card */`
- `global.css:2024` — `/* Card columns */`
- `global.css:2058` — `/* Card copy */`
- `global.css:2077` — `/* CTA */`
- `global.css:2091` — `/* Card images */`
- `global.css:2106` — `/* Captions — matches lifestyle caption style */`
- `global.css:2130` — `/* Full-bleed image pair */`
- `global.css:2156` — `/* Image hover */`
- `global.css:2167` — `/* ── Vision: responsive ── */`
- `global.css:2235` — `/* ── Reduced motion ── */`
- `global.css:2277` — `/* ─── Lifestyle (editorial two-column) ─── */`
- `global.css:2308` — `/* Copy block under slider, pinned right */`
- `global.css:2315` — `/* Draggable slider */`
- `global.css:2479` — `/* Lifestyle responsive */`
- `global.css:2491` — `/* mobile lifestyle override removed — --space-edge handles all breakpoints */` (classic deleted-behavior reference — code is gone, the comment remains pointing at nothing)
- `global.css:2493` — `/* ─── Residences (card grid teaser) ─── */`
- `global.css:2632` — `/* mobile residences override removed — --space-edge handles all breakpoints */` (same)
- `global.css:2634` — `/* ─── Neighbourhood (tabbed section) ─── */`
- `global.css:2651` — `/* Intro — centred label + heading (matches residences) */`
- `global.css:2674` — `/* Tabs — segmented control */`
- `global.css:2755` — `/* Media — fixed aspect */`
- `global.css:2767` — `/* Text — fills remaining space, body pinned bottom */`
- `global.css:2835` — `/* Text — bottom of right column */`
- `global.css:2891` — `/* Accordion — hidden on desktop */` (the selector literally does `display: none` — visible right there)
- `global.css:2896` — `/* Tablet */`
- `global.css:2906` — `/* Mobile */`
- `global.css:3002` — `/* Neighbourhood — reduced motion */`
- `global.css:3012` — `/* Footer enquiry responsive */`
- `global.css:3039` — `/* ─── Page Transition Curtains ─── */`

### fonts.css

- `src/styles/fonts.css:1–4` — the `/* Font declarations for Test Söhne ... */` header.
- `src/styles/fonts.css:6` — `/* ─── Test Söhne ─── */`
- `src/styles/fonts.css:24` — `/* ─── Aktiv Grotesk ─── */`

The `@font-face` rules name their own `font-family`.

### dev footer page inline style comments

- `src/pages/dev/footer.astro:20` — `/* Minimal reset — BaseLayout normally sets these */`
- `src/pages/dev/footer.astro:37` — `/* Make the footer fill the full viewport on this dev page */`
- `src/pages/dev/footer.astro:45` — `/* body bg would cover z-index:-1 footer — remove it */` (this one has a whiff of WHY — keep or rewrite, see §3)
- `src/pages/dev/footer.astro:51` — `/* Tweakpane panel — top-right, above footer content */`

---

## 3. Rewrites

Only these earn a shorter surviving form:

| file:line                                                                                      | current                                                                                                                                                                                                                                                                                 | proposed                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/lenis.ts:17–19`                                                                       | `// Shorter duration + lerp = responsive on first wheel after reload. // The old 1.2s duration made the page feel locked while the tween // caught up to the user's first input.`                                                                                                       | `// Duration < 1s so first wheel after reload doesn't feel locked.`                                                                                                                                                                    |
| `src/lib/lenis.ts:11–13`                                                                       | `// Idempotent — safe to call from both the early head script and the // bootstrap astro:page-load handler. First call wins; later calls no-op // unless a destroyLenis() has run between them.`                                                                                        | `// Idempotent: early head script + bootstrap both call this.`                                                                                                                                                                         |
| `src/lib/bootstrap.ts:93–96`                                                                   | `// First load: kick off the compile synchronously so footerReadyPromise // is populated by the time firstLoadCurtain() reads it. The dynamic // import + initFooterShaders() work happens off the main thread // anyway — the module resolution is what matters for promise identity.` | `// Sync kick so footerReadyPromise is set before firstLoadCurtain() reads it.`                                                                                                                                                        |
| `src/lib/bootstrap.ts:103–105`                                                                 | `// Subsequent ClientRouter mounts: module is already warm, but the // renderer may have been torn down. Gate on IO to avoid re-mounting // until the footer is actually approached.`                                                                                                   | `// ClientRouter remounts: module warm, renderer torn down. Gate on IO.`                                                                                                                                                               |
| `src/lib/bootstrap.ts:147–149`                                                                 | `// Shader is already compiling (kicked off inside scheduleFooterShaders). // Keep the curtain over the viewport until it resolves, with a hard // timeout so a broken shader never traps the user.`                                                                                    | `// Hold curtain until shader ready; hard timeout so a broken shader can't trap the user.`                                                                                                                                             |
| `src/lib/bootstrap.ts:169`                                                                     | `// Page transition listeners attach once and persist across navigations.`                                                                                                                                                                                                              | Delete — the `initPageTransition()` comment inside page-transition.ts line 169 already says this.                                                                                                                                      |
| `src/lib/nav.ts:146`                                                                           | `// Non-null refs for closures (TS can't narrow querySelector across closure boundaries)`                                                                                                                                                                                               | `// TS can't narrow querySelector across closure boundaries.`                                                                                                                                                                          |
| `src/lib/nav.ts:176–178`                                                                       | `// When the menu opens via hover, ignore close-clicks for this long — a user // who naturally hovers-then-clicks shouldn't accidentally close what they // just opened.`                                                                                                               | `// Grace window: hover-open then click should not immediately close.`                                                                                                                                                                 |
| `src/lib/nav.ts:96`                                                                            | `// Only attach hover-to-open on devices with real hover (not touch)`                                                                                                                                                                                                                   | Delete — `matchMedia('(hover: hover)')` below is self-documenting.                                                                                                                                                                     |
| `src/lib/footer-shaders.ts:84`                                                                 | `export const uSunX = uniform(0.34); // sun horizontal position, driven by mouseX`                                                                                                                                                                                                      | Delete trailing comment — `uSunX` + the lighting block at line 354 already carries the meaning.                                                                                                                                        |
| `src/lib/footer-shaders.ts:85`                                                                 | `export const uSunY = uniform(0.5); // sun vertical tilt, driven by mouseY — narrow range`                                                                                                                                                                                              | Same, delete.                                                                                                                                                                                                                          |
| `src/lib/footer-shaders.ts:177`                                                                | `return n1.add(n2).add(n3).mul(0.571); // normalise to [0, 1]`                                                                                                                                                                                                                          | Keep (magic number justification), tighten: `// 0.571 ≈ 1 / (1 + 0.5 + 0.25) — normalises fBm octaves to [0,1]`                                                                                                                        |
| `src/lib/footer-shaders.ts:185–186`                                                            | `// Domain warp — feed p into fbm, use the result to offset p, sample fbm again. // This destroys the grid structure of valueNoise and creates flowing forms.`                                                                                                                          | `// Domain warp breaks the valueNoise grid into flowing forms.`                                                                                                                                                                        |
| `src/lib/footer-shaders.ts:201`                                                                | `// Video texture is Y-flipped relative to canvas UV convention`                                                                                                                                                                                                                        | Keep (non-obvious gotcha, already tight).                                                                                                                                                                                              |
| `src/lib/footer-shaders.ts:203–204`                                                            | `// Sample the same videoTexNode at a new UV — TSL clones with referenceNode // so \`.value =\` swaps still apply to this sample.`                                                                                                                                                      | `// TSL clones via referenceNode so videoTexNode.value swaps reach this sample too.`                                                                                                                                                   |
| `src/lib/footer-shaders.ts:283–284`                                                            | `// Placeholder 1×1 canvas texture for videoTexNode until the video plays. // Must have pixel data — empty canvas → CopyExternalImageToTexture error on WebGPU.`                                                                                                                        | `// Must have pixel data — empty canvas → CopyExternalImageToTexture error on WebGPU.`                                                                                                                                                 |
| `src/lib/footer-shaders.ts:294–296`                                                            | `// Build the base TextureNode once with no UV. Samples elsewhere use // texture(videoTexNode, customUV) which clones with a referenceNode — // so swapping .value to the real VideoTexture still updates every sample.`                                                                | Delete — duplicates the 201/203–204 rewrite above.                                                                                                                                                                                     |
| `src/lib/footer-shaders.ts:302–303`                                                            | `// Warm shadow tint — deep burnt umber reads as shade without going cold. // A blue-grey here pulls the whole palette away from the brand's warmth.`                                                                                                                                   | `// Burnt umber, not blue-grey — shadow must stay warm to match palette.`                                                                                                                                                              |
| `src/lib/footer-shaders.ts:325–326`                                                            | `// Finite-difference epsilon. fBm at modest scale has slopes ~0.1/unit-UV, // so we need enough separation to see a meaningful difference.`                                                                                                                                            | `// eps wide enough for fBm slopes (~0.1/unit-UV) to produce meaningful differences.`                                                                                                                                                  |
| `src/lib/footer-shaders.ts:329`                                                                | `// Four-tap central differences give symmetric normals with no bias.`                                                                                                                                                                                                                  | Keep (shader math rationale, already one line).                                                                                                                                                                                        |
| `src/lib/footer-shaders.ts:339`                                                                | `// Surface normal. Smaller z = more dramatic tilts → stronger lighting response.`                                                                                                                                                                                                      | Keep, tighten: `// Smaller z → steeper normals → stronger lighting.`                                                                                                                                                                   |
| `src/lib/footer-shaders.ts:342–343`                                                            | `// Caustic brightness = \|∇h\|². Bright where the surface is steep, which // is where refracted light physically concentrates. Smooth falloff.`                                                                                                                                        | `// Caustic brightness = \|∇h\|² — physical: light concentrates at steep slopes.`                                                                                                                                                      |
| `src/lib/footer-shaders.ts:354–356`                                                            | `// Sun direction — horizontal tracks mouseX, vertical tilts with mouseY // in a narrow [0.35, 0.65] range so the light "breathes" as the cursor // moves without ever looking like a control surface.`                                                                                 | `// Y range narrow [0.35, 0.65] so the sun "breathes" instead of tracking.`                                                                                                                                                            |
| `src/lib/footer-shaders.ts:359–361`                                                            | `// Diffuse lighting — centred above 1.0 so lit slopes *brighten* the // underlying gradient (range [0.75..1.25]). A symmetric [0.5..1.0] // half-lambert darkens more than it lights, which fights the brand palette.`                                                                 | `// Lambert offset [0.75..1.25]: symmetric half-lambert darkens more than brand palette can take.`                                                                                                                                     |
| `src/lib/footer-shaders.ts:381–382`                                                            | `// Alpha = 1: the canvas is always opaque. Progress only drives the composite // fade inside finalColorFn — easier to diagnose scroll pipeline issues.`                                                                                                                                | `// Opaque canvas: progress fades inside finalColorFn, not via alpha.`                                                                                                                                                                 |
| `src/lib/footer-shaders.ts:446–447`                                                            | `// Longer duration on Y — vertical cursor motion is usually incidental, so // a lazier lag makes the sun feel like it's drifting rather than tracking.`                                                                                                                                | `// Lazier Y lag — vertical cursor noise shouldn't drive the sun 1:1.`                                                                                                                                                                 |
| `src/lib/page-transition.ts:159–161`                                                           | `// Hand control from CSS (pinned via data-booting) to GSAP. Snap-set // the panels to the same closed position, then drop data-booting so // the curtainOpen() tween can actually move them.`                                                                                          | `// Hand off from CSS data-booting pin to GSAP: snap closed, then clear attr so the tween can run.`                                                                                                                                    |
| `src/lib/neighbourhood.ts:63–67`                                                               | `// Check if iframe already loaded before JS ran (first tab with src in HTML) ... // If we can access contentWindow without error, it's loaded // (cross-origin will throw, but that means it loaded)`                                                                                  | Collapse to one line above the try: `// cross-origin access throws but still means the iframe has loaded`                                                                                                                              |
| `src/lib/neighbourhood.ts:356–358`                                                             | `// Stash all map data-src values so the initial setActive() call can't // eagerly load Google Maps (~500KB of JS). Loading the maps mid-scroll // stalls the main thread and locks Lenis. Restored on first IO hit.`                                                                   | Keep, tighten: `// Stash data-src so initial setActive() can't eager-load Maps (~500KB, stalls Lenis). Restored on IO hit.`                                                                                                            |
| `src/lib/neighbourhood.ts:368–375`                                                             | Two paragraph-sized blocks explaining stash + IO restore.                                                                                                                                                                                                                               | Delete both — the 356-358 rewrite above carries the full WHY.                                                                                                                                                                          |
| `src/three-shims.d.ts:1–8`                                                                     | 8-line header about missing `types` condition.                                                                                                                                                                                                                                          | Tighten to 3 lines: `// three@0.183 has no \`types\` condition for /webgpu and /tsl subpaths. // TS falls back to the main module which lacks WebGPURenderer/TSL helpers. // Re-export from @types/three deep paths to restore types.` |
| `src/lib/footer-shaders.ts:107–114` (gradient header block)                                    | 8-line TSL comment about vertical ramp.                                                                                                                                                                                                                                                 | Tighten to 2 lines: `// 5-stop vertical ramp, horizontal sine offset for painterly blend. // UV-parameterised so fragments can sample it at a refracted position.`                                                                     |
| `src/lib/footer-shaders.ts:134–148` (caustic header block)                                     | 15-line block on fBm vs Voronoi.                                                                                                                                                                                                                                                        | Keep mostly — this is the single best "WHY a magic choice" comment in the codebase (Voronoi F2-F1 misses 1px features under finite diff). Trim the middle paragraph to one sentence.                                                   |
| `src/lib/footer-shaders.ts:308–321` (physical model block)                                     | 14-line recap of physics.                                                                                                                                                                                                                                                               | Delete — duplicates the file-level header at lines 1–25.                                                                                                                                                                               |
| `src/lib/footer-shaders.ts:1–25` (file header)                                                 | 25-line physics explanation.                                                                                                                                                                                                                                                            | Keep — this is the load-bearing doc for the entire shader file. Rewrite only the "composite" numbered list from 6 items to ~4 shorter ones.                                                                                            |
| `src/layouts/BaseLayout.astro:23–26`                                                           | `<!-- Mark document as booting before curtain renders. CSS uses this to pin the curtain panels ... -->` (4 lines)                                                                                                                                                                       | `<!-- data-booting pins the curtain via CSS until firstLoadCurtain() runs. -->`                                                                                                                                                        |
| `src/layouts/BaseLayout.astro:51–54`                                                           | `<!-- Early Lenis init — runs as soon as the parser hits this <script>, well before astro:page-load. Closes the "scroll feels locked on reload" gap. initLenis() is idempotent so the bootstrap call later no-ops cleanly. -->`                                                         | `<!-- Early Lenis init — bootstrap's call later is idempotent. -->`                                                                                                                                                                    |
| `src/layouts/BaseLayout.astro:61`                                                              | `<!-- Lenis scrollend workaround (known Astro ClientRouter conflict) -->`                                                                                                                                                                                                               | Keep — this is exactly the WHY a `delete window.onscrollend` exists. Already tight.                                                                                                                                                    |
| `src/layouts/BaseLayout.astro:74`                                                              | `<!-- Invisible trigger for footer wordmark animation -->`                                                                                                                                                                                                                              | Delete — `data-footer-trigger` attribute name already tells you.                                                                                                                                                                       |
| `src/layouts/BaseLayout.astro:84–86`                                                           | `<!-- Single bootstrap entry — one page-load handler, one before-swap, one after-swap. Heavy modules ... -->`                                                                                                                                                                           | Delete — duplicates `bootstrap.ts:1–11` header.                                                                                                                                                                                        |
| `global.css:29–31`                                                                             | `/* The single accent — sunset over the bay. Used sparingly: caption numbers, focus rings, CTA underline reveal, scrollbar. If it creeps beyond that, cut it back. */`                                                                                                                  | Keep, tighten: `/* Accent — sunset. Caption nums, focus rings, CTA underline, scrollbar. Creeps → cut. */`                                                                                                                             |
| `global.css:64`                                                                                | `/* Ink tonal scale — black at fixed alphas, named once, used everywhere */`                                                                                                                                                                                                            | Keep (genuinely explains naming convention), tighten: `/* Ink = black at fixed alpha. Named once, used everywhere. */`                                                                                                                 |
| `global.css:74`                                                                                | `/* Radii — one spine, explicit scale */`                                                                                                                                                                                                                                               | Delete — the tokens below are self-evidently a scale.                                                                                                                                                                                  |
| `global.css:76–80` trailing comments (`/* buttons, inputs... */`, `/* menu cards... */`, etc.) | One per radius token.                                                                                                                                                                                                                                                                   | Keep — these are the best kind of token-intent comments and are single-line. No change.                                                                                                                                                |
| `global.css:1079–1081`                                                                         | `/* Underline-only fields. The hotel-form pattern, not the shadcn pattern. Tracked-caps label above a hairline, content sitting on the line, accent bar on focus. Nothing floats in a box. */`                                                                                          | Keep — design-intent, matches `soul.md` voice. Could tighten slightly.                                                                                                                                                                 |
| `global.css:1138–1141`                                                                         | `/* ── Phone field with country selector ───── Whole field sits on one shared underline. Country trigger and input are visually independent but acoustically one element — the hairline underneath carries them both. Focus moves the line. */`                                         | Keep the design note, drop the banner. Tighten to: `/* Whole phone row shares one underline — trigger and input read as one element. */`                                                                                               |
| `global.css:1895–1897`                                                                         | `/* Underline animation — reveal on hover (shared). Reveals in accent, not currentColor — the one place in the UI where the sunset orange shows up, deliberately. */`                                                                                                                   | Keep, tighten: `/* Reveal in accent — the one deliberate sunset-orange moment in the UI. */`                                                                                                                                           |
| `global.css:1924`                                                                              | `/* Underline animation — persistent, hide on hover */`                                                                                                                                                                                                                                 | Keep (contrasts with the 1895 block, clarifies direction). Already tight.                                                                                                                                                              |
| `global.css:2745`                                                                              | `/* Two-slot flex: media + text. Map absolute, floats corner independently. */`                                                                                                                                                                                                         | Keep, tighten: `/* Media + text in flex; map is absolute so it floats the corner. */`                                                                                                                                                  |
| `global.css:2878–2880`                                                                         | `/* Layout variants — map always floats over text, never over media. A = media left, text right, map top-right. B = media right, text left, map top-left. */`                                                                                                                           | Keep — documents the `data-layout='a'/'b'` contract TS can't express. Already good.                                                                                                                                                    |
| `global.css:3063–3065`                                                                         | `/* First-load mask: pin panels over the viewport until firstLoadCurtain() takes control and animates them open. Prevents a flash of content during the TSL shader compile gap. */`                                                                                                     | Keep, tighten: `/* Pins curtain over viewport until firstLoadCurtain() masks the shader compile. */`                                                                                                                                   |
| `global.css:3091`                                                                              | `/* Suppress Astro's default view-transition crossfade */`                                                                                                                                                                                                                              | Keep — explains why the override exists. Already tight.                                                                                                                                                                                |
| `global.css:1` (file header)                                                                   | 10-line `/* Aurea Residences — Design System ... */` block.                                                                                                                                                                                                                             | Keep but drop the redundant "No framework dependencies" (the import list says it) and "Vanilla CSS + Lightning CSS" (the filename + astro config say it). 4 lines max.                                                                 |

---

## 4. Keep — comments doing real work

Receipts. These pass the bar and should be left alone (or only lightly rewritten):

- **`src/lib/footer-shaders.ts:1–25`** — file-level physics model. This is the single doc that explains how the whole shader composes. Pure WHY, impossible to derive from the code.
- **`src/lib/footer-shaders.ts:134–148`** — why fBm and not Voronoi for caustics. Documents a rejected alternative and the finite-difference failure mode that drove the decision. Prevents the next person from "fixing" it.
- **`src/lib/footer-shaders.ts:329`** — `// Four-tap central differences give symmetric normals with no bias.` Shader math intent, one line, load-bearing.
- **`src/lib/footer-shaders.ts:201`** — `// Video texture is Y-flipped relative to canvas UV convention`. Classic gotcha.
- **`src/lib/bootstrap.ts:50–62`** — "compile-behind-curtain on first load" strategy block. Explains the dual-path design (first load vs ClientRouter remount) that isn't obvious from either branch individually.
- **`src/layouts/BaseLayout.astro:61`** — `<!-- Lenis scrollend workaround (known Astro ClientRouter conflict) -->` on top of `delete window.onscrollend`. This is exactly why you'd keep a comment: the next reader will absolutely think "why is this deleting a global?" and delete it themselves.
- **`src/lib/page-transition.ts:127–132`** — first-load curtain doc block. Non-trivial interaction between CSS `data-booting` pin, the boot promise, and the timeout. Keep.
- **`global.css:2878–2880`** — the `data-layout='a'/'b'` contract. TypeScript can't express this invariant; the comment is the only place it lives.
- **`global.css:3063–3065`** — explains the `html[data-booting]` curtain pin coupling to `firstLoadCurtain()`. Without it, someone WILL delete this rule as "orphan selector."
- **`global.css:76–80`** — one-word trailing comments on each `--radius-*` token (`/* buttons, inputs, nav pills — default */`, etc.). Real intent per token, zero fat.
- **`global.css:1895–1897`** (after trim) — "Reveal in accent, not currentColor — the one deliberate sunset-orange moment." Design intent that enforces `soul.md` restraint on the accent color.
- **`global.css:1079–1081`** (after trim) — "hotel-form pattern, not shadcn pattern." Explains a deliberate stylistic rejection; exactly the kind of call that rots into a PR review argument without a comment.

---

## 5. CLAUDE.md Adherence Check

`CLAUDE.md` doesn't set comment rules directly, but the taste rules in `soul.md` and `lessons.md` are being followed in the _useful_ comments (the kept ones above explain atmospheric/brand-palette decisions). The slop comments violate the unstated "no filler" standard implicit in "every sentence earns its place" from `soul.md`.

No emoji, no issue refs, no TODO/FIXME/HACK/XXX/stub markers, no "previously we did X" in source. The one hit for "was inline in" is `bootstrap.ts:21` (`/* ── Scroll reveal observer (was inline in BaseLayout) ── */`) and it's on the delete list.

---

## Summary

- **~55 comments to delete outright** (file banners, section dividers, restatement labels, two deleted-behavior markers in CSS)
- **~25 comments to rewrite** (tighten multi-line WHY-explanations to one line)
- **~15 comments to keep verbatim** (shader math, cross-component contracts, known-workaround receipts)
- Nothing to add. No TODOs found.

Largest wins:

1. Wipe all `.astro` file-level JSDoc — 9 files, pure larp.
2. Strip section banners from `footer-shaders.ts`, `page-transition.ts`, `bootstrap.ts`, `Enquiry.astro`, `dev/footer.astro`.
3. Flatten ~60 of the CSS label comments in `global.css`. The remaining ~15 CSS comments are design-intent and earn their keep.
4. Collapse multi-paragraph explanatory blocks in `lenis.ts`, `bootstrap.ts`, `neighbourhood.ts`, `page-transition.ts`, and `BaseLayout.astro` head scripts to single lines.

After this pass the comment-to-code ratio drops meaningfully and every surviving comment answers "why?" instead of "what?"
