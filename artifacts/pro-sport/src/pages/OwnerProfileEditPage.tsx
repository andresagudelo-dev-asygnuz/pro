import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { updateProfileFields } from "@/lib/profiles/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Globe, MessageSquare, User, FileText, ArrowLeft } from "lucide-react";


export default function OwnerProfileEditPage() {
  const { user, profile, roles, updateProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    business_name: "",
    full_name: "",
    city: "",
    bio: "",
    business_phone: "",
    business_whatsapp: "",
    business_website: "",
  });

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (!roles?.is_cancha) { setLocation("/mis-canchas"); return; }
    if (profile) {
      setForm({
        business_name:     profile.business_name     ?? "",
        full_name:         profile.full_name          ?? "",
        city:              profile.city               ?? "",
        bio:               profile.bio                ?? "",
        business_phone:    profile.business_phone     ?? "",
        business_whatsapp: profile.business_whatsapp  ?? "",
        business_website:  profile.business_website   ?? "",
      });
    }
  }, [user, profile, roles]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Ingresá tu nombre o razón social.";
    if (!form.city.trim()) errs.city = "Ingresá tu ciudad.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setPending(true);
    const updates = {
      business_name:     form.business_name.trim()     || null,
      full_name:         form.full_name.trim(),
      city:              form.city.trim(),
      bio:               form.bio.trim()               || null,
      business_phone:    form.business_phone.trim()    || null,
      business_whatsapp: form.business_whatsapp.trim() || null,
      business_website:  form.business_website.trim()  || null,
      updated_at:        new Date().toISOString(),
    };

    const { error } = await updateProfileFields(supabase, user.id, updates);
    if (error) {
      toast.error("Error al guardar: " + error);
    } else {
      updateProfile(updates);
      toast.success("Perfil actualizado.");
      setLocation("/mis-canchas/perfil");
    }
    setPending(false);
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLocation("/mis-canchas/perfil")}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border/60 hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Editar perfil de negocio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Información pública de tu operación</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Business identity */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Building2 className="size-4 text-violet-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Identidad del negocio</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business_name">Nombre del negocio / marca</Label>
                <Input
                  id="business_name"
                  placeholder="Ej: Canchas El Potrillo"
                  value={form.business_name}
                  onChange={set("business_name")}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">Dejalo vacío para usar tu nombre personal.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre del responsable *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="Juan Pérez"
                    value={form.full_name}
                    onChange={set("full_name")}
                    className="pl-9 rounded-xl"
                  />
                </div>
                {fieldErrors.full_name && <p className="text-xs text-destructive">{fieldErrors.full_name}</p>}
              </div>
            </div>
          </div>

          {/* Location + description */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Descripción</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">Ciudad *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Manizales"
                    value={form.city}
                    onChange={set("city")}
                    className="pl-9 rounded-xl"
                  />
                </div>
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Descripción del negocio</Label>
                <Textarea
                  id="bio"
                  placeholder="Contá sobre tus instalaciones, horarios, qué te diferencia…"
                  rows={4}
                  value={form.bio}
                  onChange={set("bio")}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Phone className="size-4 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Datos de contacto</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business_phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="business_phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={form.business_phone}
                    onChange={set("business_phone")}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_whatsapp">WhatsApp</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-emerald-500" />
                  <Input
                    id="business_whatsapp"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={form.business_whatsapp}
                    onChange={set("business_whatsapp")}
                    className="pl-9 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Número internacional: +57XXXXXXXXXX</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_website">Sitio web</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="business_website"
                    type="url"
                    placeholder="www.micanchita.com"
                    value={form.business_website}
                    onChange={set("business_website")}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setLocation("/mis-canchas/perfil")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
