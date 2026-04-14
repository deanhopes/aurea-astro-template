/**
 * bootstrap.ts — single entry point for all client modules.
 *
 * Replaces the 8 separate <script> blocks in BaseLayout.astro. One
 * astro:page-load handler, one astro:before-swap, one astro:after-swap.
 * Every nav under ClientRouter re-fires page-load, so doing this once
 * instead of eight times saves real startup cost on each transition.
 *
 * Heavy work (three/webgpu for the footer shader) is deferred inside
 * its own init — gated on idle + IO so it doesn't compete with LCP.
 */

import { initLenis, destroyLenis } from './lenis';
import { initNav, destroyNav } from './nav';
import { initAnimations, cleanupAnimations } from './animations';
import { initLifestyleSlider, destroyLifestyleSlider } from './lifestyle-slider';
import { initNeighbourhood, destroyNeighbourhood } from './neighbourhood';
import { initVisionScroll, destroyVisionScroll } from './vision-scroll';
import { initPageTransition, firstLoadCurtain } from './page-transition';

/* ── Scroll reveal observer (was inline in BaseLayout) ── */

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

/* ── Footer shader — compile-behind-curtain on first load ────────────────
 * The TSL pipeline compile is a single ~1500ms atomic block in
 * getNodeType — can't be split. Two-part strategy:
 *
 *   1. Compile immediately on first page-load, during the hero read,
 *      while the user is looking at the headline and not scrolling.
 *   2. Hold the transition curtain closed until the compile finishes,
 *      so the lag is visually absorbed by a brand-consistent mask
 *      instead of surfacing as a mid-scroll hitch.
 *
 * On ClientRouter navigations the module is already warm, so the IO
 * observer remains the right gate for subsequent mounts.
 * ──────────────────────────────────────────────────────────────────────── */

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
  // First load: kick off the compile synchronously so footerReadyPromise
  // is populated by the time firstLoadCurtain() reads it. The dynamic
  // import + initFooterShaders() work happens off the main thread
  // anyway — the module resolution is what matters for promise identity.
  if (!hasDoneFirstLoad) {
    hasDoneFirstLoad = true;
    void loadFooterShaders();
    return;
  }

  // Subsequent ClientRouter mounts: module is already warm, but the
  // renderer may have been torn down. Gate on IO to avoid re-mounting
  // until the footer is actually approached.
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

/* ── Lifecycle ── */

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
    // Shader is already compiling (kicked off inside scheduleFooterShaders).
    // Keep the curtain over the viewport until it resolves, with a hard
    // timeout so a broken shader never traps the user.
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
  // Page transition listeners attach once and persist across navigations.
  initPageTransition();

  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwap);
}
