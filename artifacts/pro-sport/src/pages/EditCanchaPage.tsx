import { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, updateCancha } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CANCHAS_SPORT_OPTIONS, type CanchaSportType } from "@/lib/types/db";
import { Save, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { canchaSchema, type CanchaFormValues } from "@/lib/validations/cancha";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";


function resizeToDataUrl(file: File, maxPx = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("No se pudo leer la imagen.")); };
    img.src = objectUrl;
  });
}

export default function EditCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fetchedCancha, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["cancha", id],
    queryFn: async () => {
      const { data, error } = await getCanchaById(supabase, id!);
      if (error) throw new Error(error);
      if (!data) throw new Error("Cancha no encontrada");
      if (user && data.owner_id !== user.id) {
        throw new Error("No tenés permisos para editar esta cancha.");
      }
      return data;
    },
    enabled: !!id && !!user
  });

  const form = useForm<CanchaFormValues>({
    resolver: zodResolver(canchaSchema),
    defaultValues: {
      name: "",
      description: "",
      sport_type: "futbol_5",
      capacity: 10,
      price_per_hour: 0,
      discount_percent: 0,
    },
  });

  useEffect(() => {
    if (fetchedCancha) {
      form.reset({
        name: fetchedCancha.name,
        description: fetchedCancha.description ?? "",
        sport_type: fetchedCancha.sport_type as any,
        capacity: fetchedCancha.capacity,
        price_per_hour: fetchedCancha.price_per_hour,
        discount_percent: fetchedCancha.discount_percent,
      });
      setImageUrl(fetchedCancha.image_url ?? null);
    }
  }, [fetchedCancha, form]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes (JPG, PNG, WebP)."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10 MB."); return; }

    setUploadingImage(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 1024, 0.85);
      setImageUrl(dataUrl);
      toast.success("Foto de la cancha cargada temporalmente.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al cargar la foto: " + msg);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function onSubmit(data: CanchaFormValues) {
    setError(null);

    const { error: updateErr } = await updateCancha(supabase, id!, {
      name: data.name,
      description: data.description || undefined,
      sport_type: data.sport_type as CanchaSportType,
      capacity: data.capacity,
      price_per_hour: data.price_per_hour,
      discount_percent: data.discount_percent || 0,
      image_url: imageUrl || null,
    });

    if (updateErr) {
      setError(updateErr);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["cancha", id] });
    queryClient.invalidateQueries({ queryKey: ["owner-canchas", user?.id] });

    toast.success("¡Cancha actualizada!");
    setLocation(`/canchas/${id}/agenda`);
  }

  const loadError = queryError ? (queryError as Error).message : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && !fetchedCancha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-center">{loadError}</p>
        <Link href="/mis-canchas">
          <Button variant="outline">Mis canchas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 pt-5 pb-2 max-w-2xl flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Editar — {fetchedCancha?.name ?? ""}</h1>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-6 shadow-sm">

          {/* Image upload (outside react-hook-form to avoid complex base64 state sync, although can be inside) */}
          <div className="space-y-2 pb-6">
            <Label>Foto de la cancha</Label>
            <div
              className="w-full aspect-video rounded-xl border-2 border-dashed border-border/60 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors relative overflow-hidden"
              onClick={() => !uploadingImage && fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Cancha" className="w-full h-full object-cover" />
              ) : (
                <>
                  {uploadingImage ? (
                    <Loader2 className="size-8 text-muted-foreground animate-spin mb-2" />
                  ) : (
                    <Camera className="size-8 text-muted-foreground mb-2" />
                  )}
                  <span className="text-sm text-muted-foreground font-medium">
                    {uploadingImage ? "Procesando..." : "Tocá para subir una foto"}
                  </span>
                </>
              )}
              {imageUrl && !uploadingImage && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Camera className="size-5" /> Cambiar foto
                  </span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la cancha *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: La Bombonera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Características, comodidades…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sport_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de deporte *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CANCHAS_SPORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidad (jugadores) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio/hora ($) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1000} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step={5} {...field} />
                    </FormControl>
                    <FormDescription>Dejalo en 0 si no tenés descuento activo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/30 border rounded-xl p-4 flex flex-col gap-1">
                <span className="text-sm font-medium">Información heredada</span>
                <p className="text-xs text-muted-foreground">
                  Esta cancha hereda su dirección, ciudad y teléfonos del centro deportivo al que pertenece. Si deseas modificarlos, edita la configuración del centro.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full rounded-xl gap-2"
              >
                <Save className="size-4" />
                {form.formState.isSubmitting ? "Guardando cambios…" : "Guardar cambios"}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
