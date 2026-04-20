import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

function animateCardColumns(section: HTMLElement, containerAnimation: gsap.core.Tween) {
  const columns = section.querySelectorAll(
    '.vision__card-left, .vision__card-centre, .vision__card-right',
  );
  if (!columns.length) return;

  gsap.from(columns, {
    y: 30,
    opacity: 0,
    duration: 1.4,
    ease: 'expo.out',
    stagger: 0.12,
    scrollTrigger: {
      trigger: '.vision__card',
      containerAnimation,
      start: 'left 85%',
      once: true,
    },
  });
}

function animateCardImages(section: HTMLElement, containerAnimation: gsap.core.Tween) {
  const images = section.querySelectorAll('.vision__card .vision__card-image img');

  images.forEach((img, i) => {
    gsap.from(img, {
      scale: 1.05,
      duration: 1.25,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: img.parentElement,
        containerAnimation,
        start: 'left 85%',
        once: true,
      },
    });

    const direction = i % 2 === 0 ? -1 : 1;
    gsap.fromTo(
      img,
      { xPercent: direction * 4 },
      {
        xPercent: direction * -4,
        ease: 'none',
        scrollTrigger: {
          trigger: img.parentElement,
          containerAnimation,
          start: 'left right',
          end: 'right left',
          scrub: 1,
        },
      },
    );
  });
}

function animatePairImages(section: HTMLElement, containerAnimation: gsap.core.Tween) {
  const images = section.querySelectorAll('.vision__image-pair .vision__card-image img');

  images.forEach((img) => {
    gsap.from(img, {
      scale: 1.05,
      duration: 1.25,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: img.parentElement,
        containerAnimation,
        start: 'left 90%',
        once: true,
      },
    });

    gsap.fromTo(
      img,
      { xPercent: -3 },
      {
        xPercent: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: img.parentElement,
          containerAnimation,
          start: 'left right',
          end: 'right left',
          scrub: 1,
        },
      },
    );
  });
}

function setupHorizontalScroll(section: HTMLElement, track: HTMLElement) {
  const getScrollDistance = () => track.scrollWidth - window.innerWidth;

  const horizontalScroll = gsap.to(track, {
    x: () => -getScrollDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: section,
      scrub: 1,
      anticipatePin: 1,
      end: () => `+=${getScrollDistance()}`,
      invalidateOnRefresh: true,
    },
  });

  animateCardColumns(section, horizontalScroll);
  animateCardImages(section, horizontalScroll);
  animatePairImages(section, horizontalScroll);
}

export function initVisionScroll() {
  const section = document.querySelector<HTMLElement>('[data-vision]');
  const track = document.querySelector<HTMLElement>('[data-vision-track]');
  if (!section || !track) return;

  ctx?.revert();
  ctx = gsap.context(() => {
    gsap.matchMedia().add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
      setupHorizontalScroll(section!, track!);
    });
  });
}

export function destroyVisionScroll() {
  ctx?.revert();
  ctx = null;
}
