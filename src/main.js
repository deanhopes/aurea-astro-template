import { gsap, ScrollTrigger } from 'gsap/all';

gsap.registerPlugin(ScrollTrigger);

console.log(
  '%c[aurea-residences] %cGSAP ' + gsap.version + ' + ScrollTrigger ready',
  'color: #b8860b; font-weight: bold',
  'color: #22c55e; font-weight: bold'
);

function init() {
  // ─── Hero: full-bleed → cinematic letterbox on scroll ───
  var hero = document.querySelector('[data-hero]');
  if (hero) {
    var imageWrap = hero.querySelector('.hero__image-wrap');
    var wordmark = hero.querySelector('.hero__wordmark');
    var barSize = 12;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=80%',
        scrub: 0.6,
        pin: true,
      },
    });

    tl.to(imageWrap, {
      top: barSize + '%',
      bottom: barSize + '%',
      height: (100 - barSize * 2) + '%',
      ease: 'power2.inOut',
      duration: 1,
    }, 0);

    tl.to(wordmark, {
      opacity: 0,
      y: -20,
      ease: 'power2.in',
      duration: 0.4,
    }, 0);

    console.log(
      '%c[aurea-residences] %cHero scroll animation initialised',
      'color: #b8860b; font-weight: bold',
      'color: #888'
    );
  }

  // ─── Attribute-driven animations ───
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
