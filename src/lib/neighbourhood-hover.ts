import gsap from 'gsap';

let cleanup: (() => void) | null = null;

interface HoverState {
  section: HTMLElement;
  lines: NodeListOf<HTMLElement>;
  images: NodeListOf<HTMLElement>;
  captions: NodeListOf<HTMLElement>;
  activeId: string;
}

function animateArrows(state: HoverState, id: string, instant: boolean) {
  const allArrows = state.section.querySelectorAll<HTMLElement>('.neighbourhood__line-arrow');
  const activeArrow = state.section.querySelector<HTMLElement>(
    `[data-neighbourhood-item="${id}"] .neighbourhood__line-arrow`,
  );

  if (instant) {
    gsap.set(allArrows, { opacity: 0, scale: 0 });
    if (activeArrow) gsap.set(activeArrow, { opacity: 1, scale: 1 });
  } else {
    gsap.to(allArrows, { opacity: 0, scale: 0, duration: 0.2, overwrite: true });
    if (activeArrow) {
      gsap.to(activeArrow, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.3)', overwrite: true });
    }
  }
}

function crossfadeImages(state: HoverState, id: string, instant: boolean) {
  state.images.forEach((img) => {
    const isActive = img.dataset.neighbourhoodImage === id;
    if (instant) {
      gsap.set(img, { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.03 });
      img.classList.toggle('is-active', isActive);
    } else if (isActive) {
      gsap.fromTo(img,
        { opacity: 0, scale: 1.03 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', overwrite: true },
      );
      img.classList.add('is-active');
    } else {
      gsap.to(img, {
        opacity: 0, duration: 0.3, overwrite: true,
        onComplete: () => img.classList.remove('is-active'),
      });
    }
  });
}

function revealCaption(state: HoverState, id: string, instant: boolean) {
  state.captions.forEach((cap) => {
    cap.classList.toggle('is-active', cap.dataset.neighbourhoodCaption === id);
  });

  const activeBody = state.section.querySelector<HTMLElement>(
    `[data-neighbourhood-caption="${id}"] .neighbourhood__body`,
  );
  if (!activeBody) return;

  if (instant) {
    gsap.set(activeBody, { opacity: 1, y: 0 });
  } else {
    gsap.fromTo(activeBody,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' },
    );
  }
}

function setActive(state: HoverState, id: string, instant = false) {
  if (id === state.activeId && !instant) return;
  state.activeId = id;

  state.lines.forEach((line) => {
    line.classList.toggle('is-active', line.dataset.neighbourhoodItem === id);
  });

  animateArrows(state, id, instant);
  crossfadeImages(state, id, instant);
  revealCaption(state, id, instant);
}

function measureCaptions(captions: NodeListOf<HTMLElement>, captionWrap: HTMLElement) {
  let maxH = 0;
  captions.forEach((cap) => {
    const wasActive = cap.classList.contains('is-active');
    cap.classList.add('is-active');
    maxH = Math.max(maxH, cap.getBoundingClientRect().height);
    if (!wasActive) cap.classList.remove('is-active');
  });
  captionWrap.style.minHeight = `${maxH}px`;
}

export function initNeighbourhoodHover() {
  cleanup?.();

  const section = document.querySelector<HTMLElement>('[data-neighbourhood]');
  if (!section) return;

  const lines = section.querySelectorAll<HTMLElement>('[data-neighbourhood-item]');
  const images = section.querySelectorAll<HTMLElement>('[data-neighbourhood-image]');
  const captions = section.querySelectorAll<HTMLElement>('[data-neighbourhood-caption]');
  if (!lines.length) return;

  const ids = Array.from(lines).map((el) => el.dataset.neighbourhoodItem!);

  const state: HoverState = { section, lines, images, captions, activeId: ids[0]! };

  const captionWrap = section.querySelector<HTMLElement>('.neighbourhood__captions');
  if (captionWrap) {
    const measure = () => measureCaptions(captions, captionWrap);
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(measure);
    } else {
      measure();
    }
  }

  setActive(state, ids[0]!, true);

  function onEnter(e: Event) {
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodItem;
    if (id) setActive(state, id);
  }

  lines.forEach((line) => line.addEventListener('mouseenter', onEnter));

  function onVisibility() {
    if (!document.hidden) setActive(state, state.activeId, true);
  }
  document.addEventListener('visibilitychange', onVisibility);

  cleanup = () => {
    lines.forEach((line) => line.removeEventListener('mouseenter', onEnter));
    document.removeEventListener('visibilitychange', onVisibility);
    cleanup = null;
  };
}

export function destroyNeighbourhoodHover() {
  cleanup?.();
}
