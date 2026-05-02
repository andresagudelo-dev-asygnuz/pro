"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GlassContainer } from "./GlassContainer"
import { Trophy, Users, Zap } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const challenges = [
  {
    icon: Zap,
    title: "Canchas Siempre Llenas",
    description: "Olvida las llamadas interminables. Encuentra disponibilidad real de canchas sintéticas al instante."
  },
  {
    icon: Users,
    title: "El Equipo Incompleto",
    description: "Conecta con deportistas confiables en tu zona para que nunca se vuelva a cancelar un partido."
  },
  {
    icon: Trophy,
    title: "Sin Estadísticas",
    description: "Deja de jugar a ciegas. Registra tus goles, asistencias y victorias como un profesional."
  }
]

export function ChallengeSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Registro interno para asegurar compatibilidad con Next.js hydration
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Title Animation
      gsap.fromTo(titleRef.current, 
        { y: 30, opacity: 0 },
        {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none"
          },
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out"
        }
      )

      // Cards Animation
      gsap.fromTo(".challenge-card",
        { y: 50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 90%",
            toggleActions: "play none none none"
          },
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          onComplete: () => ScrollTrigger.refresh()
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="challenge-section relative py-16 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto relative z-10 px-6">
        <div ref={titleRef} className="flex flex-col items-center text-center max-w-4xl mx-auto mb-10 challenge-title">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 tracking-tighter leading-[0.9] italic uppercase text-zinc-900 dark:text-white">
            ¿Cansado de que <br />
            <span className="text-brand-primary">falte uno?</span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
            El deporte aficionado es una forma de vida. Hemos creado las herramientas para que lo vivas como un verdadero profesional.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 challenge-cards-container">
          {challenges.map((item, index) => (
            <GlassContainer key={index} className="challenge-card flex flex-col items-center text-center p-12 bg-white/40 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:border-brand-primary/50 transition-all duration-700 hover:-translate-y-4 group shadow-xl hover:shadow-brand-primary/10">
              <div className="w-24 h-24 rounded-3xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-10 border border-zinc-200 dark:border-white/10 group-hover:bg-brand-primary group-hover:rotate-12 transition-all duration-500 shadow-inner">
                <item.icon className="w-12 h-12 text-zinc-800 dark:text-zinc-200 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-black mb-6 text-zinc-900 dark:text-white tracking-tight uppercase italic">{item.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-bold">
                {item.description}
              </p>
              
              <div className="mt-8 w-10 h-1 bg-zinc-200 dark:bg-zinc-800 group-hover:w-20 group-hover:bg-brand-primary transition-all duration-500" />
            </GlassContainer>
          ))}
        </div>
      </div>
    </section>
  )
}
