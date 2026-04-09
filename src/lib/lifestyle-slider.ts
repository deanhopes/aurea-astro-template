import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(Draggable, InertiaPlugin);

let cleanup: (() => void) | null = null;

export function initLifestyleSlider() {
  cleanup?.();

  const slider = document.querySelector<HTMLElement>('.lifestyle__slider');
  const track = document.querySelector<HTMLElement>('.lifestyle__track');
  if (!slider || !track) return;

  // Clone all slides to create seamless loop
  const originals = Array.from(track.children) as HTMLElement[];
  originals.forEach((child) => {
    track.appendChild(child.cloneNode(true));
  });

  // Width of one full set of slides (half the track after cloning)
  let setWidth = 0;
  function measureSetWidth() {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    setWidth = 0;
    for (let i = 0; i < originals.length; i++) {
      setWidth += (track.children[i] as HTMLElement).offsetWidth + gap;
    }
  }
  measureSetWidth();

  // Wrap x with modulo so even a hard fling stays in range
  function wrapX() {
    let x = gsap.getProperty(track, 'x') as number;
    if (x < -setWidth || x > 0) {
      // Modulo into [-setWidth, 0] range
      x = ((x % setWidth) + setWidth) % setWidth;
      if (x > 0) x -= setWidth;
      gsap.set(track, { x });
      draggable.update();
    }
  }

  const draggable = Draggable.create(track, {
    type: 'x',
    inertia: true,
    // No bounds — infinite in both directions
    onDrag: wrapX,
    onThrowUpdate: wrapX,
  })[0];

  const onResize = () => {
    measureSetWidth();
  };
  window.addEventListener('resize', onResize);

  cleanup = () => {
    draggable.kill();
    window.removeEventListener('resize', onResize);
    // Remove cloned nodes
    while (track.children.length > originals.length) {
      track.removeChild(track.lastChild!);
    }
    gsap.set(track, { x: 0 });
    cleanup = null;
  };
}

export function destroyLifestyleSlider() {
  cleanup?.();
}
