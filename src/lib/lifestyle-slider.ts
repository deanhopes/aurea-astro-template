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

  const originals = Array.from(track.children) as HTMLElement[];
  const slideCount = originals.length;

  // Clone slides for seamless loop
  originals.forEach((child) => {
    track.appendChild(child.cloneNode(true));
  });

  const allSlides = Array.from(track.children) as HTMLElement[];

  // Measure one full set width
  let setWidth = 0;
  let slideWidths: number[] = [];
  let slideOffsets: number[] = [];
  const gap = () => parseFloat(getComputedStyle(track).gap) || 0;

  function measure() {
    const g = gap();
    setWidth = 0;
    slideWidths = [];
    slideOffsets = [];
    for (let i = 0; i < slideCount; i++) {
      const el = allSlides[i];
      slideOffsets.push(setWidth);
      slideWidths.push(el.offsetWidth);
      setWidth += el.offsetWidth + g;
    }
  }
  measure();

  // Marker position — 60% from left edge of slider
  function markerX() {
    return slider.offsetWidth * 0.6;
  }

  // Compute x that centres slide at `index` on the marker
  function xForSlide(index: number) {
    const mx = markerX();
    const slideCenter = slideOffsets[index] + slideWidths[index] / 2;
    return -(slideCenter - mx);
  }

  // Set initial position: slide index 2 (3rd child) centred on marker
  const initialX = xForSlide(2);
  gsap.set(track, { x: initialX });

  // Track which slide is active
  let activeIndex = -1;

  function updateActive() {
    const mx = markerX();
    const currentX = gsap.getProperty(track, 'x') as number;

    let closest = -1;
    let closestDist = Infinity;

    // Check all slides (originals + clones) to find the one nearest the marker
    for (let i = 0; i < allSlides.length; i++) {
      const origIdx = i % slideCount;
      const offset = slideOffsets[origIdx] + (i >= slideCount ? setWidth : 0);
      const center = offset + slideWidths[origIdx] / 2 + currentX;
      const dist = Math.abs(center - mx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }

    if (closest !== activeIndex) {
      allSlides.forEach((el) => el.classList.remove('is-active'));
      if (closest >= 0) {
        allSlides[closest].classList.add('is-active');
        // Also activate the mirror (original or clone) for visual consistency
        const mirror = closest >= slideCount ? closest - slideCount : closest + slideCount;
        if (allSlides[mirror]) allSlides[mirror].classList.add('is-active');
      }
      activeIndex = closest;
    }
  }

  updateActive();

  // Snap function: given an end x value, return the x that snaps the nearest slide to marker
  function snapX(endValue: number) {
    const mx = markerX();
    let best = endValue;
    let bestDist = Infinity;

    for (let i = 0; i < slideCount; i++) {
      const slideCenter = slideOffsets[i] + slideWidths[i] / 2;
      // The x that centres this slide on the marker
      const targetX = -(slideCenter - mx);
      // Account for wrapping — check the target and target +/- setWidth
      for (const candidate of [targetX, targetX + setWidth, targetX - setWidth]) {
        const dist = Math.abs(candidate - endValue);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
    }
    return best;
  }

  // Wrap x with modulo for infinite loop
  function wrapX() {
    let x = gsap.getProperty(track, 'x') as number;
    if (x < -setWidth || x > 0) {
      x = ((x % setWidth) + setWidth) % setWidth;
      if (x > 0) x -= setWidth;
      gsap.set(track, { x });
      draggable.update();
    }
  }

  const draggable = Draggable.create(track, {
    type: 'x',
    inertia: true,
    snap: { x: snapX },
    onDrag() {
      wrapX();
      updateActive();
    },
    onThrowUpdate() {
      wrapX();
      updateActive();
    },
    onThrowComplete() {
      wrapX();
      updateActive();
    },
  })[0];

  const onResize = () => {
    measure();
  };
  window.addEventListener('resize', onResize);

  cleanup = () => {
    draggable.kill();
    window.removeEventListener('resize', onResize);
    allSlides.forEach((el) => el.classList.remove('is-active'));
    while (track.children.length > slideCount) {
      track.removeChild(track.lastChild!);
    }
    gsap.set(track, { x: 0 });
    cleanup = null;
  };
}

export function destroyLifestyleSlider() {
  cleanup?.();
}
