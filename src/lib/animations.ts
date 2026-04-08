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

      /* Lifestyle image reveals */
      const lifestyleMain = document.querySelector('.lifestyle__image img');
      if (lifestyleMain) {
        gsap.from(lifestyleMain, {
          scale: 1.05,
          opacity: 0,
          duration: 1.25,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.lifestyle__image',
            start: 'top 85%',
            toggleActions: 'play none none none',
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

      /* Neighbourhood reveals */
      const nhoodText = document.querySelector('.neighbourhood__text');
      if (nhoodText) {
        gsap.from(nhoodText.children, {
          y: 25,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.06,
          scrollTrigger: {
            trigger: '.neighbourhood',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      }

      const nhoodImages = document.querySelectorAll('.neighbourhood__image img');
      nhoodImages.forEach((img, i) => {
        gsap.from(img, {
          scale: 1.05,
          opacity: 0,
          duration: 1.25,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: img.parentElement,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      });

      const nhoodInfo = document.querySelector('.neighbourhood__info');
      if (nhoodInfo) {
        gsap.from(nhoodInfo, {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: nhoodInfo,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      }

      /* Neighbourhood fade-out as footer reveals */
      const nhood = document.querySelector<HTMLElement>('.neighbourhood');
      if (nhood) {
        const nhoodChildren = nhood.querySelectorAll(
          '.neighbourhood__text, .neighbourhood__image, .neighbourhood__info',
        );

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: nhood,
            start: 'bottom 90%',
            end: 'bottom 30%',
            scrub: 0.6,
          },
        });

        tl.to(nhoodChildren, {
          opacity: 0,
          y: -20,
          stagger: 0.05,
          ease: 'power2.in',
        }, 0);

        tl.to(nhood, {
          opacity: 0,
          ease: 'power2.in',
        }, 0.15);
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

        // Icon — blur-in from haze, materialises into focus
        const iconEl = footerContent.querySelector('[data-footer-icon]');
        if (iconEl) {
          gsap.set(iconEl, { filter: 'blur(12px)', opacity: 0, scale: 0.9 });
          tl.to(iconEl, {
            filter: 'blur(0px)',
            opacity: 1,
            scale: 1,
            duration: 1.4,
            ease: 'expo.out',
          }, 0);
        }
        if (tagline) {
          tl.from(tagline, { y: 25, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1);
        }
        if (navGroups.length) {
          tl.from(navGroups, { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.2);
        }
      }

      if (wordmark && footerTrigger) {
        gsap.from(wordmark, {
          y: 60,
          opacity: 0,
          duration: 1.25,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: footerTrigger,
            start: 'bottom bottom',
            toggleActions: 'play none none none',
          },
        });
      }
    });
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
