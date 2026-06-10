import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas, getAvailableSlots, createBooking, getCanchaById } from "@/lib/canchas/api";
import { getVenuesByCity } from "@/lib/venues/api";
import { getFriends, sendMatchInvitations, type FriendWithProfile } from "@/lib/friends/api";
import { sendNotification } from "@/lib/notifications/api";
import { createMatch } from "@/lib/matches/api";
import { listSports } from "@/lib/sports/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SKILL_LEVELS, ENABLED_CITIES, SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, SPORT_ID_TO_CANCHA_TYPES,
  type Cancha, type TimeSlot, type Sport, type Venue,
} from "@/lib/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft, ArrowRight, Building2, MapPin, Users, Map, List, CheckCircle2, Bell } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import { useNotifCount } from "@/context/NotifContext";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

import { StepMatchDetails } from "@/components/matches/wizard/StepMatchDetails";
import { StepLocationPicker } from "@/components/matches/wizard/StepLocationPicker";
import { StepFriendsInvite } from "@/components/matches/wizard/StepFriendsInvite";
import type { MatchInfo } from "@/components/matches/wizard/types";

const VenueCanchaPickerMap = lazy(() =>
  import("@/components/matches/VenueCanchaPickerMap").then((m) => ({ default: m.VenueCanchaPickerMap }))
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

const UUID_RE = /^[0-9a-f-]{36}$/;

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const rawBookingId = params.get("booking_id");
  const rawCanchaId = params.get("cancha_id");
  const date = params.get("date");
  const start = params.get("start");
  const end = params.get("end");
  const bookingId = rawBookingId && UUID_RE.test(rawBookingId) ? rawBookingId : null;
  const canchaId = rawCanchaId && UUID_RE.test(rawCanchaId) ? rawCanchaId : null;
  return { bookingId, canchaId, date, start, end };
}

// Wizard steps abstracted to @/components/matches/wizard/

// ─── wizard step indicator ─────────────────────────────────────────────────────

const STEP_LABELS = ["Info", "Lugar", "Amigos"];

interface WizardStepIndicatorProps {
  step: 1 | 2 | 3;
}

function WizardStepIndicator({ step }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {STEP_LABELS.map((label, idx) => {
        const n = idx + 1;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${step === n ? "bg-brand-primary text-white" : step > n ? "bg-brand-primary/20 text-brand-primary" : "bg-muted text-muted-foreground"}`}>
              <span className="font-bold">{n}</span><span className="hidden sm:inline">{label}</span>
            </div>
            {idx < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewMatchPage() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifCount();
  const [, setLocation] = useLocation();

  // wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // step 1 state
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    title: "", sport_id: "", skill_level: "", duration_minutes: 60, max_players: 10, description: "",
  });
  const [isPublic, setIsPublic] = useState(true);
  const [sports, setSports] = useState<Sport[]>([]);

  // step 2 state
  const [city, setCity] = useState("");
  const [dateStr, setDateStr] = useState(todayDate());
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueFilter, setVenueFilter] = useState("__all__");
  const [venueView, setVenueView] = useState<"map" | "list">("map");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState("");

  // step 3 state
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  // booking preselection
  const [preselectedBookingId, setPreselectedBookingId] = useState<string | null>(null);
  const preselectedBookingIdRef = useRef<string | null>(null);

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    listSports(supabase).then(({ data }) => { if (data) setSports(data); });
  }, []);

  useEffect(() => {
    const { bookingId, canchaId, date, start, end } = parseUrlParams();
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
    if (!city) {
      setCanchas([]); setVenues([]);
      if (!preselectedBookingIdRef.current) { setSelectedCancha(null); setSelectedSlot(null); }
      setVenueFilter("__all__");
      return;
    }
    setLoadingCanchas(true);
    if (!preselectedBookingIdRef.current) { setSelectedCancha(null); setSelectedSlot(null); }
    setVenueFilter("__all__");
    getAllCanchas(supabase, { city, sportTypes: SPORT_ID_TO_CANCHA_TYPES[matchInfo.sport_id] ?? [] })
      .then(({ data }) => { setCanchas(data ?? []); setLoadingCanchas(false); });
    getVenuesByCity(supabase, city).then(({ data }) => setVenues(data ?? []));
  }, [city, matchInfo.sport_id]);

  useEffect(() => {
    if (step === 2 && !userLocation) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("[geolocation]", err.message),
      );
    }
  }, [step]);

  useEffect(() => {
    if (!selectedCancha || !dateStr) { setSlots([]); return; }
    if (!preselectedBookingIdRef.current) setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, selectedCancha.id, dateStr)
      .then(({ data }) => { setSlots(data ?? []); setLoadingSlots(false); });
  }, [selectedCancha, dateStr]);

  // ── callbacks ──────────────────────────────────────────────────────────────

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const { data } = await getFriends(supabase, user.id);
    setFriends(data ?? []);
    setLoadingFriends(false);
  }, [user]);

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {};
    if (matchInfo.title.trim().length < 3) e.title = "El título debe tener al menos 3 caracteres.";
    if (!matchInfo.sport_id) e.sport_id = "Seleccioná un deporte.";
    if (matchInfo.max_players < 2) e.max_players = "Mínimo 2 jugadores.";
    if (matchInfo.duration_minutes < 15) e.duration_minutes = "Duración mínima 15 min.";
    return e;
  }

  function goToStep2() {
    const e = validateStep1();
    if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep3() {
    const e: Record<string, string> = {};
    if (!city) e.city = "Seleccioná la ciudad del evento.";
    if (!dateStr) e.date = "Indicá la fecha del partido.";
    if (selectedCancha && !selectedSlot) e.slot = "Seleccioná un horario disponible para la cancha.";
    if (!selectedCancha && !selectedSlot) e.slot = "Seleccioná una cancha y un horario.";
    if (Object.keys(e).length > 0) { setFieldErrors(e); return; }
    setFieldErrors({});
    loadFriends();
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFriend(id: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!user) { setLocation("/login"); return; }
    setPending(true);

    // Phase 1: create booking if needed
    let cancha_booking_id: string | null = preselectedBookingId;
    if (!preselectedBookingId && selectedCancha && selectedSlot) {
      const price = selectedCancha.discount_percent > 0
        ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
        : selectedCancha.price_per_hour;
      const { data: booking, error: bookingErr } = await createBooking(
        supabase,
        { cancha_id: selectedCancha.id, booking_date: dateStr, start_time: selectedSlot.start, end_time: selectedSlot.end, total_price: price },
        user.id,
      );
      if (bookingErr) { setError(bookingErr); setPending(false); return; }
      cancha_booking_id = booking!.id;
    }

    // Phase 2: create match
    const matchLocation = selectedCancha ? `${selectedCancha.name} — ${selectedCancha.address}` : manualAddress || null;
    const startsAtISO = selectedSlot
      ? new Date(`${dateStr}T${selectedSlot.start}:00`).toISOString()
      : new Date(`${dateStr}T00:00:00`).toISOString();

    const { data, error: matchErr } = await createMatch(supabase, {
      sport_id: matchInfo.sport_id,
      title: matchInfo.title.trim(),
      description: matchInfo.description.trim() || null,
      city,
      location: matchLocation,
      starts_at: startsAtISO,
      duration_minutes: matchInfo.duration_minutes,
      max_players: matchInfo.max_players,
      skill_level: matchInfo.skill_level && matchInfo.skill_level !== "any" ? matchInfo.skill_level : null,
      is_public: isPublic,
      cancha_booking_id: cancha_booking_id ?? null,
    }, user.id);

    if (matchErr) { setError(matchErr); setPending(false); return; }

    // Phase 3: invite friends + notify
    if (data && selectedFriendIds.size > 0) {
      const inviteeIds = Array.from(selectedFriendIds);
      const { error: invErr } = await sendMatchInvitations(supabase, data.id, user.id, inviteeIds);
      if (invErr) {
        toast.error(`Partido creado, pero error al enviar invitaciones: ${invErr}`);
      } else {
        toast.success(`Partido creado. ${selectedFriendIds.size} invitación(es) enviada(s).`);
      }
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

    // Phase 4: navigate
    if (data) setLocation(`/matches/${data.id}`);
    setPending(false);
  }

  // ── progress ───────────────────────────────────────────────────────────────

  const progressWidth = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <NavDrawer />
          {step === 1
            ? <Link href="/feed"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
            : <Button variant="ghost" size="icon" onClick={() => { setStep((s) => (s - 1) as 1 | 2 | 3); setFieldErrors({}); }}><ArrowLeft className="size-4" /></Button>
          }
          <h1 className="text-lg font-bold flex-1">Crear partido</h1>
          <WizardStepIndicator step={step} />
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
                <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
                  {initialsFromName(profile?.full_name ?? profile?.username)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-brand-primary transition-all duration-500 ease-out" style={{ width: progressWidth }} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-6">
          {step === 1 && (
            <StepMatchDetails
              matchInfo={matchInfo}
              sports={sports}
              isPublic={isPublic}
              fieldErrors={fieldErrors}
              preselectedBookingId={preselectedBookingId}
              onChangeMatchInfo={(update) => setMatchInfo((prev) => ({ ...prev, ...update }))}
              onTogglePublic={() => setIsPublic((v) => !v)}
              onNext={goToStep2}
            />
          )}
          {step === 2 && (
            <StepLocationPicker
              preselectedBookingId={preselectedBookingId}
              selectedCancha={selectedCancha}
              selectedSlot={selectedSlot}
              dateStr={dateStr}
              city={city}
              canchas={canchas}
              loadingCanchas={loadingCanchas}
              slots={slots}
              loadingSlots={loadingSlots}
              venues={venues}
              venueFilter={venueFilter}
              venueView={venueView}
              userLocation={userLocation}
              manualAddress={manualAddress}
              fieldErrors={fieldErrors}
              error={error}
              sportId={matchInfo.sport_id}
              sports={sports}
              onDateChange={setDateStr}
              onCityChange={setCity}
              onSelectCancha={setSelectedCancha}
              onSelectSlot={setSelectedSlot}
              onVenueFilterChange={setVenueFilter}
              onVenueViewChange={setVenueView}
              onManualAddressChange={setManualAddress}
              onNext={goToStep3}
            />
          )}
          {step === 3 && (
            <StepFriendsInvite
              friends={friends}
              loadingFriends={loadingFriends}
              selectedFriendIds={selectedFriendIds}
              currentUserId={user?.id ?? ""}
              error={error}
              pending={pending}
              onToggleFriend={toggleFriend}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
