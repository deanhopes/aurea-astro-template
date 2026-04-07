import gsap from 'gsap';
import { getLenis } from './lenis';

let cleanup: (() => void) | null = null;

function createIconTimeline(toggle: HTMLElement): gsap.core.Timeline {
  const top = toggle.querySelector('[data-bar="top"]');
  const mid = toggle.querySelector('[data-bar="mid"]');
  const bot = toggle.querySelector('[data-bar="bot"]');

  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.4, ease: 'power2.inOut' } });

  tl.to(top, { y: 6, rotation: 45, transformOrigin: 'center center' }, 0)
    .to(bot, { y: -6, rotation: -45, transformOrigin: 'center center' }, 0)
    .to(mid, { autoAlpha: 0, duration: 0.2 }, 0);

  return tl;
}

export function initNav() {
  cleanup?.();

  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!toggle || !panel) return;

  const iconTl = createIconTimeline(toggle);

  function open() {
    toggle!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    iconTl.play();
    getLenis()?.stop();
  }

  function close() {
    toggle!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
    iconTl.reverse();
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

  toggle.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKeydown);
  panel.addEventListener('click', handlePanelClick);

  cleanup = () => {
    close();
    iconTl.kill();
    toggle.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    panel.removeEventListener('click', handlePanelClick);
    cleanup = null;
  };
}

export function destroyNav() {
  cleanup?.();
}
