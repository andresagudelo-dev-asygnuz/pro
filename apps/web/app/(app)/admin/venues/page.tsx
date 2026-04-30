import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVenue, createCourt } from "@/lib/venues/actions";
import { requireUser } from "@/lib/auth/session";

export default async function AdminVenuesPage() {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: venues } = await supabase
        .from("venues")
        .select("*, venue_courts(*)")
        .eq("owner_id", user.id);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Administración de Canchas</h1>
                <p className="text-sm text-muted-foreground">Gestioná tus complejos deportivos y canchas.</p>
            </header>

            <section className="rounded-xl border bg-background p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Registrar Nuevo Complejo</h2>
                <form action={async (fd) => { "use server"; await createVenue(fd); }} className="flex flex-col gap-4 max-w-md">
                    <Input name="name" placeholder="Nombre del complejo" required />
                    <Input name="city" placeholder="Ciudad" required />
                    <Input name="address" placeholder="Dirección" required />
                    <Button type="submit">Registrar Complejo</Button>
                </form>
            </section>

            <div className="grid gap-6">
                {venues?.map((v) => (
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
                                {v.venue_courts?.map((c: { id: string; name: string; capacity_players: number }) => (
                                    <div key={c.id} className="p-3 border rounded-md bg-muted/50">
                                        <p className="font-medium">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">Capacidad: {c.capacity_players} jugadores</p>
                                    </div>
                                ))}
                            </div>

                            <form action={async (fd) => { "use server"; await createCourt(v.id, fd); }} className="flex gap-2 mt-2 max-w-sm">
                                <Input name="name" placeholder="Nombre de cancha (ej: Cancha 1)" required />
                                <Input name="capacity" type="number" placeholder="Capacidad" defaultValue="10" required />
                                <Button type="submit" variant="outline" size="sm">Añadir Cancha</Button>
                            </form>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
