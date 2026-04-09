import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

function animateHeroParallax() {
  const heroImg = document.querySelector<HTMLElement>('[data-hero] .hero__image img');
  if (!heroImg) return;

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

function animateLifestylePairImages() {
  const pairImages = document.querySelectorAll('.lifestyle__pair-image img');
  if (!pairImages.length) return;

  gsap.from(pairImages, {
    scale: 1.05,
    opacity: 0,
    duration: 1.25,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: {
      trigger: '.lifestyle__pair',
      start: 'top 85%',
      once: true,
    },
  });
}

function animateContainedParallax() {
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
}

function animateLifestyleText() {
  const label = document.querySelector('.lifestyle__label');
  const copy = document.querySelectorAll('.lifestyle__copy p');

  if (label) {
    gsap.from(label, {
      y: 20, opacity: 0, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: '.lifestyle', start: 'top 85%', once: true },
    });
  }

  if (copy.length) {
    gsap.from(copy, {
      y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04,
      scrollTrigger: { trigger: '.lifestyle__copy', start: 'top 85%', once: true },
    });
  }
}

function animateResidencesReveals() {
  const label = document.querySelector('.residences__label');
  const cards = document.querySelectorAll('.residences__card');

  if (label) {
    gsap.from(label, {
      y: 20, opacity: 0, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: '.residences', start: 'top 85%', once: true },
    });
  }

  if (cards.length) {
    gsap.from(cards, {
      y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.residences__grid', start: 'top 85%', once: true },
    });
  }
}

function animateNeighbourhoodReveals() {
  const section = document.querySelector('.neighbourhood');
  if (!section) return;

  const label = section.querySelector('.neighbourhood__label');
  const list = section.querySelector('.neighbourhood__list');
  const imgWrap = section.querySelector('.neighbourhood__images');
  const captions = section.querySelector('.neighbourhood__captions');

  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.neighbourhood', start: 'top 80%', once: true },
  });

  if (label) tl.from(label, { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0);
  if (list) tl.from(list, { y: 25, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1);
  if (imgWrap) tl.from(imgWrap, { scale: 0.97, opacity: 0, duration: 1.25, ease: 'expo.out' }, 0.15);
  if (captions) tl.from(captions, { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.3);
}

function animateFooterReveal() {
  const trigger = document.querySelector('[data-footer-trigger]');
  const content = document.querySelector('.site-footer__content');
  const wordmark = document.querySelector('.site-footer__wordmark');
  if (!content || !trigger) return;

  const tagline = content.querySelector('.site-footer__tagline-row');
  const navGroups = content.querySelectorAll('.site-footer__links');

  const tl = gsap.timeline({
    scrollTrigger: { trigger, start: 'bottom bottom', once: true },
  });

  if (tagline) tl.from(tagline, { y: 25, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1);
  if (navGroups.length) tl.from(navGroups, { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.2);
  if (wordmark) tl.from(wordmark, { y: 60, opacity: 0, duration: 1.25, ease: 'expo.out' }, 0.15);
}

export function initAnimations() {
  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      animateHeroParallax();
      animateLifestylePairImages();
      animateContainedParallax();
      animateLifestyleText();
      animateResidencesReveals();
      animateNeighbourhoodReveals();
      animateFooterReveal();
    });
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
