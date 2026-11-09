"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/stage";

const TRAIL_MS = 150;
const FOLLOW = 0.28;

type Sample = { x: number; y: number; t: number };

export function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLCanvasElement>(null);
  const head = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches || prefersReducedMotion()) return;
    const box = root.current!;
    const canvas = trail.current!;
    const dot = head.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.documentElement.classList.add("has-custom-cursor");
    const ink = getComputedStyle(box).getPropertyValue("--foreground").trim() || "#f0f2f0";
    let dpr = 1;
    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    fit();

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const samples: Sample[] = [];
    let primed = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!primed) {
        primed = true;
        pos.x = target.x;
        pos.y = target.y;
      }
      box.dataset.visible = "true";
    };
    const onOver = (e: PointerEvent) => {
      const interactive = (e.target as Element | null)?.closest?.("a, button, [data-cursor]");
      box.dataset.hover = interactive ? "true" : "false";
    };
    const onLeave = () => { box.dataset.visible = "false"; };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      pos.x += (target.x - pos.x) * FOLLOW;
      pos.y += (target.y - pos.y) * FOLLOW;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

      const last = samples[samples.length - 1];
      if (primed && (!last || Math.hypot(pos.x - last.x, pos.y - last.y) >= 1.5)) {
        samples.push({ x: pos.x, y: pos.y, t: now });
      }
      while (samples.length && now - samples[0].t > TRAIL_MS) samples.shift();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (samples.length < 3) return;

      const left: Array<[number, number]> = [];
      const right: Array<[number, number]> = [];
      samples.forEach((s, i) => {
        const a = samples[Math.max(0, i - 1)];
        const b = samples[Math.min(samples.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        const life = Math.min(1, Math.max(0, 1 - (now - s.t) / TRAIL_MS));
        const half = (1.5 + 7.5 * life) / 2;
        left.push([s.x + nx * half, s.y + ny * half]);
        right.push([s.x - nx * half, s.y - ny * half]);
      });

      const first = samples[0];
      const newest = samples[samples.length - 1];
      const fill = ctx.createLinearGradient(first.x, first.y, newest.x, newest.y);
      fill.addColorStop(0, "rgba(255,255,255,0)");
      fill.addColorStop(1, ink);
      ctx.beginPath();
      [...left, ...right.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.shadowColor = ink;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    window.addEventListener("resize", fit);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <canvas className="cursor__trail" ref={trail} />
      <div className="cursor__head" ref={head} />
    </div>
  );
}
