// Single entry for all client modules. One page-load / before-swap / after-swap
// handler triple, shared across ClientRouter navs. Heavy modules lazy + idle-gated.

import { initLenis, destroyLenis } from './lenis';
import { initNav, destroyNav } from './nav';
import { initAnimations, cleanupAnimations } from './animations';
import { initLifestyleSlider, destroyLifestyleSlider } from './lifestyle-slider';
import { initNeighbourhood, destroyNeighbourhood } from './neighbourhood';
import { initVisionScroll, destroyVisionScroll } from './vision-scroll';
import { initPageTransition, firstLoadCurtain } from './page-transition';

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

// TSL compile is an atomic ~1500ms block — mask it behind firstLoadCurtain on
// first load; IO-gate subsequent ClientRouter mounts

type FooterShaderModule = typeof import('./footer-shaders');

let footerModule: FooterShaderModule | null = null;
let footerIO: IntersectionObserver | null = null;
let footerReadyPromise: Promise<void> | null = null;
let hasDoneFirstLoad = false;

function whenIdle(cb: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(cb, { timeout: 2000 });
    return;
  }
  window.setTimeout(cb, 1);
}

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
  // First load: kick compile sync so footerReadyPromise exists when firstLoadCurtain reads it
  if (!hasDoneFirstLoad) {
    hasDoneFirstLoad = true;
    void loadFooterShaders();
    return;
  }

  // Subsequent mounts: module warm but renderer torn down — IO-gate re-mount
  if (footerReadyPromise) return;
  const footer = document.querySelector('[data-footer]');
  if (!footer) return;

  footerIO = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return;
      footerIO?.disconnect();
      footerIO = null;
      whenIdle(() => {
        void loadFooterShaders();
      });
    },
    { rootMargin: '800px 0px' },
  );
  footerIO.observe(footer);
}

function destroyFooterShaders() {
  footerIO?.disconnect();
  footerIO = null;
  footerModule?.destroyFooterShaders();
  footerModule = null;
  footerReadyPromise = null;
}

function onPageLoad() {
  const isFirstLoad = !hasDoneFirstLoad;

  initLenis();
  initNav();
  initAnimations();
  initLifestyleSlider();
  initNeighbourhood();
  initVisionScroll();
  initReveal();
  scheduleFooterShaders();

  if (isFirstLoad) {
    // Hold curtain until shader resolves; hard timeout prevents a broken shader trapping the user
    void firstLoadCurtain(footerShadersReady(), 2500);
  }
}

function onBeforeSwap() {
  destroyLenis();
  destroyNav();
  destroyLifestyleSlider();
  destroyNeighbourhood();
  destroyVisionScroll();
  destroyReveal();
  destroyFooterShaders();
}

function onAfterSwap() {
  cleanupAnimations();
}

export function bootstrap() {
  // Page transition listeners persist across navs
  initPageTransition();

  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwap);
}
