import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(Draggable, InertiaPlugin);

let cleanup: (() => void) | null = null;

interface SliderState {
  slider: HTMLElement;
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

function markerX(slider: HTMLElement): number {
  return slider.offsetWidth * 0.6;
}

function xForSlide(state: SliderState, index: number): number {
  const mx = markerX(state.slider);
  const slideCenter = state.slideOffsets[index]! + state.slideWidths[index]! / 2;
  return -(slideCenter - mx);
}

function updateActive(state: SliderState) {
  const mx = markerX(state.slider);
  const currentX = gsap.getProperty(state.track, 'x') as number;

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
    const mirror = closest >= state.slideCount ? closest - state.slideCount : closest + state.slideCount;
    state.allSlides[mirror]?.classList.add('is-active');
    state.activeOrigIndex = closest % state.slideCount;
  }
  state.activeIndex = closest;
}

function snapX(state: SliderState, endValue: number): number {
  const mx = markerX(state.slider);
  let best = endValue;
  let bestDist = Infinity;

  for (let i = 0; i < state.slideCount; i++) {
    const slideCenter = state.slideOffsets[i]! + state.slideWidths[i]! / 2;
    const targetX = -(slideCenter - mx);
    for (const candidate of [targetX, targetX + state.setWidth, targetX - state.setWidth]) {
      const dist = Math.abs(candidate - endValue);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
}

function wrapX(state: SliderState) {
  let x = gsap.getProperty(state.track, 'x') as number;
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
  const currentX = gsap.getProperty(state.track, 'x') as number;

  let best = targetX;
  let bestDist = Infinity;
  for (const candidate of [targetX, targetX + state.setWidth, targetX - state.setWidth]) {
    const d = Math.abs(candidate - currentX);
    if (d < bestDist) { bestDist = d; best = candidate; }
  }

  if (state.marker) {
    state.marker.classList.remove('is-pulling');
    void state.marker.offsetWidth;
    state.marker.classList.add('is-pulling');
  }

  gsap.to(state.track, {
    x: best,
    duration: 1.2,
    ease: 'expo.inOut',
    onUpdate: () => { wrapX(state); updateActive(state); },
    onComplete: () => { wrapX(state); updateActive(state); state.marker?.classList.remove('is-pulling'); },
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
    onDragStart() { state.isDragging = true; showMarker(); stopAutoPlay(state); },
    onDrag() { wrapX(state); updateActive(state); },
    onThrowUpdate() { wrapX(state); updateActive(state); },
    onThrowComplete() {
      wrapX(state); updateActive(state);
      state.isDragging = false; hideMarker(); resetAutoPlay(state);
    },
  })[0]!;
}

export function initLifestyleSlider() {
  cleanup?.();

  const slider = document.querySelector<HTMLElement>('.lifestyle__slider');
  const track = document.querySelector<HTMLElement>('.lifestyle__track');
  if (!slider || !track) return;

  const originals = Array.from(track.children) as HTMLElement[];
  const slideCount = originals.length;

  originals.forEach((child) => track.appendChild(child.cloneNode(true)));

  const state: SliderState = {
    slider,
    track,
    allSlides: Array.from(track.children) as HTMLElement[],
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
  const hideMarker = () => { if (!state.isDragging) state.marker?.classList.remove('is-active'); };

  slider.addEventListener('pointerenter', showMarker);
  slider.addEventListener('pointerleave', hideMarker);

  state.draggable = createDraggable(state, showMarker, hideMarker);

  updateActive(state);

  const section = document.querySelector('.lifestyle');
  const observer = new IntersectionObserver(
    ([entry]) => { entry!.isIntersecting ? startAutoPlay(state) : stopAutoPlay(state); },
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
