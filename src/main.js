import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, Flip);

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
    initHero();
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

// ─── Hero scroll animation ───
// Letterbox + wordmark Flip into nav. Plays forward on scroll, reverses on scroll back.
function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) {
    console.log('%c[hero] %cNo [data-hero] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }

  const imageWrap = hero.querySelector('[data-hero-image]');
  const wordmark = hero.querySelector('[data-wordmark]');
  const navLogo = document.querySelector('[data-nav-logo]');

  if (!imageWrap) {
    console.log('%c[hero] %cNo [data-hero-image] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }
  console.log('%c[hero] %cInit ScrollTrigger — play/reverse with Flip', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  // Hide nav logo initially, wordmark will animate to its position
  if (navLogo) {
    gsap.set(navLogo, { autoAlpha: 0 });
  }

  const clipAmount = 25;

  // Measure where the wordmark needs to go (nav logo position)
  const getNavTarget = () => {
    if (!navLogo) return null;
    const navRect = navLogo.getBoundingClientRect();
    const wordmarkRect = wordmark.getBoundingClientRect();
    return {
      x: navRect.left - wordmarkRect.left + (navRect.width - wordmarkRect.width) / 2,
      y: navRect.top - wordmarkRect.top + (navRect.height - wordmarkRect.height) / 2,
      scale: navRect.width / wordmarkRect.width,
    };
  };

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
  });

  // Letterbox: clip from bottom
  tl.to(imageWrap, {
    clipPath: 'inset(0 0 ' + clipAmount + '% 0)',
    duration: 1.2,
  }, 0);

  // Wordmark animates to nav logo position
  if (wordmark) {
    tl.to(wordmark, {
      x: () => {
        const target = getNavTarget();
        return target ? target.x : 0;
      },
      y: () => {
        const target = getNavTarget();
        return target ? target.y : -wordmark.getBoundingClientRect().top + 16;
      },
      scale: () => {
        const target = getNavTarget();
        return target ? target.scale : 0.12;
      },
      transformOrigin: 'center center',
      duration: 1.2,
    }, 0);

    // At the end: hide wordmark, show nav logo
    tl.to(wordmark, { autoAlpha: 0, duration: 0.1 }, 1.0);
    if (navLogo) {
      tl.to(navLogo, { autoAlpha: 1, duration: 0.1 }, 1.0);
    }
  }

  // ScrollTrigger: play after first scroll, reverse when back to top
  ScrollTrigger.create({
    trigger: hero,
    start: 'top -1px',
    end: '+=40%',
    pin: true,
    pinSpacing: true,
    invalidateOnRefresh: true,
    onEnter: () => tl.play(),
    onLeaveBack: () => tl.reverse(),
  });
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
