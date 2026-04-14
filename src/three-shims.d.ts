// Type shims for Three.js WebGPU/TSL subpath exports.
// three@0.183 has no `types` condition in its exports map for these subpaths,
// so TypeScript falls back to the main `three.module.d.ts` which doesn't
// contain WebGPURenderer, MeshBasicNodeMaterial, or the TSL helpers.
//
// @types/three ships the right .d.ts files at deep src paths — re-export
// them here so consuming code can `import * as THREE from 'three/webgpu'`
// and `import { ... } from 'three/tsl'` without losing types.

declare module 'three/webgpu' {
  export * from '@types/three/src/Three.WebGPU.Nodes.js';
}

declare module 'three/tsl' {
  export * from '@types/three/src/Three.TSL.js';
}
