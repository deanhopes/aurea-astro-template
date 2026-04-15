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

export function initAnimations() {
  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      animateHeroParallax();
    });
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
