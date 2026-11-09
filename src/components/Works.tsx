"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { WarpTile } from "@/components/WarpTile";
import { site, type Project } from "@/content/site";
import { clamp01, isTall, smootherstep, stage } from "@/lib/stage";

const projects = site.projects;
const GAP_VW = 12;

const rate = (tall: boolean) => (tall ? 0.6 : 1);

function layout(count: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const tall = w < h;
  const pad = 0.09 * w + (tall ? 0.9 * h : 0);
  const reveal = 2 * h;
  const tile = tall ? 85 : 50;
  const start = -(w * (count * tile + (count - 1) * GAP_VW)) / 100 - pad;
  const travel = w + pad - start;
  return { reveal, start, travel, height: Math.max(travel / rate(tall) - reveal + h, h) };
}

function Tile({ project, energy }: { project: Project; energy: React.RefObject<number> }) {
  const media = <WarpTile project={project} energy={energy} />;
  return (
    <div className="tile">
      {project.href ? (
        <a className="tile__link" href={project.href} target="_blank" rel="noreferrer">{media}</a>
      ) : (
        <div className="tile__link" data-cursor>{media}</div>
      )}
      <div className="tile__caption">
        <span className="tile__title t-30">{project.title}</span>
        <span className="tile__info t-20">{project.info}</span>
      </div>
    </div>
  );
}

export function Works() {
  const section = useRef<HTMLElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const closing = useRef<HTMLParagraphElement>(null);
  const sceneStage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const energy = useRef(0);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: "200% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const size = () => {
      el.style.height = `${layout(projects.length).height}px`;
      stage.lenis?.resize();
    };
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, []);

  useEffect(() => {
    const el = section.current;
    const stageEl = sceneStage.current;
    if (!el || !stageEl) return;
    let queued = false;
    let wasActive = false;

    const update = () => {
      queued = false;
      const { reveal, start, travel } = layout(projects.length);
      const rect = el.getBoundingClientRect();
      const active = rect.top < reveal && rect.bottom > 0;
      if (active !== wasActive) {
        wasActive = active;
        stageEl.dataset.active = String(active);
      }
      if (!active) {
        if (kicker.current) kicker.current.dataset.active = "false";
        if (closing.current) closing.current.dataset.active = "false";
        stage.closing = rect.top >= reveal ? 0 : stage.closing;
        return;
      }
      const tall = isTall();
      const inView = rect.bottom > 0.6 * window.innerHeight;
      const moved = Math.min(Math.max(reveal - rect.top, 0) * rate(tall), travel);
      if (track.current) track.current.style.transform = `translateX(${start + smootherstep(moved / travel) * travel}px)`;
      const from = tall ? 0.4 : 0.6;
      const close = smootherstep(clamp01((moved / travel - from) / (1 - from)));
      stage.closing = close;
      const closingOn = inView && close > 0.5;
      if (kicker.current) kicker.current.dataset.active = String(inView && !closingOn && !(stage.workOn > 0.15));
      if (closing.current) closing.current.dataset.active = String(closingOn);
    };

    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", update);
      stage.closing = 0;
    };
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let y = window.scrollY;
    let last = performance.now();
    let raf = 0;
    const measure = () => {
      raf = requestAnimationFrame(measure);
      const now = performance.now();
      const dt = now - last;
      if (dt > 0) {
        const target = Math.min(Math.abs(window.scrollY - y) / dt / 3, 1);
        energy.current += (target - energy.current) * 0.1;
      }
      y = window.scrollY;
      last = now;
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [near]);

  return (
    <section ref={section} className="works">
      <div className="works__kicker">
        <p ref={kicker} className="works__kicker-label t-16" data-active="false">{site.worksKicker}</p>
      </div>
      <div className="works__closing-wrap">
        <p ref={closing} className="works__closing t-30" data-active="false">{site.closing}</p>
      </div>
      <div ref={sceneStage} className="works__stage" data-active="false">
        <div className="works__marquee">
          <div ref={track} className="works__track">
            {near && [...projects].reverse().map((p) => <Tile key={p.id} project={p} energy={energy} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
