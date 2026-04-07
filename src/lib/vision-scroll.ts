import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

export function initVisionScroll() {
  const section = document.querySelector<HTMLElement>('[data-vision]');
  const track = document.querySelector<HTMLElement>('[data-vision-track]');
  if (!section || !track) return;

  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const scrollDistance = track.scrollWidth - window.innerWidth;

      const horizontalScroll = gsap.to(track, {
        x: -scrollDistance,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: section,
          scrub: 1,
          anticipatePin: 1,
          end: () => `+=${scrollDistance}`,
          invalidateOnRefresh: true,
        },
      });

      /* ── Panel 1: intro text reveals ── */
      const introLabel = section.querySelector('.vision__panel--intro > .vision__label');
      const towerLabel = section.querySelector('.vision__tower .vision__label');
      const towerBody = section.querySelector('.vision__tower-body');

      [introLabel, towerLabel, towerBody].forEach((el) => {
        if (!el) return;
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            containerAnimation: horizontalScroll,
            start: 'left 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      /* ── Panel 2: card columns stagger ── */
      const cardColumns = section.querySelectorAll(
        '.vision__card-left, .vision__card-centre, .vision__card-right',
      );
      if (cardColumns.length) {
        gsap.from(cardColumns, {
          y: 40,
          opacity: 0,
          duration: 1.0,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: '.vision__card',
            containerAnimation: horizontalScroll,
            start: 'left 80%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* ── Panel 2: images scale in ── */
      const cardImages = section.querySelectorAll('.vision__card .vision__card-image img');
      cardImages.forEach((img) => {
        gsap.from(img, {
          scale: 1.05,
          duration: 1.25,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: img.parentElement,
            containerAnimation: horizontalScroll,
            start: 'left 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      /* ── Panel 3: full-bleed images scale in ── */
      const pairImages = section.querySelectorAll('.vision__image-pair .vision__card-image img');
      pairImages.forEach((img) => {
        gsap.from(img, {
          scale: 1.05,
          duration: 1.25,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: img.parentElement,
            containerAnimation: horizontalScroll,
            start: 'left 90%',
            toggleActions: 'play none none none',
          },
        });
      });
    });

    /* ── Reduced motion: no pin, no animation ── */
    gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => {
      // Section flows naturally in document, no horizontal scroll
    });
  });
}

export function destroyVisionScroll() {
  ctx?.revert();
  ctx = null;
}
