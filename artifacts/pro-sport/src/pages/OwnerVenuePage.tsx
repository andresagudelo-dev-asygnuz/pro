import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getVenueByOwner } from "@/lib/venues/api";
import { getMyCanchas } from "@/lib/canchas/api";
import { Building2, ExternalLink, Pencil, Star } from "lucide-react";
import type { Venue } from "@/lib/types/db";

export default function OwnerVenuePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [venue, setVenue] = useState<Venue | null | undefined>(undefined); // undefined = loading
  const [canchaCount, setCanchaCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getVenueByOwner(supabase, user.id),
      getMyCanchas(supabase, user.id),
    ]).then(([venueRes, canchasRes]) => {
      setVenue(venueRes.data ?? null);
      setCanchaCount(canchasRes.data?.length ?? 0);
    });
  }, [user?.id]);

  if (venue === undefined) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="flex flex-col items-center text-center gap-5 py-8 bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <Building2 className="size-8 text-violet-500" />
          </div>
          <div>
            <h2 className="font-bold text-lg mb-1.5">Tu Centro aún no tiene perfil público</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crea el perfil de tu centro para que los jugadores puedan encontrarte.
            </p>
          </div>
          <button
            onClick={() => navigate("/mis-canchas/centro/editar")}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Crear perfil del Centro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl">Mi Centro Deportivo</h1>
          <p className="text-sm text-muted-foreground">Perfil público del centro</p>
        </div>
        <Link href="/mis-canchas/centro/editar">
          <button className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-300 dark:border-violet-700 rounded-xl px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
            <Pencil className="size-3.5" /> Editar
          </button>
        </Link>
      </div>

      {/* Banner + Logo preview */}
      <div className="rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        {/* Banner */}
        <div className="h-24 relative">
          {venue.banner_url ? (
            <img src={venue.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-900" />
          )}
          {venue.logo_url && (
            <div className="absolute bottom-[-16px] left-4 w-12 h-12 rounded-xl border-4 border-white dark:border-zinc-900 overflow-hidden bg-white shadow-md">
              <img src={venue.logo_url} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className={`px-4 pb-4 ${venue.logo_url ? "pt-8" : "pt-4"}`}>
          <h2 className="font-bold text-base">{venue.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{venue.city}</p>
          {venue.rating_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="size-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold">{venue.rating_avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({venue.rating_count} reseñas)</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
            <div className="text-center">
              <p className="font-bold text-sm text-violet-600">{canchaCount}</p>
              <p className="text-[10px] text-muted-foreground">cancha{canchaCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View as player link */}
      <Link href={`/venues/${venue.id}`}>
        <div className="flex items-center justify-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline underline-offset-2 cursor-pointer py-1">
          <ExternalLink className="size-3.5" />
          Ver como jugador →
        </div>
      </Link>
    </div>
  );
}
