import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import gsap from 'gsap';
import { getLenis } from './lenis';

const DURATION = 1;
const EASE = 'power3.inOut';
const MOBILE_BP = 991;

let isAnimating = false;
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

function curtainClose(): Promise<void> {
  return new Promise((resolve) => {
    if (!resolvePanels()) {
      resolve();
      return;
    }

    const mobile = isMobile();
    const axis = mobile ? 'y' : 'x';
    const resetAxis = mobile ? 'x' : 'y';

    // Reset the unused axis in case the viewport crossed the breakpoint since last nav
    gsap.set([panelLeft, panelRight], { [resetAxis]: 0 });

    gsap
      .timeline({ onComplete: resolve })
      .to(panelLeft!, { [axis]: 0, duration: DURATION, ease: EASE }, 0)
      .to(panelRight!, { [axis]: 0, duration: DURATION, ease: EASE }, 0);
  });
}

function curtainSnapClosed(): void {
  if (!resolvePanels()) return;
  const mobile = isMobile();
  const axis = mobile ? 'y' : 'x';
  const resetAxis = mobile ? 'x' : 'y';
  gsap.set([panelLeft, panelRight], { [axis]: 0, [resetAxis]: 0 });
}

function curtainOpen(): Promise<void> {
  return new Promise((resolve) => {
    if (!resolvePanels()) {
      resolve();
      return;
    }

    const mobile = isMobile();
    const axis = mobile ? 'y' : 'x';

    gsap
      .timeline({
        onComplete: () => {
          isAnimating = false;
          resolve();
        },
      })
      .to(panelLeft!, { [axis]: mobile ? '-101%' : '-101%', duration: DURATION, ease: EASE }, 0)
      .to(panelRight!, { [axis]: mobile ? '101%' : '101%', duration: DURATION, ease: EASE }, 0);
  });
}

function onBeforePreparation(event: TransitionBeforePreparationEvent) {
  if (event.navigationType === 'traverse') return;
  if (prefersReducedMotion()) return;

  if (isAnimating) {
    event.preventDefault();
    return;
  }

  isAnimating = true;
  getLenis()?.stop();

  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.click();
  }

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

// First load: CSS pins panels closed (via data-booting). Wait for ready (or timeout), then open.
export async function firstLoadCurtain(ready: Promise<void>, timeoutMs: number): Promise<void> {
  const root = document.documentElement;
  const wasBooting = root.hasAttribute('data-booting');

  if (prefersReducedMotion()) {
    if (wasBooting) root.removeAttribute('data-booting');
    return;
  }

  if (!resolvePanels()) {
    if (wasBooting) root.removeAttribute('data-booting');
    return;
  }

  getLenis()?.stop();
  isAnimating = true;

  let timer: number | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, timeoutMs);
  });

  await Promise.race([ready, timeout]);
  if (timer !== undefined) window.clearTimeout(timer);

  // Hand control from CSS (pinned via data-booting) to GSAP before tweening open
  curtainSnapClosed();
  if (wasBooting) root.removeAttribute('data-booting');

  await curtainOpen();
  getLenis()?.start();
}

export function initPageTransition() {
  resolvePanels();
  document.addEventListener('astro:before-preparation', onBeforePreparation as EventListener);
  document.addEventListener('astro:page-load', onPageLoad);
}
