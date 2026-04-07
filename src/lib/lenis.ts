import Lenis from 'lenis';

let lenis: Lenis | null = null;

export function initLenis() {
  lenis?.destroy();
  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  });

  function raf(time: number) {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

export function destroyLenis() {
  lenis?.destroy();
  lenis = null;
}

export function getLenis() {
  return lenis;
}
