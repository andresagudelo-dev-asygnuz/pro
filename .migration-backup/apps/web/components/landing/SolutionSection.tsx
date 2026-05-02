"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { Search, CalendarDays, Trophy as TrophyIcon } from "lucide-react"
import { GlassContainer } from "./GlassContainer"

const solutions = [
  {
    number: "01",
    title: "Explora",
    description: "Descubre las mejores canchas sintéticas y de césped cerca de ti con fotos reales y disponibilidad en vivo.",
    color: "from-brand-secondary to-cyan-400",
    icon: Search
  },
  {
    number: "02",
    title: "Organiza",
    description: "Crea convocatorias abiertas o privadas y gestiona los pagos de la cancha sin estrés ni complicaciones.",
    color: "from-brand-primary to-brand-accent",
    icon: CalendarDays
  },
  {
    number: "03",
    title: "Compite",
    description: "Sube en el ranking de tu barrio, gana premios exclusivos y conviértete en la leyenda local de Manizales.",
    color: "from-brand-secondary to-emerald-400",
    icon: TrophyIcon
  }
]

export function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".solution-card", {
        scrollTrigger: {
          trigger: ".solution-cards-grid",
          start: "top 80%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out"
      })

      // Floating animation for cards
      gsap.to(".solution-card", {
        y: -15,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 0.3,
          from: "random"
        }
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-32 mesh-gradient overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-[url('/hero-bg.png')] bg-fixed bg-cover bg-center opacity-30" 
      />
      {/* Dark Gradient Overlay matching Pasion Sin Fronteras */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-zinc-950" />

      <div className="container mx-auto relative z-10 px-6">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter drop-shadow-2xl uppercase italic leading-[0.85]">
            La Solución <br />
            <span className="text-brand-secondary">que Necesitas</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/90 font-bold max-w-xl mx-auto leading-relaxed">
            Integramos tecnología de vanguardia para que tú solo te preocupes de dar lo mejor en el campo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 solution-cards-grid">
          {solutions.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="solution-card group relative">
                <GlassContainer className="h-full flex flex-col items-center text-center p-12 border-white/10 bg-white/5 backdrop-blur-xl hover:border-white/30 transition-all duration-500 overflow-hidden rounded-[2.5rem]">
                  {/* Glowing background effect on hover */}
                  <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 blur-[60px] transition-opacity duration-700`} />
                  <div className={`absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr ${item.color} opacity-0 group-hover:opacity-10 blur-[60px] transition-opacity duration-700`} />
                  
                  {/* Icon and Number */}
                  <div className="relative mb-10">
                    <div className={`text-9xl font-black bg-gradient-to-b ${item.color} bg-clip-text text-transparent opacity-20 absolute -top-12 left-1/2 -translate-x-1/2 select-none tracking-tighter`}>
                      {item.number}
                    </div>
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} p-[1px] shadow-2xl relative z-10`}>
                      <div className="w-full h-full bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                        <Icon className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-4xl font-black mb-6 text-white uppercase tracking-tighter italic">{item.title}</h3>
                  <div className={`w-16 h-1.5 bg-gradient-to-r ${item.color} mb-8 rounded-full`} />
                  <p className="text-white/70 text-lg leading-relaxed font-bold">
                    {item.description}
                  </p>
                  
                  {/* Subtle index number at bottom */}
                  <div className="mt-auto pt-10 text-[10px] font-black text-white/20 tracking-[0.3em] uppercase">
                    PRO_STEP_{item.number}
                  </div>
                </GlassContainer>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  )
}
