import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let rafId: number | null = null;

export function initLenis() {
  // Idempotent — safe to call from both the early head script and the
  // bootstrap astro:page-load handler. First call wins; later calls no-op
  // unless a destroyLenis() has run between them.
  if (lenis) return;

  lenis = new Lenis({
    // Shorter duration + lerp = responsive on first wheel after reload.
    // The old 1.2s duration made the page feel locked while the tween
    // caught up to the user's first input.
    duration: 0.8,
    lerp: 0.12,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  });

  lenis.on('scroll', ScrollTrigger.update);

  function raf(time: number) {
    lenis?.raf(time);
    rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf);
}

export function destroyLenis() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lenis?.destroy();
  lenis = null;
}

export function getLenis() {
  return lenis;
}
