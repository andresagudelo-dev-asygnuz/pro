"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { FloatingBlobs } from "./floating-blobs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function ChallengeSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".challenge-text", {
        scrollTrigger: {
          trigger: ".challenge-text",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.from(".challenge-card", {
        scrollTrigger: {
          trigger: ".challenge-grid",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        scale: 0.5,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.2)",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const challenges = [
    {
      icon: Users,
      title: "Falta de Organización",
      description: "Coordinar un equipo amateur no debería ser un trabajo de tiempo completo.",
    },
    {
      icon: Trophy,
      title: "Visibilidad Nula",
      description: "Tus logros deportivos merecen ser registrados y celebrados profesionalmente.",
    },
    {
      icon: TrendingUp,
      title: "Sin Seguimiento",
      description: "Es imposible mejorar lo que no se mide. Lleva tus estadísticas al día.",
    },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden bg-background">
      <FloatingBlobs />

      <div className="container px-4 mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 challenge-text">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Tu pasión merece más ¿verdad?
          </h2>
          <p className="text-xl text-muted-foreground">
            Los deportistas aficionados enfrentan barreras que frenan su crecimiento.
            Es hora de cambiar las reglas del juego.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 challenge-grid">
          {challenges.map((item, idx) => (
            <div
              key={idx}
              className="challenge-card glass will-change-transform p-8 rounded-3xl flex flex-col items-center text-center shadow-xl border-white/5"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 text-primary">
                <item.icon size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
