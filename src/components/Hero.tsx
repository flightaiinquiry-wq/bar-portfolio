"use client";

import { useEffect, useRef } from "react";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";

const STEP = 0.8;

export function Hero() {
  const copy = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const labels = () => copy.current?.querySelectorAll<HTMLElement>(".blur-anim") ?? [];

    if (document.body.dataset.preloading !== "true") {
      const timer = window.setTimeout(() => labels().forEach((el) => el.classList.add("is-visible")), 1000);
      return () => window.clearTimeout(timer);
    }

    const done = new MutationObserver(() => {
      if (document.body.dataset.preloading === "true") return;
      done.disconnect();
      labels().forEach((el, i) => {
        el.style.setProperty("--anim-delay", `${STEP * i - STEP}s`);
        el.classList.add("is-visible");
      });
    });
    done.observe(document.body, { attributes: true, attributeFilter: ["data-preloading"] });
    return () => done.disconnect();
  }, []);

  return (
    <section className="hero">
      <div className="hero__copy" ref={copy}>
        <Reveal as="h1" size={30} anim="blur" stagger={0.015} manual>{site.name}</Reveal>
        <Reveal as="p" size={30} anim="blur" stagger={0.015} manual>{site.role}</Reveal>
      </div>
    </section>
  );
}
