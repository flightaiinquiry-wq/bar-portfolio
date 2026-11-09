"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { prefersReducedMotion, stage } from "@/lib/stage";

const SEEN_KEY = "preloader-seen";
const COUNT_DELAY = 3500;
const COUNT_MS = 2000;
const RING_OUT_MS = 2000;
const BLOCKED_KEYS = new Set([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function animate(ms: number, step: (t: number) => void, alive: () => boolean) {
  return new Promise<void>((done) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (!alive()) return done();
      const t = Math.min((now - start) / ms, 1);
      step(t);
      if (t < 1) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });
}

function lockScroll() {
  const stop = (e: Event) => e.cancelable && e.preventDefault();
  const stopKey = (e: KeyboardEvent) => BLOCKED_KEYS.has(e.key) && stop(e);
  const pin = () => window.scrollY !== 0 && window.scrollTo(0, 0);
  const opts = { passive: false };
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchmove", stop, opts);
  window.addEventListener("keydown", stopKey, opts);
  window.addEventListener("scroll", pin);
  return () => {
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
    window.removeEventListener("keydown", stopKey);
    window.removeEventListener("scroll", pin);
  };
}

export function Preloader() {
  const [showing, setShowing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen || prefersReducedMotion()) {
      document.body.dataset.preloading = "false";
      stage.lenis?.start();
      return;
    }
    setShowing(true);
    stage.ringMix = 1;
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!showing) return;
    let live = true;
    const alive = () => live;
    const unlock = lockScroll();

    (async () => {
      await wait(3000);
      if (!live) return;
      setEntered(true);
      await wait(COUNT_DELAY - 3000);
      await animate(COUNT_MS, (t) => setCount(Math.round(t * t * t * 100)), alive);
      await wait(500);
      if (!live) return;
      setEntered(false);
      await wait(400);
      if (!live) return;
      await animate(RING_OUT_MS, (t) => { stage.ringMix = 1 - easeInOutCubic(t); }, alive);
      if (!live) return;
      stage.ringMix = 0;
      document.body.dataset.preloading = "false";
      unlock();
      stage.lenis?.resize();
      stage.lenis?.start();
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      setDismissing(true);
      await wait(700);
      if (live) setShowing(false);
    })();

    return () => {
      live = false;
      unlock();
    };
  }, [showing]);

  if (!showing) return null;
  return (
    <div className="preloader" data-dismissing={dismissing}>
      <span className="preloader__count t-20" data-entered={entered}>{count}%</span>
    </div>
  );
}
