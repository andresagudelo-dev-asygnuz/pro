import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAgendaData } from "@/hooks/useAgendaData";
import { useAgendaActions } from "@/hooks/useAgendaActions";
import { AgendaWeekSelector } from "@/components/canchas/AgendaWeekSelector";
import { AgendaDayGrid } from "@/components/canchas/AgendaDayGrid";
import { CanchaScheduleEditor } from "@/components/canchas/CanchaScheduleEditor";
import { RecurringBookingDialog } from "@/components/canchas/RecurringBookingDialog";
import { RecurringOccurrenceMenu } from "@/components/canchas/RecurringOccurrenceMenu";
import { RecurringSeriesList } from "@/components/canchas/RecurringSeriesList";
import { Button } from "@/components/ui/button";
import { Pencil, AlertCircle, RefreshCw, Repeat2, Plus } from "lucide-react";
import { CanchaOwnerTabs } from "@/components/CanchaOwnerTabs";
import { AgendaDaySkeleton } from "@/components/ui/skeletons";
import { type CanchaBooking, type Profile } from "@/lib/types/db";
import { AgendaBookingList } from "@/components/canchas/AgendaBookingList";
import { BookingReceiptViewer } from "@/components/canchas/BookingReceiptViewer";
import type { AgendaItem } from "@/hooks/useAgendaData";
import type { ExpandedOccurrence } from "@/lib/canchas/recurring-api";

function getWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

type BookingFilter = "all" | "pendiente" | "en_validacion" | "confirmada" | "cancelada";

export default function CanchaAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showSeriesList, setShowSeriesList] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<ExpandedOccurrence | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<CanchaBooking | null>(null);

  const { items: agendaItems, refetch: refetchAgenda } = useAgendaData(id ?? "", weekStart);

  function handleRecurringSuccess() {
    queryClient.invalidateQueries({ queryKey: ["recurring", id] });
    queryClient.invalidateQueries({ queryKey: ["agenda", id] });
    refetchAgenda();
  }

  function handleItemClick(item: AgendaItem) {
    if (item.kind === "recurring" && item.occurrence) {
      setSelectedOccurrence(item.occurrence);
    } else {
      setSelectedDate(item.booking_date);
    }
  }

  const {
    cancha, schedule, loadingCancha, savingSchedule,
    bookings, bookerProfiles, loadingBookings, openingChat, slotMinutes,
    loadBookings, updateDay, applyToGroup, applyPreset,
    changeSlotDuration, saveSchedule, handleBookingAction, handlePaymentStatusChange, openChat,
  } = useAgendaActions({
    canchaId: id ?? "",
    userId: user?.id,
    selectedDate,
    onNavigate: setLocation,
    onRefetchAgenda: refetchAgenda,
  });

  if (loadingCancha) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <AgendaDaySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!cancha || (user && cancha.owner_id !== user.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">No tenés permisos para gestionar esta cancha.</p>
        <Link href="/mis-canchas"><Button variant="outline">Mis canchas</Button></Link>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pendiente").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <CanchaOwnerTabs canchaId={id!} canchaName={cancha.name} />

      <div className="flex items-center justify-end gap-2 px-4 pt-3 max-w-2xl mx-auto">
        <button
          onClick={() => { loadBookings(selectedDate); refetchAgenda(); }}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="size-3.5" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5 text-xs"
          onClick={() => setShowRecurringDialog(true)}
        >
          <Plus className="size-3.5" /> Nueva recurrente
        </Button>
        <Link href={`/canchas/${id}/editar`}>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
            <Pencil className="size-3.5" /> Editar
          </Button>
        </Link>
      </div>

      <main className="container mx-auto px-4 py-3 max-w-2xl space-y-5">

        {/* Week grid */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 shadow-sm space-y-3">
          <AgendaWeekSelector
            weekStart={weekStart}
            onPrev={() => setWeekStart((w) => addWeeks(w, -1))}
            onNext={() => setWeekStart((w) => addWeeks(w, 1))}
          />
          <AgendaDayGrid
            items={agendaItems}
            weekStart={weekStart}
            onItemClick={handleItemClick}
          />
        </div>

        {/* Bookings for selected day */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
            <div>
              <h2 className="font-semibold text-base">
                Reservas —{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </h2>
              {pendingBookings > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertCircle className="size-3 text-amber-500" />
                  <p className="text-xs text-amber-600 font-medium">
                    {pendingBookings} pendiente{pendingBookings > 1 ? "s" : ""} de confirmación
                  </p>
                </div>
              )}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-border/60 rounded-xl px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <AgendaBookingList
            canchaId={id!}
            bookings={bookings}
            bookerProfiles={bookerProfiles as Map<string, Profile>}
            loadingBookings={loadingBookings}
            openingChat={openingChat}
            bookingFilter={bookingFilter}
            onFilterChange={setBookingFilter}
            onBookingAction={handleBookingAction}
            onPaymentStatusChange={handlePaymentStatusChange}
            onOpenChat={openChat}
            onViewReceipt={(b) => setReceiptBooking(b)}
          />
        </div>

        {/* Recurring series list */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSeriesList((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="size-4 text-violet-600" />
              <div className="text-left">
                <h2 className="font-semibold text-base">Series recurrentes</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reservas fijas que se repiten periódicamente
                </p>
              </div>
            </div>
            <span className={`text-xs font-medium text-muted-foreground transition-transform duration-200 ${showSeriesList ? "rotate-180" : ""}`}>▾</span>
          </button>

          {showSeriesList && (
            <div className="px-5 pb-5">
              <RecurringSeriesList canchaId={id!} />
            </div>
          )}
        </div>

        {/* Schedule config */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Repeat2 className="size-4 text-violet-600" />
              <div className="text-left">
                <h2 className="font-semibold text-base">Configuración semanal</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se repite automáticamente cada semana · Configurá una vez
                </p>
              </div>
            </div>
            <span className={`text-xs font-medium text-muted-foreground transition-transform duration-200 ${showSchedule ? "rotate-180" : ""}`}>▾</span>
          </button>

          {showSchedule && (
            <CanchaScheduleEditor
              schedule={schedule}
              slotMinutes={slotMinutes}
              isSaving={savingSchedule}
              onUpdateDay={updateDay}
              onApplyToGroup={applyToGroup}
              onApplyPreset={applyPreset}
              onChangeSlotDuration={changeSlotDuration}
              onSave={saveSchedule}
            />
          )}
        </div>
      </main>

      {/* ── Dialogs / Sheets ── */}
      {id && (
        <RecurringBookingDialog
          canchaId={id}
          open={showRecurringDialog}
          onOpenChange={setShowRecurringDialog}
          onSuccess={handleRecurringSuccess}
        />
      )}

      {selectedOccurrence && id && (
        <RecurringOccurrenceMenu
          open={!!selectedOccurrence}
          onOpenChange={(v) => { if (!v) setSelectedOccurrence(null); }}
          occurrence={selectedOccurrence}
          canchaId={id}
          onSuccess={() => {
            setSelectedOccurrence(null);
            handleRecurringSuccess();
          }}
        />
      )}

      {receiptBooking && (
        <BookingReceiptViewer
          booking={receiptBooking}
          open={!!receiptBooking}
          onClose={() => setReceiptBooking(null)}
          onUpdated={() => {
            setReceiptBooking(null);
            loadBookings(selectedDate);
          }}
        />
      )}

    </div>
  );
}
