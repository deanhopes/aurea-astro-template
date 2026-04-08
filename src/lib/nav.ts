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
  const cards = panel.querySelectorAll('.menu-card');
  const links = panel.querySelectorAll('.menu-sidebar__link');
  const cta = panel.querySelector('.menu-sidebar__cta');

  const tl = gsap.timeline({ paused: true });

  // Panel enters with ease-out — starts fast, feels responsive
  tl.to(panel, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' })
    .fromTo(cards, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.05 }, 0.1)
    .fromTo(links, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out', stagger: 0.04 }, 0.15);

  if (cta) {
    tl.fromTo(cta, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.25);
  }

  return tl;
}

export function initNav() {
  cleanup?.();

  const header = document.querySelector<HTMLElement>('[data-nav]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!header || !toggle || !panel) return;

  // Pre-promote to GPU layer so backdrop-filter doesn't cause jank on first open
  gsap.set(panel, { autoAlpha: 0, y: -4, force3D: true });

  const iconTl = createIconTimeline(toggle);
  const panelTl = createPanelTimeline(panel);

  /* ── Hide-on-scroll-down, show-on-scroll-up ── */
  let lastScroll = 0;
  const SCROLL_THRESHOLD = 80; // Don't hide until past hero area

  function onScroll() {
    const current = window.scrollY;
    const isMenuOpen = toggle!.getAttribute('aria-expanded') === 'true';

    // Never hide when menu is open or near top
    if (isMenuOpen || current < SCROLL_THRESHOLD) {
      header!.classList.remove('header--hidden');
    } else if (current > lastScroll) {
      // Scrolling down — hide
      header!.classList.add('header--hidden');
    } else {
      // Scrolling up — show
      header!.classList.remove('header--hidden');
    }

    lastScroll = current;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function open() {
    toggle!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    header!.classList.remove('header--hidden');
    iconTl.play();
    panelTl.play();
    getLenis()?.stop();
  }

  function close() {
    toggle!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
    iconTl.reverse();
    // Instant out — snap panel and children to hidden state
    panelTl.pause(0);
    getLenis()?.start();
  }

  function handleToggle() {
    const isOpen = toggle!.getAttribute('aria-expanded') === 'true';
    isOpen ? close() : open();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && toggle!.getAttribute('aria-expanded') === 'true') {
      close();
      toggle!.focus();
    }
  }

  function handlePanelClick(e: Event) {
    if ((e.target as HTMLElement).closest('a')) close();
  }

  // Click outside header closes menu
  function handleClickOutside(e: MouseEvent) {
    if (toggle!.getAttribute('aria-expanded') !== 'true') return;
    if (!header!.contains(e.target as Node)) {
      close();
    }
  }

  // Hover: mouse enters menu toggle → open, mouse leaves header → close
  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function handleToggleEnter() {
    if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
    if (toggle!.getAttribute('aria-expanded') !== 'true') open();
  }

  function handleHeaderLeave(e: MouseEvent) {
    // Only close if mouse actually left the header bounds
    const related = e.relatedTarget as Node | null;
    if (related && header!.contains(related)) return;
    if (toggle!.getAttribute('aria-expanded') !== 'true') return;

    // Small delay so quick mouse movements don't flicker
    hoverCloseTimer = setTimeout(close, 200);
  }

  function handleHeaderEnter() {
    if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
  }

  toggle.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
  panel.addEventListener('click', handlePanelClick);
  toggle.addEventListener('mouseenter', handleToggleEnter);
  header.addEventListener('mouseleave', handleHeaderLeave);
  header.addEventListener('mouseenter', handleHeaderEnter);

  cleanup = () => {
    close();
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    iconTl.kill();
    panelTl.kill();
    toggle.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleClickOutside);
    panel.removeEventListener('click', handlePanelClick);
    toggle.removeEventListener('mouseenter', handleToggleEnter);
    header.removeEventListener('mouseleave', handleHeaderLeave);
    header.removeEventListener('mouseenter', handleHeaderEnter);
    window.removeEventListener('scroll', onScroll);
    header.classList.remove('header--hidden');
    cleanup = null;
  };
}

export function destroyNav() {
  cleanup?.();
}
