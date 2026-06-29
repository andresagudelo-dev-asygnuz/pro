import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getMyCanchas } from "@/lib/canchas/api";
import {
  addCanchaAdmin,
  removeCanchaAdmin,
  searchProfiles,
  DEFAULT_PERMS,
  type CanchaAdmin,
  type AdminRole,
  type AdminPermissions,
  type UserSearchResult,
} from "@/lib/canchas/admins-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { Search, Plus, Trash2, Shield, User2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import type { Cancha } from "@/lib/types/db";

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
  { key: "can_clients",  label: "Ver clientes",        hint: "Acceso a la sección de clientes" },
];

export default function OwnerEquipoPage() {
  const { user } = useAuth();

  const queryClient = useQueryClient();

  const { data: canchas = [], isLoading: loadingCanchas } = useQuery({
    queryKey: ["owner-canchas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await getMyCanchas(supabase, user.id);
      return data ?? [];
    },
    enabled: !!user
  });

  const canchaIds = canchas.map(c => c.id);

  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ["owner-admins", user?.id, canchaIds.join(",")],
    queryFn: async () => {
      if (canchaIds.length === 0) return [];
      const { data: adminsData } = await supabase
        .from("cancha_admins")
        .select("*, profiles!user_id(full_name, username, avatar_url, city)")
        .in("cancha_id", canchaIds)
        .eq("status", "active")
        .order("created_at");
      return (adminsData ?? []).map((r: any) => ({ ...r, profile: r.profiles ?? null }));
    },
    enabled: !!user && canchaIds.length > 0
  });

  const loading = loadingCanchas || loadingAdmins;

  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [newPerms, setNewPerms] = useState<AdminPermissions>(DEFAULT_PERMS.admin);
  const [selectedCanchas, setSelectedCanchas] = useState<Set<string>>(new Set());
  
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(q: string) {
    setSearchQ(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await searchProfiles(supabase, q);
      // Exclude owner
      setSearchResults((data ?? []).filter(p => p.id !== user?.id));
      setSearching(false);
    }, 300);
  }

  function handleSelectUser(p: UserSearchResult) {
    setSelectedUser(p);
    setSearchQ("");
    setSearchResults([]);
    setSelectedCanchas(new Set(canchas.map(c => c.id))); // Select all by default
  }

  function handleRoleChange(role: AdminRole) {
    setNewRole(role);
    setNewPerms(DEFAULT_PERMS[role]);
  }

  function toggleCanchaSelection(id: string) {
    setSelectedCanchas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!selectedUser || !user || selectedCanchas.size === 0) return;
    setAdding(true);
    
    let hasError = false;
    for (const cId of selectedCanchas) {
      const { error } = await addCanchaAdmin(supabase, cId, selectedUser.id, newRole, newPerms, user.id);
      if (error) hasError = true;
    }
    
    if (hasError) {
      toast.error("Ocurrió un error al agregar en algunas canchas.");
    } else {
      toast.success(`${selectedUser.full_name ?? selectedUser.username} agregado correctamente.`);
    }
    
    setSelectedUser(null);
    setNewRole("admin");
    setNewPerms(DEFAULT_PERMS.admin);
    setSelectedCanchas(new Set());
    setAdding(false);
    queryClient.invalidateQueries({ queryKey: ["owner-admins", user?.id] });
  }

  async function handleRemove(adminId: string, canchaId: string, name: string) {
    setRemovingId(`${adminId}-${canchaId}`);
    const { error } = await removeCanchaAdmin(supabase, canchaId, adminId);
    if (error) { toast.error("No se pudo eliminar."); }
    else {
      toast.success(`${name} eliminado de la cancha.`);
      queryClient.invalidateQueries({ queryKey: ["owner-admins", user?.id] });
    }
    setRemovingId(null);
  }

  // Group admins by user to show them cleanly if they manage multiple canchas
  type GroupedAdmins = Record<string, { user: CanchaAdmin; canchas: { adminEntry: CanchaAdmin; cancha: Cancha }[] }>;
  const groupedAdmins = (admins as CanchaAdmin[]).reduce((acc: GroupedAdmins, admin: CanchaAdmin) => {
    if (!acc[admin.user_id]) {
      acc[admin.user_id] = {
        user: admin,
        canchas: []
      };
    }
    const c = canchas.find(c => c.id === admin.cancha_id);
    if (c) {
      acc[admin.user_id].canchas.push({ adminEntry: admin, cancha: c });
    }
    return acc;
  }, {} as GroupedAdmins);

  if (loading) return (
    <>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 pt-6">
        
        {/* Custom Header (like Dashboard) */}
        <div className="px-4 max-w-2xl mx-auto mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">Equipo de trabajo</h1>
            <p className="text-muted-foreground text-xs mt-1">Coordinadores y staff que gestionan tus canchas</p>
          </div>
          <Link href="/mis-canchas">
            <button className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline">
              ← Volver al Panel
            </button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          
          {/* Owner card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Dueño del centro
            </p>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <User2 className="size-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{user?.email?.split("@")[0] ?? "Vos"}</p>
                <p className="text-xs text-muted-foreground">Acceso total a todas las canchas</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300">
                Owner
              </span>
            </div>
          </div>

          {/* Current admins */}
          {Object.keys(groupedAdmins).length > 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Shield className="size-3.5 text-violet-600" /> Colaboradores
                </h3>
                <span className="text-xs text-muted-foreground">{Object.keys(groupedAdmins).length} persona{Object.keys(groupedAdmins).length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-border/30">
                {Object.values(groupedAdmins).map(({ user: admin, canchas: adminCanchas }) => {
                  const name = admin.profile?.full_name ?? admin.profile?.username ?? "Usuario";
                  return (
                    <div key={admin.user_id} className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-9 shrink-0 mt-1">
                          {admin.profile?.avatar_url && <AvatarImage src={admin.profile.avatar_url} />}
                          <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            {initialsFromName(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1">{name}</p>
                          {/* List canchas for this user */}
                          <div className="space-y-2">
                            {adminCanchas.map(({ adminEntry, cancha }) => {
                              const rc = ROLE_CONFIG[adminEntry.role];
                              const isRemoving = removingId === `${adminEntry.user_id}-${cancha.id}`;
                              return (
                                <div key={cancha.id} className="flex items-start justify-between bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-border/40">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate max-w-[120px]">{cancha.name}</p>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${rc.bg} ${rc.color}`}>
                                        {rc.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {PERM_LABELS.filter(p => adminEntry[p.key]).map(p => (
                                        <span key={p.key} className="text-[9px] px-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-sm">
                                          ✓ {p.label.split(" ")[0]}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemove(adminEntry.user_id, cancha.id, name)}
                                    disabled={isRemoving}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                                    title={`Eliminar de ${cancha.name}`}
                                  >
                                    {isRemoving
                                      ? <div className="size-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                      : <Trash2 className="size-3" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-border/60 rounded-2xl text-muted-foreground bg-white dark:bg-zinc-900">
              <Shield className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aún no hay colaboradores.</p>
              <p className="text-xs mt-1">Agregá administradores a tus canchas.</p>
            </div>
          )}

          {/* Add admin */}
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
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invite external user info */}
            {!selectedUser && searchQ.length > 2 && searchResults.length === 0 && !searching && (
              <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/50 rounded-xl text-center">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">¿No encuentras a esta persona?</p>
                <p className="text-xs text-violet-600/80 dark:text-violet-400 mt-1">
                  Para ser colaborador, primero debe tener una cuenta en la aplicación. 
                  Pídele que se registre y luego búscalo por su @usuario.
                </p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`¡Hola! Descarga la app PRO y regístrate para que pueda agregarte como colaborador de nuestras canchas.`);
                    toast.success("Mensaje de invitación copiado al portapapeles.");
                  }}
                  className="mt-3 px-4 py-2 bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  Copiar mensaje de invitación
                </button>
              </div>
            )}

            {selectedUser && (
              <div className="space-y-5">
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
                  <button onClick={() => setSelectedUser(null)} className="text-violet-400 hover:text-violet-700 text-sm leading-none p-1">✕</button>
                </div>

                {/* Select Canchas */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Asignar a Canchas</p>
                  <div className="grid grid-cols-2 gap-2">
                    {canchas.map(c => (
                      <button
                        key={c.id}
                        onClick={() => toggleCanchaSelection(c.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-colors ${
                          selectedCanchas.has(c.id) 
                            ? "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-900 dark:text-violet-100" 
                            : "bg-transparent border-border/60 text-muted-foreground"
                        }`}
                      >
                        {selectedCanchas.has(c.id) ? <CheckSquare className="size-4 text-violet-600" /> : <Square className="size-4" />}
                        <span className="text-xs font-medium truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                  {selectedCanchas.size === 0 && (
                    <p className="text-[11px] text-red-500 mt-1">Debes seleccionar al menos una cancha.</p>
                  )}
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
                  disabled={adding || selectedCanchas.size === 0}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding
                    ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Plus className="size-4" />}
                  Agregar al equipo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
