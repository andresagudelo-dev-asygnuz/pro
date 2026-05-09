import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, CheckCircle2, ChevronRight, MailOpen, PartyPopper, Eye, EyeOff } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    const is_player = (form.elements.namedItem("is_player") as HTMLInputElement).checked;
    const is_promoter = (form.elements.namedItem("is_promoter") as HTMLInputElement).checked;
    const is_cancha = (form.elements.namedItem("is_cancha") as HTMLInputElement).checked;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://pro-sport.app/login",
        data: {
          full_name,
          is_player: is_player || (!is_promoter && !is_cancha),
          is_promoter,
          is_cancha,
        },
      },
    });

    if (error) {
      setError(error.message);
      toast.error("Error al registrarse: " + error.message);
      setPending(false);
    } else if (data.session) {
      toast.success("¡Bienvenido a PRO!");
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#7c3aed", "#06b6d4", "#ffffff"] });
      setLocation("/onboarding");
    } else {
      const msg = "¡Felicitaciones! Tu cuenta ha sido creada. Por favor, revisá tu correo electrónico para activarla.";
      setMessage(msg);
      toast.success("¡Felicitaciones!");
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#7c3aed", "#06b6d4", "#ffffff"] });
      setPending(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {message ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center py-8"
        >
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 relative">
            <MailOpen className="size-10 text-brand-primary animate-bounce" />
            <div className="absolute inset-0 bg-brand-primary/20 rounded-full animate-ping" />
          </div>
          
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-4 flex items-center gap-2">
            <PartyPopper className="size-6 text-brand-primary" />
            ¡Felicitaciones!
          </h2>
          
          <p className="text-white/70 leading-relaxed mb-8">
            Tu cuenta ha sido creada con éxito. <br />
            Enviamos un enlace de activación a tu correo.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 w-full mb-8">
            <p className="text-xs text-white/50 uppercase font-black tracking-widest mb-2">Próximo paso</p>
            <p className="text-sm text-white font-medium">Revisá tu bandeja de entrada y hacé clic en el botón para activar tu cuenta PRO.</p>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setLocation("/login")}
            className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 text-white/70 hover:text-white transition-all uppercase text-[10px] font-black tracking-widest"
          >
            Ir al inicio de sesión
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name" className="text-white/70 uppercase text-[10px] font-black tracking-widest ml-1">Nombre completo</Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 group-focus-within:text-brand-primary transition-colors" />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                placeholder="Tu nombre"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 pl-10 h-12 rounded-xl focus:ring-brand-primary/20 transition-all"
              />
            </div>
            {fieldErrors.full_name && (
              <p className="text-[10px] text-red-400 font-bold ml-1">{fieldErrors.full_name}</p>
            )}
          </div>

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
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                className="bg-white/5 border-white/10 text-white pl-10 pr-10 h-12 rounded-xl focus:ring-brand-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[9px] text-white/40 ml-1 uppercase tracking-wider">Mínimo 8 caracteres.</p>
            {fieldErrors.password && (
              <p className="text-[10px] text-red-400 font-bold ml-1">{fieldErrors.password}</p>
            )}
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-[10px] font-black uppercase tracking-widest text-white/70 ml-1 mb-2">Quiero usar PRO como</legend>
            
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm hover:bg-white/10 cursor-pointer transition-colors group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="is_player"
                  defaultChecked
                  className="peer appearance-none size-5 rounded-lg border-2 border-white/20 checked:border-brand-primary checked:bg-brand-primary transition-all cursor-pointer"
                />
                <CheckCircle2 className="absolute size-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="flex flex-col gap-0.5">
                <span className="font-bold text-white group-hover:text-brand-primary transition-colors">Jugador</span>
                <span className="text-[11px] text-white/40 leading-tight">Inscribite a torneos y construí tu ficha deportiva.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm hover:bg-white/10 cursor-pointer transition-colors group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="is_promoter"
                  className="peer appearance-none size-5 rounded-lg border-2 border-white/20 checked:border-brand-primary checked:bg-brand-primary transition-all cursor-pointer"
                />
                <CheckCircle2 className="absolute size-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="flex flex-col gap-0.5">
                <span className="font-bold text-white group-hover:text-brand-primary transition-colors">Promotor</span>
                <span className="text-[11px] text-white/40 leading-tight">Creá y gestioná torneos. Podés combinarlo con otros roles.</span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm hover:bg-white/10 cursor-pointer transition-colors group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="is_cancha"
                  className="peer appearance-none size-5 rounded-lg border-2 border-white/20 checked:border-brand-primary checked:bg-brand-primary transition-all cursor-pointer"
                />
                <CheckCircle2 className="absolute size-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="flex flex-col gap-0.5">
                <span className="font-bold text-white group-hover:text-brand-primary transition-colors">Dueño de Cancha</span>
                <span className="text-[11px] text-white/40 leading-tight">Registrá tus canchas, configurá horarios y aceptá reservas.</span>
              </span>
            </label>
          </fieldset>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p role="alert" className="text-xs text-red-400 text-center font-medium">{error}</p>
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
                Creando cuenta…
              </>
            ) : (
              <>
                Crear cuenta
                <ChevronRight className="size-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-white/50 pt-2">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-white font-bold hover:text-brand-primary transition-colors">
              Iniciá sesión
            </Link>
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
