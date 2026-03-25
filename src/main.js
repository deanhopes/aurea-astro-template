import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(ScrollTrigger, SplitText);

// Connection info
console.log(
  '%c[aurea-residences] %cCustom code connected %c(local dev)',
  'color: #b8860b; font-weight: bold',
  'color: #22c55e; font-weight: bold',
  'color: #888'
);
console.log(
  '%c[aurea-residences] %cGSAP ' + gsap.version + ' + ScrollTrigger loaded',
  'color: #b8860b; font-weight: bold',
  'color: #888'
);

// Wait for DOM
function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

onReady(function init() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    initPreloader(function onPreloaderDone() {
      initHero();
      initHorizontalScroll();
      initAnimateEngine();
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    // Skip animations — show content immediately
    const preloader = document.querySelector('[data-preloader]');
    if (preloader) preloader.remove();
    document.body.style.overflow = '';
    // Logo stays in nav naturally, no hero animation
    initHorizontalScroll();
  });
});

// ─── Preloader ───
// Standalone page reveal. Calls onDone callback when finished.
function initPreloader(onDone) {
  const preloader = document.querySelector('[data-preloader]');
  if (!preloader) {
    console.log('%c[preloader] %cNo preloader found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    if (onDone) onDone();
    return;
  }
  console.log('%c[preloader] %cInit', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  const bar = preloader.querySelector('[data-preloader-bar]');
  const heroImage = document.querySelector('[data-hero-image]');

  // Show preloader (hidden in Designer via display:none)
  preloader.style.display = 'block';

  // Lock scroll during preloader
  document.body.style.overflow = 'hidden';
  if (heroImage) {
    gsap.set(heroImage, { scale: 1.1 });
  }

  // Spin the placeholder icon
  let spinner;
  const icon = bar.querySelector('[data-preloader-icon]');
  if (icon) {
    spinner = gsap.to(icon, { rotation: 360, duration: 1, repeat: -1, ease: 'none' });
  }

  const tl = gsap.timeline({
    delay: 0.3,
    onComplete: function () {
      console.log('%c[preloader] %cComplete', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
      if (spinner) spinner.kill();
      document.body.style.overflow = '';
      preloader.remove();
      if (onDone) onDone();
    },
  });

  // Clip-mask preloader UP (reveals hero behind it)
  gsap.set(bar, { clipPath: 'inset(0 0 0 0)' });
  tl.to(bar, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 1.2,
    ease: 'power3.inOut',
  });

  // Hero image subtle scale settle
  if (heroImage) {
    tl.to(
      heroImage,
      {
        scale: 1,
        duration: 1.4,
        ease: 'power2.out',
      },
      '-=0.6'
    );
  }
}

// ─── Hero ───
// Placeholder — hero animations stripped for now.
function initHero() {
  // No-op
}

// ─── Horizontal scroll section ───
// Simple pattern: tall section, wide sticky track, GSAP translates x on scroll.
// Section height and scroll distance recalculate on resize via invalidateOnRefresh.
function initHorizontalScroll() {
  const section = document.querySelector('[data-horizontal-scroll]');
  if (!section) {
    console.log('%c[horizontal] %cNo [data-horizontal-scroll] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }

  const track = section.querySelector('[data-horizontal-track]');
  if (!track) {
    console.log('%c[horizontal] %cNo [data-horizontal-track] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }

  // Fix sticky killers: walk up from section and swap overflow: hidden to clip
  let el = section.parentElement;
  while (el && el !== document.body) {
    const ov = getComputedStyle(el).overflow;
    if (ov === 'hidden') {
      el.style.overflow = 'clip';
      console.log('%c[horizontal] %cFixed overflow: hidden on ancestor', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    }
    el = el.parentElement;
  }

  // Dynamic: track width minus one viewport = total scroll travel
  const scrollDistance = () => track.scrollWidth - window.innerWidth;

  // Dynamic: set section height to match track width so scroll ratio is 1:1
  const setSectionHeight = () => {
    section.style.height = track.scrollWidth + 'px';
  };
  setSectionHeight();

  console.log('%c[horizontal] %cInit — track: ' + track.scrollWidth + 'px, viewport: ' + window.innerWidth + 'px, travel: ' + scrollDistance() + 'px', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  gsap.to(track, {
    x: () => -scrollDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
      onRefresh: () => {
        setSectionHeight();
        console.log('%c[horizontal] %cRefreshed — section: ' + section.style.height + ', travel: ' + scrollDistance() + 'px', 'color: #b8860b; font-weight: bold', 'color: #888');
      },
    },
  });
}

// ─── Attribute-driven animation engine ───
// All animations use IntersectionObserver (not ScrollTrigger).
// Works in any context: normal flow, horizontal scroll, sticky containers.
// ScrollTrigger is reserved for scrub-linked animations (horizontal scroll, parallax).
//
// Text splits:
//   data-animate="split-lines|split-words|split-chars"
//   data-delay="0"        (seconds)
//   data-duration="1.9"   (seconds)
//   data-stagger="0.05"   (seconds between items)
//   data-ease="expo.out"
//
// Element animations:
//   data-animate="fade-up|fade-down|fade-in|scale-up"
//   data-delay="0"        (seconds)
//   data-duration="0.6"   (seconds)
//   data-ease="power2.out"
//
// Shared options:
//   data-once="true"      (default true — set false to re-trigger on re-enter)
//   data-threshold="0.2"  (0-1, how much of element must be visible)
//   data-margin="10px"    (observer rootMargin)
//
function initAnimateEngine() {
  const animEls = document.querySelectorAll('[data-animate]');

  let count = 0;
  animEls.forEach((el) => {
    const type = el.getAttribute('data-animate');
    if (!type) return; // skip empty Mast component props

    count++;
    if (type.startsWith('split-')) {
      initSplitAnimation(el, type);
    } else {
      initElementAnimation(el, type);
    }
  });

  console.log(
    '%c[aurea-residences] %cAnimated ' + count + ' elements (' + animEls.length + ' total [data-animate], ' + (animEls.length - count) + ' skipped empty)',
    'color: #b8860b; font-weight: bold',
    'color: #888'
  );
}

// ─── Split text animations (Observer pattern) ───
// Uses IntersectionObserver for trigger — lighter than ScrollTrigger,
// supports animateOut for re-triggering, and kill() for clean transitions.
function initSplitAnimation(el, type) {
  const delay = parseFloat(el.dataset.delay || 0);
  const duration = parseFloat(el.dataset.duration || 1.9);
  const stagger = parseFloat(el.dataset.stagger || 0.05);
  const ease = el.dataset.ease || 'expo.out';
  const once = el.dataset.once !== 'false';
  const threshold = parseFloat(el.dataset.threshold ?? 0.2);
  const margin = el.dataset.margin || '10px';

  // SplitText needs the actual text node, not a Webflow wrapper div
  const splitTarget =
    el.querySelector('h1, h2, h3, h4, h5, h6, p, [class*="heading-text"], [class*="plain-text"]') || el;

  // Determine split type and mask config
  let splitType, maskType, targets;
  switch (type) {
    case 'split-lines':
      splitType = 'lines';
      maskType = 'lines';
      break;
    case 'split-words':
      splitType = 'words';
      maskType = 'words';
      break;
    case 'split-chars':
      splitType = 'words, chars';
      maskType = null; // chars use opacity, not mask
      break;
  }

  // Create split — GSAP's mask option handles the overflow:hidden wrapper
  const splitConfig = { type: splitType, autoSplit: true };
  if (maskType) splitConfig.mask = maskType;
  const split = SplitText.create(splitTarget, splitConfig);

  // Fix descender clipping (g, y, p, q, j) — mask wrappers use overflow:clip
  // with a height that doesn't account for descenders. Add padding to the outer mask divs.
  if (maskType) {
    const maskDivs = splitTarget.querySelectorAll(':scope > div[style*="overflow"]');
    maskDivs.forEach((div) => { div.style.paddingBottom = '0.15em'; });
  }

  // Get the targets to animate
  targets = type === 'split-chars' ? split.chars : type === 'split-lines' ? split.lines : split.words;

  // Set initial hidden state on split targets (GSAP controls visibility from here)
  if (type === 'split-chars') {
    gsap.set(targets, { y: 30, autoAlpha: 0 });
  } else {
    gsap.set(targets, { yPercent: 120 });
  }

  // Clear CSS FOUC hiding — SplitText has split and GSAP owns the hidden state now
  gsap.set(splitTarget, { visibility: 'visible', opacity: 1 });

  // Track current animation for kill/restart
  let animation = null;

  function animateIn() {
    if (animation) animation.kill();
    if (type === 'split-chars') {
      animation = gsap.to(targets, {
        y: 0,
        autoAlpha: 1,
        delay,
        duration,
        ease,
        stagger: { each: stagger || 0.02, from: 'start' },
      });
    } else {
      animation = gsap.to(targets, {
        yPercent: 0,
        delay,
        duration,
        ease,
        stagger: { each: stagger, from: 'start' },
      });
    }
  }

  function animateOut() {
    if (animation) animation.kill();
    if (type === 'split-chars') {
      gsap.set(targets, { y: 30, autoAlpha: 0 });
    } else {
      gsap.set(targets, { yPercent: 120 });
    }
  }

  // IntersectionObserver — fires animateIn/Out on visibility
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateIn();
          if (once) observer.unobserve(el);
        } else if (!once) {
          animateOut();
        }
      });
    },
    { rootMargin: margin, threshold }
  );
  observer.observe(el);
}

// ─── Element animations (Observer) ───
function initElementAnimation(el, type) {
  const delay = parseFloat(el.dataset.delay || 0);
  const duration = parseFloat(el.dataset.duration || 0.6);
  const ease = el.dataset.ease || 'power2.out';
  const once = el.dataset.once !== 'false';
  const threshold = parseFloat(el.dataset.threshold || 0.2);
  const margin = el.dataset.margin || '10px';

  // Determine initial hidden state
  let fromProps;
  switch (type) {
    case 'fade-up':
      fromProps = { autoAlpha: 0, y: 30 };
      break;
    case 'fade-down':
      fromProps = { autoAlpha: 0, y: -30 };
      break;
    case 'fade-in':
      fromProps = { autoAlpha: 0 };
      break;
    case 'scale-up':
      fromProps = { autoAlpha: 0, scale: 0.9 };
      break;
    default:
      return; // unknown type, skip
  }

  // Set initial hidden state
  gsap.set(el, fromProps);

  let animation = null;

  function animateIn() {
    if (animation) animation.kill();
    animation = gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      delay,
      duration,
      ease,
    });
  }

  function animateOut() {
    if (animation) animation.kill();
    gsap.set(el, fromProps);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateIn();
          if (once) observer.unobserve(el);
        } else if (!once) {
          animateOut();
        }
      });
    },
    { rootMargin: margin, threshold }
  );
  observer.observe(el);
}
