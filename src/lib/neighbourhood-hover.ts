import gsap from 'gsap';

let cleanup: (() => void) | null = null;

export function initNeighbourhoodHover() {
  cleanup?.();

  const section = document.querySelector<HTMLElement>('[data-neighbourhood]');
  if (!section) return;

  const lines = section.querySelectorAll<HTMLElement>('[data-neighbourhood-item]');
  const images = section.querySelectorAll<HTMLElement>('[data-neighbourhood-image]');
  const captions = section.querySelectorAll<HTMLElement>('[data-neighbourhood-caption]');
  if (!lines.length) return;

  const ids = Array.from(lines).map((el) => el.dataset.neighbourhoodItem!);
  let activeId = ids[0];

  function setActive(id: string, instant = false) {
    if (id === activeId && !instant) return;
    activeId = id;

    // List: toggle active state
    lines.forEach((line) => {
      line.classList.toggle('is-active', line.dataset.neighbourhoodItem === id);
    });

    // Arrows: hide all, spring-in the active one
    const allArrows = section!.querySelectorAll<HTMLElement>('.neighbourhood__line-arrow');
    const activeArrow = section!.querySelector<HTMLElement>(
      `[data-neighbourhood-item="${id}"] .neighbourhood__line-arrow`,
    );

    if (instant) {
      gsap.set(allArrows, { opacity: 0, scale: 0 });
      if (activeArrow) gsap.set(activeArrow, { opacity: 1, scale: 1 });
    } else {
      gsap.to(allArrows, { opacity: 0, scale: 0, duration: 0.2, overwrite: true });
      if (activeArrow) {
        gsap.to(activeArrow, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.3)',
          overwrite: true,
        });
      }
    }

    // Images: crossfade with subtle scale (no blur — per lessons.md)
    images.forEach((img) => {
      const isActive = img.dataset.neighbourhoodImage === id;
      if (instant) {
        gsap.set(img, { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.03 });
        img.classList.toggle('is-active', isActive);
      } else if (isActive) {
        gsap.fromTo(
          img,
          { opacity: 0, scale: 1.03 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', overwrite: true },
        );
        img.classList.add('is-active');
      } else {
        gsap.to(img, {
          opacity: 0,
          duration: 0.3,
          overwrite: true,
          onComplete: () => img.classList.remove('is-active'),
        });
      }
    });

    // Captions: swap visibility
    captions.forEach((cap) => {
      cap.classList.toggle('is-active', cap.dataset.neighbourhoodCaption === id);
    });

    // Caption text: reveal with y offset
    const activeBody = section!.querySelector<HTMLElement>(
      `[data-neighbourhood-caption="${id}"] .neighbourhood__body`,
    );
    if (activeBody) {
      if (instant) {
        gsap.set(activeBody, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          activeBody,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        );
      }
    }
  }

  // Measure tallest caption so container doesn't shift on switch
  const captionWrap = section.querySelector<HTMLElement>('.neighbourhood__captions');
  function measureCaptions() {
    if (!captionWrap) return;
    let maxH = 0;
    captions.forEach((cap) => {
      // Temporarily show to measure
      const wasActive = cap.classList.contains('is-active');
      cap.classList.add('is-active');
      maxH = Math.max(maxH, cap.getBoundingClientRect().height);
      if (!wasActive) cap.classList.remove('is-active');
    });
    captionWrap.style.minHeight = `${maxH}px`;
  }
  if (document.fonts?.ready) document.fonts.ready.then(measureCaptions);
  else measureCaptions();

  // Initialise first item
  setActive(ids[0], true);

  // Hover events
  function onEnter(e: Event) {
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodItem;
    if (id) setActive(id);
  }

  lines.forEach((line) => line.addEventListener('mouseenter', onEnter));

  // Restore state on tab re-focus
  function onVisibility() {
    if (!document.hidden) setActive(activeId, true);
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
