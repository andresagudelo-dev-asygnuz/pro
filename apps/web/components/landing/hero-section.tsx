"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { FloatingBlobs } from "./floating-blobs";
import Link from "next/link";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-content > *", {
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: "power4.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      <video poster="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1920&auto=format&fit=crop" preload="auto"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-football-player-running-on-the-grass-field-4011-large.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/20 z-10" />

      <FloatingBlobs className="z-20" />

      <div className="container relative z-30 hero-content text-center text-white px-4">
        <div className="mb-6 flex justify-center">
           <div className="text-3xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
             PRO
           </div>
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-2xl">
          Vive el Deporte Aficionado <br />
          <span className="text-secondary">como un profesional</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-300 mb-10 drop-shadow-md">
          Gestiona tus equipos, torneos y estadísticas con la tecnología que usan los mejores.
          Lleva tu pasión al siguiente nivel.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-gradient-to-r from-primary to-accent hover:brightness-110 transition-all shadow-[0_0_20px_rgba(107,70,193,0.4)] hover:shadow-[0_0_30px_rgba(107,70,193,0.6)]">
              🚀 ¡Regístrate Gratis!
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
