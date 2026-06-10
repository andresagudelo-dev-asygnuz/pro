import { Link } from "wouter";
import { CheckCircle2, XCircle, Users, MessageCircle, ExternalLink, FileSearch } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { initialsFromName } from "@/lib/format";
import { type CanchaBooking, type PaymentStatus, type Profile } from "@/lib/types/db";

type BookingFilter = "all" | "pendiente" | "en_validacion" | "confirmada" | "cancelada";

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; style: string }> = {
  sin_anticipo: {
    label: "Sin anticipo",
    style: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700",
  },
  anticipo_pagado: {
    label: "Anticipo ✓",
    style: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  pagado_total: {
    label: "Pagado total ✓",
    style: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  },
};

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pendiente: {
    label: "Pendiente",
    style: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  en_validacion: {
    label: "Por validar",
    style: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  },
  confirmada: {
    label: "Confirmada",
    style: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  finalizada: {
    label: "Finalizada",
    style: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-transparent",
  },
};

const FILTER_LABELS: Record<BookingFilter, string> = {
  all: "Todas", pendiente: "Pendientes", en_validacion: "Por validar", confirmada: "Confirmadas", cancelada: "Canceladas",
};

interface AgendaBookingListProps {
  canchaId: string;
  bookings: CanchaBooking[];
  bookerProfiles: Map<string, Profile>;
  loadingBookings: boolean;
  openingChat: string | null;
  bookingFilter: BookingFilter;
  onFilterChange: (f: BookingFilter) => void;
  onBookingAction: (booking: CanchaBooking, status: "confirmada" | "cancelada") => void;
  onPaymentStatusChange: (bookingId: string, paymentStatus: PaymentStatus) => void;
  onOpenChat: (booking: CanchaBooking) => void;
  onViewReceipt?: (booking: CanchaBooking) => void;
}

export function AgendaBookingList({
  canchaId,
  bookings,
  bookerProfiles,
  loadingBookings,
  openingChat,
  bookingFilter,
  onFilterChange,
  onBookingAction,
  onPaymentStatusChange,
  onOpenChat,
  onViewReceipt,
}: AgendaBookingListProps) {
  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter((b) => b.status === bookingFilter);
  const filterCounts: Record<BookingFilter, number> = {
    all: bookings.length,
    pendiente: bookings.filter((b) => b.status === "pendiente").length,
    en_validacion: bookings.filter((b) => b.status === "en_validacion").length,
    confirmada: bookings.filter((b) => b.status === "confirmada").length,
    cancelada: bookings.filter((b) => b.status === "cancelada").length,
  };

  return (
    <>
      {bookings.length > 0 && (
        <div className="flex gap-2 px-5 pt-3 pb-1 overflow-x-auto scrollbar-none">
          {(["all", "pendiente", "en_validacion", "confirmada", "cancelada"] as BookingFilter[]).map((f) => {
            const count = filterCounts[f];
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  bookingFilter === f
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-border/60 hover:border-violet-400 bg-background"
                }`}
              >
                {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      )}

      <div className="p-5 pt-3">
        {loadingBookings ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        ) : !loadingBookings && bookings.length === 0 ? (
          <EmptyState
            title="Sin reservas hoy"
            cta={{ label: "Ver cancha pública", href: `/canchas/${canchaId}` }}
          />
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-6">
            <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin reservas con este filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b: CanchaBooking) => {
              const booker = bookerProfiles.get(b.booked_by) as Profile | undefined;
              const cfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendiente;
              const bookerName = booker?.full_name ?? booker?.username ?? "Usuario";
              const isOpeningThisChat = openingChat === b.id;
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border transition-colors ${
                    b.status === "pendiente"
                      ? "border-amber-200 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-900/10"
                      : b.status === "en_validacion"
                      ? "border-orange-200 dark:border-orange-700/60 bg-orange-50/30 dark:bg-orange-900/10"
                      : "border-border/60 bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3.5">
                    <Link href={`/profile/${b.booked_by}`}>
                      <Avatar className="size-10 shrink-0 cursor-pointer ring-2 ring-offset-1 ring-violet-200 dark:ring-violet-800">
                        {booker?.avatar_url && <AvatarImage src={booker.avatar_url} />}
                        <AvatarFallback className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {initialsFromName(bookerName)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{bookerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.start_time.substring(0, 5)} – {b.end_time.substring(0, 5)} ·{" "}
                        <span className="font-medium text-violet-600 dark:text-violet-400">
                          ${Number(b.total_price).toLocaleString("es-CO")}
                        </span>
                      </p>
                      {b.notes && (
                        <p className="text-xs text-muted-foreground truncate">📝 {b.notes}</p>
                      )}
                      {/* Payment status quick-toggle */}
                      {b.status !== "cancelada" && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {(["sin_anticipo", "anticipo_pagado", "pagado_total"] as PaymentStatus[]).map((ps) => {
                            const pc = PAYMENT_CONFIG[ps];
                            const isActive = (b.payment_status ?? "sin_anticipo") === ps;
                            return (
                              <button
                                key={ps}
                                onClick={(e) => { e.stopPropagation(); onPaymentStatusChange(b.id, ps); }}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border transition-all ${
                                  isActive ? pc.style : "border-border/40 text-muted-foreground hover:border-border"
                                }`}
                              >
                                {pc.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.style}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 pb-3 border-t border-border/30 pt-2.5">
                    <Link href={`/profile/${b.booked_by}`}>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                        <ExternalLink className="size-3" /> Ver perfil
                      </button>
                    </Link>

                    <button
                      onClick={() => onOpenChat(b)}
                      disabled={isOpeningThisChat}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50 font-medium"
                    >
                      {isOpeningThisChat
                        ? <div className="size-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        : <MessageCircle className="size-3" />}
                      {isOpeningThisChat ? "Abriendo..." : "Chat"}
                    </button>

                    <div className="flex-1" />

                    {b.status === "en_validacion" && onViewReceipt && (
                      <button
                        onClick={() => onViewReceipt(b)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-medium"
                      >
                        <FileSearch className="size-3.5" /> Ver comprobante
                      </button>
                    )}

                    {b.status === "pendiente" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onBookingAction(b, "confirmada")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
                        >
                          <CheckCircle2 className="size-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => onBookingAction(b, "cancelada")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors font-medium"
                        >
                          <XCircle className="size-3.5" /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
