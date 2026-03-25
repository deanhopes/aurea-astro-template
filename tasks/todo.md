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

### Next: Nav — Colour Logic (hero vs rest of page)

- [ ] **White nav over hero** — Logo and hamburger icon must be white when over the hero section (dark background)
- [ ] **Blue nav elsewhere** — Logo and hamburger switch to blue when scrolled past hero onto any other section (light backgrounds, visibility)
- [ ] **ScrollTrigger colour swap** — Use ScrollTrigger on the hero section to toggle a class or swap SVG fills at the right scroll position
- [ ] **Upload both SVG variants** — White AUREA logo for hero, blue/dark AUREA logo for rest of page. Swap `src` or use CSS filter
- [ ] **Nav logo hidden until ready** — Prevent FOUC: hide nav logo in Designer, JS reveals after hero animation completes

### Next: Nav — Hamburger Animation

- [ ] **Hover animation** — Design a nice hover effect on the hamburger icon (e.g. line spread, subtle scale, colour shift). Should feel premium/smooth
- [ ] **Click → X animation** — On click: top line rotates 45°, middle fades out, bottom rotates -45° (forms X). Reverse on close. GSAP timeline
- [ ] **Click handler** — Toggle open/close state, coordinate with overlay

### Next: Nav — Mega Menu Overlay

- [ ] **Design the overlay** — Full-screen overlay from top, mega menu style. Needs to look premium and well-designed (not just a list of links)
- [ ] **Overlay animation** — Animate in from top (clip-path or translateY reveal). Staggered content entrance. Smooth close animation
- [ ] **Overlay content/layout** — Build mega menu layout inside `nav-overlay__content`. Decide what links/sections go here
- [ ] **Lock scroll when open** — `document.body.style.overflow = 'hidden'`
- [ ] **Hamburger white when overlay open** — Overlay bg is dark, so X icon must be white regardless of scroll position

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
