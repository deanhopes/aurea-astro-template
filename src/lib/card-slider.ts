import gsap from 'gsap';

let cleanups: (() => void)[] = [];

function initCard(card: HTMLElement): () => void {
  const track = card.querySelector<HTMLElement>('.card__slider-track');
  if (!track) return () => {};

  const originalSlides = Array.from(card.querySelectorAll<HTMLElement>('.card__slide'));
  const total = originalSlides.length;
  if (total < 2) return () => {};

  // Clone last slide to front, first slide to back for seamless wrap
  const headClone = originalSlides[0].cloneNode(true) as HTMLElement;
  const tailClone = originalSlides[total - 1].cloneNode(true) as HTMLElement;
  headClone.setAttribute('aria-hidden', 'true');
  tailClone.setAttribute('aria-hidden', 'true');

  track.appendChild(headClone);
  track.insertBefore(tailClone, originalSlides[0]);

  // current = index into originals (0-based); real position = current + 1 (offset by tail clone)
  let current = 0;
  let animating = false;

  // Position to slide 0 without transition (tail clone is now at index 0)
  gsap.set(track, { xPercent: -100 });

  function goTo(index: number, instant = false) {
    current = ((index % total) + total) % total;
    const xPercent = -(current + 1) * 100;

    if (instant) {
      gsap.set(track, { xPercent });
      return;
    }

    animating = true;
    gsap.to(track, {
      xPercent,
      duration: 0.5,
      ease: 'expo.out',
      onComplete() {
        animating = false;
      },
    });
  }

  function wrapTo(toX: number, snapX: number, landIndex: number) {
    animating = true;
    gsap.to(track, {
      xPercent: toX,
      duration: 0.5,
      ease: 'expo.out',
      onComplete() {
        current = landIndex;
        gsap.set(track, { xPercent: snapX });
        animating = false;
      },
    });
  }

  function prev(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (animating) return;
    if (current - 1 < 0) {
      wrapTo(0, -total * 100, total - 1);
    } else {
      goTo(current - 1);
    }
  }

  function next(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (animating) return;
    if (current + 1 >= total) {
      wrapTo(-(total + 1) * 100, -100, 0);
    } else {
      goTo(current + 1);
    }
  }

  const prevBtn = card.querySelector<HTMLButtonElement>('.card__slider-arrow--prev');
  const nextBtn = card.querySelector<HTMLButtonElement>('.card__slider-arrow--next');

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  return () => {
    prevBtn?.removeEventListener('click', prev);
    nextBtn?.removeEventListener('click', next);
    gsap.killTweensOf(track);
    gsap.set(track, { xPercent: 0, clearProps: 'xPercent' });
    // Remove clones
    headClone.remove();
    tailClone.remove();
  };
}

export function initCardSliders(): void {
  destroyCardSliders();
  const cards = document.querySelectorAll<HTMLElement>('[data-card-slider]');
  cards.forEach((card) => cleanups.push(initCard(card)));
}

export function destroyCardSliders(): void {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}
