"use client";

import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function LaunchBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Fecha objetivo: 15 de Mayo de 2026 (ejemplo)
    const targetDate = new Date("2026-05-15T00:00:00").getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-[100] bg-zinc-950/80 backdrop-blur-md border-b border-white/10 py-3">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary animate-pulse">
            <Zap className="h-3 w-3 text-white fill-current" />
          </div>
          <span className="text-xs md:text-sm font-black uppercase tracking-widest text-white italic">
            Lanzamiento Oficial <span className="text-brand-primary">PRO Manizales</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-white">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-brand-secondary" />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black tabular-nums">{timeLeft.days}</span>
              <span className="text-[10px] font-bold text-white/50 uppercase">d</span>
            </div>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tabular-nums">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-white/50 uppercase">h</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tabular-nums">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-white/50 uppercase">m</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tabular-nums text-brand-secondary animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-white/50 uppercase">s</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
            <span className="bg-brand-secondary/20 text-brand-secondary text-[10px] font-black px-3 py-1 rounded-full border border-brand-secondary/30 uppercase tracking-tighter">
                Fase de Validación
            </span>
            <a 
              href="/feedback" 
              onClick={() => trackEvent('feedback_banner_click')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:scale-105 flex items-center gap-1 animate-bounce-subtle"
            >
              ¡AYUDAR A MEJORAR! 🚀
            </a>
        </div>
      </div>
    </div>
  );
}
