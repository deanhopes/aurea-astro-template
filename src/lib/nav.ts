import { getLenis } from './lenis';

let cleanup: (() => void) | null = null;

export function initNav() {
  cleanup?.();

  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!toggle || !panel) return;

  function open() {
    toggle!.setAttribute('aria-expanded', 'true');
    panel!.setAttribute('aria-hidden', 'false');
    getLenis()?.stop();
  }

  function close() {
    toggle!.setAttribute('aria-expanded', 'false');
    panel!.setAttribute('aria-hidden', 'true');
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
    toggle.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    panel.removeEventListener('click', handlePanelClick);
    cleanup = null;
  };
}

export function destroyNav() {
  cleanup?.();
}
