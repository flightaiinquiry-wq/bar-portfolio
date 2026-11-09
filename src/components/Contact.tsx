"use client";

import { useEffect, useRef, useState } from "react";
import { Dust, type DustHandle } from "@/components/Dust";
import { Reveal } from "@/components/Reveal";
import { site } from "@/content/site";
import { clamp01, smootherstep, stage } from "@/lib/stage";

export function Contact() {
  const shell = useRef<HTMLAnchorElement>(null);
  const emailDust = useRef<DustHandle>(null);
  const linkedinDust = useRef<DustHandle>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        seen.disconnect();
      }
    }, { threshold: 0.2 });
    seen.observe(el);

    let raf = 0;
    const track = () => {
      raf = requestAnimationFrame(track);
      const rect = el.getBoundingClientRect();
      const half = window.innerHeight / 2;
      stage.contactFocus = smootherstep(clamp01(1 - Math.abs(rect.top + rect.height / 2 - half) / half));
      stage.contactRect = rect;
    };
    raf = requestAnimationFrame(track);

    return () => {
      seen.disconnect();
      cancelAnimationFrame(raf);
      stage.contactFocus = 0;
      stage.contactRect = null;
    };
  }, []);

  return (
    <section className="contact">
      <div className="contact__copy">
        <Reveal as="p" size={16} anim="blur" muted className="contact__kicker" delay={0.15}>
          {site.contactKicker}
        </Reveal>
        <a
          ref={shell}
          href={`mailto:${site.email}`}
          className="contact__email-shell"
          data-entered={entered}
          onMouseEnter={() => emailDust.current?.run()}
        >
          <Dust ref={emailDust} duration={800} density={20} textClassName="contact__email t-85">
            {site.email}
          </Dust>
        </a>
        <p className="t-20 muted">
          or reach out on{" "}
          <a href={site.linkedin} target="_blank" rel="noreferrer" onMouseEnter={() => linkedinDust.current?.run()}>
            <Dust ref={linkedinDust} className="contact__linkedin-dust" textClassName="contact__linkedin">
              LinkedIn
            </Dust>
          </a>
        </p>
      </div>
    </section>
  );
}
