import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, getClientBookingsForCancha } from "@/lib/canchas/api";
import { getProfileById } from "@/lib/profiles/api";
import { getCanchaClients, type CanchaClient } from "@/lib/canchas/clients-api";
import { listRecurringWithExceptionsForCancha, cancelRecurring } from "@/lib/canchas/recurring-api";
import { getClientTag, setClientTag, removeClientTag } from "@/lib/canchas/client-tags-api";
import type { Cancha, CanchaBooking, RecurringBooking, ClientTagType } from "@/lib/types/db";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, ExternalLink, CalendarDays, RefreshCw, Trash2, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecurringBookingDialog } from "@/components/canchas/RecurringBookingDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DAY_LABELS } from "@/lib/types/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CanchaClienteDetallePage() {
  const { id: canchaId, userId } = useParams<{ id: string; userId: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [client, setClient] = useState<CanchaClient | null>(null);
  
  // Bookings (ad-hoc) - fetching recently created
  const [recentBookings, setRecentBookings] = useState<CanchaBooking[]>([]);
  
  // Recurring
  const [recurringSeries, setRecurringSeries] = useState<RecurringBooking[]>([]);
  const [showNewRecurring, setShowNewRecurring] = useState(false);
  
  // Mass cancellation
  const [showCancelAllAlert, setShowCancelAllAlert] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Client tag
  const [clientTag, setClientTagState] = useState<ClientTagType | null>(null);
  const [savingTag, setSavingTag] = useState(false);

  const loadData = useCallback(async () => {
    if (!canchaId || !userId) return;
    setLoading(true);

    try {
      const [canchaRes, clientsRes, recurringRes, bookingsRes, tagRes] = await Promise.all([
        getCanchaById(supabase, canchaId),
        getCanchaClients(supabase, canchaId),
        listRecurringWithExceptionsForCancha(supabase, canchaId),
        getClientBookingsForCancha(supabase, canchaId, userId),
        getClientTag(supabase, canchaId, userId),
      ]);
      if (tagRes.data) setClientTagState(tagRes.data.tag);

      if (canchaRes.data) setCancha(canchaRes.data);
      
      const foundClient = clientsRes.data?.find(c => c.user_id === userId);
      if (foundClient) {
        setClient(foundClient);
      } else {
        const { data: profile } = await getProfileById(supabase, userId);
        if (profile) {
          setClient({
            user_id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            city: profile.city,
            total_bookings: 0,
            confirmed: 0,
            cancelled: 0,
            pending: 0,
            total_spent: 0,
            last_booking_date: null,
            tag: null,
            tag_notes: null
          });
        }
      }

      if (recurringRes.data) {
        setRecurringSeries(recurringRes.data.recurrings.filter(r => r.user_id === userId));
      }

      if (bookingsRes.data) {
        setRecentBookings(bookingsRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los datos del cliente");
    } finally {
      setLoading(false);
    }
  }, [canchaId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelAllRecurring = async () => {
    if (!canchaId || !userId) return;
    setCancelling(true);
    
    try {
      const activeSeries = recurringSeries.filter(r => r.status !== "cancelada");
      
      for (const series of activeSeries) {
        await cancelRecurring(supabase, series.id);
      }
      
      toast.success("Todas las series activas fueron canceladas");
      loadData();
    } catch (err) {
      toast.error("Ocurrió un error al cancelar las series");
    } finally {
      setCancelling(false);
      setShowCancelAllAlert(false);
    }
  };

  const handleCancelSingleRecurring = async (seriesId: string) => {
    try {
      const { error } = await cancelRecurring(supabase, seriesId);
      if (error) throw new Error(error);
      toast.success("Serie cancelada");
      loadData();
    } catch (err) {
      toast.error("No se pudo cancelar la serie");
    }
  };

  const handleTagChange = async (tag: ClientTagType | null) => {
    if (!canchaId || !userId || !user) return;
    setSavingTag(true);
    if (tag === null) {
      const { error } = await removeClientTag(supabase, canchaId, userId);
      if (error) toast.error(error);
      else { setClientTagState(null); toast.success("Etiqueta eliminada."); }
    } else {
      const { error } = await setClientTag(supabase, canchaId, userId, tag, user.id);
      if (error) toast.error(error);
      else { setClientTagState(tag); toast.success("Etiqueta actualizada."); }
    }
    setSavingTag(false);
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <PageHeader title="Cliente no encontrado" backHref={`/canchas/${canchaId}/clientes`} />
        <div className="flex flex-col items-center justify-center p-8 mt-10">
          <p className="text-muted-foreground text-center">El cliente no existe o no pudo ser cargado.</p>
        </div>
      </>
    );
  }

  const name = client.full_name || client.username || "Usuario";
  const activeRecurringCount = recurringSeries.filter(r => r.status !== "cancelada").length;

  return (
    <>
      <PageHeader 
        title="Trazabilidad" 
        backHref={`/canchas/${canchaId}/clientes`}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Header Profile Info */}
        <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar className="size-16 border-2 border-violet-100 dark:border-violet-900">
              {client.avatar_url && <AvatarImage src={client.avatar_url} />}
              <AvatarFallback className="text-xl font-bold bg-violet-100 text-violet-700">
                {initialsFromName(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 mb-2">
                {client.city ? `📍 ${client.city}` : "Sin ciudad registrada"}
              </p>
              <Link href={`/profile/${client.user_id}`}>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <ExternalLink className="size-3.5" />
                  Ver Perfil Global
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border/60">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600">{client.total_bookings}</p>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Reservas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">${(client.total_spent / 1000).toFixed(0)}k</p>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Ingresos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{activeRecurringCount}</p>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Recurrentes</p>
            </div>
          </div>
        </div>

        {/* Client Tag */}
        <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="size-4 text-violet-500 shrink-0" />
            <span className="text-sm font-semibold">Etiqueta del cliente</span>
            {clientTag && (
              <button
                onClick={() => handleTagChange(null)}
                disabled={savingTag}
                className="ml-auto text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                Quitar etiqueta
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { tag: "vip",       label: "⭐ VIP",        style: "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300" },
              { tag: "frecuente", label: "🔄 Frecuente",  style: "border-violet-300 text-violet-700 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300" },
              { tag: "bloqueado", label: "🚫 Bloqueado",  style: "border-red-300 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300" },
            ] as { tag: ClientTagType; label: string; style: string }[]).map(({ tag, label, style }) => (
              <button
                key={tag}
                onClick={() => handleTagChange(clientTag === tag ? null : tag)}
                disabled={savingTag}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                  clientTag === tag
                    ? style
                    : "border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Series Recurrentes Section */}
        <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <RefreshCw className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="font-semibold text-sm">Series Recurrentes</h2>
            </div>
            {activeRecurringCount > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-7 text-[10px] gap-1"
                onClick={() => setShowCancelAllAlert(true)}
              >
                <Trash2 className="size-3" />
                Cancelar Todas
              </Button>
            )}
          </div>
          <div className="p-4 space-y-3">
            {recurringSeries.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-4">No tiene series recurrentes.</p>
            ) : (
              recurringSeries.map(series => (
                <div key={series.id} className={`flex items-center justify-between p-3 rounded-xl border ${series.status === "cancelada" ? "opacity-60 bg-muted/30" : "bg-card"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{DAY_LABELS[series.day_of_week]}</span>
                      <span className="text-sm text-muted-foreground">
                        {series.start_time.slice(0, 5)} - {series.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {series.frequency}
                      </Badge>
                      {series.status === "cancelada" && (
                        <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
                      )}
                      {series.status !== "cancelada" && (
                         <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Activa</Badge>
                      )}
                    </div>
                  </div>
                  
                  {series.status !== "cancelada" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm("¿Seguro que deseas cancelar esta serie?")) {
                          handleCancelSingleRecurring(series.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))
            )}

            <Button 
              variant="outline" 
              className="w-full mt-2 gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20"
              onClick={() => setShowNewRecurring(true)}
            >
              <Plus className="size-4" />
              Crear Nueva Serie para {client.full_name?.split(" ")[0] || "Cliente"}
            </Button>
          </div>
        </div>

        {/* Historial de Reservas Recientes */}
        <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CalendarDays className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm">Últimas 10 reservas físicas</h2>
          </div>
          <div className="p-0">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">No hay reservas recientes.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {recentBookings.map(booking => {
                  let statusBadge = null;
                  if (booking.status === "confirmada") statusBadge = <span className="w-2 h-2 rounded-full bg-green-500" />;
                  else if (booking.status === "cancelada") statusBadge = <span className="w-2 h-2 rounded-full bg-red-500" />;
                  else statusBadge = <span className="w-2 h-2 rounded-full bg-amber-500" />;

                  return (
                    <div key={booking.id} className="p-4 flex flex-col gap-1 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize">
                          {format(new Date(booking.booking_date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                          {statusBadge}
                          <span className="capitalize">{booking.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <p>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</p>
                        <p>${booking.total_price.toLocaleString("es-CO")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {canchaId && (
        <RecurringBookingDialog
          open={showNewRecurring}
          onOpenChange={setShowNewRecurring}
          canchaId={canchaId}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Cancel All Alert */}
      <AlertDialog open={showCancelAllAlert} onOpenChange={setShowCancelAllAlert}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar masivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará TODAS las series recurrentes activas de este usuario en esta cancha. Las reservas ya cobradas o pasadas no se verán afectadas, pero se detendrá la expansión futura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCancelAllRecurring();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Sí, cancelar todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
