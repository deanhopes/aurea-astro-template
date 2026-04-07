import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

export function initAnimations() {
  ctx?.revert();
  ctx = gsap.context(() => {
    // Page-level animations registered here or via per-page scripts
  });
}

export function cleanupAnimations() {
  ctx?.revert();
  ctx = null;
}
