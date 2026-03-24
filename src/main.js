import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
    initPreloader();
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    // Skip animations — show content immediately
    const preloader = document.querySelector('[data-preloader]');
    if (preloader) preloader.remove();
    document.body.style.overflow = '';
    initHero();
    initHorizontalScroll();
  });
});

// ─── Phase 1: Preloader wipe + wordmark reveal ───
function initPreloader() {
  const preloader = document.querySelector('[data-preloader]');
  if (!preloader) {
    console.log('%c[preloader] %cNo preloader found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    initHero();
    initHorizontalScroll();
    initAnimateEngine();
    return;
  }
  console.log('%c[preloader] %cInit', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  const bar = preloader.querySelector('[data-preloader-bar]');
  const wordmark = document.querySelector('[data-wordmark]');
  const heroImage = document.querySelector('[data-hero-image]');

  // Show preloader (hidden in Designer via display:none)
  preloader.style.display = 'block';

  // Lock scroll during preloader
  document.body.style.overflow = 'hidden';

  // Set initial states
  if (wordmark) {
    gsap.set(wordmark, { clipPath: 'inset(100% 0 0 0)', autoAlpha: 1 });
  }
  if (heroImage) {
    gsap.set(heroImage, { scale: 1.1 });
  }

  // Spin the placeholder icon — store ref to kill later
  let spinner;
  const icon = bar.querySelector('[data-preloader-icon]');
  if (icon) {
    spinner = gsap.to(icon, { rotation: 360, duration: 1, repeat: -1, ease: 'none' });
  }

  const tl = gsap.timeline({
    delay: 0.3,
    onComplete: function () {
      console.log('%c[preloader] %cComplete — removing overlay, unlocking scroll', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
      if (spinner) spinner.kill();
      document.body.style.overflow = '';
      preloader.remove();
      // Now init hero + animate AFTER preloader is done
      initHero();
      initHorizontalScroll();
      initAnimateEngine();
    },
  });

  // Clip-mask preloader UP (reveals hero behind it)
  gsap.set(bar, { clipPath: 'inset(0 0 0 0)' });
  tl.to(bar, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 1.2,
    ease: 'power3.inOut',
  });

  // Wordmark clip-path reveal (bottom to top)
  if (wordmark) {
    tl.to(
      wordmark,
      {
        clipPath: 'inset(0% 0 0 0)',
        duration: 0.8,
        ease: 'power2.out',
      },
      '-=0.6'
    );
  }

  // Hero image subtle scale settle
  if (heroImage) {
    tl.to(
      heroImage,
      {
        scale: 1,
        duration: 1.4,
        ease: 'power2.out',
      },
      '-=1.0'
    );
  }
}

// ─── Phase 2: Scroll-triggered hero animation ───
// Letterbox + wordmark — scrub with snap, plays/reverses
function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) {
    console.log('%c[hero] %cNo [data-hero] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }

  const imageWrap = hero.querySelector('[data-hero-image]');
  const wordmark = hero.querySelector('[data-wordmark]');
  console.log('%c[hero] %cFound elements — hero: ✓, imageWrap: ' + !!imageWrap + ', wordmark: ' + !!wordmark, 'color: #b8860b; font-weight: bold', 'color: #888');

  if (!imageWrap) {
    console.log('%c[hero] %cNo [data-hero-image] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }
  console.log('%c[hero] %cInit ScrollTrigger — scrub + snap', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  // Create a fixed wordmark clone for post-hero display (avoids DOM mutation during scroll)
  let fixedWordmark;
  if (wordmark) {
    fixedWordmark = wordmark.cloneNode(true);
    fixedWordmark.setAttribute('data-wordmark-fixed', '');
    fixedWordmark.removeAttribute('data-wordmark');
    gsap.set(fixedWordmark, {
      position: 'fixed',
      top: '1rem',
      left: '0',
      width: '100%',
      zIndex: 100,
      scale: 0.25,
      transformOrigin: 'center top',
      paddingLeft: '5vw',
      paddingRight: '5vw',
      autoAlpha: 0,
    });
    document.body.appendChild(fixedWordmark);
  }

  // Letterbox clips from bottom only — image stays anchored to top
  const clipAmount = 38; // % clipped from bottom — enough to reveal intro text

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=100%',
      pin: true,
      pinSpacing: true,
      scrub: 1,
      fastScrollEnd: true,
      invalidateOnRefresh: true,
      refreshPriority: -1,
      snap: {
        snapTo: 'labelsDirectional',
        duration: { min: 0.3, max: 0.6 },
        delay: 0.1,
        ease: 'power2.inOut',
      },
      onEnter: function () {
        console.log('%c[hero] %cScrollTrigger entered — playing', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
      },
      onLeaveBack: function () {
        console.log('%c[hero] %cScrollTrigger left back — reversing to fullbleed', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
      },
    },
  });

  tl.addLabel('start', 0);

  // Fullbleed → letterbox, clipped from bottom (anchored to top of viewport)
  tl.to(
    imageWrap,
    {
      clipPath: 'inset(0 0 ' + clipAmount + '% 0)',
      ease: 'none',
      duration: 1,
    },
    0
  );

  // Wordmark scales down and moves up via y transform (no layout-triggering top/bottom)
  if (wordmark) {
    tl.to(
      wordmark,
      {
        y: () => {
          const heroRect = hero.getBoundingClientRect();
          const wordmarkRect = wordmark.getBoundingClientRect();
          // Move from current position to 1rem from top of hero
          return -(wordmarkRect.top - heroRect.top) + 16;
        },
        scale: 0.25,
        transformOrigin: 'center top',
        ease: 'none',
        duration: 1,
      },
      0
    );

    // Crossfade: hide hero wordmark, show fixed — at the very end of the scrub
    // so it stays in sync with animation progress (not scroll position)
    if (fixedWordmark) {
      tl.to(wordmark, { autoAlpha: 0, duration: 0.05, ease: 'none' });
      tl.to(fixedWordmark, { autoAlpha: 1, duration: 0.05, ease: 'none' }, '<');
    }
  }

  tl.addLabel('end');

  ScrollTrigger.refresh();
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
function initAnimateEngine() {
  // Exclude elements inside horizontal scroll — those use containerAnimation
  const animEls = document.querySelectorAll('[data-animate]:not([data-horizontal-scroll] [data-animate])');
  console.log(
    '%c[aurea-residences] %cFound ' + animEls.length + ' animated elements',
    'color: #b8860b; font-weight: bold',
    'color: #888'
  );

  animEls.forEach(function (el) {
    const type = el.getAttribute('data-animate');
    const delay = parseFloat(el.getAttribute('data-delay') || 0);
    const duration = parseFloat(el.getAttribute('data-duration') || 0.6);

    const props = {
      delay: delay,
      duration: duration,
      immediateRender: false,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    };

    switch (type) {
      case 'fade-up':
        Object.assign(props, { autoAlpha: 0, y: 30 });
        break;
      case 'fade-down':
        Object.assign(props, { autoAlpha: 0, y: -30 });
        break;
      case 'fade-in':
        Object.assign(props, { autoAlpha: 0 });
        break;
      case 'scale-up':
        Object.assign(props, { autoAlpha: 0, scale: 0.9 });
        break;
    }

    gsap.from(el, props);
  });
}
