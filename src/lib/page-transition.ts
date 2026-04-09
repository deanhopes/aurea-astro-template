import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import gsap from 'gsap';
import { getLenis } from './lenis';

/* ── Constants ── */
const DURATION = 1;
const EASE = 'power3.inOut';
const MOBILE_BP = 991;

/* ── State ── */
let isAnimating = false;

/* ── DOM refs ── */
let panelLeft: HTMLElement | null = null;
let panelRight: HTMLElement | null = null;

function resolvePanels(): boolean {
  panelLeft = document.querySelector('.curtain__panel--left');
  panelRight = document.querySelector('.curtain__panel--right');
  return !!(panelLeft && panelRight);
}

function isMobile(): boolean {
  return window.innerWidth <= MOBILE_BP;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── Curtain Close (cover the viewport) ── */
function curtainClose(): Promise<void> {
  return new Promise((resolve) => {
    if (!resolvePanels()) { resolve(); return; }

    const mobile = isMobile();
    const axis = mobile ? 'y' : 'x';
    const resetAxis = mobile ? 'x' : 'y';

    // Reset the unused axis in case viewport changed since last navigation
    gsap.set([panelLeft, panelRight], { [resetAxis]: 0 });

    gsap.timeline({ onComplete: resolve })
      .to(panelLeft!, { [axis]: 0, duration: DURATION, ease: EASE }, 0)
      .to(panelRight!, { [axis]: 0, duration: DURATION, ease: EASE }, 0);
  });
}

/* ── Curtain Open (reveal the page) ── */
function curtainOpen(): Promise<void> {
  return new Promise((resolve) => {
    if (!resolvePanels()) { resolve(); return; }

    const mobile = isMobile();
    const axis = mobile ? 'y' : 'x';

    gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        resolve();
      },
    })
      .to(panelLeft!, { [axis]: mobile ? '-101%' : '-101%', duration: DURATION, ease: EASE }, 0)
      .to(panelRight!, { [axis]: mobile ? '101%' : '101%', duration: DURATION, ease: EASE }, 0);
  });
}

/* ── Lifecycle Handlers ── */

function onBeforePreparation(event: TransitionBeforePreparationEvent) {
  // Back/forward: skip curtains, instant swap
  if (event.navigationType === 'traverse') return;

  // Respect reduced motion
  if (prefersReducedMotion()) return;

  // Prevent overlapping navigations
  if (isAnimating) {
    event.preventDefault();
    return;
  }

  isAnimating = true;

  // Freeze scroll immediately
  getLenis()?.stop();

  // Close nav menu if open
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.click();
  }

  // Wrap Astro's loader: animate curtains closed while page fetches in parallel
  const originalLoader = event.loader;
  event.loader = async () => {
    const [fetched] = await Promise.all([originalLoader(), curtainClose()]);
    return fetched;
  };
}

function onPageLoad() {
  resolvePanels();

  if (isAnimating) {
    curtainOpen();
  }
}

/* ── Init (called once, listeners persist across navigations) ── */
export function initPageTransition() {
  resolvePanels();
  document.addEventListener('astro:before-preparation', onBeforePreparation as EventListener);
  document.addEventListener('astro:page-load', onPageLoad);
}
