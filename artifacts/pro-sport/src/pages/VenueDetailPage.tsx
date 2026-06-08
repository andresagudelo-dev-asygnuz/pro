import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { supabase } from "@/lib/supabase";
import { getVenueById } from "@/lib/venues/api";
import { getAllCanchas } from "@/lib/canchas/api";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { SPORT_TYPE_ICONS, SPORT_TYPE_LABELS, type Venue, type Cancha } from "@/lib/types/db";
import { MapPin, Phone, Users } from "lucide-react";

function venueIcon() {
  return L.divIcon({
    html: '<div style="width:20px;height:20px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: "",
  });
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [venueRes, canchasRes] = await Promise.all([
        getVenueById(supabase, id),
        getAllCanchas(supabase, { venueId: id }),
      ]);
      if (venueRes.error || !venueRes.data) {
        setError(venueRes.error ?? "Centro no encontrado");
      } else {
        setVenue(venueRes.data);
        setCanchas(canchasRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Centro deportivo" backHref="/canchas" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Centro deportivo" backHref="/canchas" />
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <p className="text-destructive text-sm">{error ?? "Centro no encontrado"}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title={venue.name} backHref="/canchas" />

      {/* Mini map */}
      {venue.lat != null && venue.lng != null && (
        <div className="h-48 w-full">
          <MapContainer
            center={[venue.lat, venue.lng]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
            zoomControl={false}
            dragging={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <Marker position={[venue.lat, venue.lng]} icon={venueIcon()}>
              <Popup>{venue.name}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4">
        {/* Venue info */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-4 space-y-2">
          <h1 className="font-bold text-lg">{venue.name}</h1>
          {venue.description && (
            <p className="text-sm text-muted-foreground">{venue.description}</p>
          )}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              {venue.address}, {venue.city}
            </span>
            {venue.phone && (
              <span className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0" />
                {venue.phone}
              </span>
            )}
          </div>
        </div>

        {/* Canchas */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Canchas · {canchas.length}
          </h2>
          {canchas.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center gap-2">
              <span className="text-3xl">🏟️</span>
              <p className="text-sm text-muted-foreground">Sin canchas registradas aún.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {canchas.map((cancha) => {
                const finalPrice =
                  cancha.discount_percent > 0
                    ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
                    : cancha.price_per_hour;
                return (
                  <Link key={cancha.id} href={`/canchas/${cancha.id}`}>
                    <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/10 border border-violet-100 dark:border-violet-800 flex items-center justify-center text-xl shrink-0">
                              {SPORT_TYPE_ICONS[cancha.sport_type]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                                {cancha.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {SPORT_TYPE_LABELS[cancha.sport_type]}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {cancha.discount_percent > 0 && (
                              <p className="text-xs text-muted-foreground line-through">
                                ${cancha.price_per_hour.toLocaleString("es-CO")}/h
                              </p>
                            )}
                            <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">
                              ${finalPrice.toLocaleString("es-CO")}/h
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3" /> {cancha.capacity} jugadores
                          </span>
                          {cancha.discount_percent > 0 && (
                            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                              -{cancha.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-border/40 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">📍 {cancha.address}</span>
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:underline shrink-0 ml-2">
                          Reservar →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
