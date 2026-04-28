"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Layout, Award, Zap, Shield, Globe, Heart } from "lucide-react";
import { FloatingBlobs } from "./floating-blobs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const features = [
    { icon: Layout, title: "Gestión de Equipos", desc: "Crea tu plantilla, asigna roles y gestiona convocatorias fácilmente." },
    { icon: Award, title: "Perfil Profesional", desc: "Tu propia ficha técnica con historial, fotos y estadísticas acumuladas." },
    { icon: Zap, title: "Resultados en Vivo", desc: "Actualiza el marcador desde el campo y notifica a todos al instante." },
    { icon: Shield, title: "Seguridad y Datos", desc: "Tu información está protegida con estándares de nivel bancario." },
    { icon: Globe, title: "Red de Torneos", desc: "Descubre ligas y eventos cerca de ti y únete con un solo clic." },
    { icon: Heart, title: "Comunidad Activa", desc: "Sigue a tus amigos, reacciona a sus logros y comparte tu pasión." },
  ];

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden bg-background">
      <FloatingBlobs />

      <div className="container px-4 mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Todo lo que necesitas para vivir tu pasión
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 features-grid">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="feature-card glass will-change-transform p-8 rounded-3xl group transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl hover:border-primary/30 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-6 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors duration-300 group-hover:animate-pulse-slow">
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
