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

// ─── Hero: full-bleed → cinematic letterbox on scroll ───
(function initHero() {
  var hero = document.querySelector('[data-hero]');
  if (!hero) return;

  var imageWrap = hero.querySelector('.hero__image-wrap');
  var wordmark = hero.querySelector('.hero__wordmark');

  // Letterbox target: cinematic 2.39:1 ratio
  // Bars = (100vh - viewport-width/2.39) / 2, expressed as %
  var barSize = 12; // % of viewport height for each bar (top + bottom)

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=80%',
      scrub: 0.6,
      pin: true,
    },
  });

  // Image wrap shrinks from full viewport to letterbox
  tl.to(imageWrap, {
    top: barSize + '%',
    bottom: barSize + '%',
    height: (100 - barSize * 2) + '%',
    ease: 'power2.inOut',
    duration: 1,
  }, 0);

  // Wordmark fades out as we leave the hero
  tl.to(wordmark, {
    opacity: 0,
    y: -20,
    ease: 'power2.in',
    duration: 0.4,
  }, 0);
})();

// Attribute-driven architecture
// In Webflow Designer: add data-animate="fade-up" to elements
var animEls = document.querySelectorAll('[data-animate]');
console.log(
  '%c[aurea-residences] %cFound ' + animEls.length + ' animated elements',
  'color: #b8860b; font-weight: bold',
  'color: #888'
);

animEls.forEach(function(el) {
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
