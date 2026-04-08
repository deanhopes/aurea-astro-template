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
      const getScrollDistance = () => track!.scrollWidth - window.innerWidth;

      const horizontalScroll = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: section,
          scrub: 1,
          anticipatePin: 1,
          end: () => `+=${getScrollDistance()}`,
          invalidateOnRefresh: true,
        },
      });

      /* ── Panel 2: card columns stagger ── */
      const cardColumns = section.querySelectorAll(
        '.vision__card-left, .vision__card-centre, .vision__card-right',
      );
      if (cardColumns.length) {
        gsap.from(cardColumns, {
          y: 30,
          opacity: 0,
          duration: 1.4,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: '.vision__card',
            containerAnimation: horizontalScroll,
            start: 'left 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* ── Panel 2: images scale in + subtle parallax ── */
      const cardImages = section.querySelectorAll('.vision__card .vision__card-image img');
      cardImages.forEach((img, i) => {
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

        // Subtle L/R parallax during scrub
        const direction = i % 2 === 0 ? -1 : 1;
        gsap.fromTo(
          img,
          { xPercent: direction * 4 },
          {
            xPercent: direction * -4,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentElement,
              containerAnimation: horizontalScroll,
              start: 'left right',
              end: 'right left',
              scrub: 1,
            },
          },
        );
      });

      /* ── Panel 3: full-bleed images scale in + parallax ── */
      const pairImages = section.querySelectorAll('.vision__image-pair .vision__card-image img');
      pairImages.forEach((img, i) => {
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

        // Subtle parallax during scrub — both images drift the same direction
        gsap.fromTo(
          img,
          { xPercent: -3 },
          {
            xPercent: 3,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentElement,
              containerAnimation: horizontalScroll,
              start: 'left right',
              end: 'right left',
              scrub: 1,
            },
          },
        );
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
