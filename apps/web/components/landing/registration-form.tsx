"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  name: z.string().optional(),
  sport: z.string().min(1, "Selecciona un deporte"),
  terms: z.boolean().refine((val) => val === true, "Debes aceptar los términos"),
});

type FormValues = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      sport: "",
      terms: false,
    },
  });

  const sportValue = watch("sport");
  const termsValue = watch("terms");

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSubmitted(true);
    toast.success("¡Registro exitoso!");
  }

  const copyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  if (isSubmitted) {
    return (
      <section className="py-24 bg-background" id="registro">
        <div className="container px-4 mx-auto max-w-xl text-center">
          <div className="glass p-12 rounded-3xl flex flex-col items-center">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-bold mb-4">¡Ya estás en la lista!</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Gracias por sumarte a la revolución del deporte aficionado. Te avisaremos pronto.
            </p>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={copyUrl}
            >
              <Copy size={18} />
              Compartir PRO
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-background relative overflow-hidden" id="registro">
      <div className="container px-4 mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Únete a la Experiencia</h2>
          <p className="text-muted-foreground">Regístrate para ser de los primeros en vivir el deporte como un PRO.</p>
        </div>

        <div className="glass p-8 md:p-12 rounded-3xl shadow-2xl border-white/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre (Opcional)</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                className="h-12 bg-background/50"
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="h-12 bg-background/50"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Deporte Favorito</Label>
              <Select
                onValueChange={(val) => setValue("sport", val ?? "")}
                value={sportValue ?? ""}
              >
                <SelectTrigger className="h-12 bg-background/50 w-full">
                  <SelectValue placeholder="Selecciona un deporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="futbol">Fútbol</SelectItem>
                  <SelectItem value="tenis">Tenis</SelectItem>
                  <SelectItem value="padel">Pádel</SelectItem>
                  <SelectItem value="basket">Básquet</SelectItem>
                </SelectContent>
              </Select>
              {errors.sport && <p className="text-sm text-destructive">{errors.sport.message}</p>}
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-muted/30">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={termsValue}
                onChange={(e) => setValue("terms", e.target.checked)}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                  Acepto los términos y condiciones y la política de privacidad de PRO.
                </Label>
                {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-[length:200%_auto] hover:bg-right transition-all duration-500 rounded-xl shadow-lg"
            >
              {isLoading ? "Registrando..." : "🚀 ¡Regístrate Gratis!"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
