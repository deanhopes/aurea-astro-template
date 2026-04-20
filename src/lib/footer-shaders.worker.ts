/**
 * Footer shaders Web Worker — owns the WebGPU renderer + render loop.
 * Receives OffscreenCanvas from main thread, builds the TSL scene,
 * and accepts uniform updates via postMessage.
 */

import * as THREE from 'three/webgpu';

import {
  buildScene,
  uProgress,
  uSunX,
  uSunY,
  uQuality,
  uCausticScale,
  uCausticSpeed,
  uCausticSharpness,
  uCausticHeight,
  uShadowThreshold,
  uShadowSoftness,
  uShadowAlpha,
  uRefraction,
  uWordmarkOpacity,
  uWordmarkScale,
  uWordmarkX,
  uWordmarkY,
} from './footer-shaders-scene';
import type { FooterScene } from './footer-shaders-scene';

export type InboundMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'progress'; value: number }
  | { type: 'mouse'; x: number; y: number }
  | { type: 'videoFrame'; bitmap: ImageBitmap }
  | { type: 'wordmarkBitmap'; bitmap: ImageBitmap }
  | { type: 'uniform'; name: string; value: number }
  | { type: 'visibility'; visible: boolean }
  | { type: 'quality'; value: number }
  | { type: 'destroy' };

let fs: FooterScene | null = null;
let rafId = 0;
let videoTex: THREE.Texture | null = null;
let prevBitmap: ImageBitmap | null = null;
let visible = false;
let dirty = false;

function tick(): void {
  if (!fs) return;
  if (!visible && !dirty) {
    rafId = 0;
    return;
  }
  dirty = false;
  fs.renderer.render(fs.scene, fs.camera);
  rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
  dirty = true;
  if (!rafId && fs) rafId = requestAnimationFrame(tick);
}

function stopLoop(): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  dirty = false;
}

self.onmessage = async (e: MessageEvent<InboundMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      fs = await buildScene(msg.canvas);
      if (!fs) {
        self.postMessage({ type: 'error', message: 'WebGPU init failed' });
        return;
      }
      fs.renderer.setPixelRatio(1);
      fs.renderer.setSize(msg.width, msg.height, false);
      ensureLoop();
      self.postMessage({ type: 'ready' });
      break;
    }

    case 'resize': {
      if (!fs) return;
      fs.renderer.setPixelRatio(1);
      fs.renderer.setSize(msg.width, msg.height, false);
      break;
    }

    case 'progress': {
      uProgress.value = msg.value;
      ensureLoop();
      break;
    }

    case 'mouse': {
      uSunX.value = msg.x;
      uSunY.value = msg.y;
      ensureLoop();
      break;
    }

    case 'videoFrame': {
      if (!fs) {
        msg.bitmap.close();
        return;
      }

      if (!videoTex) {
        videoTex = new THREE.Texture(msg.bitmap as unknown as HTMLImageElement);
        videoTex.minFilter = THREE.LinearFilter;
        videoTex.magFilter = THREE.LinearFilter;
        videoTex.format = THREE.RGBAFormat;
        videoTex.colorSpace = THREE.SRGBColorSpace;
        fs.videoTexNode.value = videoTex;
      } else {
        videoTex.image = msg.bitmap as unknown as HTMLImageElement;
      }
      videoTex.needsUpdate = true;

      if (prevBitmap) prevBitmap.close();
      prevBitmap = msg.bitmap;

      ensureLoop();
      break;
    }

    case 'wordmarkBitmap': {
      if (!fs) {
        msg.bitmap.close();
        return;
      }
      const wmTex = new THREE.Texture(msg.bitmap as unknown as HTMLImageElement);
      wmTex.minFilter = THREE.LinearFilter;
      wmTex.magFilter = THREE.LinearFilter;
      wmTex.format = THREE.RGBAFormat;
      wmTex.needsUpdate = true;
      fs.wordmarkTexNode.value = wmTex;
      ensureLoop();
      break;
    }

    case 'uniform': {
      const uniforms: Record<string, { value: number }> = {
        uCausticScale,
        uCausticSpeed,
        uCausticSharpness,
        uCausticHeight,
        uShadowThreshold,
        uShadowSoftness,
        uShadowAlpha,
        uRefraction,
        uWordmarkOpacity,
        uWordmarkScale,
        uWordmarkX,
        uWordmarkY,
      };
      const u = uniforms[msg.name];
      if (u) {
        u.value = msg.value;
        ensureLoop();
      }
      break;
    }

    case 'visibility': {
      visible = msg.visible;
      if (visible) ensureLoop();
      break;
    }

    case 'quality': {
      uQuality.value = msg.value;
      ensureLoop();
      break;
    }

    case 'destroy': {
      stopLoop();
      if (prevBitmap) {
        prevBitmap.close();
        prevBitmap = null;
      }
      videoTex?.dispose();
      videoTex = null;
      if (fs) {
        fs.renderer.dispose();
        fs.material.dispose();
        fs = null;
      }
      break;
    }
  }
};
