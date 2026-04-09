/**
 * Footer sunset haze — canvas-based concentric radial gradients.
 * 7 rings drawn from largest (warm orange-peach) to smallest (soft background).
 * Scroll-driven: rings rise from below as footer reveals.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Color helpers ── */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/* ── Ring definitions ── */

const COLORS = {
  orange: hexToRgb('#ef5d2a'),
  orangeDark: hexToRgb('#d96139'),
  peach: hexToRgb('#f0c4a8'),
  pink: hexToRgb('#ff5684'),
  lightBlue: hexToRgb('#8ed4fd'),
  background: hexToRgb('#f9efe6'),
  white: hexToRgb('#f5f5f5'),
};

interface Ring {
  scale: number;       // 1 = full canvas radius
  innerColor: [number, number, number];
  outerColor: [number, number, number];
  innerAlpha: number;
  outerAlpha: number;  // alpha at edge before fade-out
  fadeStart: number;   // 0-1 where solid color ends
  fadeEnd: number;     // 0-1 where fully transparent
}

const rings: Ring[] = [
  // Outermost → cool hint of sky, barely there
  { scale: 1.0,  innerColor: mixRgb(COLORS.background, COLORS.lightBlue, 0.12), outerColor: COLORS.background,                             innerAlpha: 0.35, outerAlpha: 0.1,  fadeStart: 0.25, fadeEnd: 0.8 },
  // Warm white veil with faint blue edge
  { scale: 0.88, innerColor: mixRgb(COLORS.white, COLORS.peach, 0.3),           outerColor: mixRgb(COLORS.background, COLORS.lightBlue, 0.08), innerAlpha: 0.45, outerAlpha: 0.15, fadeStart: 0.25, fadeEnd: 0.75 },
  // Peach with whisper of pink
  { scale: 0.76, innerColor: mixRgb(COLORS.peach, COLORS.pink, 0.08),           outerColor: mixRgb(COLORS.peach, COLORS.background, 0.5),      innerAlpha: 0.55, outerAlpha: 0.2,  fadeStart: 0.28, fadeEnd: 0.72 },
  // Pure peach band
  { scale: 0.64, innerColor: COLORS.peach,                                       outerColor: mixRgb(COLORS.peach, COLORS.background, 0.4),      innerAlpha: 0.65, outerAlpha: 0.25, fadeStart: 0.3,  fadeEnd: 0.7 },
  // Warm peach-orange with pink tint
  { scale: 0.52, innerColor: mixRgb(COLORS.peach, COLORS.pink, 0.12),           outerColor: mixRgb(COLORS.peach, COLORS.orange, 0.1),           innerAlpha: 0.75, outerAlpha: 0.3,  fadeStart: 0.3,  fadeEnd: 0.68 },
  // Deep orange-dark warmth
  { scale: 0.40, innerColor: mixRgb(COLORS.orangeDark, COLORS.peach, 0.5),      outerColor: mixRgb(COLORS.peach, COLORS.orange, 0.2),           innerAlpha: 0.85, outerAlpha: 0.35, fadeStart: 0.32, fadeEnd: 0.65 },
  // Innermost — hot orange core with pink heat
  { scale: 0.28, innerColor: mixRgb(COLORS.orange, COLORS.pink, 0.15),          outerColor: mixRgb(COLORS.orangeDark, COLORS.peach, 0.4),       innerAlpha: 0.95, outerAlpha: 0.45, fadeStart: 0.35, fadeEnd: 0.62 },
];

/* ── Noise dither — cached texture ── */

let noiseCanvas: HTMLCanvasElement | null = null;

function getNoiseCanvas(w: number, h: number): HTMLCanvasElement {
  // Create at quarter resolution for performance, scale up
  const nw = Math.ceil(w / 4);
  const nh = Math.ceil(h / 4);
  if (noiseCanvas && noiseCanvas.width === nw && noiseCanvas.height === nh) return noiseCanvas;

  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = nw;
  noiseCanvas.height = nh;
  const nctx = noiseCanvas.getContext('2d')!;
  const imageData = nctx.createImageData(nw, nh);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 18; // very subtle
  }
  nctx.putImageData(imageData, 0, 0);
  return noiseCanvas;
}

function applyNoise(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  const noise = getNoiseCanvas(w, h);
  ctx.save();
  ctx.globalAlpha = 0.06 * alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(noise, 0, 0, w, h);
  ctx.restore();
}

/* ── State ── */

let canvas: HTMLCanvasElement | null = null;
let ctx2d: CanvasRenderingContext2D | null = null;
let gsapCtx: gsap.Context | null = null;
let ro: ResizeObserver | null = null;
let rafId = 0;
let needsDraw = true;

// Scroll-driven progress: 0 = hidden below, 1 = fully revealed
const state = { progress: 0 };

/* ── Drawing ── */

function draw() {
  if (!canvas || !ctx2d) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx2d.clearRect(0, 0, w, h);

  // Squash factor — wide ellipses, not circles
  const squash = 0.3; // Y is 30% of X — very flat, very wide

  // Draw in squashed coordinate space, then scale back
  // Centre in squashed space
  const cx = w / 2;
  const cySquashed = h / squash; // centre at bottom edge of viewport
  const maxRadius = w * 6; // massive — extends far beyond viewport

  // Progress drives vertical offset — rings rise from below
  const yOffset = ((1 - state.progress) * (h * 0.5)) / squash;
  const globalAlpha = state.progress;

  if (globalAlpha <= 0) return;

  ctx2d.save();
  ctx2d.scale(1, squash); // squash Y axis

  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const radius = maxRadius * ring.scale;

    // Each ring has its own delay — outer rings appear first
    const ringDelay = i * 0.04;
    const ringProgress = Math.max(0, Math.min(1, (state.progress - ringDelay) / (1 - ringDelay)));
    const ringYOffset = yOffset + (i * 30 / squash) * (1 - ringProgress);
    const ringAlpha = globalAlpha * ringProgress;

    if (ringAlpha <= 0) continue;

    const ry = cySquashed + ringYOffset;
    const grad = ctx2d.createRadialGradient(cx, ry, 0, cx, ry, radius);

    // Smooth multi-stop falloff — eliminates banding
    const iA = ring.innerAlpha * ringAlpha;
    const oA = ring.outerAlpha * ringAlpha;
    const mid = (ring.fadeStart + ring.fadeEnd) / 2;

    grad.addColorStop(0, rgba(ring.innerColor, iA));
    grad.addColorStop(ring.fadeStart * 0.5, rgba(mixRgb(ring.innerColor, ring.outerColor, 0.3), iA * 0.9));
    grad.addColorStop(ring.fadeStart, rgba(ring.outerColor, oA));
    grad.addColorStop(mid, rgba(ring.outerColor, oA * 0.45));
    grad.addColorStop(ring.fadeEnd, rgba(ring.outerColor, oA * 0.08));
    grad.addColorStop(Math.min(ring.fadeEnd + 0.08, 0.98), rgba(ring.outerColor, 0));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, w, h / squash);
  }

  ctx2d.restore();

  // Noise dither — breaks up any remaining banding
  applyNoise(ctx2d, w, h, globalAlpha);
}

function tick() {
  if (needsDraw) {
    draw();
    needsDraw = false;
  }
  // Stop looping once fully revealed — nothing left to animate
  if (state.progress >= 1) {
    rafId = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

/** Ensure the rAF loop is running (called by GSAP onUpdate) */
function ensureLoop() {
  needsDraw = true;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/* ── Sizing ── */

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  needsDraw = true;
}

/* ── Public API ── */

export function initFooterHaze() {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-haze]');
  if (!canvas) return;

  ctx2d = canvas.getContext('2d');
  if (!ctx2d) return;

  resize();

  ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  gsapCtx?.revert();
  gsapCtx = gsap.context(() => {
    const footerTrigger = document.querySelector('[data-footer-trigger]');
    if (!footerTrigger) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      // Just show it statically
      state.progress = 1;
      needsDraw = true;
      return;
    }

    gsap.to(state, {
      progress: 1,
      ease: 'none',
      onUpdate: ensureLoop,
      scrollTrigger: {
        trigger: footerTrigger,
        start: 'top 130%',
        end: 'bottom 40%',
        scrub: 1,
      },
    });
  });

  rafId = requestAnimationFrame(tick);
}

export function destroyFooterHaze() {
  cancelAnimationFrame(rafId);
  ro?.disconnect();
  ro = null;
  gsapCtx?.revert();
  gsapCtx = null;
  canvas = null;
  ctx2d = null;
}
