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
import { saveOnboarding, type ProfileState } from "@/lib/profile/actions";
import { SKILL_LEVELS, type Sport } from "@/lib/types/db";

const initialState: ProfileState = {};

export function OnboardingForm({
  sports,
  defaults,
}: {
  sports: Sport[];
  defaults: {
    username: string;
    full_name: string;
    city: string;
    bio: string;
    primary_sport_id: string;
    primary_skill_level: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    saveOnboarding,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-z0-9_]{3,24}"
            defaultValue={defaults.username}
            placeholder="andres_gk"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={defaults.full_name}
            placeholder="Andrés Agudelo"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={defaults.city}
            placeholder="Manizales"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Deporte principal</Label>
          <Select
            name="primary_sport_id"
            defaultValue={defaults.primary_sport_id || undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegí un deporte" />
            </SelectTrigger>
            <SelectContent>
              {sports.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Nivel</Label>
        <Select
          name="primary_skill_level"
          defaultValue={defaults.primary_skill_level || undefined}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elegí tu nivel" />
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio (opcional)</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={defaults.bio}
          placeholder="Contá un poco de vos como deportista…"
          rows={3}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, msg]) => (
          <p key={field} className="text-xs text-destructive">
            {field}: {msg}
          </p>
        ))}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar y continuar"}
      </Button>
    </form>
  );
}
