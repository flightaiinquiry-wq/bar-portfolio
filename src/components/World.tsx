"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";

export function World() {
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => setSize(el.clientWidth);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  const c = size / 2;
  const r = size * 0.46;

  return (
    <section className="world">
      <svg ref={svg} className="world__ring" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {size > 0 && (
          <>
            <defs>
              <path id="ring-top" d={`M ${c - r},${c} A ${r},${r} 0 0 1 ${c + r},${c}`} />
              <path id="ring-bottom" d={`M ${c + r},${c} A ${r},${r} 0 0 1 ${c - r},${c}`} />
            </defs>
            <text className="world__text" textAnchor="middle">
              <textPath href="#ring-top" startOffset="50%">{site.ringTop}</textPath>
            </text>
            <text className="world__text" textAnchor="middle">
              <textPath href="#ring-bottom" startOffset="50%">{site.ringBottom}</textPath>
            </text>
          </>
        )}
      </svg>
    </section>
  );
}
