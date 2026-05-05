import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById } from "@/lib/canchas/api";
import {
  getCanchaAdmins,
  addCanchaAdmin,
  removeCanchaAdmin,
  searchProfiles,
  DEFAULT_PERMS,
  type CanchaAdmin,
  type AdminRole,
  type AdminPermissions,
  type UserSearchResult,
} from "@/lib/canchas/admins-api";
import { CanchaOwnerTabs } from "@/components/CanchaOwnerTabs";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { Search, Plus, Trash2, Shield, User2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Cancha } from "@/lib/types/db";

const supabase = createClient();

const ROLE_CONFIG: Record<AdminRole, { label: string; desc: string; color: string; bg: string }> = {
  admin: {
    label: "Admin",
    desc: "Acceso completo: agenda, horarios, clientes y estadísticas.",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700",
  },
  staff: {
    label: "Staff",
    desc: "Solo puede confirmar/cancelar reservas y ver estadísticas básicas.",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  },
};

const PERM_LABELS: { key: keyof AdminPermissions; label: string; hint: string }[] = [
  { key: "can_confirm",  label: "Confirmar reservas",  hint: "Aprobar o cancelar reservas de clientes" },
  { key: "can_schedule", label: "Gestionar horarios",  hint: "Editar horarios y disponibilidad" },
  { key: "can_stats",    label: "Ver estadísticas",    hint: "Acceso al dashboard de estadísticas" },
  { key: "can_clients",  label: "Ver clientes",        hint: "Acceso a la sección de clientes y etiquetas" },
];

export default function CanchaEquipoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cancha, setCancha]       = useState<Cancha | null>(null);
  const [admins, setAdmins]       = useState<CanchaAdmin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isOwner, setIsOwner]     = useState(false);

  const [searchQ, setSearchQ]           = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [selectedUser, setSelectedUser]   = useState<UserSearchResult | null>(null);
  const [newRole, setNewRole]             = useState<AdminRole>("admin");
  const [newPerms, setNewPerms]           = useState<AdminPermissions>(DEFAULT_PERMS.admin);
  const [adding, setAdding]               = useState(false);
  const [removingId, setRemovingId]       = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [canchaRes, adminsRes] = await Promise.all([
      getCanchaById(supabase, id),
      getCanchaAdmins(supabase, id),
    ]);
    if (canchaRes.data) {
      setCancha(canchaRes.data);
      setIsOwner(canchaRes.data.owner_id === user.id);
    }
    setAdmins(adminsRes.data ?? []);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  function handleSearchChange(q: string) {
    setSearchQ(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await searchProfiles(supabase, q);
      const excluded = new Set([cancha?.owner_id, user?.id, ...admins.map(a => a.user_id)]);
      setSearchResults((data ?? []).filter(p => !excluded.has(p.id)));
      setSearching(false);
    }, 300);
  }

  function handleSelectUser(p: UserSearchResult) {
    setSelectedUser(p);
    setSearchQ(p.full_name ?? p.username ?? "");
    setSearchResults([]);
  }

  function handleRoleChange(role: AdminRole) {
    setNewRole(role);
    setNewPerms(DEFAULT_PERMS[role]);
  }

  async function handleAdd() {
    if (!selectedUser || !id || !user) return;
    setAdding(true);
    const { error } = await addCanchaAdmin(supabase, id, selectedUser.id, newRole, newPerms, user.id);
    if (error) {
      toast.error("No se pudo agregar al colaborador.");
      setAdding(false);
      return;
    }
    toast.success(`${selectedUser.full_name ?? selectedUser.username} agregado como ${ROLE_CONFIG[newRole].label}.`);
    setSelectedUser(null);
    setSearchQ("");
    setNewRole("admin");
    setNewPerms(DEFAULT_PERMS.admin);
    setAdding(false);
    load();
  }

  async function handleRemove(admin: CanchaAdmin) {
    const name = admin.profile?.full_name ?? admin.profile?.username ?? "este colaborador";
    setRemovingId(admin.user_id);
    const { error } = await removeCanchaAdmin(supabase, id!, admin.user_id);
    if (error) { toast.error("No se pudo eliminar."); setRemovingId(null); return; }
    toast.success(`${name} eliminado del equipo.`);
    setAdmins(prev => prev.filter(a => a.user_id !== admin.user_id));
    setRemovingId(null);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <CanchaOwnerTabs canchaId={id!} canchaName={cancha?.name} />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Info banner (non-owner) */}
        {!isOwner && (
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl px-4 py-3">
            <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Sos administrador de esta cancha. Solo el dueño puede gestionar el equipo.
            </p>
          </div>
        )}

        {/* Owner card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Dueño de la cancha
          </p>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <User2 className="size-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{user?.email?.split("@")[0] ?? "Vos"}</p>
              <p className="text-xs text-muted-foreground">Acceso completo · No se puede remover</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300">
              Owner
            </span>
          </div>
        </div>

        {/* Current admins */}
        {admins.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Shield className="size-3.5 text-violet-600" /> Equipo
              </h3>
              <span className="text-xs text-muted-foreground">{admins.length} colaborador{admins.length !== 1 ? "es" : ""}</span>
            </div>
            <div className="divide-y divide-border/30">
              {admins.map(admin => {
                const name = admin.profile?.full_name ?? admin.profile?.username ?? "Usuario";
                const rc   = ROLE_CONFIG[admin.role];
                return (
                  <div key={admin.user_id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9 shrink-0">
                        {admin.profile?.avatar_url && <AvatarImage src={admin.profile.avatar_url} />}
                        <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {initialsFromName(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold">{name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${rc.bg} ${rc.color}`}>
                            {rc.label}
                          </span>
                        </div>
                        {admin.profile?.city && <p className="text-[11px] text-muted-foreground mb-1.5">📍 {admin.profile.city}</p>}
                        <div className="flex flex-wrap gap-1">
                          {PERM_LABELS.filter(p => admin[p.key]).map(p => (
                            <span key={p.key} className="text-[10px] px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                              ✓ {p.label}
                            </span>
                          ))}
                          {PERM_LABELS.filter(p => !admin[p.key]).map(p => (
                            <span key={p.key} className="text-[10px] px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-muted-foreground rounded-full border border-border/50">
                              ✗ {p.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemove(admin)}
                          disabled={removingId === admin.user_id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                          title="Eliminar del equipo"
                        >
                          {removingId === admin.user_id
                            ? <div className="size-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="size-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isOwner ? (
          <div className="text-center py-8 border border-dashed border-border/60 rounded-2xl text-muted-foreground">
            <Shield className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no hay colaboradores.</p>
            <p className="text-xs mt-1">Agregá administradores para que te ayuden a gestionar esta cancha.</p>
          </div>
        ) : null}

        {/* Add admin — owner only */}
        {isOwner && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Plus className="size-4 text-violet-600" /> Agregar colaborador
            </h3>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Buscar por @usuario o nombre..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 size-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-zinc-900 border border-border/60 rounded-xl shadow-lg overflow-hidden z-20">
                  {searchResults.slice(0, 6).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectUser(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="size-7 shrink-0">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
                          {initialsFromName(p.full_name ?? p.username ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name ?? p.username}</p>
                        {p.username && p.full_name && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                        {p.city && <p className="text-[11px] text-muted-foreground">📍 {p.city}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="space-y-4">
                {/* Selected user chip */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700">
                  <Avatar className="size-8 shrink-0">
                    {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
                    <AvatarFallback className="text-xs bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300">
                      {initialsFromName(selectedUser.full_name ?? selectedUser.username ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 truncate">
                      {selectedUser.full_name ?? selectedUser.username}
                    </p>
                    {selectedUser.username && <p className="text-[11px] text-violet-500">@{selectedUser.username}</p>}
                  </div>
                  <button onClick={() => { setSelectedUser(null); setSearchQ(""); }} className="text-violet-400 hover:text-violet-700 text-sm leading-none p-1">✕</button>
                </div>

                {/* Role */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Rol</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["admin","staff"] as AdminRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          newRole === r
                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                            : "border-border/60 text-muted-foreground hover:border-violet-400"
                        }`}
                      >
                        {ROLE_CONFIG[r].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    {ROLE_CONFIG[newRole].desc}
                  </p>
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Permisos específicos</p>
                  <div className="space-y-2">
                    {PERM_LABELS.map(({ key, label, hint }) => (
                      <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={newPerms[key]}
                          onChange={e => setNewPerms(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="mt-0.5 rounded border-border accent-violet-600 size-4"
                        />
                        <div>
                          <p className="text-sm group-hover:text-foreground transition-colors">{label}</p>
                          <p className="text-[11px] text-muted-foreground">{hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding
                    ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Plus className="size-4" />}
                  Agregar al equipo
                </button>
              </div>
            )}

            {!selectedUser && (
              <p className="text-center text-xs text-muted-foreground py-2">
                Buscá por nombre de usuario o nombre real. Los colaboradores recibirán acceso según sus permisos.
              </p>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
