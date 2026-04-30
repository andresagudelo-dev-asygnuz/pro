"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createMatch,
  type MatchFormState,
} from "@/lib/match/actions";
import { SKILL_LEVELS, type Sport } from "@/lib/types/db";

type VenueCourt = { id: string; name: string; capacity_players: number };
type VenueWithCourts = {
  id: string;
  name: string;
  city: string;
  venue_courts?: VenueCourt[];
};

const initialState: MatchFormState = {};

export function MatchForm({
  sports,
  venues = [],
  defaultCity,
}: {
  sports: Sport[];
  venues?: VenueWithCourts[];
  defaultCity: string;
}) {
  const [state, formAction, pending] = useActionState(
    createMatch,
    initialState,
  );

  const err: Record<string, string> = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Fútbol 5 en la cancha del barrio"
          aria-invalid={Boolean(err.title) || undefined}
        />
        {err.title && <p className="text-xs text-destructive">{err.title}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Deporte</Label>
          <Select name="sport_id">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegí deporte" />
            </SelectTrigger>
            <SelectContent>
              {sports
                .filter((s) => s.id === "futbol")
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {err.sport_id && (
            <p className="text-xs text-destructive">{err.sport_id}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Nivel sugerido (opcional)</Label>
          <Select name="skill_level">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sin preferencia" />
            </SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((lvl) => (
                <SelectItem key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={defaultCity}
            aria-invalid={Boolean(err.city) || undefined}
          />
          {err.city && <p className="text-xs text-destructive">{err.city}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Lugar / Cancha</Label>
          <Select name="court_id" defaultValue="manual">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegí una cancha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">📍 Ingresar manualmente / Otros</SelectItem>
              {venues.map((v) => (
                <div key={v.id}>
                  <div className="px-2 py-1.5 text-xs font-bold text-primary bg-primary/5 uppercase tracking-wider">
                    🏢 {v.name} ({v.city})
                  </div>
                  {v.venue_courts?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      ⚽ {c.name} (Cap: {c.capacity_players})
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="location"
            name="location"
            placeholder="O escribí el lugar exacto..."
            className="mt-1"
            aria-invalid={Boolean(err.location) || undefined}
          />
          {err.location && (
            <p className="text-xs text-destructive">{err.location}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="is_public">Partido Abierto</Label>
          <p className="text-sm text-muted-foreground">
            Cualquier persona puede encontrarlo y unirse.
          </p>
        </div>
        <Switch id="is_public" name="is_public" defaultChecked />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="starts_at">Fecha y hora</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            aria-invalid={Boolean(err.starts_at) || undefined}
          />
          {err.starts_at && (
            <p className="text-xs text-destructive">{err.starts_at}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="duration_minutes">Duración (min)</Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={15}
            step={15}
            defaultValue={60}
            required
            aria-invalid={Boolean(err.duration_minutes) || undefined}
          />
          {err.duration_minutes && (
            <p className="text-xs text-destructive">{err.duration_minutes}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="max_players">Cupos</Label>
          <Input
            id="max_players"
            name="max_players"
            type="number"
            min={2}
            max={40}
            defaultValue={10}
            required
            aria-invalid={Boolean(err.max_players) || undefined}
          />
          {err.max_players && (
            <p className="text-xs text-destructive">{err.max_players}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Arranquen con cambio, pagamos la cancha entre todos…"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear partido"}
        </Button>
      </div>
    </form>
  );
}
