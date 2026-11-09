"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { paintCover } from "@/components/covers";
import type { Project } from "@/content/site";

const ASPECT = 16 / 9;
const MARGIN = 1.2;
const WARP_MAX = 0.06;
const HOVER_WARP = 0.02;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const settle = (a: number, b: number, t: number) => {
  const v = lerp(a, b, t);
  return Math.abs(v - b) < 5e-4 ? b : v;
};

function coverFit(tex: THREE.Texture, w: number, h: number) {
  const ratio = w / h;
  if (ratio > ASPECT) {
    const k = ASPECT / ratio;
    tex.repeat.set(k, 1);
    tex.offset.set((1 - k) / 2, 0);
  } else {
    const k = ratio / ASPECT;
    tex.repeat.set(1, k);
    tex.offset.set(0, (1 - k) / 2);
  }
}

async function loadTexture(project: Project) {
  const src = project.media;
  if (src && /\.(mp4|webm)$/i.test(src)) {
    const video = document.createElement("video");
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: "auto", src });
    await new Promise((r) => video.addEventListener("loadeddata", r, { once: true }));
    const tex = new THREE.VideoTexture(video);
    coverFit(tex, video.videoWidth, video.videoHeight);
    return { tex, video };
  }
  if (src) {
    const tex = await new THREE.TextureLoader().loadAsync(src);
    const img = tex.image as HTMLImageElement;
    coverFit(tex, img.width, img.height);
    return { tex, video: null };
  }
  const canvas = await paintCover(project.id);
  return { tex: new THREE.CanvasTexture(canvas), video: null };
}

type Props = { project: Project; energy: RefObject<number> };

export function WarpTile({ project, energy }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const pointer = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = () => { pointer.current = 1; };
    const off = () => { pointer.current = 0; };
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    return () => {
      el.removeEventListener("pointerenter", on);
      el.removeEventListener("pointerleave", off);
    };
  }, []);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false;
    let teardown = () => {};

    const start = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera((-ASPECT / 2) * MARGIN, (ASPECT / 2) * MARGIN, 0.5 * MARGIN, -0.5 * MARGIN, 0.1, 10);
      camera.position.z = 1;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      const geometry = new THREE.PlaneGeometry(ASPECT, 1, 32, 18);
      const rest = (geometry.attributes.position.array as Float32Array).slice();
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      let onScreen = true;
      let video: HTMLVideoElement | null = null;
      let texture: THREE.Texture | null = null;

      loadTexture(project).then((loaded) => {
        if (disposed) return loaded.tex.dispose();
        texture = loaded.tex;
        video = loaded.video;
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.opacity = 1;
        material.needsUpdate = true;
        if (glow.current) glow.current.style.opacity = "1";
        if (onScreen) video?.play().catch(() => {});
      });

      const fit = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (w && h) renderer.setSize(w, h, false);
      };
      fit();
      const sizer = new ResizeObserver(fit);
      sizer.observe(host);

      let e = 0;
      let h = 0;
      let raf = 0;
      const t0 = performance.now();
      const draw = () => {
        raf = requestAnimationFrame(draw);
        if (!onScreen) return;
        const time = (performance.now() - t0) / 1000;
        e = settle(e, energy.current ?? 0, 0.08);
        h = settle(h, pointer.current, 0.05);
        const amp = lerp(0, WARP_MAX, e) + HOVER_WARP * h;
        mesh.scale.setScalar(1 + 0.025 * e);
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = rest[i * 3];
          const y = rest[i * 3 + 1];
          const u = x / ASPECT;
          const v = y;
          const edge = Math.max(0, (Math.min(Math.hypot(u, v) / Math.SQRT1_2, 1) - 0.15) / 0.85);
          pos.setXY(
            i,
            x + edge * amp * Math.sin(3.2 * v * Math.PI + 0.6 * time),
            y + edge * amp * Math.sin(3.2 * u * Math.PI + 0.78 * time + 1.7),
          );
        }
        pos.needsUpdate = true;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(draw);

      const visibility = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) video?.play().catch(() => {});
        else video?.pause();
      }, { rootMargin: "50% 0px" });
      visibility.observe(host);

      teardown = () => {
        cancelAnimationFrame(raf);
        sizer.disconnect();
        visibility.disconnect();
        texture?.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        host.replaceChildren();
      };
    };

    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      start();
    }, { rootMargin: "50% 0px" });
    near.observe(host);

    return () => {
      disposed = true;
      near.disconnect();
      teardown();
    };
  }, [project, energy]);

  return (
    <div ref={root} className="tile__media">
      <div ref={glow} className="tile__glow" aria-hidden="true" />
      <div ref={mount} className="tile__gl" />
    </div>
  );
}
