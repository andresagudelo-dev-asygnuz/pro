import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      toast.error("Error al iniciar sesión: " + error.message);
      setPending(false);
    } else {
      toast.success("¡Bienvenido de nuevo!");
      setLocation("/feed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-white/70 uppercase text-[10px] font-black tracking-widest ml-1">Email</Label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 group-focus-within:text-brand-primary transition-colors" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 pl-10 h-12 rounded-xl focus:ring-brand-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" title="Contraseña" className="text-white/70 uppercase text-[10px] font-black tracking-widest ml-1">Contraseña</Label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 group-focus-within:text-brand-primary transition-colors" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="bg-white/5 border-white/10 text-white pl-10 h-12 rounded-xl focus:ring-brand-primary/20 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p role="alert" className="text-xs text-red-400 text-center font-medium">
            {error}
          </p>
        </div>
      )}

      <Button 
        type="submit" 
        disabled={pending} 
        className="h-12 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>

      <div className="space-y-4 pt-2">
        <p className="text-center text-xs">
          <Link
            href="/recuperar-contrasena"
            className="text-white/40 hover:text-white transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p className="text-center text-xs text-white/50">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="text-white font-bold hover:text-brand-primary transition-colors">
            Registrate ahora
          </Link>
        </p>
      </div>
    </form>
  );
}
