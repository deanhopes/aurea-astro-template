# Aurea Residences — Next Steps

## Session: 2026-03-24

### What's done
- [x] Horizontal scroll: 5 panels with Grid Row components, dynamic section height, resize-safe GSAP
- [x] Panel combo classes: `cc-wide` (120vw), `cc-narrow` (80vw), `cc-half` (50vw)
- [x] Panel 1: 4-column layout with image (flex:1), text anchored bottom (u-mt-auto)
- [x] Typography: all letter spacing tightened (-2% to -1%)
- [x] Hero: preloader separated from hero (callback pattern)
- [x] Hero: scroll animation plays/reverses (not scrub), `toggleActions` via `onEnter`/`onLeaveBack`
- [x] Hero: letterbox clip at 25%, wordmark animates to nav logo position
- [x] Custom nav built from scratch (not MAST component): centered logo, spacer, hamburger
- [x] Nav overlay element added (display:none, ready for JS)
- [x] Styles created: nav, nav__container, nav__spacer, nav__logo, nav__hamburger, nav__hamburger-line, nav-overlay, nav-overlay__content

### Next: Nav fixes (Dean's notes)

- [ ] **Nav logo must be hidden in Designer** — Currently the AUREA.svg loads and is visible before JS hides it (flash). Set `display: none` or `opacity: 0` on the nav logo image in Webflow Designer. JS will reveal it when the hero scroll animation completes. This prevents the FOUC (flash of unstyled content).

- [ ] **Hamburger lines must be white over hero** — Currently `#1a1a2e` (dark). Since the nav overlays the dark hero image, hamburger lines need to be white initially. Options:
  1. Set `nav__hamburger-line` to white in Webflow, then JS changes to dark after hero scroll animation
  2. Or use a combo class `cc-light` that sets lines to white, JS removes it after scroll

- [ ] **Upload AUREA-dark.svg** — Open the AUREA SVG, change fill from white to dark blue/navy. Upload as new asset. Swap the nav logo image source to this dark version. The white SVG is invisible on the light nav background.

### Next: Hamburger + overlay animation (JS)

- [ ] **Hamburger click handler** — Toggle open/close state
- [ ] **Hamburger line animation** — On open: top line rotates 45deg, middle fades out, bottom rotates -45deg (forms X). On close: reverse.
- [ ] **Overlay animation** — On open: set display:block, animate in (clip-path reveal or fade). On close: animate out, set display:none.
- [ ] **Overlay content** — Build mega menu layout inside `nav-overlay__content`. TBD what links/content go here.
- [ ] **Lock scroll when overlay open** — `document.body.style.overflow = 'hidden'`
- [ ] **Hamburger colour swap** — Lines white over hero, dark after scroll, white when overlay is open (on dark bg)

### Next: Hero animation polish

- [ ] **Test wordmark-to-nav animation** — Verify the hero wordmark animates to the correct nav logo position. May need position tweaking.
- [ ] **Nav background on scroll** — Nav starts transparent over hero. After hero animation completes, add a subtle background (white/cream with slight opacity) so nav is visible over page content.
- [ ] **Letterbox value tuning** — 25% clip may need adjusting depending on intro section position. Check gap between image bottom and intro text.

### Later: Content + polish

- [ ] Populate horizontal scroll panels 2-5 with content
- [ ] Responsive breakpoints for horizontal scroll (tablet/mobile behaviour)
- [ ] Responsive nav (probably same hamburger pattern, just adjust sizes)
- [ ] Real images (replace placeholders)
- [ ] Publish and test on staging
