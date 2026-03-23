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
  initPreloader();
});

// ─── Phase 1: Preloader wipe + wordmark reveal ───
function initPreloader() {
  var preloader = document.querySelector('[data-preloader]');
  if (!preloader) {
    console.log('%c[preloader] %cNo preloader found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    initHero();
    initAnimateEngine();
    return;
  }
  console.log('%c[preloader] %cInit', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  var bar = preloader.querySelector('[data-preloader-bar]');
  var wordmark = document.querySelector('[data-wordmark]');
  var heroImage = document.querySelector('[data-hero-image]');

  // Show preloader (hidden in Designer via display:none)
  preloader.style.display = 'block';

  // Lock scroll during preloader
  document.body.style.overflow = 'hidden';

  // Set initial states
  if (wordmark) {
    gsap.set(wordmark, { clipPath: 'inset(100% 0 0 0)', opacity: 1 });
  }
  if (heroImage) {
    gsap.set(heroImage, { scale: 1.1 });
  }

  var tl = gsap.timeline({
    delay: 0.3,
    onComplete: function () {
      console.log('%c[preloader] %cComplete — removing overlay, unlocking scroll', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
      document.body.style.overflow = '';
      preloader.remove();
      // Now init hero + animate AFTER preloader is done
      initHero();
      initAnimateEngine();
    },
  });

  // Spin the placeholder icon
  var icon = bar.querySelector('[data-preloader-icon]');
  if (icon) {
    gsap.to(icon, { rotation: 360, duration: 1, repeat: -1, ease: 'none' });
  }

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
  var hero = document.querySelector('[data-hero]');
  if (!hero) {
    console.log('%c[hero] %cNo [data-hero] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }

  var imageWrap = hero.querySelector('[data-hero-image]');
  var wordmark = hero.querySelector('[data-wordmark]');
  var introSection = document.querySelector('[data-section="intro"]');

  // Move intro inside the hero so the letterbox clip reveals it
  if (introSection) {
    hero.appendChild(introSection);
    console.log('%c[hero] %cMoved intro section inside hero', 'color: #b8860b; font-weight: bold', 'color: #888');
  }

  console.log('%c[hero] %cFound elements — hero: ✓, imageWrap: ' + !!imageWrap + ', wordmark: ' + !!wordmark + ', intro: ' + !!introSection, 'color: #b8860b; font-weight: bold', 'color: #888');

  if (!imageWrap) {
    console.log('%c[hero] %cNo [data-hero-image] found, skipping', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
    return;
  }
  console.log('%c[hero] %cInit ScrollTrigger — scrub + snap', 'color: #b8860b; font-weight: bold', 'color: #22c55e');

  // Letterbox clips from bottom only — image stays anchored to top
  var clipAmount = 38; // % clipped from bottom — enough to reveal intro text

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: '1% top',
      end: '+=100%',
      pin: true,
      pinSpacing: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: 3000,
      invalidateOnRefresh: true,
      snap: {
        snapTo: 'labelsDirectional',
        duration: { min: 0.3, max: 0.6 },
        delay: 0.1,
        ease: 'power2.inOut',
      },
      onEnter: function () {
        console.log('%c[hero] %cScrollTrigger entered — playing', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
      },
      onLeave: function () {
        console.log('%c[hero] %conLeave — fixing wordmark', 'color: #b8860b; font-weight: bold', 'color: #22c55e');
        if (wordmark) {
          document.body.appendChild(wordmark);
          gsap.set(wordmark, {
            position: 'fixed',
            top: '1rem',
            left: '0',
            bottom: 'auto',
            width: '100%',
            zIndex: 100,
            scale: 0.25,
            transformOrigin: 'center top',
            paddingLeft: '5vw',
            paddingRight: '5vw',
          });
        }
      },
      onEnterBack: function () {
        console.log('%c[hero] %conEnterBack — wordmark back to hero', 'color: #b8860b; font-weight: bold', 'color: #f59e0b');
        if (wordmark) {
          hero.appendChild(wordmark);
          gsap.set(wordmark, { clearProps: 'all' });
          gsap.set(wordmark, {
            position: 'absolute',
            top: '1rem',
            left: '0',
            bottom: 'auto',
            width: '100%',
            zIndex: 2,
            scale: 0.25,
            transformOrigin: 'center top',
            paddingLeft: '5vw',
            paddingRight: '5vw',
          });
        }
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

  // Wordmark moves from bottom to top, scales down
  if (wordmark) {
    tl.to(
      wordmark,
      {
        bottom: 'auto',
        top: '1rem',
        scale: 0.25,
        transformOrigin: 'center top',
        ease: 'none',
        duration: 1,
      },
      0
    );
  }

  tl.addLabel('end');

  ScrollTrigger.refresh();
}

// ─── Attribute-driven animation engine ───
function initAnimateEngine() {
  var animEls = document.querySelectorAll('[data-animate]');
  console.log(
    '%c[aurea-residences] %cFound ' + animEls.length + ' animated elements',
    'color: #b8860b; font-weight: bold',
    'color: #888'
  );

  animEls.forEach(function (el) {
    var type = el.getAttribute('data-animate');
    var delay = parseFloat(el.getAttribute('data-delay') || 0);
    var duration = parseFloat(el.getAttribute('data-duration') || 0.6);

    var props = {
      delay: delay,
      duration: duration,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    };

    switch (type) {
      case 'fade-up':
        Object.assign(props, { opacity: 0, y: 30 });
        break;
      case 'fade-down':
        Object.assign(props, { opacity: 0, y: -30 });
        break;
      case 'fade-in':
        Object.assign(props, { opacity: 0 });
        break;
      case 'scale-up':
        Object.assign(props, { opacity: 0, scale: 0.9 });
        break;
    }

    gsap.from(el, props);
  });
}
