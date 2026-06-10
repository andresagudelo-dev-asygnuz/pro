import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { supabase } from "@/lib/supabase";
import { getVenueById } from "@/lib/venues/api";
import { getAllCanchas } from "@/lib/canchas/api";
import { ScreenLayout } from "@/components/ScreenLayout";
import {
  SPORT_TYPE_ICONS,
  SPORT_TYPE_LABELS,
  type Venue,
  type Cancha,
} from "@/lib/types/db";
import { MapPin, Phone, MessageCircle, Star, Users } from "lucide-react";

function venueIcon() {
  return L.divIcon({
    html: '<div style="width:20px;height:20px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: "",
  });
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  const full = Math.floor(avg);
  const half = avg - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return "full";
    if (i === full && half) return "half";
    return "empty";
  });
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars.map((type, i) => (
          <Star
            key={i}
            className={`size-3.5 ${type === "empty" ? "text-muted-foreground/40" : "text-amber-400 fill-amber-400"}`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold">{avg.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count} reseñas)</span>
    </div>
  );
}

function CanchaRow({ cancha }: { cancha: Cancha }) {
  const finalPrice =
    cancha.discount_percent > 0
      ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
      : cancha.price_per_hour;

  return (
    <Link href={`/canchas/${cancha.id}`}>
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
}

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"canchas" | "info">("canchas");

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
        const activeCanchas = (canchasRes.data ?? []).filter((c) => c.is_active);
        setCanchas(activeCanchas);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-destructive text-sm">{error ?? "Centro no encontrado"}</p>
        <button
          onClick={() => navigate("/canchas")}
          className="text-sm text-violet-600 underline underline-offset-2"
        >
          Volver a Canchas
        </button>
      </div>
    );
  }

  return (
    <ScreenLayout title={venue.name} backHref="/canchas" className="pb-20">
      {/* ── Hero Banner ── */}
      <div className="relative">
        {venue.banner_url ? (
          <img
            src={venue.banner_url}
            alt={venue.name}
            className="w-full h-52 object-cover"
          />
        ) : (
          <div className="h-52 bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-900" />
        )}

        {/* Logo overlay */}
        {venue.logo_url && (
          <div className="absolute bottom-[-20px] left-5 w-14 h-14 rounded-2xl border-4 border-white dark:border-zinc-950 overflow-hidden bg-white shadow-md">
            <img src={venue.logo_url} alt="Logo" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* ── Info Card ── */}
      <div className={`container max-w-lg mx-auto px-4 ${venue.logo_url ? "pt-10" : "pt-4"} pb-2`}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-2">
          <h1 className="font-bold text-xl leading-tight">{venue.name}</h1>
          {venue.rating_count > 0 && (
            <StarRating avg={venue.rating_avg} count={venue.rating_count} />
          )}
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              {venue.address}, {venue.city}
            </span>
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Phone className="size-3.5 shrink-0" />
                {venue.phone}
              </a>
            )}
            {venue.whatsapp && (
              <a
                href={`https://wa.me/${venue.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:underline"
              >
                <MessageCircle className="size-3.5 shrink-0" />
                {venue.whatsapp}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="container max-w-lg mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1">
          {(["canchas", "info"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "canchas" ? `Canchas · ${canchas.length}` : "Info"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <main className="container max-w-lg mx-auto px-4 py-4 space-y-3">
        {activeTab === "canchas" ? (
          canchas.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center gap-3">
              <span className="text-4xl">🏟️</span>
              <p className="text-sm text-muted-foreground">Sin canchas activas en este centro.</p>
            </div>
          ) : (
            canchas.map((c) => <CanchaRow key={c.id} cancha={c} />)
          )
        ) : (
          <div className="space-y-4">
            {venue.description && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-2">Descripción</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{venue.description}</p>
              </div>
            )}

            {venue.lat != null && venue.lng != null && (
              <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm">
                <MapContainer
                  center={[venue.lat, venue.lng]}
                  zoom={16}
                  style={{ height: "200px", width: "100%" }}
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

            {!venue.description && venue.lat == null && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Sin información adicional del centro.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </ScreenLayout>
  );
}
