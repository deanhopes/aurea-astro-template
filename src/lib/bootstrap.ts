// Single entry for all client modules. Heavy modules lazy + idle-gated.

import { initLenis } from './lenis';
import { initNav } from './nav';
import { initAnimations } from './animations';
import { initLifestyleSlider } from './lifestyle-slider';
import { initNeighbourhood } from './neighbourhood';
import { initVisionScroll } from './vision-scroll';

let revealObserver: IntersectionObserver | null = null;

function initReveal() {
  destroyReveal();
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  );

  elements.forEach((el) => revealObserver!.observe(el));
}

function destroyReveal() {
  revealObserver?.disconnect();
  revealObserver = null;
}

type FooterShaderModule = typeof import('./footer-shaders');

let footerModule: FooterShaderModule | null = null;
let footerReadyPromise: Promise<void> | null = null;

function loadFooterShaders(): Promise<void> {
  if (footerReadyPromise) return footerReadyPromise;
  footerReadyPromise = (async () => {
    footerModule = await import('./footer-shaders');
    await footerModule.initFooterShaders();
  })();
  return footerReadyPromise;
}

export function footerShadersReady(): Promise<void> {
  return footerReadyPromise ?? Promise.resolve();
}

function scheduleFooterShaders() {
  const trigger = document.querySelector('[data-footer-trigger]');
  if (!trigger) return;

  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        io.disconnect();
        const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1));
        idle(() => void loadFooterShaders());
      }
    },
    { rootMargin: '400px 0px' },
  );
  io.observe(trigger);
}

function onPageLoad() {
  initLenis();
  initNav();
  initAnimations();
  initLifestyleSlider();
  initNeighbourhood();
  initVisionScroll();
  initReveal();
  scheduleFooterShaders();
}

export function bootstrap() {
  onPageLoad();
}
