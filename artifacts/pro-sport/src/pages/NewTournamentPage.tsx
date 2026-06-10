import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { createTournament } from "@/lib/tournaments/api";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentSchema, type TournamentFormValues } from "@/lib/validations/tournament";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";


export default function NewTournamentPage() {
  const { user, roles } = useAuth();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: "",
      format: "liga",
      slots: 16,
      location: "",
      startDate: "",
      endDate: "",
    },
  });

  if (!roles?.is_promoter) {
    return (
      <div className="container py-16 max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Se requiere rol de Promotor</h1>
        <p className="text-muted-foreground">
          Para crear torneos necesitás el rol de Promotor. Podés activarlo
          desde tu perfil, o registrarte con ese rol si aún no lo tenés.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" asChild>
            <Link href="/profile">Ir a mi perfil</Link>
          </Button>
          <Button asChild>
            <Link href="/tournaments">Ver torneos</Link>
          </Button>
        </div>
      </div>
    );
  }

  async function onSubmit(data: TournamentFormValues) {
    if (!user) return;
    setError(null);

    const apiData = {
      ...data,
      status: "borrador" as const,
      categories: [],
    };

    const result = await createTournament(supabase, apiData, user.id);

    if (result.error) {
      setError(result.error);
    } else {
      navigate("/tournaments/mine");
    }
  }

  return (
    <div className="container py-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crear Torneo</h1>
        <p className="text-muted-foreground mt-1">Configura los detalles básicos de tu nuevo torneo.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-6 rounded-lg bg-white dark:bg-zinc-900">
          {error && (
            <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{error}</div>
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del torneo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Copa de Verano" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="liga">Liga</SelectItem>
                      <SelectItem value="eliminatoria">Eliminatoria</SelectItem>
                      <SelectItem value="fase_grupos_eliminatoria">Grupos + Eliminatoria</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupos *</FormLabel>
                  <FormControl>
                    <Input type="number" min={2} max={128} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación (Ciudad o Complejo) *</FormLabel>
                <FormControl>
                  <Input placeholder="Manizales" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Inicio *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Fin *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : "Crear Borrador"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
