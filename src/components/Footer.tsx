"use client";

import { useRef, useState } from "react";
import { site } from "@/content/site";

const B = "M14 12h26a18 18 0 0 1 0 38H14zM14 50h30a19 19 0 0 1 0 38H14z";

export function Footer() {
  const [hovered, setHovered] = useState(false);
  const [tip, setTip] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <footer className="footer">
      <div
        className="mono"
        data-hovered={hovered}
        data-cursor
        onMouseEnter={() => {
          setHovered(true);
          clear();
          setTip(true);
          timer.current = window.setTimeout(() => setTip(false), 3000);
        }}
        onMouseLeave={() => {
          setHovered(false);
          clear();
          setTip(false);
        }}
      >
        <span className="mono__tip t-20" data-visible={tip}>{site.greeting}</span>
        <svg viewBox="0 0 136 100" className="mono__mark" aria-hidden="true">
          <path d={B} className="mono__b mono__b--a" />
          <path d={B} className="mono__b mono__b--b" transform="translate(64)" />
        </svg>
        <p className="footer__line t-16">{site.name} - &copy; {site.year}</p>
      </div>
      <p className="footer__line t-16">{site.footerNote}</p>
    </footer>
  );
}
