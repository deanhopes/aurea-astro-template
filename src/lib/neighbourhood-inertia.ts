import gsap from 'gsap';

let cleanup: (() => void) | null = null;

const INTENSITY = 15; // max px shift
const DURATION = 0.8; // inertia settle time

export function initNeighbourhoodInertia() {
  cleanup?.();

  const section = document.querySelector<HTMLElement>('.neighbourhood');
  if (!section) return;

  // Only on desktop (absolute-positioned images)
  if (window.matchMedia('(max-width: 1024px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const images = section.querySelectorAll<HTMLElement>('.neighbourhood__image');
  if (!images.length) return;

  // Create quickTo tweens for each image — spring-like follow
  const tweens = Array.from(images).map((img, i) => {
    // Alternate intensity so images feel layered
    const factor = 1 - i * 0.2;
    return {
      x: gsap.quickTo(img, 'x', { duration: DURATION, ease: 'power3.out' }),
      y: gsap.quickTo(img, 'y', { duration: DURATION, ease: 'power3.out' }),
      factor,
    };
  });

  function onMove(e: MouseEvent) {
    const rect = section!.getBoundingClientRect();
    // Normalise cursor pos to -1…1 relative to section centre
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    tweens.forEach(({ x, y, factor }) => {
      x(nx * INTENSITY * factor);
      y(ny * INTENSITY * factor);
    });
  }

  function onLeave() {
    // Spring back to origin
    tweens.forEach(({ x, y }) => {
      x(0);
      y(0);
    });
  }

  section.addEventListener('mousemove', onMove);
  section.addEventListener('mouseleave', onLeave);

  cleanup = () => {
    section.removeEventListener('mousemove', onMove);
    section.removeEventListener('mouseleave', onLeave);
    // Reset positions
    images.forEach((img) => gsap.set(img, { x: 0, y: 0 }));
    cleanup = null;
  };
}

export function destroyNeighbourhoodInertia() {
  cleanup?.();
}
