"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { prefersReducedMotion, stage } from "@/lib/stage";

export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ autoRaf: true });
    stage.lenis = lenis;
    if (document.body.dataset.preloading === "true") lenis.stop();
    return () => {
      lenis.destroy();
      stage.lenis = null;
    };
  }, []);
  return null;
}
