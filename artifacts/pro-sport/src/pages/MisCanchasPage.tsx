import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyCanchas, updateCancha } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  SPORT_TYPE_LABELS,
  SPORT_TYPE_ICONS,
  type Cancha,
} from "@/lib/types/db";
import { Plus, Calendar, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

export default function MisCanchasPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMyCanchas(supabase, user.id).then(({ data, error }) => {
      if (error) setError(error);
      else setCanchas(data ?? []);
      setLoading(false);
    });
  }, [user]);

  async function toggleActive(cancha: Cancha) {
    const { error } = await updateCancha(supabase, cancha.id, {
      is_active: !cancha.is_active,
    });
    if (error) {
      toast.error("No se pudo actualizar.");
    } else {
      setCanchas((prev) =>
        prev.map((c) =>
          c.id === cancha.id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
      toast.success(
        cancha.is_active ? "Cancha desactivada." : "Cancha activada.",
      );
    }
  }

  if (!roles?.is_cancha && !loading) {
    return (
      <AppLayout>
        <div className="container py-8 max-w-lg mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Rol de Cancha no activado
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              Necesitás activar el rol de Administrador de Cancha para registrar
              y gestionar tus canchas.
            </p>
            <Button
              className="rounded-xl"
              onClick={() => setLocation("/perfil")}
            >
              Ir a mi perfil
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Canchas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestioná las canchas que administrás.
            </p>
          </div>
          <Button asChild className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Link href="/canchas/nueva">
              <Plus className="size-4" /> Nueva cancha
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">
            {error}
          </div>
        ) : canchas.length === 0 ? (
          <div className="text-center py-12 border border-border/60 rounded-2xl bg-muted/20">
            <p className="text-4xl mb-4">🏟️</p>
            <p className="text-muted-foreground mb-4">
              Todavía no registraste ninguna cancha.
            </p>
            <Button asChild className="rounded-xl">
              <Link href="/canchas/nueva">Registrar mi primera cancha</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {canchas.map((c) => (
              <div
                key={c.id}
                className="border border-border/60 rounded-2xl p-5 bg-white dark:bg-zinc-900 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">
                        {SPORT_TYPE_ICONS[c.sport_type]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {SPORT_TYPE_LABELS[c.sport_type]}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      📍 {c.city}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(c)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                      c.is_active
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                        : "bg-muted text-muted-foreground border-transparent"
                    }`}
                    title={c.is_active ? "Desactivar cancha" : "Activar cancha"}
                  >
                    {c.is_active ? (
                      <>
                        <ToggleRight className="size-3.5" /> Activa
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="size-3.5" /> Inactiva
                      </>
                    )}
                  </button>
                </div>

                <div className="text-sm">
                  <span className="font-bold text-violet-600 dark:text-violet-400">
                    ${c.price_per_hour.toLocaleString("es-CO")}/h
                  </span>
                  {c.discount_percent > 0 && (
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      -{c.discount_percent}% dto.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    asChild
                  >
                    <Link href={`/canchas/${c.id}/agenda`}>
                      <Calendar className="size-3.5 mr-1" /> Agenda
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    asChild
                  >
                    <Link href={`/canchas/${c.id}/editar`}>
                      <Pencil className="size-3.5 mr-1" /> Editar
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    asChild
                  >
                    <Link href={`/canchas/${c.id}`}>Ver</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
