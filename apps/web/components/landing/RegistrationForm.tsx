"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { GlassContainer } from "./GlassContainer"
import { CheckCircle2, Copy, Share2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/analytics"

const formSchema = z.object({
  email: z.string().email({ message: "Introduce un email válido." }),
  name: z.string().min(2, { message: "El nombre es obligatorio." }),
  sport: z.string().min(1, { message: "Selecciona un deporte." }),
  terms: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los términos y condiciones.",
  }),
})

export function RegistrationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      sport: "futbol",
      terms: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      // 1. Verificar si ya existe (opcional pero recomendado para mejor UX)
      const { data: existing } = await supabase
        .from("market_validation_responses")
        .select("id")
        .eq("email", values.email)
        .single()

      if (existing) {
        toast.info("Ya estás en la lista de espera. ¡Pronto tendrás noticias!")
        setIsSubmitted(true)
        return
      }

      // 2. Insertar
      const { error } = await supabase
        .from("market_validation_responses")
        .insert([
          {
            name: values.name,
            email: values.email,
            main_sport: values.sport,
            beta_interest: true,
            signals: { source: "waitlist_form" }
          }
        ])

      if (error) {
        if (error.code === '23505') { // Código de error para duplicado en Postgres
          toast.info("Ya estás en la lista de espera. ¡Pronto tendrás noticias!")
          setIsSubmitted(true)
          return
        }
        throw error
      }

      trackEvent('registration_submit', { sport: values.sport });
      setIsSubmitted(true)
      toast.success("¡Bienvenido a la lista de espera!")
    } catch (error: any) {
      console.error("Error saving to waitlist:", error)
      toast.error("Hubo un error al registrarte. Inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    trackEvent('share_link_click', { action: 'copy_clipboard' });
    toast.success("Enlace copiado al portapapeles")
  }

  if (isSubmitted) {
    return (
      <section className="py-24 bg-zinc-50 dark:bg-zinc-950 flex justify-center px-6 relative overflow-hidden">
        {/* Simple CSS Confetti */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                backgroundColor: ['#6B46C1', '#00B5D8', '#FFD700'][Math.floor(Math.random() * 3)],
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                animation: `fall ${Math.random() * 3 + 2}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        <style jsx>{`
          @keyframes fall {
            to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
        <GlassContainer className="max-w-md w-full p-12 text-center border-brand-primary/30 shadow-[0_0_40px_rgba(107,70,193,0.15)] animate-in fade-in zoom-in duration-500 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center border border-brand-primary/20">
              <CheckCircle2 className="w-10 h-10 text-brand-primary animate-bounce" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">¡Ya estás dentro!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Gracias por registrarte. Te avisaremos en cuanto PRO esté disponible para tu deporte favorito.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={copyUrl} variant="outline" className="w-full flex items-center gap-2">
              <Copy className="w-4 h-4" /> Copiar enlace para compartir
            </Button>
            <Button variant="ghost" className="w-full flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Compartir en redes
            </Button>
          </div>
        </GlassContainer>
      </section>
    )
  }

  return (
    <section id="registration-form" className="py-24 bg-zinc-100 dark:bg-zinc-950 flex justify-center px-6 overflow-hidden relative">
      {/* Decorative Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 blur-[150px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/10 blur-[150px] rounded-full -z-10" />

      <div className="container relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-6 tracking-tighter uppercase italic leading-none">
            Sé el Primero <br />
            <span className="text-brand-secondary">en Jugar</span>
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 font-bold leading-relaxed">
            Únete a nuestra exclusiva lista de espera y recibe acceso anticipado a la plataforma que cambiará el deporte.
          </p>
        </div>

        <GlassContainer className="max-w-xl mx-auto p-10 md:p-16 border-white/20 dark:border-white/10 shadow-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-[40px] blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 text-center relative">
              <div className="grid grid-cols-1 gap-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-900 dark:text-white font-black uppercase tracking-widest text-xs text-center block w-full">Nombre Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Tu nombre de leyenda" 
                          {...field} 
                          className="h-14 bg-white/50 dark:bg-black/20 border-zinc-200 dark:border-white/10 rounded-xl focus:ring-brand-primary font-bold text-lg text-center" 
                        />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-900 dark:text-white font-black uppercase tracking-widest text-xs text-center block w-full">Email de Contacto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="tu@victoria.com" 
                          {...field} 
                          className="h-14 bg-white/50 dark:bg-black/20 border-zinc-200 dark:border-white/10 rounded-xl focus:ring-brand-primary font-bold text-lg text-center" 
                        />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-900 dark:text-white font-black uppercase tracking-widest text-xs text-center block w-full">Tu Disciplina</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-white/50 dark:bg-black/20 border-zinc-200 dark:border-white/10 rounded-xl focus:ring-brand-primary font-bold text-lg flex justify-center text-center">
                            <SelectValue placeholder="Selecciona un deporte" className="text-center" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold">
                          <SelectItem value="futbol">Fútbol</SelectItem>
                          <SelectItem value="basquet">Básquetbol</SelectItem>
                          <SelectItem value="tenis">Tenis</SelectItem>
                          <SelectItem value="padel">Pádel</SelectItem>
                          <SelectItem value="voley">Vóley</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/20 dark:bg-black/20 space-y-4">
                    <div className="flex items-center space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="w-6 h-6 rounded-md border-zinc-400 dark:border-zinc-600 data-[state=checked]:bg-brand-primary"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        Acepto que mi vida deportiva cambie para siempre
                      </FormLabel>
                    </div>
                    <div className="space-y-1 leading-tight text-center">
                      <FormDescription className="text-xs font-medium text-zinc-500 dark:text-zinc-500 italic mx-auto">
                        No compartiremos tus datos con el equipo rival. Prometido.
                      </FormDescription>
                    </div>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <Button 
                id="registration-submit-button"
                type="submit" 
                disabled={isLoading}
                className="w-full h-16 text-xl font-black bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-2xl uppercase tracking-tighter italic overflow-hidden group/btn relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" /> PROCESANDO...
                    </>
                  ) : (
                    <>
                      RECLAMAR MI LUGAR <CheckCircle2 className="h-6 w-6" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </Form>
        </GlassContainer>
      </div>
    </section>
  )
}
