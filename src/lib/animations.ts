import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

export function initAnimations() {
  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      /* Hero parallax */
      const heroImg = document.querySelector<HTMLElement>('[data-hero] .hero__image img');
      if (heroImg) {
        gsap.to(heroImg, {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-hero]',
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

      const pairImages = document.querySelectorAll('.lifestyle__pair-image img');
      if (pairImages.length) {
        gsap.from(pairImages, {
          scale: 1.05,
          opacity: 0,
          duration: 1.25,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: '.lifestyle__pair',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* Contained parallax — images with data-parallax inside overflow:hidden parents */
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((img) => {
        gsap.set(img, { scale: 1.15 });
        gsap.to(img, {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: {
            trigger: img.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      });

      /* Lifestyle text reveals */
      const lifestyleLabel = document.querySelector('.lifestyle__label');
      const lifestyleCopy = document.querySelectorAll('.lifestyle__copy p');

      if (lifestyleLabel) {
        gsap.from(lifestyleLabel, {
          y: 20,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.lifestyle',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      if (lifestyleCopy.length) {
        gsap.from(lifestyleCopy, {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.04,
          scrollTrigger: {
            trigger: '.lifestyle__copy',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* Residences reveals */
      const residencesLabel = document.querySelector('.residences__label');
      const residencesCards = document.querySelectorAll('.residences__card');

      if (residencesLabel) {
        gsap.from(residencesLabel, {
          y: 20,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.residences',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      if (residencesCards.length) {
        gsap.from(residencesCards, {
          y: 40,
          opacity: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: '.residences__grid',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* Neighbourhood reveals — animate containers, not individual lines
         (the hover module manages per-line opacity) */
      const nhoodSection = document.querySelector('.neighbourhood');
      if (nhoodSection) {
        const nhoodLabel = nhoodSection.querySelector('.neighbourhood__label');
        const nhoodList = nhoodSection.querySelector('.neighbourhood__list');
        const nhoodImgWrap = nhoodSection.querySelector('.neighbourhood__images');
        const nhoodCaptions = nhoodSection.querySelector('.neighbourhood__captions');

        const nhoodTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.neighbourhood',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        if (nhoodLabel) {
          nhoodTl.from(nhoodLabel, { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0);
        }
        if (nhoodList) {
          nhoodTl.from(nhoodList, { y: 25, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1);
        }
        if (nhoodImgWrap) {
          nhoodTl.from(nhoodImgWrap, { scale: 0.97, opacity: 0, duration: 1.25, ease: 'expo.out' }, 0.15);
        }
        if (nhoodCaptions) {
          nhoodTl.from(nhoodCaptions, { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.3);
        }
      }

      /* Footer content + wordmark reveal */
      const footerTrigger = document.querySelector('[data-footer-trigger]');
      const footerContent = document.querySelector('.site-footer__content');
      const wordmark = document.querySelector('.site-footer__wordmark');

      if (footerContent && footerTrigger) {
        const icon = footerContent.querySelector('.site-footer__icon');
        const tagline = footerContent.querySelector('.site-footer__tagline-row');
        const navGroups = footerContent.querySelectorAll('.site-footer__links');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: footerTrigger,
            start: 'bottom bottom',
            toggleActions: 'play none none none',
          },
        });

        if (tagline) {
          tl.from(tagline, { y: 25, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1);
        }
        if (navGroups.length) {
          tl.from(navGroups, { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.2);
        }
        if (wordmark) {
          tl.from(wordmark, { y: 60, opacity: 0, duration: 1.25, ease: 'expo.out' }, 0.15);
        }
      }
    });
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
