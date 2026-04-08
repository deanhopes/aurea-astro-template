/**
 * Footer shadow silhouettes — WebGL video texture with luminance threshold shader.
 * Scroll-driven: shadows fade in and "grow longer" as footer reveals.
 *
 * Composites over the Canvas2D haze via a separate canvas with mix-blend-mode: multiply.
 * Video texture upload capped at ~15fps for performance.
 * Graceful fallback: silently skipped if WebGL unavailable or video fails to load.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Shader sources ── */

const VERT_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uVideo;
uniform vec3 uLightColor;
uniform vec3 uShadowColor;
uniform float uThreshold;
uniform float uSoftness;
uniform float uProgress;

void main() {
  // Flip Y — video texture is top-down, GL is bottom-up
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 texel = texture2D(uVideo, uv);

  // Luminance (Rec. 709)
  float luma = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));

  // Soft threshold — dark areas become shadow
  float shadow = 1.0 - smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, luma);

  // Map to palette
  vec3 color = mix(uLightColor, uShadowColor, shadow);

  // Alpha: shadow areas more opaque, light areas nearly transparent
  float alpha = mix(0.05, 0.22, shadow) * uProgress;

  gl_FragColor = vec4(color, alpha);
}
`;

/* ── Palette (matching footer-haze tones) ── */

const LIGHT_COLOR: [number, number, number] = [0.941, 0.769, 0.659];  // #f0c4a8
const SHADOW_COLOR: [number, number, number] = [0.545, 0.380, 0.302]; // warm muted brown
const SOFTNESS = 0.15;

/* ── State ── */

let canvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let videoEl: HTMLVideoElement | null = null;
let videoTexture: WebGLTexture | null = null;
let gsapCtx: gsap.Context | null = null;
let ro: ResizeObserver | null = null;
let ioObserver: IntersectionObserver | null = null;
let rafId = 0;
let videoReady = false;
let lastVideoUpdate = 0;

const state = { progress: 0 };

/* Uniform locations (cached after link) */
let uVideoLoc: WebGLUniformLocation | null = null;
let uLightColorLoc: WebGLUniformLocation | null = null;
let uShadowColorLoc: WebGLUniformLocation | null = null;
let uThresholdLoc: WebGLUniformLocation | null = null;
let uSoftnessLoc: WebGLUniformLocation | null = null;
let uProgressLoc: WebGLUniformLocation | null = null;

/* ── WebGL helpers ── */

function compileShader(type: number, src: string): WebGLShader | null {
  if (!gl) return null;
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('FooterShadows: shader compile failed', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initWebGL(): boolean {
  if (!canvas) return false;

  gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return false;

  /* Compile & link */
  const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC);
  const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vert || !frag) return false;

  program = gl.createProgram();
  if (!program) return false;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('FooterShadows: program link failed', gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);

  /* Fullscreen quad: two triangles as triangle strip */
  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  /* Video texture — empty until video loads */
  videoTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Init with 1x1 transparent pixel so draws don't error before video loads
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

  /* Cache uniform locations */
  uVideoLoc = gl.getUniformLocation(program, 'uVideo');
  uLightColorLoc = gl.getUniformLocation(program, 'uLightColor');
  uShadowColorLoc = gl.getUniformLocation(program, 'uShadowColor');
  uThresholdLoc = gl.getUniformLocation(program, 'uThreshold');
  uSoftnessLoc = gl.getUniformLocation(program, 'uSoftness');
  uProgressLoc = gl.getUniformLocation(program, 'uProgress');

  /* Set static uniforms */
  gl.uniform1i(uVideoLoc, 0); // texture unit 0
  gl.uniform3fv(uLightColorLoc, LIGHT_COLOR);
  gl.uniform3fv(uShadowColorLoc, SHADOW_COLOR);
  gl.uniform1f(uSoftnessLoc, SOFTNESS);

  /* Blending for transparent output */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* Clean up shader objects (program retains them) */
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  return true;
}

/* ── Video loading ── */

function initVideo(): void {
  videoEl = document.querySelector<HTMLVideoElement>('[data-footer-shadows-video]');
  if (!videoEl) return;

  const footer = document.querySelector('[data-footer]');
  if (!footer) return;

  /* Lazy-load: only fetch video when footer approaches viewport */
  ioObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        videoEl!.load();
        videoEl!.play().catch(() => {
          // Autoplay blocked — grab first frame as static fallback
          videoEl!.currentTime = 0;
          videoReady = true;
          ensureLoop();
        });
        ioObserver!.disconnect();
        ioObserver = null;
      }
    },
    { rootMargin: '200px 0px' },
  );
  ioObserver.observe(footer);

  videoEl.addEventListener('playing', () => {
    videoReady = true;
    ensureLoop();
  });
  videoEl.addEventListener('canplay', () => {
    videoReady = true;
    ensureLoop();
  });
}

/* ── Render loop ── */

const VIDEO_UPDATE_INTERVAL = 1000 / 15; // ~15fps texture upload

function render(): void {
  if (!gl || !canvas || !program) return;

  /* Upload video texture at reduced rate */
  if (videoReady && videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
    const now = performance.now();
    if (now - lastVideoUpdate > VIDEO_UPDATE_INTERVAL) {
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl);
      lastVideoUpdate = now;
    }
  }

  /* Dynamic uniforms */
  const threshold = 0.55 - state.progress * 0.2; // shadows grow as sun sets
  gl.uniform1f(uThresholdLoc, threshold);
  gl.uniform1f(uProgressLoc, state.progress);

  /* Draw */
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function tick(): void {
  render();

  // Stop looping when nothing to show
  if (state.progress <= 0 && !videoReady) {
    rafId = 0;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/* ── Sizing ── */

function resize(): void {
  if (!canvas || !gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
}

/* ── Public API ── */

export function initFooterShadows(): void {
  canvas = document.querySelector<HTMLCanvasElement>('[data-footer-shadows]');
  if (!canvas) return;

  if (!initWebGL()) return;

  resize();

  ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  initVideo();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsapCtx?.revert();
  gsapCtx = gsap.context(() => {
    const footerTrigger = document.querySelector('[data-footer-trigger]');
    if (!footerTrigger) return;

    if (prefersReduced) {
      state.progress = 1;
      if (videoEl) videoEl.pause();
      ensureLoop();
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
}

export function destroyFooterShadows(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;

  ioObserver?.disconnect();
  ioObserver = null;

  ro?.disconnect();
  ro = null;

  gsapCtx?.revert();
  gsapCtx = null;

  /* WebGL cleanup */
  if (gl) {
    if (videoTexture) gl.deleteTexture(videoTexture);
    if (program) gl.deleteProgram(program);
    const ext = gl.getExtension('WEBGL_lose_context');
    ext?.loseContext();
  }

  /* Release video resources */
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  }

  gl = null;
  program = null;
  canvas = null;
  videoEl = null;
  videoTexture = null;
  videoReady = false;
  lastVideoUpdate = 0;
  state.progress = 0;
}
