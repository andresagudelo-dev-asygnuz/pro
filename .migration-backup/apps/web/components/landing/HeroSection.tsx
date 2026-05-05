"use client"

import { VideoBackground } from "./VideoBackground"
import { FloatingBlob } from "./FloatingBlob"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

export function HeroSection() {
  const handleJoinClick = () => {
    trackEvent('join_waitlist_click', { location: 'hero' });
    document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <VideoBackground 
        src="" 
        poster="/multisport-bg.png"
      />
      
      {/* Background Decor */}
      <FloatingBlob color="bg-brand-primary" className="top-1/4 left-1/4 opacity-20" delay={0} />
      <FloatingBlob color="bg-brand-secondary" className="bottom-1/4 right-1/4 opacity-20" delay={2} />

      <div className="container mx-auto relative z-10 text-center px-6 pt-20">
        <div className="mb-20 flex justify-center scale-110 animate-fade-in">
          <span className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg">
            PRO<span className="text-brand-primary">.</span>
          </span>
        </div>
        
        <div className="flex flex-col items-center text-center max-w-7xl mx-auto mb-16 hero-title">
          <h1 className="text-6xl md:text-8xl lg:text-[8rem] font-black mb-10 tracking-tighter leading-[0.85] italic uppercase text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
            PASIÓN <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-purple-300 to-brand-secondary bg-[length:200%_auto] animate-gradient-x whitespace-nowrap">
              SIN FRONTERAS
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 font-medium mb-12 hero-subtitle leading-relaxed max-w-xl uppercase tracking-[0.2em]">
            Reserva canchas, organiza partidos y <br className="hidden md:block" />
            <span className="text-white">domina el ranking de tu ciudad.</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Button 
            id="hero-cta-button"
            size="lg" 
            onClick={handleJoinClick}
            className="h-16 px-10 text-sm font-black bg-white text-zinc-950 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-[0_0_40px_rgba(255,255,255,0.2)] relative group overflow-hidden rounded-xl border-2 border-brand-primary uppercase tracking-widest"
          >
            <span className="relative z-10 flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              Unirse a la lista de espera <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/5 to-transparent -translate-x-full animate-shimmer" />
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
          <div className="w-1 h-2 bg-white/60 rounded-full" />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase">SCROLL</span>
      </div>
    </section>
  )
}
