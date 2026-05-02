"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { FloatingBlob } from "./FloatingBlob"
import { GlassContainer } from "./GlassContainer"
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  MapPin, 
  ShieldCheck, 
  Share2 
} from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    icon: Calendar,
    title: "Reserva de Canchas",
    description: "Encuentra y reserva canchas sintéticas en segundos con disponibilidad real."
  },
  {
    icon: MessageSquare,
    title: "Arma tu Equipo",
    description: "Chat integrado para coordinar el 5-a-side o el 11-a-side sin salir de la app."
  },
  {
    icon: BarChart3,
    title: "Tablero de Goleadores",
    description: "Registra tus estadísticas, goles y asistencias para competir por el Pichichi local."
  },
  {
    icon: MapPin,
    title: "Radar de Partidos",
    description: "Localiza retos abiertos y partidos que necesitan jugadores cerca de ti."
  },
  {
    icon: ShieldCheck,
    title: "Fair Play",
    description: "Sistema de reputación para garantizar que cada partido sea competitivo y limpio."
  },
  {
    icon: Share2,
    title: "MVP de la Fecha",
    description: "Comparte tus mejores jugadas, trofeos y estadísticas en tus redes sociales."
  }
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (gridRef.current) {
        const cards = gridRef.current.children
        gsap.from(cards, {
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse"
          },
          opacity: 0,
          y: 50,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out"
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-20 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      {/* Background Decor */}
      <FloatingBlob color="bg-brand-primary" size="w-[600px] h-[600px]" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]" />
      <FloatingBlob color="bg-brand-secondary" className="top-0 right-0 opacity-[0.05]" delay={4} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-zinc-900 dark:text-white leading-none uppercase italic">
            Potencia <br />
            <span className="text-brand-primary">tu Juego</span>
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            Una plataforma diseñada por deportistas para deportistas. Sin distracciones, solo acción.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group relative">
              {/* Glow background on hover */}
              <div className="absolute inset-0 bg-brand-primary/20 blur-3xl rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10 scale-90 group-hover:scale-110" />
              
              <GlassContainer className="h-full border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-white/5 p-10 transition-all duration-700 hover:-translate-y-4 hover:scale-[1.05] hover:border-brand-primary/40 cursor-default shadow-sm hover:shadow-2xl flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-200/50 dark:bg-white/5 flex items-center justify-center mb-8 border border-zinc-300 dark:border-white/10 group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:rotate-12 transition-all duration-500 shadow-inner">
                  <feature.icon className="w-8 h-8 text-zinc-700 dark:text-zinc-300 group-hover:text-white transition-colors duration-500" />
                </div>
                <h3 className="text-2xl font-black mb-4 text-zinc-900 dark:text-white transition-colors duration-500 group-hover:text-brand-primary tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </GlassContainer>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
