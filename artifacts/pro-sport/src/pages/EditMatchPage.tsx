import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas, getAvailableSlots, createBooking, updateBookingStatus } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  SKILL_LEVELS, ENABLED_CITIES, SPORT_TYPE_LABELS, SPORT_TYPE_ICONS,
  SPORT_ID_TO_CANCHA_TYPES,
  type Cancha, type TimeSlot, type Match, type CanchaBooking, type Sport,
} from "@/lib/types/db";
import {
  ArrowLeft, ArrowRight, Building2, MapPin, Clock, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

const supabase = createClient();

type FullBooking = CanchaBooking & { canchas?: { name: string; address: string; city: string; cancha_id?: string } | null };

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EditMatchPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Loaded data
  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [currentBooking, setCurrentBooking] = useState<FullBooking | null>(null);

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isPublic, setIsPublic] = useState(true);

  // Step 2 fields
  const [dateStr, setDateStr] = useState(todayDate());
  const [timeStr, setTimeStr] = useState("09:00");
  const [city, setCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  // Cancha selection
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [removeCancha, setRemoveCancha] = useState(false);

  // ── Load match ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (!m) { toast.error("Partido no encontrado"); setLocation(`/matches/${id}`); return; }
      const matchData = m as Match;
      if (matchData.organizer_id !== user.id) {
        toast.error("No tenés permiso para editar este partido.");
        setLocation(`/matches/${id}`);
        return;
      }
      setMatch(matchData);

      // Pre-populate fields
      setTitle(matchData.title);
      setDescription(matchData.description ?? "");
      setSkillLevel(matchData.skill_level ?? "any");
      setMaxPlayers(matchData.max_players);
      setDurationMinutes(matchData.duration_minutes);
      setIsPublic(matchData.is_public);
      setDateStr(isoToLocalDate(matchData.starts_at));
      setTimeStr(isoToLocalTime(matchData.starts_at));
      setCity(matchData.city);

      // Load sport
      const { data: sp } = await supabase.from("sports").select("*").eq("id", matchData.sport_id).maybeSingle();
      setSport(sp as Sport | null);

      // Load current booking
      if (matchData.cancha_booking_id) {
        const { data: bk } = await supabase
          .from("cancha_bookings")
          .select("*, canchas(name, address, city)")
          .eq("id", matchData.cancha_booking_id)
          .maybeSingle();
        if (bk) setCurrentBooking(bk as FullBooking);
      } else {
        // Pre-populate manual address from match.location if it's not a cancha string
        setManualAddress(matchData.location ?? "");
      }

      setLoading(false);
    })();
  }, [id, user]);

  // ── Load canchas when city changes ──────────────────────────────────────────
  useEffect(() => {
    if (!city || !match) return;
    setLoadingCanchas(true);
    setSelectedCancha(null);
    setSelectedSlot(null);
    const sportTypes = SPORT_ID_TO_CANCHA_TYPES[match.sport_id] ?? [];
    getAllCanchas(supabase, { city, sportTypes }).then(({ data }) => {
      setCanchas(data ?? []);
      setLoadingCanchas(false);
    });
  }, [city, match]);

  // ── Load slots when cancha or date changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedCancha || !dateStr) { setSlots([]); return; }
    setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, selectedCancha.id, dateStr).then(({ data }) => {
      setSlots(data ?? []);
      setLoadingSlots(false);
    });
  }, [selectedCancha, dateStr]);

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (title.trim().length < 3) errs.title = "El título debe tener al menos 3 caracteres.";
    if (maxPlayers < 2) errs.max_players = "Mínimo 2 jugadores.";
    if (durationMinutes < 15) errs.duration_minutes = "Duración mínima 15 min.";
    return errs;
  }

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!dateStr) errs.date = "Indicá la fecha del partido.";
    if (!timeStr && !selectedSlot) errs.time = "Indicá la hora del partido.";
    if (!city) errs.city = "Seleccioná la ciudad.";
    if (selectedCancha && !selectedSlot) errs.slot = "Seleccioná un horario disponible.";
    return errs;
  }

  function goToStep2() {
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    if (!match || !user) return;

    setSaving(true);

    // Compute new starts_at
    const effectiveTime = selectedSlot ? selectedSlot.start : timeStr;
    const startsAtISO = new Date(`${dateStr}T${effectiveTime}:00`).toISOString();

    // Detect what changed for notification message
    const changes: string[] = [];
    if (title.trim() !== match.title) changes.push("título");
    if ((description.trim() || null) !== match.description) changes.push("descripción");
    if (startsAtISO !== match.starts_at) changes.push("fecha/hora");
    if (durationMinutes !== match.duration_minutes) changes.push("duración");
    if (maxPlayers !== match.max_players) changes.push("cupos");
    const skillLevelValue = skillLevel === "any" ? null : skillLevel;
    if (skillLevelValue !== match.skill_level) changes.push("nivel");

    // Determine location/cancha changes
    let newCanchaBookingId = match.cancha_booking_id;
    let locationChanged = false;

    if (removeCancha && match.cancha_booking_id) {
      // Cancel old booking
      await updateBookingStatus(supabase, match.cancha_booking_id, "cancelada");

      // Notify cancha owner about cancellation
      if (currentBooking) {
        const { data: canchaOwner } = await supabase
          .from("canchas")
          .select("owner_id, name")
          .eq("id", currentBooking.cancha_id)
          .maybeSingle();
        if (canchaOwner && canchaOwner.owner_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: canchaOwner.owner_id,
            type: "booking_cancelled",
            data: {
              match_id: match.id,
              match_title: match.title,
              cancha_name: canchaOwner.name,
              booking_date: currentBooking.booking_date,
              start_time: currentBooking.start_time,
            },
          }).select();
        }
      }

      newCanchaBookingId = null;
      locationChanged = true;
      changes.push("cancha (eliminada)");

    } else if (selectedCancha && selectedSlot) {
      // New cancha selected — cancel old if existed
      if (match.cancha_booking_id && currentBooking) {
        await updateBookingStatus(supabase, match.cancha_booking_id, "cancelada");

        const { data: oldCanchaOwner } = await supabase
          .from("canchas")
          .select("owner_id, name")
          .eq("id", currentBooking.cancha_id)
          .maybeSingle();
        if (oldCanchaOwner && oldCanchaOwner.owner_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: oldCanchaOwner.owner_id,
            type: "booking_cancelled",
            data: {
              match_id: match.id,
              match_title: match.title,
              cancha_name: currentBooking.canchas?.name ?? oldCanchaOwner.name,
              booking_date: currentBooking.booking_date,
              start_time: currentBooking.start_time,
            },
          }).select();
        }
      }

      // Create new booking
      const finalPrice =
        selectedCancha.discount_percent > 0
          ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
          : selectedCancha.price_per_hour;

      const { data: newBooking, error: bookingErr } = await createBooking(
        supabase,
        {
          cancha_id: selectedCancha.id,
          booking_date: dateStr,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          total_price: finalPrice,
        },
        user.id,
      );

      if (bookingErr) {
        toast.error("Error al crear la nueva reserva: " + bookingErr);
        setSaving(false);
        return;
      }

      newCanchaBookingId = newBooking!.id;
      locationChanged = true;
      changes.push("cancha");

      // Notify new cancha owner
      const { data: newCanchaOwner } = await supabase
        .from("canchas")
        .select("owner_id")
        .eq("id", selectedCancha.id)
        .maybeSingle();
      if (newCanchaOwner && newCanchaOwner.owner_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: newCanchaOwner.owner_id,
          type: "booking_created",
          data: {
            match_id: match.id,
            match_title: title.trim(),
            cancha_name: selectedCancha.name,
            booking_date: dateStr,
            start_time: selectedSlot.start,
          },
        }).select();
      }

    } else if (startsAtISO !== match.starts_at) {
      locationChanged = true;
    }

    // Check if location string changed (manual)
    const newLocation = selectedCancha
      ? `${selectedCancha.name} — ${selectedCancha.address}`
      : (removeCancha ? (manualAddress.trim() || null) : match.location);
    if (newLocation !== match.location) locationChanged = true;

    // Update match
    const { error: matchErr } = await supabase.from("matches").update({
      title: title.trim(),
      description: description.trim() || null,
      skill_level: skillLevelValue,
      max_players: maxPlayers,
      duration_minutes: durationMinutes,
      is_public: isPublic,
      starts_at: startsAtISO,
      city,
      location: newLocation,
      cancha_booking_id: newCanchaBookingId,
      updated_at: new Date().toISOString(),
    }).eq("id", match.id);

    if (matchErr) {
      toast.error("Error al guardar: " + matchErr.message);
      setSaving(false);
      return;
    }

    // If time or location changed: reset confirmed_at for all confirmed participants
    if (locationChanged || startsAtISO !== match.starts_at) {
      await supabase
        .from("match_participants")
        .update({ confirmed_at: null })
        .eq("match_id", match.id)
        .not("confirmed_at", "is", null);
    }

    // Notify all participants (except organizer)
    if (changes.length > 0) {
      const { data: parts } = await supabase
        .from("match_participants")
        .select("user_id")
        .eq("match_id", match.id)
        .neq("user_id", user.id)
        .eq("status", "joined");

      if (parts && parts.length > 0) {
        const notifRows = (parts as { user_id: string }[]).map((p) => ({
          user_id: p.user_id,
          type: "match_updated",
          data: {
            match_id: match.id,
            match_title: title.trim(),
            changes: changes.join(", "),
            needs_reconfirm: locationChanged || startsAtISO !== match.starts_at,
          },
        }));
        await supabase.from("notifications").insert(notifRows).select();
      }

      // Post a chat message about the update
      const changesText = changes.join(", ");
      const reconfirmText = (locationChanged || startsAtISO !== match.starts_at)
        ? " Se requiere re-confirmar asistencia."
        : "";
      await supabase.from("messages").insert({
        match_id: match.id,
        sender_id: user.id,
        content: `📝 El organizador actualizó el partido: ${changesText}.${reconfirmText}`,
      }).select();
    }

    toast.success("¡Partido actualizado!");
    setLocation(`/matches/${match.id}`);
    setSaving(false);
  }

  // ── Render loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) return null;

  const hasCurrentBooking = !!currentBooking && !removeCancha;
  const showCanchaChangedMsg = selectedCancha && selectedSlot && match.cancha_booking_id && !removeCancha;
  const sportTypes = SPORT_ID_TO_CANCHA_TYPES[match.sport_id] ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          {step === 1 ? (
            <button
              onClick={() => setLocation(`/matches/${id}`)}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => { setStep(1); setFieldErrors({}); }}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">Editar partido</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{match.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  step === n ? "bg-violet-600 text-white" : step > n ? "bg-violet-100 text-violet-600" : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-6">

          {/* ── STEP 1: Basic info ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Información del partido</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Editá el nombre, descripción y configuración.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Nombre del partido *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Ej: "Pichanga de los martes"'
                />
                {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Nivel de dificultad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={skillLevel} onValueChange={setSkillLevel}>
                  <SelectTrigger><SelectValue placeholder="Cualquier nivel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier nivel</SelectItem>
                    {SKILL_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="duration">Duración (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                  />
                  {fieldErrors.duration_minutes && <p className="text-xs text-destructive">{fieldErrors.duration_minutes}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="max_players">Máx. jugadores *</Label>
                  <Input
                    id="max_players"
                    type="number"
                    min={2}
                    max={64}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 10)}
                  />
                  {fieldErrors.max_players && <p className="text-xs text-destructive">{fieldErrors.max_players}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles del partido, reglas especiales…"
                />
              </div>

              {/* Visibilidad */}
              <div className="flex items-center justify-between p-4 border border-border/60 rounded-xl bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Partido público</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPublic ? "Aparece en el feed y cualquiera puede unirse." : "Solo visible para quienes tengan el enlace."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPublic ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <Button onClick={goToStep2} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700">
                Siguiente — Fecha y lugar <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Date / Location / Cancha ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Fecha y lugar</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Modificá cuándo y dónde se juega.</p>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-2">
                <Label>Fecha del partido *</Label>
                <input
                  type="date"
                  value={dateStr}
                  min={todayDate()}
                  onChange={(e) => { setDateStr(e.target.value); setSelectedSlot(null); }}
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
              </div>

              {/* Time (only shown if no cancha selected) */}
              {!selectedCancha && (
                <div className="flex flex-col gap-2">
                  <Label>Hora del partido *</Label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {fieldErrors.time && <p className="text-xs text-destructive">{fieldErrors.time}</p>}
                </div>
              )}

              {/* City */}
              <div className="flex flex-col gap-2">
                <Label>Ciudad *</Label>
                <Select value={city} onValueChange={(v) => { setCity(v); setSelectedCancha(null); setSelectedSlot(null); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná la ciudad" /></SelectTrigger>
                  <SelectContent>
                    {ENABLED_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>

              {/* Current booking info */}
              {hasCurrentBooking && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {currentBooking.canchas?.name ?? "Cancha reservada"}
                      </p>
                    </div>
                    <button
                      onClick={() => setRemoveCancha(true)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                    >
                      Quitar cancha
                    </button>
                  </div>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
                    {currentBooking.booking_date} · {currentBooking.start_time?.substring(0, 5)} – {currentBooking.end_time?.substring(0, 5)}
                  </p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-1">
                    Para cambiar la cancha, seleccioná una nueva abajo. La reserva anterior se cancelará automáticamente.
                  </p>
                </div>
              )}

              {removeCancha && (
                <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-red-700 dark:text-red-400">La reserva de cancha será cancelada.</p>
                  <button onClick={() => setRemoveCancha(false)} className="text-xs text-muted-foreground hover:text-foreground">
                    Deshacer
                  </button>
                </div>
              )}

              {/* Cancha picker */}
              {city && (
                <div className="space-y-3 border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">
                      Canchas en {city}
                      {sport && <span className="ml-1 text-muted-foreground font-normal">· {sport.icon} {sport.name}</span>}
                    </p>
                  </div>

                  {loadingCanchas ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : canchas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      {sportTypes.length > 0
                        ? `No hay canchas de ${sport?.name ?? "este deporte"} registradas en ${city}.`
                        : `No hay canchas registradas en ${city}.`}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {canchas.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCancha(selectedCancha?.id === c.id ? null : c)}
                          className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all text-left ${
                            selectedCancha?.id === c.id
                              ? "border-violet-500 bg-violet-500/5 shadow-sm"
                              : "border-border hover:border-foreground/30 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {SPORT_TYPE_LABELS[c.sport_type]} · {c.capacity} jug. · {c.address}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-violet-600 text-sm">
                              ${(c.discount_percent > 0 ? c.price_per_hour * (1 - c.discount_percent / 100) : c.price_per_hour).toLocaleString("es-CO")}/h
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Slots */}
                  {selectedCancha && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Horarios disponibles
                      </p>
                      {loadingSlots ? (
                        <div className="flex justify-center py-3">
                          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : slots.filter((s) => s.isAvailable).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay horarios disponibles para esta fecha.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          {slots.filter((s) => s.isAvailable).map((slot) => (
                            <button
                              key={slot.start}
                              type="button"
                              onClick={() => setSelectedSlot(selectedSlot?.start === slot.start ? null : slot)}
                              className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                                selectedSlot?.start === slot.start
                                  ? "bg-violet-600 text-white border-violet-600"
                                  : "border-border hover:border-violet-400 hover:text-violet-600 bg-white dark:bg-zinc-900"
                              }`}
                            >
                              {slot.start}
                            </button>
                          ))}
                        </div>
                      )}
                      {fieldErrors.slot && <p className="text-xs text-destructive mt-1">{fieldErrors.slot}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Manual address (if no cancha booking and no new cancha selected) */}
              {!hasCurrentBooking && !selectedCancha && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="address">
                    Dirección / Lugar <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Ej: Cancha del barrio, calle 123"
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              {/* Warnings */}
              {(showCanchaChangedMsg) && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-3 flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    La reserva actual será cancelada y se creará una nueva en <strong>{selectedCancha.name}</strong> · {selectedSlot?.start}h.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Al guardar, todos los jugadores recibirán una notificación con los cambios. Las confirmaciones de asistencia se reiniciarán si cambiaste la fecha, hora o cancha.
                </p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 font-bold h-11"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
