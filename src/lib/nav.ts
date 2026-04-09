import gsap from 'gsap';
import { getLenis } from './lenis';

let cleanup: (() => void) | null = null;

function createIconTimeline(toggle: HTMLElement): gsap.core.Timeline {
  const top = toggle.querySelector('[data-bar="top"]');
  const mid = toggle.querySelector('[data-bar="mid"]');
  const bot = toggle.querySelector('[data-bar="bot"]');

  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.3, ease: 'power2.inOut' } });

  tl.to(top, { y: 6, rotation: 45, transformOrigin: 'center center' }, 0)
    .to(bot, { y: -6, rotation: -45, transformOrigin: 'center center' }, 0)
    .to(mid, { autoAlpha: 0, duration: 0.15 }, 0);

  return tl;
}

function createPanelTimeline(panel: HTMLElement): gsap.core.Timeline {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const tl = gsap.timeline({ paused: true });

  tl.to(panel, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'expo.out' });

  if (isMobile) {
    // Mobile: all items are flat text links — stagger as one sequence
    const allItems = panel.querySelectorAll('.menu-card__label, .menu-sidebar__link, .menu-sidebar__cta');
    tl.fromTo(allItems,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'expo.out', stagger: 0.03 },
      0.1,
    );
  } else {
    // Desktop: cards with images + sidebar links
    const cards = panel.querySelectorAll('.menu-card');
    const links = panel.querySelectorAll('.menu-sidebar__link');
    const cta = panel.querySelector('.menu-sidebar__cta');

    tl.fromTo(cards, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'expo.out', stagger: 0.05 }, 0.1)
      .fromTo(links, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'expo.out', stagger: 0.04 }, 0.15);

    if (cta) {
      tl.fromTo(cta, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'expo.out' }, 0.25);
    }
  }

  return tl;
}

function isMenuOpen(toggle: HTMLButtonElement): boolean {
  return toggle.getAttribute('aria-expanded') === 'true';
}

function setupScrollHide(header: HTMLElement, toggle: HTMLButtonElement): () => void {
  let lastScroll = 0;
  const SCROLL_THRESHOLD = 80;

  function onScroll() {
    const current = window.scrollY;

    if (isMenuOpen(toggle) || current < SCROLL_THRESHOLD) {
      header.classList.remove('header--hidden');
    } else if (current > lastScroll) {
      header.classList.add('header--hidden');
    } else {
      header.classList.remove('header--hidden');
    }

    lastScroll = current;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

function setupHoverBehavior(
  header: HTMLElement,
  toggle: HTMLButtonElement,
  open: () => void,
  close: () => void,
): () => void {
  // Only attach hover-to-open on devices with real hover (not touch)
  if (!window.matchMedia('(hover: hover)').matches) return () => {};

  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function handleToggleEnter() {
    if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
    if (!isMenuOpen(toggle)) open();
  }

  function handleHeaderLeave(e: MouseEvent) {
    const related = e.relatedTarget as Node | null;
    if (related && header.contains(related)) return;
    if (!isMenuOpen(toggle)) return;
    hoverCloseTimer = setTimeout(close, 200);
  }

  function handleHeaderEnter() {
    if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
  }

  toggle.addEventListener('mouseenter', handleToggleEnter);
  header.addEventListener('mouseleave', handleHeaderLeave);
  header.addEventListener('mouseenter', handleHeaderEnter);

  return () => {
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    toggle.removeEventListener('mouseenter', handleToggleEnter);
    header.removeEventListener('mouseleave', handleHeaderLeave);
    header.removeEventListener('mouseenter', handleHeaderEnter);
  };
}

export function initNav() {
  cleanup?.();

  const _header = document.querySelector<HTMLElement>('[data-nav]');
  const _toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const _panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!_header || !_toggle || !_panel) return;

  // Non-null refs for closures (TS can't narrow querySelector across closure boundaries)
  const header = _header;
  const toggle = _toggle;
  const panel = _panel;

  gsap.set(panel, { autoAlpha: 0, y: -4, force3D: true });

  const iconTl = createIconTimeline(toggle);
  const panelTl = createPanelTimeline(panel);

  function open() {
    toggle.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    header.classList.remove('header--hidden');
    iconTl.play();
    panelTl.restart();
    getLenis()?.stop();
  }

  function close() {
    if (!isMenuOpen(toggle)) return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    iconTl.reverse();
    panelTl.progress(0).pause();
    gsap.set(panel, { autoAlpha: 0, y: -4 });
    getLenis()?.start();
  }

  let toggleClicked = false;

  function handleToggle(e: MouseEvent) {
    e.stopPropagation();
    toggleClicked = true;
    isMenuOpen(toggle) ? close() : open();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isMenuOpen(toggle)) {
      close();
      toggle.focus();
    }
  }

  function handlePanelClick(e: Event) {
    if ((e.target as HTMLElement).closest('a')) close();
  }

  function handleClickOutside(e: MouseEvent) {
    if (toggleClicked) { toggleClicked = false; return; }
    if (!isMenuOpen(toggle)) return;
    if (!header.contains(e.target as Node)) close();
  }

  const teardownScroll = setupScrollHide(header, toggle);
  const teardownHover = setupHoverBehavior(header, toggle, open, close);

  toggle.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
  panel.addEventListener('click', handlePanelClick);

  cleanup = () => {
    close();
    teardownScroll();
    teardownHover();
    iconTl.kill();
    panelTl.kill();
    toggle.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleClickOutside);
    panel.removeEventListener('click', handlePanelClick);
    header.classList.remove('header--hidden');
    cleanup = null;
  };
}

export function destroyNav() {
  cleanup?.();
}
