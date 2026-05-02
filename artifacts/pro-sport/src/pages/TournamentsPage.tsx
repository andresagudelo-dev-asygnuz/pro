import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  format: string;
  slots: number;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  abierto_inscripciones: "Abierto",
  cerrado_inscripciones: "Cerrado",
  cancelado: "Cancelado",
  finalizado: "Finalizado",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  borrador: "secondary",
  abierto_inscripciones: "default",
  cerrado_inscripciones: "outline",
  cancelado: "destructive",
  finalizado: "outline",
};

export default function TournamentsPage() {
  useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setTournaments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Torneos</h1>
          <Link href="/tournaments/new">
            <Button size="sm">
              <Plus className="size-4 mr-1" /> Crear
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No hay torneos disponibles.</p>
            <Link href="/tournaments/new">
              <Button>Crear el primero</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <div className="flex flex-col gap-2 rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm hover:border-foreground/30 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{t.name}</h3>
                    <Badge variant={statusVariants[t.status] || "secondary"}>
                      {statusLabels[t.status] || t.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>📍 {t.location}</span>
                    <span>·</span>
                    <span>{t.slots} cupos</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.start_date).toLocaleDateString("es-CO")} – {new Date(t.end_date).toLocaleDateString("es-CO")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span><span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>🏆</span><span>Torneos</span>
            </Link>
            <Link href="/matches/new" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>➕</span><span>Crear</span>
            </Link>
            <Link href="/notificaciones" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🔔</span><span>Notif.</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👤</span><span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
