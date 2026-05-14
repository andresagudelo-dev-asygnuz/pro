import { ArrowLeft, Share2, Heart } from "lucide-react";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, type Cancha } from "@/lib/types/db";

interface CanchaHeroProps {
  cancha: Cancha;
  finalPrice: number;
  onBack: () => void;
}

export function CanchaHero({ cancha, finalPrice, onBack }: CanchaHeroProps) {
  return (
    <div className="relative h-72 md:h-96 overflow-hidden">
      {/* Background Image/Gradient */}
      <div className="absolute inset-0 bg-zinc-900">
        <img
          src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000"
          alt={cancha.name}
          className="w-full h-full object-cover opacity-50 blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-100 dark:from-zinc-950 via-transparent to-black/60" />
      </div>

      {/* Top Controls */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/80 hover:text-white transition-all bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/10"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
        <div className="flex gap-2">
          <button className="p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-white">
            <Share2 className="size-4" />
          </button>
          <button className="p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-brand-primary transition-colors">
            <Heart className="size-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats Overlay */}
      <div className="absolute bottom-12 left-4 right-4 z-10">
        <div className="grid grid-cols-3 divide-x divide-white/10 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="flex flex-col items-center py-3 px-1 gap-0.5">
            <p className="text-sm font-black text-brand-primary">${finalPrice.toLocaleString("es-CO")}</p>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-0.5">Precio / h</p>
          </div>
          <div className="flex flex-col items-center py-3 px-1 gap-0.5">
            <p className="text-sm font-black text-white">{cancha.capacity}</p>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-0.5">Jugadores</p>
          </div>
          <div className="flex flex-col items-center py-3 px-1 gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-sm">{SPORT_TYPE_ICONS[cancha.sport_type]}</span>
            </div>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-0.5">{SPORT_TYPE_LABELS[cancha.sport_type]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
