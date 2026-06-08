import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas, getAvailableSlots, createBooking, getCanchaById } from "@/lib/canchas/api";
import { getVenuesByCity } from "@/lib/venues/api";
import { getFriends, sendMatchInvitations, type FriendWithProfile } from "@/lib/friends/api";
import { sendNotification } from "@/lib/notifications/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_LEVELS, ENABLED_CITIES, SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, SPORT_ID_TO_CANCHA_TYPES, type Cancha, type TimeSlot, type Sport, type Venue } from "@/lib/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft, ArrowRight, Building2, MapPin, Users, Map, List, CheckCircle2, Bell } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import { useNotifCount } from "@/context/NotifContext";
import { BottomNav } from "@/components/BottomNav";
const VenueCanchaPickerMap = lazy(() =>
  import("@/components/matches/VenueCanchaPickerMap").then((m) => ({ default: m.VenueCanchaPickerMap }))
);
import { toast } from "sonner";

function todayDate() { return new Date().toISOString().slice(0, 10); }

type Step1 = { title: string; sport_id: string; skill_level: string; duration_minutes: number; max_players: number; description: string };

export default function NewMatchPage() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifCount();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const [preselectedBookingId, setPreselectedBookingId] = useState<string | null>(null);
  const preselectedBookingIdRef = useRef<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [s1, setS1] = useState<Step1>({ title: "", sport_id: "", skill_level: "", duration_minutes: 60, max_players: 10, description: "" });
  const [city, setCity] = useState("");
  const [dateStr, setDateStr] = useState(todayDate());
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueFilter, setVenueFilter] = useState<string>("__all__");
  const [venueView, setVenueView] = useState<"map" | "list">("map");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("sports").select("*").order("name").then(({ data }: { data: Sport[] | null }) => { if (data) setSports(data); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("booking_id");
    const canchaId = params.get("cancha_id");
    const date = params.get("date");
    const start = params.get("start");
    const end = params.get("end");
    if (!bookingId || !canchaId || !date || !start || !end) return;
    setPreselectedBookingId(bookingId);
    preselectedBookingIdRef.current = bookingId;
    setDateStr(date);
    getCanchaById(supabase, canchaId).then(({ data: cancha }) => {
      if (!cancha) return;
      setSelectedCancha(cancha);
      setCity(cancha.city);
      setSelectedSlot({ start, end, isAvailable: true });
    });
  }, []);

  useEffect(() => {
    if (!city) { setCanchas([]); setVenues([]); if (!preselectedBookingIdRef.current) { setSelectedCancha(null); setSelectedSlot(null); } setVenueFilter("__all__"); return; }
    setLoadingCanchas(true); if (!preselectedBookingIdRef.current) { setSelectedCancha(null); setSelectedSlot(null); } setVenueFilter("__all__");
    getAllCanchas(supabase, { city, sportTypes: SPORT_ID_TO_CANCHA_TYPES[s1.sport_id] ?? [] }).then(({ data }) => { setCanchas(data ?? []); setLoadingCanchas(false); });
    getVenuesByCity(supabase, city).then(({ data }) => setVenues(data ?? []));
  }, [city, s1.sport_id]);

  useEffect(() => {
    if (step === 2 && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [step]);

  useEffect(() => {
    if (!selectedCancha || !dateStr) { setSlots([]); return; }
    if (!preselectedBookingIdRef.current) setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, selectedCancha.id, dateStr).then(({ data }) => { setSlots(data ?? []); setLoadingSlots(false); });
  }, [selectedCancha, dateStr]);

  const loadFriends = useCallback(async () => {
    if (!user) return; setLoadingFriends(true);
    const { data } = await getFriends(supabase, user.id); setFriends(data ?? []); setLoadingFriends(false);
  }, [user]);

  function validateStep1() {
    const e: Record<string, string> = {};
    if (s1.title.trim().length < 3) e.title = "El título debe tener al menos 3 caracteres.";
    if (!s1.sport_id) e.sport_id = "Seleccioná un deporte.";
    if (s1.max_players < 2) e.max_players = "Mínimo 2 jugadores.";
    if (s1.duration_minutes < 15) e.duration_minutes = "Duración mínima 15 min.";
    return e;
  }

  function goToStep2() {
    const e = validateStep1(); if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setFieldErrors({}); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep3() {
    const e: Record<string, string> = {};
    if (!city) e.city = "Seleccioná la ciudad del evento.";
    if (!dateStr) e.date = "Indicá la fecha del partido.";
    if (selectedCancha && !selectedSlot) e.slot = "Seleccioná un horario disponible para la cancha.";
    if (!selectedCancha && !selectedSlot) e.slot = "Seleccioná una cancha y un horario.";
    if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setFieldErrors({}); loadFriends(); setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFriend(id: string) { setSelectedFriendIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function handleSubmit() {
    setError(null); if (!user) { setLocation("/login"); return; } setPending(true);
    let cancha_booking_id: string | null = preselectedBookingId;
    if (!preselectedBookingId && selectedCancha && selectedSlot) {
      const price = selectedCancha.discount_percent > 0 ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100) : selectedCancha.price_per_hour;
      const { data: booking, error: bookingErr } = await createBooking(supabase, { cancha_id: selectedCancha.id, booking_date: dateStr, start_time: selectedSlot.start, end_time: selectedSlot.end, total_price: price }, user.id);
      if (bookingErr) { setError(bookingErr); setPending(false); return; }
      cancha_booking_id = booking!.id;
    }
    const matchLocation = selectedCancha ? `${selectedCancha.name} — ${selectedCancha.address}` : manualAddress || null;
    const startsAtISO = selectedSlot ? new Date(`${dateStr}T${selectedSlot.start}:00`).toISOString() : new Date(`${dateStr}T00:00:00`).toISOString();
    const { data, error: matchErr } = await supabase.from("matches").insert({ organizer_id: user.id, sport_id: s1.sport_id, title: s1.title.trim(), description: s1.description.trim() || null, city, location: matchLocation, starts_at: startsAtISO, duration_minutes: s1.duration_minutes, max_players: s1.max_players, skill_level: s1.skill_level && s1.skill_level !== "any" ? s1.skill_level : null, status: "open", is_public: isPublic, ...(cancha_booking_id ? { cancha_booking_id } : {}) }).select().single();
    if (matchErr) { setError(matchErr.message); setPending(false); return; }
    if (data && selectedFriendIds.size > 0) {
      const inviteeIds = Array.from(selectedFriendIds);
      const { error: invErr } = await sendMatchInvitations(supabase, data.id, user.id, inviteeIds);
      if (invErr) toast.error(`Partido creado, pero error al enviar invitaciones: ${invErr}`);
      else toast.success(`Partido creado. ${selectedFriendIds.size} invitación(es) enviada(s).`);
      await Promise.allSettled(
        inviteeIds.map((id) =>
          sendNotification(supabase, id, "match_invite", {
            match_id: data.id,
            match_title: data.title,
            inviter_id: user.id,
            inviter_name: profile?.full_name || profile?.username || "Un jugador",
          })
        )
      );
    }
    if (data) setLocation(`/matches/${data.id}`);
    setPending(false);
  }

  const finalPrice = selectedCancha ? (selectedCancha.discount_percent > 0 ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100) : selectedCancha.price_per_hour) : 0;
  const stepLabels = ["Info", "Lugar", "Amigos"];
  const progressWidth = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <NavDrawer />
          {step === 1 ? <Link href="/feed"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
            : <Button variant="ghost" size="icon" onClick={() => { setStep((s) => (s - 1) as 1 | 2 | 3); setFieldErrors({}); }}><ArrowLeft className="size-4" /></Button>}
          <h1 className="text-lg font-bold flex-1">Crear partido</h1>
          <div className="flex items-center gap-1.5 text-xs">
            {stepLabels.map((label, idx) => {
              const n = idx + 1;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${step === n ? "bg-brand-primary text-white" : step > n ? "bg-brand-primary/20 text-brand-primary" : "bg-muted text-muted-foreground"}`}>
                    <span className="font-bold">{n}</span><span className="hidden sm:inline">{label}</span>
                  </div>
                  {idx < stepLabels.length - 1 && <div className="w-4 h-px bg-border" />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link href="/notificaciones">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/perfil">
              <Avatar className="size-8 ring-2 ring-violet-100 dark:ring-violet-900 cursor-pointer">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Perfil" />}
                <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">{initialsFromName(profile?.full_name ?? profile?.username)}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
        <div className="h-1 bg-muted"><div className="h-full bg-brand-primary transition-all duration-500 ease-out" style={{ width: progressWidth }} /></div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-6">

          {step === 1 && (
            <div className="flex flex-col gap-5">
              {preselectedBookingId && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Cancha reservada — completá los datos del partido</span>
                </div>
              )}
              <div><h2 className="text-base font-semibold">Información del partido</h2><p className="text-sm text-muted-foreground mt-0.5">Nombre, deporte y configuración básica.</p></div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Nombre del partido *</Label>
                <Input id="title" placeholder='Ej: "Pichanga de los martes"' value={s1.title} onChange={(e) => setS1((p) => ({ ...p, title: e.target.value }))} />
                {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Deporte *</Label>
                <Select value={s1.sport_id} onValueChange={(v) => setS1((p) => ({ ...p, sport_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná el deporte" /></SelectTrigger>
                  <SelectContent>{sports.map((sp) => <SelectItem key={sp.id} value={sp.id}>{sp.icon && <span className="mr-1">{sp.icon}</span>}{sp.name}</SelectItem>)}</SelectContent>
                </Select>
                {fieldErrors.sport_id && <p className="text-xs text-destructive">{fieldErrors.sport_id}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Nivel de dificultad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={s1.skill_level} onValueChange={(v) => setS1((p) => ({ ...p, skill_level: v }))}>
                  <SelectTrigger><SelectValue placeholder="Cualquier nivel" /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Cualquier nivel</SelectItem>{SKILL_LEVELS.map((lvl) => <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="duration">Duración (min) *</Label>
                  <Input id="duration" type="number" min={15} max={600} step={15} value={s1.duration_minutes} onChange={(e) => setS1((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} />
                  {fieldErrors.duration_minutes && <p className="text-xs text-destructive">{fieldErrors.duration_minutes}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="max_players">Máx. jugadores *</Label>
                  <Input id="max_players" type="number" min={2} max={64} value={s1.max_players} onChange={(e) => setS1((p) => ({ ...p, max_players: parseInt(e.target.value) || 10 }))} />
                  {fieldErrors.max_players && <p className="text-xs text-destructive">{fieldErrors.max_players}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea id="description" placeholder="Detalles del partido, reglas especiales…" rows={3} value={s1.description} onChange={(e) => setS1((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between p-4 border border-border/60 rounded-xl bg-muted/30">
                <div><p className="text-sm font-medium">Partido público</p><p className="text-xs text-muted-foreground mt-0.5">{isPublic ? "Aparece en el feed y cualquiera puede unirse." : "Solo visible para quienes tengan el enlace."}</p></div>
                <button type="button" onClick={() => setIsPublic(!isPublic)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPublic ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <Button onClick={goToStep2} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700">Siguiente — Elegir lugar <ArrowRight className="size-4 ml-1" /></Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div><h2 className="text-base font-semibold">Fecha y lugar</h2><p className="text-sm text-muted-foreground mt-0.5">{preselectedBookingId ? "Tu cancha ya está reservada. Confirmá y continuá." : "Elegí cuándo y dónde se juega. Podés reservar una cancha registrada o ingresar la dirección manualmente."}</p></div>

              {preselectedBookingId ? (
                <>
                  {selectedCancha ? (
                    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                        <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Cancha reservada</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{SPORT_TYPE_ICONS[selectedCancha.sport_type]}</span>
                        <div>
                          <p className="font-semibold text-sm">{selectedCancha.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedCancha.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-green-100 dark:border-green-900">
                        <span>📅 {dateStr}</span>
                        <span>⏰ {selectedSlot?.start} – {selectedSlot?.end}</span>
                      </div>
                      <Link href={`/canchas/${selectedCancha.id}`}>
                        <p className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer mt-1">Cambiar cancha (la reserva actual quedará pendiente)</p>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
                  <Button onClick={goToStep3} disabled={!selectedCancha} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700" size="lg">Siguiente — Invitar amigos <ArrowRight className="size-4 ml-1" /></Button>
                </>
              ) : (
                <>
              <div className="flex flex-col gap-2">
                <Label>Fecha del partido *</Label>
                <input type="date" value={dateStr} min={todayDate()} onChange={(e) => { setDateStr(e.target.value); setSelectedSlot(null); }} className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Ciudad *</Label>
                <Select value={city} onValueChange={(v) => { setCity(v); setSelectedCancha(null); setSelectedSlot(null); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná la ciudad" /></SelectTrigger>
                  <SelectContent>{ENABLED_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>

              {city && (
                <div className="space-y-3">
                  {/* Header + toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        Canchas en {city}
                        {s1.sport_id && sports.find((sp) => sp.id === s1.sport_id) && (
                          <span className="ml-1 text-muted-foreground font-normal">· {sports.find((sp) => sp.id === s1.sport_id)!.icon} {sports.find((sp) => sp.id === s1.sport_id)!.name}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setVenueView("map")}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${venueView === "map" ? "bg-white dark:bg-zinc-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Map className="size-3" /> Mapa
                      </button>
                      <button
                        type="button"
                        onClick={() => setVenueView("list")}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${venueView === "list" ? "bg-white dark:bg-zinc-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <List className="size-3" /> Lista
                      </button>
                    </div>
                  </div>

                  {loadingCanchas ? (
                    <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
                  ) : canchas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No hay canchas registradas en {city} aún.</p>
                  ) : (
                    <>
                      {/* Venue filter chips */}
                      {venues.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setVenueFilter("__all__")}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${venueFilter === "__all__" ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-zinc-900 border-border text-muted-foreground hover:border-foreground/40"}`}
                          >
                            Todas
                          </button>
                          {venues.map((v) => (
                            <button
                              type="button"
                              key={v.id}
                              onClick={() => setVenueFilter(venueFilter === v.id ? "__all__" : v.id)}
                              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${venueFilter === v.id ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-zinc-900 border-border text-muted-foreground hover:border-foreground/40"}`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Map view */}
                      {venueView === "map" && (
                        <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm">
                          <Suspense fallback={<div className="flex justify-center items-center h-[300px] bg-zinc-100 dark:bg-zinc-800"><div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>}>
                            <VenueCanchaPickerMap
                              canchas={venueFilter === "__all__" ? canchas : canchas.filter((c) => c.venue_id === venueFilter)}
                              venues={venues}
                              userLocation={userLocation}
                              selectedCanchaId={selectedCancha?.id ?? null}
                              onSelectCancha={(c) => setSelectedCancha(selectedCancha?.id === c.id ? null : c)}
                              height="300px"
                            />
                          </Suspense>
                        </div>
                      )}

                      {/* List view */}
                      {venueView === "list" && (
                        <div className="space-y-2">
                          {(venueFilter === "__all__" ? canchas : canchas.filter((c) => c.venue_id === venueFilter)).map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => setSelectedCancha(selectedCancha?.id === c.id ? null : c)}
                              className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all text-left ${selectedCancha?.id === c.id ? "border-brand-primary bg-brand-primary/5 shadow-sm" : "border-border hover:border-foreground/30 bg-white dark:bg-zinc-900"}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-2xl shrink-0">{SPORT_TYPE_ICONS[c.sport_type]}</span>
                                <div className="min-w-0">
                                  <p className="font-semibold leading-tight truncate">{c.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{SPORT_TYPE_LABELS[c.sport_type]} · {c.capacity} jug. · {c.address}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {c.discount_percent > 0 && <p className="text-xs text-muted-foreground line-through">${c.price_per_hour.toLocaleString("es-CO")}/h</p>}
                                <p className="font-bold text-brand-primary text-sm">${(c.discount_percent > 0 ? c.price_per_hour * (1 - c.discount_percent / 100) : c.price_per_hour).toLocaleString("es-CO")}/h</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Selected cancha: time slots */}
                  {selectedCancha && (
                    <div className="border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{selectedCancha.name}</p>
                        <button type="button" onClick={() => { setSelectedCancha(null); setSelectedSlot(null); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Quitar</button>
                      </div>
                      <p className="text-xs text-muted-foreground">{SPORT_TYPE_LABELS[selectedCancha.sport_type]} · {selectedCancha.capacity} jug. · {selectedCancha.address}</p>
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Horarios disponibles</p>
                        {!dateStr ? (
                          <p className="text-sm text-muted-foreground">Seleccioná la fecha arriba para ver disponibilidad.</p>
                        ) : loadingSlots ? (
                          <div className="flex justify-center py-3"><div className="w-5 h-5 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
                        ) : slots.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No hay horarios disponibles para el {dateStr} en esta cancha.</p>
                        ) : (
                          <div className="grid grid-cols-4 gap-1.5">
                            {slots.map((slot) => (
                              <button
                                type="button"
                                key={slot.start}
                                disabled={!slot.isAvailable}
                                onClick={() => setSelectedSlot(selectedSlot?.start === slot.start ? null : slot)}
                                className={`text-xs font-medium py-2.5 rounded-lg border transition-all ${!slot.isAvailable ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-60" : selectedSlot?.start === slot.start ? "bg-brand-primary text-white border-brand-primary shadow-sm" : "bg-white dark:bg-zinc-900 border-border hover:border-foreground/40"}`}
                              >
                                {slot.start}
                                {!slot.isAvailable && <span className="block text-[10px] opacity-60">Ocupado</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {fieldErrors.slot && <p className="text-xs text-destructive mt-1">{fieldErrors.slot}</p>}
                      </div>
                      {selectedSlot && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5 text-sm space-y-0.5">
                          <p className="font-semibold text-amber-800 dark:text-amber-300">Solicitud: {selectedSlot.start}–{selectedSlot.end} en {selectedCancha.name}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400">${finalPrice.toLocaleString("es-CO")} · Pendiente hasta que el dueño apruebe</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selectedCancha && (
                <div className="flex flex-col gap-2">
                  <Label><MapPin className="size-3.5 inline mr-1 text-muted-foreground" />Dirección del partido <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input placeholder="Ej: Cancha El Prado, Carrera 12 #45-67" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Si no reservás una cancha, podés escribir la dirección o dejarla vacía.</p>
                </div>
              )}
              {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
              <Button onClick={goToStep3} className="w-full" size="lg">Siguiente — Invitar amigos <ArrowRight className="size-4 ml-1" /></Button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div><h2 className="text-base font-semibold flex items-center gap-2"><Users className="size-4" /> Invitar amigos</h2><p className="text-sm text-muted-foreground mt-0.5">Seleccioná los amigos que querés invitar. Este paso es opcional.</p></div>
              {loadingFriends ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
                : friends.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl bg-muted/40 border border-dashed"><Users className="size-10 text-muted-foreground/40" /><div><p className="font-medium text-sm">No tenés amigos todavía</p><p className="text-xs text-muted-foreground mt-0.5">Agregá amigos desde la sección Amigos para poder invitarlos.</p></div></div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedFriendIds.size > 0 && <p className="text-xs font-medium text-brand-primary">{selectedFriendIds.size} amigo(s) seleccionado(s)</p>}
                    {friends.map((f) => {
                      const friendId = f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                      const isSelected = selectedFriendIds.has(friendId);
                      return (
                        <button key={f.id} type="button" onClick={() => toggleFriend(friendId)} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all w-full ${isSelected ? "border-brand-primary bg-brand-primary/5 shadow-sm" : "border-border bg-white dark:bg-zinc-900 hover:border-foreground/30"}`}>
                          <div className="relative">
                            <Avatar className="size-10">{f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}<AvatarFallback>{initialsFromName(f.profile.full_name ?? f.profile.username)}</AvatarFallback></Avatar>
                            {isSelected && <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-brand-primary flex items-center justify-center"><span className="text-white text-[10px] font-bold">✓</span></div>}
                          </div>
                          <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{f.profile.full_name ?? f.profile.username ?? "Usuario"}</p><p className="text-xs text-muted-foreground truncate">{[f.profile.city, f.profile.username ? `@${f.profile.username}` : ""].filter(Boolean).join(" · ")}</p></div>
                          <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-brand-primary bg-brand-primary" : "border-muted-foreground/30"}`}>{isSelected && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
              <Button onClick={handleSubmit} disabled={pending} className="w-full" size="lg">{pending ? "Creando partido…" : selectedFriendIds.size > 0 ? `Crear partido e invitar ${selectedFriendIds.size} amigo(s)` : "Crear partido sin invitar"}</Button>
              {selectedFriendIds.size === 0 && friends.length > 0 && <p className="text-xs text-center text-muted-foreground -mt-2">No seleccionaste ningún amigo — el partido se creará sin invitaciones privadas.</p>}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
