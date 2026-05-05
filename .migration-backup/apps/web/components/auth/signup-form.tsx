"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword, type AuthState } from "@/lib/auth/actions";

const initialState: AuthState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Tu nombre"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Quiero usar PRO como</legend>
        <p className="text-xs text-muted-foreground">
          Podés elegir los dos. Si no marcás ninguno, te damos el rol de jugador
          por defecto.
        </p>
        <label className="flex items-start gap-3 rounded-md border border-input p-3 text-sm hover:bg-accent/50">
          <input
            type="checkbox"
            name="is_player"
            defaultChecked
            className="mt-0.5 size-4 rounded border-input text-primary focus-visible:outline-2 focus-visible:outline-ring"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Jugador</span>
            <span className="text-xs text-muted-foreground">
              Inscribirte a torneos y construir tu ficha deportiva.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-input p-3 text-sm hover:bg-accent/50">
          <input
            type="checkbox"
            name="is_promoter"
            className="mt-0.5 size-4 rounded border-input text-primary focus-visible:outline-2 focus-visible:outline-ring"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Promotor</span>
            <span className="text-xs text-muted-foreground">
              Crear y gestionar torneos. Podés combinarlo con el rol de jugador.
            </span>
          </span>
        </label>
      </fieldset>

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
      {state.message && (
        <p role="status" className="text-sm text-foreground">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Entrá
        </Link>
      </p>
    </form>
  );
}
