import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function exchangeToken() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setInvalidToken(true);
        } else {
          setSessionReady(true);
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSessionReady(true);
        } else {
          setInvalidToken(true);
        }
      }
    }
    exchangeToken();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setPending(false);
    } else {
      toast.success("Contraseña actualizada correctamente.");
      setLocation("/login");
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
            Nueva contraseña
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá tu nueva contraseña
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
          {invalidToken ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm text-destructive">
                El enlace de recuperación es inválido o ya expiró.
              </p>
              <Link
                href="/recuperar-contrasena"
                className="text-sm font-medium text-foreground underline"
              >
                Solicitá un nuevo enlace
              </Link>
            </div>
          ) : !sessionReady ? (
            <p className="text-center text-sm text-muted-foreground">Verificando enlace…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
