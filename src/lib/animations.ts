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

function animateLifestyleText() {
  const label = document.querySelector('.lifestyle__label');
  const copy = document.querySelectorAll('.lifestyle__copy p');

  if (label) {
    gsap.from(label, {
      y: 20,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.lifestyle', start: 'top 85%', once: true },
    });
  }

  if (copy.length) {
    gsap.from(copy, {
      y: 30,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.04,
      scrollTrigger: { trigger: '.lifestyle__copy', start: 'top 85%', once: true },
    });
  }
}

function animateResidencesReveals() {
  const label = document.querySelector('.residences__label');
  const cards = document.querySelectorAll('.residences__card');

  if (label) {
    gsap.from(label, {
      y: 20,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.residences', start: 'top 85%', once: true },
    });
  }

  if (cards.length) {
    gsap.from(cards, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.1,
      scrollTrigger: { trigger: '.residences__grid', start: 'top 85%', once: true },
    });
  }
}

export function initAnimations() {
  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      animateHeroParallax();
      animateLifestyleText();
      animateResidencesReveals();
    });
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
