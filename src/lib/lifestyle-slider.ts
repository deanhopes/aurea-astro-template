import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(Draggable, InertiaPlugin);

let cleanup: (() => void) | null = null;

interface SliderState {
  slider: HTMLElement;
  container: HTMLElement;
  track: HTMLElement;
  allSlides: HTMLElement[];
  slideCount: number;
  setWidth: number;
  slideWidths: number[];
  slideOffsets: number[];
  activeIndex: number;
  activeOrigIndex: number;
  marker: HTMLElement | null;
  isDragging: boolean;
  autoTimer: ReturnType<typeof setInterval> | null;
  draggable: Draggable;
}

function getGap(track: HTMLElement): number {
  return parseFloat(getComputedStyle(track).gap) || 0;
}

function getX(el: HTMLElement): number {
  const v = gsap.getProperty(el, 'x');
  return typeof v === 'number' ? v : parseFloat(v);
}

function measure(state: SliderState) {
  const g = getGap(state.track);
  state.setWidth = 0;
  state.slideWidths = [];
  state.slideOffsets = [];
  for (let i = 0; i < state.slideCount; i++) {
    state.slideOffsets.push(state.setWidth);
    state.slideWidths.push(state.allSlides[i]!.offsetWidth);
    state.setWidth += state.allSlides[i]!.offsetWidth + g;
  }
}

function markerX(state: SliderState): number {
  const pad = parseFloat(getComputedStyle(state.container).paddingLeft) || 0;
  return state.container.offsetWidth * 0.6 - pad;
}

function xForSlide(state: SliderState, index: number): number {
  const mx = markerX(state);
  const slideCenter = state.slideOffsets[index]! + state.slideWidths[index]! / 2;
  return -(slideCenter - mx);
}

function updateActive(state: SliderState) {
  const mx = markerX(state);
  const currentX = getX(state.track);

  let closest = -1;
  let closestDist = Infinity;

  for (let i = 0; i < state.allSlides.length; i++) {
    const origIdx = i % state.slideCount;
    const offset = state.slideOffsets[origIdx]! + (i >= state.slideCount ? state.setWidth : 0);
    const center = offset + state.slideWidths[origIdx]! / 2 + currentX;
    const dist = Math.abs(center - mx);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  }

  if (closest === state.activeIndex) return;

  state.allSlides.forEach((el) => el.classList.remove('is-active'));
  if (closest >= 0) {
    state.allSlides[closest]!.classList.add('is-active');
    const mirror =
      closest >= state.slideCount ? closest - state.slideCount : closest + state.slideCount;
    state.allSlides[mirror]?.classList.add('is-active');
    state.activeOrigIndex = closest % state.slideCount;
  }
  state.activeIndex = closest;
}

function snapX(state: SliderState, endValue: number): number {
  const mx = markerX(state);
  const w = state.setWidth;
  // Normalise endValue into (-w, 0] so we always search within one period
  const wrapped = ((endValue % w) - w) % w;
  let best = wrapped;
  let bestDist = Infinity;

  for (let i = 0; i < state.slideCount; i++) {
    const target = -(state.slideOffsets[i]! + state.slideWidths[i]! / 2 - mx);
    const dist = Math.abs(target - wrapped);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  // Re-add the multi-period offset so the throw lands in the right direction
  return best + (endValue - wrapped);
}

function wrapX(state: SliderState) {
  let x = getX(state.track);
  if (x < -state.setWidth || x > 0) {
    x = ((x % state.setWidth) + state.setWidth) % state.setWidth;
    if (x > 0) x -= state.setWidth;
    gsap.set(state.track, { x });
    state.draggable.update();
  }
}

function stopAutoPlay(state: SliderState) {
  if (state.autoTimer) {
    clearInterval(state.autoTimer);
    state.autoTimer = null;
  }
}

function advanceToNext(state: SliderState) {
  const nextOrig = (state.activeOrigIndex + 1) % state.slideCount;
  const targetX = xForSlide(state, nextOrig);
  const currentX = getX(state.track);

  let best = targetX;
  let bestDist = Infinity;
  for (const candidate of [targetX, targetX + state.setWidth, targetX - state.setWidth]) {
    const d = Math.abs(candidate - currentX);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }

  if (state.marker) {
    state.marker.getAnimations().forEach((a) => a.cancel());
    state.marker.classList.remove('is-pulling');
    requestAnimationFrame(() => state.marker?.classList.add('is-pulling'));
  }

  gsap.to(state.track, {
    x: best,
    duration: 1.2,
    ease: 'expo.inOut',
    onUpdate: () => {
      wrapX(state);
      updateActive(state);
    },
    onComplete: () => {
      wrapX(state);
      updateActive(state);
      state.marker?.classList.remove('is-pulling');
    },
  });
}

function startAutoPlay(state: SliderState) {
  if (state.autoTimer) return;
  state.autoTimer = setInterval(() => advanceToNext(state), 6000);
}

function resetAutoPlay(state: SliderState) {
  stopAutoPlay(state);
  startAutoPlay(state);
}

function createDraggable(
  state: SliderState,
  showMarker: () => void,
  hideMarker: () => void,
): Draggable {
  return Draggable.create(state.track, {
    type: 'x',
    inertia: true,
    snap: { x: (v: number) => snapX(state, v) },
    onDragStart() {
      state.isDragging = true;
      showMarker();
      stopAutoPlay(state);
    },
    onDrag() {
      wrapX(state);
      updateActive(state);
    },
    onThrowUpdate() {
      wrapX(state);
      updateActive(state);
    },
    onThrowComplete() {
      wrapX(state);
      updateActive(state);
      state.isDragging = false;
      hideMarker();
      resetAutoPlay(state);
    },
  })[0]!;
}

// eslint-disable-next-line max-lines-per-function -- IO observer + draggable + autoplay lifecycle can't split further without fake abstractions
export function initLifestyleSlider() {
  cleanup?.();

  const slider = document.querySelector<HTMLElement>('.lifestyle__slider');
  const container = document.querySelector<HTMLElement>('.lifestyle__slider-container');
  const track = document.querySelector<HTMLElement>('.lifestyle__track');
  if (!slider || !container || !track) return;

  const originals = Array.from(track.querySelectorAll<HTMLElement>(':scope > *'));
  const slideCount = originals.length;

  originals.forEach((child) => track.appendChild(child.cloneNode(true)));

  const state: SliderState = {
    slider,
    container,
    track,
    allSlides: Array.from(track.querySelectorAll<HTMLElement>(':scope > *')),
    slideCount,
    setWidth: 0,
    slideWidths: [],
    slideOffsets: [],
    activeIndex: -1,
    activeOrigIndex: 2,
    marker: slider.querySelector<HTMLElement>('.lifestyle__marker'),
    isDragging: false,
    autoTimer: null,
    draggable: null!,
  };

  measure(state);
  gsap.set(track, { x: xForSlide(state, 2) });

  const showMarker = () => state.marker?.classList.add('is-active');
  const hideMarker = () => {
    if (!state.isDragging) state.marker?.classList.remove('is-active');
  };

  slider.addEventListener('pointerenter', showMarker);
  slider.addEventListener('pointerleave', hideMarker);

  state.draggable = createDraggable(state, showMarker, hideMarker);

  updateActive(state);

  const section = document.querySelector('.lifestyle');
  let autoStarted = false;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry!.isIntersecting) {
        if (!autoStarted) {
          autoStarted = true;
          delayTimer = setTimeout(() => {
            delayTimer = null;
            startAutoPlay(state);
          }, 3000);
        } else {
          startAutoPlay(state);
        }
      } else {
        stopAutoPlay(state);
      }
    },
    { threshold: 0.3 },
  );
  if (section) observer.observe(section);

  const onResize = () => {
    measure(state);
    gsap.set(track, { x: xForSlide(state, state.activeOrigIndex) });
    state.draggable.update();
    updateActive(state);
  };
  window.addEventListener('resize', onResize);

  cleanup = () => {
    if (delayTimer) clearTimeout(delayTimer);
    stopAutoPlay(state);
    observer.disconnect();
    state.draggable.kill();
    slider.removeEventListener('pointerenter', showMarker);
    slider.removeEventListener('pointerleave', hideMarker);
    state.marker?.classList.remove('is-active', 'is-pulling');
    window.removeEventListener('resize', onResize);
    state.allSlides.forEach((el) => el.classList.remove('is-active'));
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
