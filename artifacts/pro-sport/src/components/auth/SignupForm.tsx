import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setMessage(null);
    setPending(true);

    const form = e.currentTarget;
    const full_name = (form.elements.namedItem("full_name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (full_name.length < 2) {
      setFieldErrors({ full_name: "Ingresá tu nombre completo." });
      setPending(false);
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: "La contraseña debe tener al menos 8 caracteres." });
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    } else if (data.session) {
      setLocation("/onboarding");
    } else {
      setMessage("¡Cuenta creada! Revisá tu email para confirmar tu cuenta y luego iniciá sesión.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        {fieldErrors.full_name && (
          <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
        )}
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
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Quiero usar PRO como</legend>
        <p className="text-xs text-muted-foreground">
          Podés elegir los dos. Si no marcás ninguno, te damos el rol de jugador por defecto.
        </p>
        <label className="flex items-start gap-3 rounded-md border border-input p-3 text-sm hover:bg-accent/50 cursor-pointer">
          <input
            type="checkbox"
            name="is_player"
            defaultChecked
            className="mt-0.5 size-4 rounded border-input text-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Jugador</span>
            <span className="text-xs text-muted-foreground">
              Inscribirte a torneos y construir tu ficha deportiva.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-input p-3 text-sm hover:bg-accent/50 cursor-pointer">
          <input
            type="checkbox"
            name="is_promoter"
            className="mt-0.5 size-4 rounded border-input text-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Promotor</span>
            <span className="text-xs text-muted-foreground">
              Crear y gestionar torneos. Podés combinarlo con el rol de jugador.
            </span>
          </span>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md p-3">
          {message}
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
