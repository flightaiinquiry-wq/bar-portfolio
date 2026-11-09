import type Lenis from "lenis";

/** Per-frame values shared between the DOM sections and the particle scene. */
export const stage = {
  lenis: null as Lenis | null,
  ringMix: 0,
  closing: 0,
  workOn: 0,
  contactFocus: 0,
  contactRect: null as DOMRect | null,
};

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const smootherstep = (t: number) => t * t * t * (t * (6 * t - 15) + 10);
export const isTall = () => window.innerWidth < window.innerHeight;
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
