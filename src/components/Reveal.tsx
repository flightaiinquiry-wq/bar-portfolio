"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ElementType } from "react";

type Props = {
  as?: ElementType;
  size?: 16 | 20 | 30 | 85;
  anim: "blur" | "split";
  children: string;
  className?: string;
  muted?: boolean;
  delay?: number;
  stagger?: number;
  /** When set, a parent decides when the text appears. */
  manual?: boolean;
};

const indexed = (i: number) => ({ "--anim-index": i }) as CSSProperties;

export function Reveal({ as = "span", size, anim, children, className, muted, delay, stagger, manual }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || manual) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-visible");
        seen.disconnect();
      },
      { threshold: 0.2 },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, [manual]);

  const words = children.split(" ");
  let n = 0;
  const body = words.flatMap((word, w) => {
    const space = w < words.length - 1 ? " " : null;
    if (anim === "split") {
      return [
        <span className="word-wrapper" key={w}>
          <span className="word" style={indexed(n++)}>{word}</span>
        </span>,
        space,
      ];
    }
    return [
      <span className="blur-word" key={w}>
        {[...word].map((ch, c) => (
          <span className="char" key={c} style={indexed(n++)}>{ch}</span>
        ))}
      </span>,
      space,
    ];
  });

  const classes = [
    size ? `t-${size}` : "",
    muted ? "muted" : "",
    anim === "blur" ? "blur-anim" : "split",
    className ?? "",
  ].filter(Boolean).join(" ");

  const style = {
    ...(delay !== undefined ? { "--anim-delay": `${delay}s` } : {}),
    ...(stagger !== undefined ? { "--anim-stagger": `${stagger}s` } : {}),
  } as CSSProperties;

  return createElement(as, { ref, className: classes, style, "aria-label": children }, body);
}
