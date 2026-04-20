/**
 * Overlay coordination — calendar + detail overlays.
 *
 * Shared lifecycle: open/close, backdrop click, Escape, Lenis stop/start,
 * GSAP enter/exit. Gallery prev/next for detail overlays.
 */

import gsap from 'gsap';

import { getLenis } from './lenis';

let cleanup: (() => void) | null = null;

interface OverlayState {
  activeOverlay: HTMLElement | null;
  activeResidence: string | null;
}

const state: OverlayState = {
  activeOverlay: null,
  activeResidence: null,
};

// ── Gallery ───────────────────────────────────────────────────────────

function initGallery(overlay: HTMLElement): void {
  const track = overlay.querySelector<HTMLElement>('[data-gallery-track]');
  const counter = overlay.querySelector<HTMLElement>('[data-gallery-counter]');
  if (!track) return;

  const slides = track.querySelectorAll('.detail__gallery-slide');
  const total = slides.length;
  if (total === 0) return;

  let current = 0;

  function update() {
    gsap.to(track!, {
      x: `${-current * 100}%`,
      duration: 0.5,
      ease: 'expo.out',
    });
    if (counter) counter.textContent = `${current + 1} / ${total}`;
  }

  function prev() {
    current = current > 0 ? current - 1 : total - 1;
    update();
  }

  function next() {
    current = current < total - 1 ? current + 1 : 0;
    update();
  }

  const prevBtn = overlay.querySelector<HTMLButtonElement>('[data-gallery-prev]');
  const nextBtn = overlay.querySelector<HTMLButtonElement>('[data-gallery-next]');

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  // Reset on open
  current = 0;
  update();
}

// ── Open / Close ──────────────────────────────────────────────────────

function open(overlay: HTMLElement): void {
  if (state.activeOverlay) {
    closeImmediate(state.activeOverlay);
  }

  state.activeOverlay = overlay;
  overlay.classList.add('is-open');
  overlay.removeAttribute('inert');

  const backdrop = overlay.querySelector<HTMLElement>('.overlay__backdrop');
  const panel = overlay.querySelector<HTMLElement>('.overlay__panel');

  if (backdrop && panel) {
    gsap
      .timeline()
      .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'expo.out' })
      .fromTo(
        panel,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' },
        0.1,
      );
  }

  getLenis()?.stop();
  initGallery(overlay);
}

function close(overlay: HTMLElement): void {
  const backdrop = overlay.querySelector<HTMLElement>('.overlay__backdrop');
  const panel = overlay.querySelector<HTMLElement>('.overlay__panel');

  if (backdrop && panel) {
    gsap
      .timeline({
        onComplete() {
          overlay.classList.remove('is-open');
          overlay.setAttribute('inert', '');
          if (state.activeOverlay === overlay) {
            state.activeOverlay = null;
            state.activeResidence = null;
          }
          getLenis()?.start();
        },
      })
      .to(panel, { opacity: 0, y: 10, duration: 0.25, ease: 'expo.in' })
      .to(backdrop, { opacity: 0, duration: 0.25, ease: 'expo.in' }, 0.05);
  } else {
    closeImmediate(overlay);
  }
}

function closeImmediate(overlay: HTMLElement): void {
  gsap.killTweensOf(overlay.querySelector('.overlay__backdrop'));
  gsap.killTweensOf(overlay.querySelector('.overlay__panel'));

  const backdrop = overlay.querySelector<HTMLElement>('.overlay__backdrop');
  const panel = overlay.querySelector<HTMLElement>('.overlay__panel');
  if (backdrop) gsap.set(backdrop, { opacity: 0 });
  if (panel) gsap.set(panel, { opacity: 0, y: 20 });

  overlay.classList.remove('is-open');
  overlay.setAttribute('inert', '');

  if (state.activeOverlay === overlay) {
    state.activeOverlay = null;
    state.activeResidence = null;
  }
  getLenis()?.start();
}

function closeActive(): void {
  if (state.activeOverlay) close(state.activeOverlay);
}

// ── Resolve overlay element ───────────────────────────────────────────

function findOverlay(type: string, residence?: string): HTMLElement | null {
  if (type === 'calendar') {
    return document.querySelector<HTMLElement>('[data-overlay="calendar"]');
  }
  if (type === 'detail' && residence) {
    return document.querySelector<HTMLElement>(
      `[data-overlay="detail"][data-overlay-residence="${residence}"]`,
    );
  }
  return null;
}

// ── Event handlers ────────────────────────────────────────────────────

function handleTriggerClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-overlay-trigger]');
  if (!btn) return;

  const type = btn.dataset.overlayTrigger!;
  const residence = btn.dataset.residence;

  const overlay = findOverlay(type, residence);
  if (!overlay) return;

  state.activeResidence = residence ?? null;
  open(overlay);
}

function handleCloseClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-overlay-close]');
  if (!btn) return;

  const overlay = btn.closest<HTMLElement>('.overlay');
  if (overlay) close(overlay);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeActive();
}

// ── Public API ────────────────────────────────────────────────────────

export function initOverlays(): void {
  cleanup?.();

  document.addEventListener('click', handleTriggerClick);
  document.addEventListener('click', handleCloseClick);
  document.addEventListener('keydown', handleKeydown);

  cleanup = () => {
    closeActive();
    document.removeEventListener('click', handleTriggerClick);
    document.removeEventListener('click', handleCloseClick);
    document.removeEventListener('keydown', handleKeydown);
    cleanup = null;
  };
}

export function destroyOverlays(): void {
  cleanup?.();
}
