import { Contact } from "@/components/Contact";
import { Cursor } from "@/components/Cursor";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ParticleScene } from "@/components/ParticleScene";
import { Preloader } from "@/components/Preloader";
import { Reveal } from "@/components/Reveal";
import { SmoothScroll } from "@/components/SmoothScroll";
import { World } from "@/components/World";
import { Works } from "@/components/Works";
import { site } from "@/content/site";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <div className="noise" aria-hidden="true" />
      <ParticleScene />
      <main className="content">
        <Hero />
        <section className="statement">
          <div className="statement__copy">
            <Reveal as="p" size={30} anim="split" delay={0.15} stagger={0.015}>
              {site.statement}
            </Reveal>
          </div>
        </section>
        <World />
        <section className="place">
          <p className="place__label t-30">{site.location}</p>
        </section>
        <section className="approach">
          <div className="approach__content">
            <Reveal as="p" size={30} anim="split" delay={0.15} stagger={0.015} className="approach__line">
              {site.approach}
            </Reveal>
          </div>
        </section>
        <Works />
        <div className="contacts-wrap">
          <Contact />
          <Footer />
        </div>
      </main>
      <Preloader />
      <Cursor />
    </>
  );
}
