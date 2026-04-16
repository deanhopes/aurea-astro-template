/**
 * Footer shaders — pure Three.js / TSL scene builder.
 *
 * Extracted so the same shader graph can be used on the main thread (fallback)
 * or inside a Web Worker with OffscreenCanvas. No DOM access — only
 * canvas-like surfaces and Three.js primitives.
 */

import * as THREE from 'three/webgpu';
import {
  uniform,
  vec2,
  vec3,
  vec4,
  float,
  mix,
  uv,
  color,
  Fn,
  sin,
  max,
  dot,
  floor,
  fract,
  normalize,
  smoothstep,
  clamp,
  texture,
  time,
} from 'three/tsl';

type Vec2Node = ReturnType<typeof vec2>;

// ── Uniforms ──────────────────────────────────────────────────────────
export const uProgress = uniform(0);
export const uSunX = uniform(0.34);
export const uSunY = uniform(0.5);

export const uCausticScale = uniform(2.3);
export const uCausticSpeed = uniform(0.08);
export const uCausticSharpness = uniform(2.5);
export const uCausticHeight = uniform(2.0);

export const uShadowThreshold = uniform(1.0);
export const uShadowSoftness = uniform(0.5);
export const uShadowAlpha = uniform(0.46);

export const uRefraction = uniform(0.008);

// Wordmark
export const uWordmarkOpacity = uniform(1.0);
export const uWordmarkScale = uniform(1.13);
export const uWordmarkX = uniform(0.02);
export const uWordmarkY = uniform(0.05);

// ── TSL node graph ────────────────────────────────────────────────────

let videoTexNode: ReturnType<typeof texture> | null = null;
let wordmarkTexNode: ReturnType<typeof texture> | null = null;

const gradientFn = Fn(([sampleUV]: [Vec2Node]) => {
  const cDeep = color(0xc94020);
  const cOrange = color(0xef5d2a);
  const cCoral = color(0xf0a080);
  const cPeach = color(0xf0c4a8);
  const cParchment = color(0xf9efe6);

  const safeProgress = clamp(uProgress, float(0.001), float(1.0));
  const ripple = sin(sampleUV.x.mul(6.0).add(time.mul(0.3))).mul(0.03);
  const t = clamp(sampleUV.y.div(safeProgress).add(ripple), float(0.0), float(1.0));

  const c01 = mix(cDeep, cOrange, smoothstep(float(0.0), float(0.45), t));
  const c12 = mix(c01, cCoral, smoothstep(float(0.2), float(0.65), t));
  const c23 = mix(c12, cPeach, smoothstep(float(0.45), float(0.85), t));
  return mix(c23, cParchment, smoothstep(float(0.65), float(1.0), t));
});

const hash2 = Fn(([p]: [Vec2Node]) => {
  return fract(sin(p.x.mul(127.1).add(p.y.mul(311.7))).mul(43758.5453));
});

const valueNoise = Fn(([p]: [Vec2Node]) => {
  const i = floor(p);
  const f = fract(p);
  const u = f
    .mul(f)
    .mul(f)
    .mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0));
  const a = hash2(i);
  const b = hash2(i.add(vec2(1.0, 0.0)));
  const c = hash2(i.add(vec2(0.0, 1.0)));
  const d = hash2(i.add(vec2(1.0, 1.0)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

const fbm = Fn(([p]: [Vec2Node]) => {
  const n1 = valueNoise(p);
  const n2 = valueNoise(p.mul(2.0)).mul(0.5);
  const n3 = valueNoise(p.mul(4.0)).mul(0.25);
  return n1.add(n2).add(n3).mul(0.571);
});

const causticHeightFn = Fn(([sampleUV]: [Vec2Node]) => {
  const t = time.mul(uCausticSpeed);
  const p = sampleUV.mul(uCausticScale);
  const warpX = fbm(p.add(vec2(t, float(0.0))));
  const warpY = fbm(p.add(vec2(float(0.0), t.mul(0.8))));
  const warped = p.add(vec2(warpX, warpY).mul(1.5)).add(vec2(t.mul(0.3), t.mul(-0.2)));
  return fbm(warped);
});

const shadowMaskFn = Fn(([sampleUV]: [Vec2Node]) => {
  const flipped = vec2(sampleUV.x, float(1.0).sub(sampleUV.y));
  const videoRgb = texture(videoTexNode!, flipped).rgb;
  const luma = dot(videoRgb, vec3(0.2126, 0.7152, 0.0722));
  return smoothstep(
    uShadowThreshold.sub(uShadowSoftness),
    uShadowThreshold.add(uShadowSoftness),
    float(1.0).sub(luma),
  );
});

const wordmarkFn = Fn(([sampleUV]: [Vec2Node]) => {
  // Scale from center, offset Y
  const centered = sampleUV.sub(vec2(0.5, 0.5));
  const scaled = centered.div(uWordmarkScale).add(vec2(0.5, 0.5)).sub(vec2(uWordmarkX, uWordmarkY));
  const alpha = texture(wordmarkTexNode!, scaled).r;
  // Clamp to 0 outside [0,1] to avoid texture repeat
  const inBounds = smoothstep(float(0.0), float(0.002), scaled.x)
    .mul(smoothstep(float(0.0), float(0.002), scaled.y))
    .mul(smoothstep(float(0.0), float(0.002), float(1.0).sub(scaled.x)))
    .mul(smoothstep(float(0.0), float(0.002), float(1.0).sub(scaled.y)));
  return alpha.mul(inBounds);
});

// ── Scene builder ─────────────────────────────────────────────────────

export interface FooterScene {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  material: THREE.MeshBasicNodeMaterial;
  videoTexNode: ReturnType<typeof texture>;
  wordmarkTexNode: ReturnType<typeof texture>;
}

export async function buildScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<FooterScene | null> {
  const renderer = new THREE.WebGPURenderer({
    canvas: canvas as HTMLCanvasElement,
    alpha: true,
    antialias: false,
  });

  try {
    await renderer.init();
  } catch {
    console.warn('FooterShaders: WebGPU init failed');
    return null;
  }

  const dpr = Math.min(
    typeof self !== 'undefined' && 'devicePixelRatio' in self
      ? (self as unknown as { devicePixelRatio: number }).devicePixelRatio
      : 1,
    2,
  );
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // 1x1 placeholders — works in both main thread and worker (no DOM needed)
  const data = new Uint8Array([255, 255, 255, 255]);
  const placeholderTex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  placeholderTex.needsUpdate = true;

  const wmData = new Uint8Array([0, 0, 0, 255]);
  const wmPlaceholder = new THREE.DataTexture(wmData, 1, 1, THREE.RGBAFormat);
  wmPlaceholder.needsUpdate = true;

  videoTexNode = texture(placeholderTex);
  wordmarkTexNode = texture(wmPlaceholder);

  const geo = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.MeshBasicNodeMaterial();

  const shadowTint = color(0x5a2818);
  const causticTint = color(0xfff4d8);

  const finalColorFn = Fn(() => {
    const baseUV = uv();
    const eps = float(0.008);

    const hL = causticHeightFn(baseUV.sub(vec2(eps, float(0.0))));
    const hR = causticHeightFn(baseUV.add(vec2(eps, float(0.0))));
    const hD = causticHeightFn(baseUV.sub(vec2(float(0.0), eps)));
    const hU = causticHeightFn(baseUV.add(vec2(float(0.0), eps)));

    const dhdx = hR.sub(hL).mul(uCausticHeight);
    const dhdy = hU.sub(hD).mul(uCausticHeight);

    const n = normalize(vec3(dhdx.negate(), dhdy.negate(), float(0.04)));

    const slopeSq = dhdx.mul(dhdx).add(dhdy.mul(dhdy));
    const causticBright = clamp(slopeSq.mul(8.0), float(0.0), float(1.0)).pow(uCausticSharpness);

    const refractOffset = n.xy.mul(uRefraction);
    const refractedUV = baseUV.add(refractOffset);

    const grad = gradientFn(refractedUV);
    const shadow = shadowMaskFn(refractedUV);

    const sunDir = normalize(vec3(uSunX.mul(2.0).sub(1.0), uSunY.mul(0.3).add(0.35), float(0.7)));

    const nDotL = max(dot(n, sunDir), float(0.0));
    const diffuse = nDotL.mul(0.5).add(0.75);

    const causticGlow = causticTint.mul(causticBright).mul(0.55);
    const lit = grad.mul(diffuse).add(causticGlow);

    const shaded = mix(lit, shadowTint, shadow.mul(uShadowAlpha));
    const flatGrad = gradientFn(baseUV);
    const scene = mix(flatGrad, shaded, clamp(uProgress.mul(1.2), float(0.0), float(1.0)));

    // Wordmark: sampled through refracted UVs → swims with the water
    const wmAlpha = wordmarkFn(refractedUV);
    const wmColor = color(0x323032);
    const wmLit = wmColor.mul(diffuse);
    return mix(scene, wmLit, wmAlpha.mul(uWordmarkOpacity));
  });

  material.colorNode = vec4(finalColorFn(), float(1.0));
  material.transparent = false;

  const quad = new THREE.Mesh(geo, material);
  scene.add(quad);

  return { renderer, scene, camera, material, videoTexNode, wordmarkTexNode };
}
