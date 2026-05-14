import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById } from "@/lib/canchas/api";
import { getCanchaClients, upsertClientTag, removeClientTag, CLIENT_TAG_CONFIG, type CanchaClient, type ClientTag } from "@/lib/canchas/clients-api";
import { getOrCreateConversation } from "@/lib/chat/api";
import { CanchaOwnerTabs } from "@/components/CanchaOwnerTabs";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { MessageCircle, ExternalLink, Star, Tag, X, Search, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Cancha } from "@/lib/types/db";


type FilterType = "all" | "vip" | "frecuente" | "bloqueado";

function formatMoney(n: number) {
  return "$" + n.toLocaleString("es-CO");
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function CanchaClientesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [cancha, setCancha]           = useState<Cancha | null>(null);
  const [clients, setClients]         = useState<CanchaClient[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<FilterType>("all");
  const [search, setSearch]           = useState("");
  const [taggingId, setTaggingId]     = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [canchaRes, clientsRes] = await Promise.all([
      getCanchaById(supabase, id),
      getCanchaClients(supabase, id),
    ]);
    if (canchaRes.data) setCancha(canchaRes.data);
    setClients(clientsRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleTag(client: CanchaClient, tag: ClientTag | null) {
    if (!id || !user) return;
    setTaggingId(client.user_id);
    if (tag === null) {
      await removeClientTag(supabase, id, client.user_id);
      toast.success("Etiqueta eliminada.");
    } else {
      const { error } = await upsertClientTag(supabase, id, client.user_id, tag, undefined, user.id);
      if (error) { toast.error("No se pudo guardar."); setTaggingId(null); return; }
      toast.success(`Cliente marcado como ${CLIENT_TAG_CONFIG[tag].label}.`);
    }
    setTaggingId(null);
    setClients(prev => prev.map(c =>
      c.user_id === client.user_id ? { ...c, tag } : c
    ));
  }

  async function openChat(client: CanchaClient) {
    if (!user || !cancha) return;
    setOpeningChat(client.user_id);
    const name = client.full_name ?? client.username ?? "Cliente";
    const refId = [user.id, client.user_id].sort().join("_");
    const { data, error } = await getOrCreateConversation(
      supabase, "direct", refId,
      [user.id, client.user_id],
      `${cancha.name} — ${name}`,
      cancha.name,
      { cancha_id: cancha.id },
    );
    setOpeningChat(null);
    if (error || !data) { toast.error("No se pudo abrir el chat."); return; }
    setLocation(`/chat/${data.id}`);
  }

  const filtered = clients.filter(c => {
    if (filter !== "all" && c.tag !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.full_name ?? "").toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalRevenue  = clients.reduce((s, c) => s + c.total_spent, 0);
  const activeThisMonth = clients.filter(c => {
    if (!c.last_booking_date) return false;
    const now = new Date();
    const d   = new Date(c.last_booking_date + "T12:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <CanchaOwnerTabs canchaId={id!} canchaName={cancha?.name} />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-3.5 text-center shadow-sm">
            <p className="text-xl font-bold text-violet-600">{clients.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total clientes</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-3.5 text-center shadow-sm">
            <p className="text-xl font-bold text-green-600">{activeThisMonth}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Activos este mes</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-3.5 text-center shadow-sm">
            <p className="text-xl font-bold text-emerald-600 text-[15px]">{formatMoney(totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ingresos totales</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-white dark:bg-zinc-900 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {(["all","vip","frecuente","bloqueado"] as FilterType[]).map(f => {
            const count = f === "all" ? clients.length : clients.filter(c => c.tag === f).length;
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filter === f
                    ? "bg-violet-600 text-white border-violet-600"
                    : "border-border/60 bg-white dark:bg-zinc-900 hover:border-violet-400"
                }`}
              >
                {f === "all" ? `Todos (${count})` : `${CLIENT_TAG_CONFIG[f as ClientTag].label} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">{clients.length === 0 ? "Aún no hay clientes registrados." : "Sin clientes con este filtro."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((client, idx) => {
              const name     = client.full_name ?? client.username ?? "Usuario";
              const isTop3   = idx < 3 && filter === "all" && !search;
              const cancelRate = client.total_bookings > 0 ? Math.round((client.cancelled / client.total_bookings) * 100) : 0;

              return (
                <div key={client.user_id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">

                  {/* Main row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="relative shrink-0">
                      <Avatar className="size-11 ring-2 ring-offset-1 ring-violet-200 dark:ring-violet-800">
                        {client.avatar_url && <AvatarImage src={client.avatar_url} />}
                        <AvatarFallback className="text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {initialsFromName(name)}
                        </AvatarFallback>
                      </Avatar>
                      {isTop3 && (
                        <span className="absolute -top-1 -right-1 text-[10px] bg-amber-400 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold">{name}</p>
                        {client.tag && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CLIENT_TAG_CONFIG[client.tag].bg} ${CLIENT_TAG_CONFIG[client.tag].color}`}>
                            {CLIENT_TAG_CONFIG[client.tag].label}
                          </span>
                        )}
                      </div>
                      {client.city && <p className="text-[11px] text-muted-foreground">📍 {client.city}</p>}

                      {/* Stats chips */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <TrendingUp className="size-3" /> {client.total_bookings} reservas
                        </span>
                        <span className="text-[11px] text-green-600 font-medium">
                          {formatMoney(client.total_spent)}
                        </span>
                        {cancelRate > 20 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-red-500">
                            <AlertTriangle className="size-3" /> {cancelRate}% cancel.
                          </span>
                        )}
                        {client.last_booking_date && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Clock className="size-3" /> {formatDate(client.last_booking_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Booking breakdown bar */}
                  <div className="px-4 pb-3">
                    <div className="flex rounded-full overflow-hidden h-1.5 bg-zinc-100 dark:bg-zinc-800">
                      {client.confirmed > 0 && (
                        <div className="bg-green-500 h-full" style={{ width: `${(client.confirmed / client.total_bookings) * 100}%` }} title={`${client.confirmed} confirmadas`} />
                      )}
                      {client.pending > 0 && (
                        <div className="bg-amber-400 h-full" style={{ width: `${(client.pending / client.total_bookings) * 100}%` }} title={`${client.pending} pendientes`} />
                      )}
                      {client.cancelled > 0 && (
                        <div className="bg-red-400 h-full" style={{ width: `${(client.cancelled / client.total_bookings) * 100}%` }} title={`${client.cancelled} canceladas`} />
                      )}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-green-600">✓ {client.confirmed}</span>
                      {client.pending > 0 && <span className="text-[10px] text-amber-500">⏳ {client.pending}</span>}
                      {client.cancelled > 0 && <span className="text-[10px] text-red-500">✗ {client.cancelled}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-3 pb-3 border-t border-border/30 pt-2.5">
                    <Link href={`/profile/${client.user_id}`}>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                        <ExternalLink className="size-3" /> Perfil
                      </button>
                    </Link>

                    <button
                      onClick={() => openChat(client)}
                      disabled={openingChat === client.user_id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors font-medium disabled:opacity-50"
                    >
                      {openingChat === client.user_id
                        ? <div className="size-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        : <MessageCircle className="size-3" />}
                      Chat
                    </button>

                    <div className="flex-1" />

                    {/* Tag button */}
                    {taggingId === client.user_id ? (
                      <div className="flex items-center gap-1">
                        {(["vip","frecuente","bloqueado"] as ClientTag[]).map(t => (
                          <button
                            key={t}
                            onClick={() => handleTag(client, t)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all hover:scale-105 ${CLIENT_TAG_CONFIG[t].bg} ${CLIENT_TAG_CONFIG[t].color}`}
                          >
                            {CLIENT_TAG_CONFIG[t].label}
                          </button>
                        ))}
                        {client.tag && (
                          <button onClick={() => handleTag(client, null)} className="px-2 py-0.5 rounded-full text-[10px] border border-border/60 text-muted-foreground hover:bg-muted/50">
                            <X className="size-2.5 inline" /> Quitar
                          </button>
                        )}
                        <button onClick={() => setTaggingId(null)} className="ml-1 text-muted-foreground hover:text-foreground">
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTaggingId(client.user_id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Tag className="size-3" />
                        {client.tag ? "Cambiar" : "Etiquetar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
