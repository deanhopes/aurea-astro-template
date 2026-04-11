// Type shims for Three.js WebGPU subpath exports.
// three@0.183 has no `types` field in its exports map for these subpaths.

declare module 'three/webgpu' {
  import * as THREE from 'three';
  export = THREE;
}

// TSL uses named exports — declare each one used in this project as any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

declare module 'three/tsl' {
  export const uniform: AnyFn;
  export const vec2: AnyFn;
  export const vec3: AnyFn;
  export const vec4: AnyFn;
  export const float: AnyFn;
  export const int: AnyFn;
  export const mix: AnyFn;
  export const uv: AnyFn;
  export const color: AnyFn;
  export const Fn: AnyFn;
  export const sin: AnyFn;
  export const cos: AnyFn;
  export const abs: AnyFn;
  export const dot: AnyFn;
  export const floor: AnyFn;
  export const fract: AnyFn;
  export const smoothstep: AnyFn;
  export const clamp: AnyFn;
  export const texture: AnyFn;
  export const select: AnyFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const PI: any;
  export const positionWorld: AnyFn;
  export const normalWorld: AnyFn;
}
