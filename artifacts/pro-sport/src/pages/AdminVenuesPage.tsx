import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

type Court = { id: string; name: string; capacity_players: number };
type Venue = { id: string; name: string; address: string; city: string; venue_courts?: Court[] };

export default function AdminVenuesPage() {
  const [, navigate] = useLocation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }
      setUserId(auth.user.id);

      const { data } = await supabase.from("venues").select("*, venue_courts(*)").eq("owner_id", auth.user.id);
      setVenues((data ?? []) as Venue[]);
      setLoading(false);
    })();
  }, [navigate]);

  async function handleCreateVenue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setCreating(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { data, error: err } = await supabase.from("venues").insert({
      owner_id: userId,
      name: fd.get("name") as string,
      city: fd.get("city") as string,
      address: fd.get("address") as string,
    }).select("*, venue_courts(*)").single();
    if (err) { setError("Error al crear el complejo."); }
    else { setVenues((prev) => [...prev, data as Venue]); (e.target as HTMLFormElement).reset(); }
    setCreating(false);
  }

  async function handleAddCourt(venueId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error: err } = await supabase.from("venue_courts").insert({
      venue_id: venueId,
      name: fd.get("name") as string,
      capacity_players: parseInt(fd.get("capacity") as string),
    }).select().single();
    if (!err && data) {
      setVenues((prev) => prev.map((v) => v.id === venueId ? { ...v, venue_courts: [...(v.venue_courts ?? []), data as Court] } : v));
      (e.target as HTMLFormElement).reset();
    }
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Administración de Canchas</h1>
        <p className="text-sm text-muted-foreground">Gestioná tus complejos deportivos y canchas.</p>
      </header>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Registrar Nuevo Complejo</h2>
        {error && <div className="mb-3 p-3 bg-destructive/15 text-destructive rounded-md text-sm">{error}</div>}
        <form onSubmit={handleCreateVenue} className="flex flex-col gap-4 max-w-md">
          <Input name="name" placeholder="Nombre del complejo" required />
          <Input name="city" placeholder="Ciudad" required />
          <Input name="address" placeholder="Dirección" required />
          <Button type="submit" disabled={creating}>{creating ? "Registrando…" : "Registrar Complejo"}</Button>
        </form>
      </section>

      <div className="grid gap-6">
        {venues.map((v) => (
          <section key={v.id} className="rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{v.name}</h3>
                <p className="text-sm text-muted-foreground">{v.address}, {v.city}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="font-semibold text-sm">Canchas en este complejo:</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(v.venue_courts ?? []).map((c) => (
                  <div key={c.id} className="p-3 border rounded-md bg-muted/50">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Capacidad: {c.capacity_players} jugadores</p>
                  </div>
                ))}
                {(v.venue_courts ?? []).length === 0 && <p className="text-sm text-muted-foreground col-span-3">Sin canchas registradas.</p>}
              </div>

              <form onSubmit={(e) => handleAddCourt(v.id, e)} className="flex gap-2 mt-2 max-w-sm flex-wrap">
                <Input name="name" placeholder="Nombre de cancha (ej: Cancha 1)" required className="flex-1" />
                <Input name="capacity" type="number" placeholder="Cap." defaultValue="10" required className="w-20" />
                <Button type="submit" variant="outline" size="sm">Añadir</Button>
              </form>
            </div>
          </section>
        ))}

        {venues.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">No tenés complejos registrados todavía.</div>
        )}
      </div>
    </div>
  );
}
