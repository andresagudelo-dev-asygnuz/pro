import { ArrowLeft, Share2, Heart } from "lucide-react";
import { type Cancha } from "@/lib/types/db";
import { useState } from "react";
import { toast } from "sonner";

interface CanchaHeroProps {
  cancha: Cancha;
  finalPrice: number;
  onBack: () => void;
}

export function CanchaHero({ cancha, finalPrice, onBack }: CanchaHeroProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: cancha.name,
          text: `¡Mira esta cancha: ${cancha.name}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Enlace copiado al portapapeles");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? "Eliminado de favoritos" : "Añadido a favoritos");
  };

  return (
    <div className="relative h-72 md:h-96 overflow-hidden">
      {/* Background Image/Gradient */}
      <div className="absolute inset-0 bg-zinc-900">
        {cancha.image_url ? (
          <img
            src={cancha.image_url}
            alt={cancha.name}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-zinc-300 dark:bg-zinc-800 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-100 dark:from-zinc-950 via-zinc-900/40 to-black/60" />
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
          <button 
            onClick={handleShare}
            className="p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/80 hover:text-white"
          >
            <Share2 className="size-4" />
          </button>
          <button 
            onClick={toggleFavorite}
            className={`p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 transition-colors ${
              isFavorite ? "text-red-500" : "text-white/80 hover:text-red-500"
            }`}
          >
            <Heart className={`size-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
