"use client"

import { GlassContainer } from "./GlassContainer"
import { MapPin, Users, Zap } from "lucide-react"

export function LocalFocusSection() {
  return (
    <section className="relative py-24 bg-zinc-950 overflow-hidden">
      {/* Background Image with Parallax effect */}
      <div 
        className="absolute inset-0 bg-[url('/pitch-aerial.png')] bg-fixed bg-cover bg-center opacity-20" 
      />
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-zinc-950" />

      <div className="container mx-auto relative z-10 px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase leading-[0.8] italic">
            Pasión <br />
            <span className="text-brand-secondary">Sin Fronteras</span>
          </h2>
          <p className="text-xl text-white/80 leading-relaxed max-w-2xl font-bold mx-auto">
            PRO nace en el corazón de Caldas para conectar a todos los deportistas de Manizales. Porque la pasión no entiende de límites, pero sí de vecindarios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Column 1: Cards */}
          <div className="grid grid-cols-1 gap-8">
            <GlassContainer className="p-10 border-white/10 bg-white/5 hover:border-brand-primary/50 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/players-celebrating.png')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative z-10 flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center shrink-0 group-hover:bg-brand-primary transition-colors">
                  <MapPin className="w-8 h-8 text-brand-primary group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Comunidad Manizaleña</h3>
                  <p className="text-white/70 font-bold text-lg leading-snug">
                    Conectamos las canchas de Palermo, Chipre, La Enea y todos los barrios de Manizales.
                  </p>
                </div>
              </div>
            </GlassContainer>

            <GlassContainer className="p-10 border-white/10 bg-white/5 hover:border-brand-secondary/50 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/manizales-challenges.png')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative z-10 flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-secondary/20 flex items-center justify-center shrink-0 group-hover:bg-brand-secondary transition-colors">
                  <Users className="w-8 h-8 text-brand-secondary group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Retos Locales</h3>
                  <p className="text-white/70 font-bold text-lg leading-snug">
                    Arma tu equipo y compite en el ranking regional de Caldas para ser el mejor de la zona.
                  </p>
                </div>
              </div>
            </GlassContainer>
          </div>

          {/* Column 2: Map of Manizales */}
          <div className="relative group perspective-1000 w-full h-full min-h-[500px]">
            {/* Map pings for Manizales locations */}
            <div className="absolute top-[40%] left-[45%] w-4 h-4 bg-brand-secondary rounded-full animate-ping z-20 shadow-[0_0_15px_#00B5D8]" />
            <div className="absolute top-[55%] left-[60%] w-4 h-4 bg-brand-primary rounded-full animate-ping z-20 delay-700 shadow-[0_0_15px_#6B46C1]" />
            <div className="absolute top-[30%] left-[55%] w-4 h-4 bg-brand-accent rounded-full animate-ping z-20 delay-1000 shadow-[0_0_15px_#FFD700]" />

            <GlassContainer className="p-2 border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden h-full min-h-[500px] group-hover:rotate-x-1 group-hover:rotate-y-1 transition-transform duration-700 bg-black/40">
              <iframe
                title="Google Maps Manizales"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31835.34114441584!2d-75.524451!3d5.06889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e47656623d3f231%3A0x6436e4f3a9e223c9!2sManizales%2C%20Caldas!5e0!3m2!1sen!2sco!4v1714231234567!5m2!1sen!2sco"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                className="rounded-2xl filter grayscale invert contrast-125 opacity-40 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000"
              />
              <div className="absolute inset-0 pointer-events-none ring-1 ring-white/40 rounded-2xl" />
            </GlassContainer>
            
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 border border-brand-secondary/20 rounded-full animate-[spin_15s_linear_infinite] -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 border border-brand-primary/20 rounded-full animate-[spin_20s_linear_infinite_reverse] -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
