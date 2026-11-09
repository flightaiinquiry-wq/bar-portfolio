"use client";

import { useImperativeHandle, useRef, type ReactNode, type Ref } from "react";

export type DustHandle = { run: () => void };

type Props = {
  children: ReactNode;
  ref?: Ref<DustHandle>;
  direction?: "left" | "right";
  duration?: number;
  density?: number;
  className?: string;
  textClassName?: string;
};

type Mote = { x0: number; y0: number; x: number; y: number; angle: number; age: number; life: number; v: number; r: number };

const PAD = 60;
const COOLDOWN = 1000;
const WOBBLE = 50;

/** Wipes its text away behind a sweep of particles, then fades the text back in. */
export function Dust({ children, ref, direction = "left", duration = 500, density = 3, className, textClassName }: Props) {
  const mask = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const running = useRef(false);
  const finishedAt = useRef(0);

  const slide = (percent: number) => {
    const offset = direction === "left" ? percent : -percent;
    if (!mask.current || !text.current) return;
    mask.current.style.transform = percent === 0 ? "none" : `translateX(${offset}%)`;
    text.current.style.transform = percent === 0 ? "none" : `translateX(${-offset}%)`;
  };

  useImperativeHandle(ref, () => ({
    run() {
      if (running.current || Date.now() - finishedAt.current < COOLDOWN) return;
      const box = mask.current;
      const cv = canvas.current;
      const ctx = cv?.getContext("2d");
      if (!box || !cv || !ctx) return;

      running.current = true;
      const rect = box.getBoundingClientRect();
      cv.width = rect.width + PAD * 2;
      cv.height = rect.height + PAD * 2;
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();

      const motes: Mote[] = [];
      const lifeFrames = (duration * 60) / 1000;
      const start = performance.now();
      let swept = 0;
      let restored = false;

      const frame = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const percent = eased * 101;
        if (!restored) slide(percent);

        if (t < 1) {
          const progress = percent / 100;
          const delta = progress - swept;
          swept = progress;
          const front = rect.width * progress + delta * 100;
          const x = PAD + (direction === "left" ? front : rect.width - front);
          for (let n = Math.floor(density * (delta * 100 + 1)); n > 0; n--) {
            motes.push({
              x0: x,
              y0: PAD + rect.height * Math.random(),
              x: 0,
              y: 0,
              angle: ((Math.random() * 360 - 180) * Math.PI) / 180,
              age: 0,
              life: lifeFrames - 20 + Math.random() * 40,
              v: Math.random() * 4 - 2,
              r: Math.floor(Math.random() * 3) + 1,
            });
          }
        }

        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = ink;
        for (let i = motes.length - 1; i >= 0; i--) {
          const m = motes[i];
          if (m.age > m.life) {
            motes.splice(i, 1);
            continue;
          }
          m.x += m.v;
          m.y = WOBBLE * Math.sin((m.age * 2 * Math.PI) / 100);
          m.age++;
          ctx.save();
          ctx.translate(m.x0, m.y0);
          ctx.rotate(m.angle);
          ctx.globalAlpha = Math.max(1 - m.age / m.life, 0);
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (t >= 1 && !restored) {
          restored = true;
          box.style.transition = "none";
          slide(0);
          box.style.opacity = "0";
          box.style.filter = "blur(10px)";
          void box.offsetWidth;
          box.style.transition = "";
          box.style.opacity = "1";
          box.style.filter = "blur(0px)";
          window.setTimeout(() => { finishedAt.current = Date.now(); }, 400);
        }

        if (t < 1 || motes.length > 0) requestAnimationFrame(frame);
        else running.current = false;
      };
      requestAnimationFrame(frame);
    },
  }));

  return (
    <span className={["dust", className].filter(Boolean).join(" ")}>
      <span className="dust__mask" ref={mask}>
        <span className={["dust__text", textClassName].filter(Boolean).join(" ")} ref={text}>{children}</span>
      </span>
      <canvas className="dust__canvas" ref={canvas} aria-hidden="true" />
    </span>
  );
}
