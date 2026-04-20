/**
 * Tweakpane debug panel for footer shader uniforms.
 * Dev-only — tree-shaken in production via `import.meta.env.DEV` gate in bootstrap.
 */

import { Pane } from 'tweakpane';
import { setUniform } from './footer-shaders';

let pane: Pane | null = null;

// Proxy object — tweakpane binds here, onChange posts to worker/fallback
const params = {
  // Wordmark
  wmOpacity: 1.0,
  wmScale: 1.13,
  wmX: -0.01,
  wmY: 0.05,
  // Caustics
  causticScale: 2.3,
  causticSpeed: 0.08,
  causticSharpness: 2.5,
  causticHeight: 2.0,
  refraction: 0.008,
  // Shadows
  shadowThreshold: 1.0,
  shadowSoftness: 0.5,
  shadowAlpha: 0.46,
};

// Map param keys → uniform names
const uniformMap: Record<string, string> = {
  wmOpacity: 'uWordmarkOpacity',
  wmScale: 'uWordmarkScale',
  wmX: 'uWordmarkX',
  wmY: 'uWordmarkY',
  causticScale: 'uCausticScale',
  causticSpeed: 'uCausticSpeed',
  causticSharpness: 'uCausticSharpness',
  causticHeight: 'uCausticHeight',
  refraction: 'uRefraction',
  shadowThreshold: 'uShadowThreshold',
  shadowSoftness: 'uShadowSoftness',
  shadowAlpha: 'uShadowAlpha',
};

function bind(
  folder: ReturnType<Pane['addFolder']> | Pane,
  key: keyof typeof params,
  opts: { label: string; min: number; max: number; step: number },
) {
  const uName = uniformMap[key]!;
  folder.addBinding(params, key, opts).on('change', (e) => {
    setUniform(uName, e.value);
  });
}

let container: HTMLDivElement | null = null;

export function initFooterDebug(): void {
  if (pane) return;

  // #main-content has z-index:1 and covers the viewport — tweakpane's
  // default body-append lands behind it. Create a wrapper above everything.
  container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;right:0;z-index:9999;';
  document.body.appendChild(container);

  pane = new Pane({ title: 'Footer Shaders', expanded: false, container });

  // -- Wordmark --
  const wm = pane.addFolder({ title: 'Wordmark', expanded: true });
  bind(wm, 'wmOpacity', { label: 'opacity', min: 0, max: 1, step: 0.01 });
  bind(wm, 'wmScale', { label: 'scale', min: 0.2, max: 3, step: 0.01 });
  bind(wm, 'wmX', { label: 'x offset', min: -0.5, max: 0.5, step: 0.005 });
  bind(wm, 'wmY', { label: 'y offset', min: -0.5, max: 0.5, step: 0.005 });

  // -- Caustics --
  const ca = pane.addFolder({ title: 'Caustics', expanded: false });
  bind(ca, 'causticScale', { label: 'scale', min: 0.5, max: 8, step: 0.1 });
  bind(ca, 'causticSpeed', { label: 'speed', min: 0, max: 0.5, step: 0.01 });
  bind(ca, 'causticSharpness', { label: 'sharpness', min: 0.5, max: 8, step: 0.1 });
  bind(ca, 'causticHeight', { label: 'height', min: 0, max: 5, step: 0.1 });
  bind(ca, 'refraction', { label: 'refraction', min: 0, max: 0.1, step: 0.001 });

  // -- Shadows --
  const sh = pane.addFolder({ title: 'Shadows', expanded: false });
  bind(sh, 'shadowThreshold', { label: 'threshold', min: -1, max: 1, step: 0.01 });
  bind(sh, 'shadowSoftness', { label: 'softness', min: 0, max: 4, step: 0.1 });
  bind(sh, 'shadowAlpha', { label: 'alpha', min: 0, max: 1, step: 0.01 });
}

export function destroyFooterDebug(): void {
  pane?.dispose();
  pane = null;
  container?.remove();
  container = null;
}
