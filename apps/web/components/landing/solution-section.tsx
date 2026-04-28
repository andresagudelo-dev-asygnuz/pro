"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SolutionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".solution-title", {
        scrollTrigger: {
          trigger: ".solution-title",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.from(".solution-card", {
        scrollTrigger: {
          trigger: ".solution-grid",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const solutions = [
    {
      num: "1",
      title: "Plataforma Centralizada",
      desc: "Todo lo que necesitas para tu equipo en un solo lugar.",
    },
    {
      num: "2",
      title: "Estadísticas en Vivo",
      desc: "Captura cada gol, asistencia y victoria en tiempo real.",
    },
    {
      num: "3",
      title: "Comunidad PRO",
      desc: "Conecta con otros apasionados y descubre nuevos retos.",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-32 overflow-hidden"
    >
      <Image
        src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop"
        alt="Background"
        fill
        className="object-cover"
        sizes="100vw"
        quality={80}
      />
      <div className="absolute inset-0 bg-black/80 z-10" />

      <div className="container px-4 mx-auto relative z-20 text-white">
        <div className="max-w-3xl mx-auto text-center mb-20 solution-title">
          <h2 className="text-3xl md:text-6xl font-bold mb-6">
            La Solución que Necesitas
          </h2>
          <p className="text-xl text-zinc-300">
            Hemos diseñado PRO para que tú solo te preocupes por jugar.
            Nosotros nos encargamos de todo el resto.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 solution-grid">
          {solutions.map((item, idx) => (
            <div key={idx} className="solution-card glass p-10 rounded-3xl text-center flex flex-col items-center group hover:border-primary/50 transition-all duration-500 will-change-transform">
              <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-4xl font-black mb-8 shadow-[0_0_20px_rgba(107,70,193,0.3)] group-hover:scale-110 transition-transform">
                {item.num}
              </div>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
