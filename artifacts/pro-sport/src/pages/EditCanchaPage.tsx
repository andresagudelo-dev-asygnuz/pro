import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, updateCancha } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANCHAS_SPORT_OPTIONS, type Cancha, type CanchaSportType } from "@/lib/types/db";
import { Save } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { VenueSearchOrCreate } from "@/components/canchas/VenueSearchOrCreate";


export default function EditCanchaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] = useState<CanchaSportType>("futbol_5");
  const [capacity, setCapacity] = useState(10);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pricePerHour, setPricePerHour] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [venueId, setVenueId] = useState<string | null>(null);

  useEffect(() => {
    getCanchaById(supabase, id).then(({ data, error }) => {
      if (error || !data) {
        setError(error ?? "Cancha no encontrada");
        setLoading(false);
        return;
      }
      if (user && data.owner_id !== user.id) {
        setError("No tenés permisos para editar esta cancha.");
        setLoading(false);
        return;
      }
      setCancha(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setSportType(data.sport_type);
      setCapacity(data.capacity);
      setAddress(data.address);
      setCity(data.city);
      setPricePerHour(data.price_per_hour);
      setDiscountPercent(data.discount_percent);
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setVenueId(data.venue_id ?? null);
      setLoading(false);
    });
  }, [id, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "El nombre debe tener al menos 2 caracteres.";
    if (!address.trim()) errs.address = "Ingresá la dirección.";
    if (!city.trim()) errs.city = "Ingresá la ciudad.";
    if (isNaN(pricePerHour) || pricePerHour < 0) errs.pricePerHour = "Precio inválido.";
    if (capacity < 1) errs.capacity = "La capacidad debe ser mayor a 0.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const { error: updateErr } = await updateCancha(supabase, id, {
      name: name.trim(),
      description: description.trim() || undefined,
      sport_type: sportType,
      capacity,
      address: address.trim(),
      city: city.trim(),
      price_per_hour: pricePerHour,
      discount_percent: discountPercent,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      venue_id: venueId,
    });

    if (updateErr) {
      setError(updateErr);
      setSaving(false);
      return;
    }

    toast.success("¡Cancha actualizada!");
    setLocation(`/canchas/${id}/agenda`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !cancha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-center">{error}</p>
        <Link href="/mis-canchas">
          <Button variant="outline">Mis canchas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title={`Editar — ${cancha?.name ?? ""}`} backHref={`/canchas/${id}/agenda`} />

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la cancha *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: La Bombonera"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Características, comodidades…"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de deporte *</Label>
              <Select
                value={sportType}
                onValueChange={(v) => setSportType(v as CanchaSportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCHAS_SPORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad (jugadores) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(e) =>
                    setCapacity(parseInt(e.target.value) || 1)
                  }
                />
                {fieldErrors.capacity && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.capacity}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio/hora ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={1000}
                  value={pricePerHour}
                  onChange={(e) =>
                    setPricePerHour(parseFloat(e.target.value) || 0)
                  }
                />
                {fieldErrors.pricePerHour && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.pricePerHour}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Descuento (%)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                step={5}
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                Dejalo en 0 si no tenés descuento activo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle 50 #23-45"
              />
              {fieldErrors.address && (
                <p className="text-xs text-destructive">
                  {fieldErrors.address}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Manizales"
              />
              {fieldErrors.city && (
                <p className="text-xs text-destructive">{fieldErrors.city}</p>
              )}
            </div>

            <VenueSearchOrCreate
              city={city}
              value={venueId}
              onChange={setVenueId}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+57 300 000 0000"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl gap-2"
            >
              <Save className="size-4" />
              {saving ? "Guardando cambios…" : "Guardar cambios"}
            </Button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
