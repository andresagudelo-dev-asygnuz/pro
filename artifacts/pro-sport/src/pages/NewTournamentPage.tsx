import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { createTournament } from "@/lib/tournaments/api";

const supabase = createClient();

export default function NewTournamentPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      format: formData.get("format") as "liga" | "eliminatoria" | "fase_grupos_eliminatoria",
      slots: parseInt(formData.get("slots") as string),
      location: formData.get("location") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      status: "borrador" as const,
      categories: [],
    };

    const result = await createTournament(supabase, data);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate("/tournaments/mine");
    }
  }

  const inputCls = "w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <AppLayout>
    <div className="container py-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crear Torneo</h1>
        <p className="text-muted-foreground mt-1">Configura los detalles básicos de tu nuevo torneo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded-lg">
        {error && (
          <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{error}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nombre del torneo</label>
          <input id="name" name="name" type="text" required className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="format" className="text-sm font-medium">Formato</label>
            <select id="format" name="format" required className={inputCls}>
              <option value="liga">Liga</option>
              <option value="eliminatoria">Eliminatoria</option>
              <option value="fase_grupos_eliminatoria">Grupos + Eliminatoria</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="slots" className="text-sm font-medium">Cupos</label>
            <input id="slots" name="slots" type="number" min="2" max="128" required className={inputCls} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium">Ubicación (Ciudad o Complejo)</label>
          <input id="location" name="location" type="text" required className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="startDate" className="text-sm font-medium">Fecha de Inicio</label>
            <input id="startDate" name="startDate" type="date" required className={inputCls} />
          </div>
          <div className="space-y-2">
            <label htmlFor="endDate" className="text-sm font-medium">Fecha de Fin</label>
            <input id="endDate" name="endDate" type="date" required className={inputCls} />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Borrador"}</Button>
        </div>
      </form>
    </div>
  );
}
