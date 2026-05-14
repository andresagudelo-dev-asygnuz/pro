import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    });

    if (error) {
      toast.error(error.message);
      setPending(false);
    } else {
      toast.success("Te enviamos un email para recuperar tu contraseña.");
      setSent(true);
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
            PRO<span className="text-brand-primary">.</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
          {sent ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Revisá tu bandeja de entrada y seguí las instrucciones del email
                que te enviamos.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              <Button type="submit" disabled={pending}>
                {pending ? "Enviando…" : "Enviar enlace"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-foreground underline"
                >
                  Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
