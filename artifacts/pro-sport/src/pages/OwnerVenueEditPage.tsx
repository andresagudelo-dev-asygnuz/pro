import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getVenueByOwner, upsertOwnerVenue, updateVenue, uploadVenueAsset } from "@/lib/venues/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Image, Loader2, Upload, Plus, Trash2 } from "lucide-react";
import type { Venue, VenuePaymentMethod } from "@/lib/types/db";
import { AddressGeoPicker } from "@/components/canchas/AddressGeoPicker";

export default function OwnerVenueEditPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingVenue, setExistingVenue] = useState<Venue | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState("");

  // File inputs
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQrId, setUploadingQrId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getVenueByOwner(supabase, user.id).then(({ data }) => {
      if (data) {
        setExistingVenue(data);
        setName(data.name ?? "");
        setCity(data.city ?? "");
        setAddress(data.address ?? "");
        setDescription(data.description ?? "");
        setPhone(data.phone ?? "");
        setWhatsapp(data.whatsapp ?? "");
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setBannerUrl(data.banner_url);
        setLogoUrl(data.logo_url);
        setPaymentMethods(data.payment_methods ?? []);
        setPaymentInstructions(data.payment_instructions ?? "");
      }
      setLoading(false);
    });
  }, [user?.id]);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !existingVenue) return;
    setUploadingBanner(true);
    const { url, error } = await uploadVenueAsset(supabase, existingVenue.id, "banner", file);
    setUploadingBanner(false);
    if (error) { toast.error("Error al subir banner: " + error); return; }
    setBannerUrl(url);
    toast.success("Banner actualizado");
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !existingVenue) return;
    setUploadingLogo(true);
    const { url, error } = await uploadVenueAsset(supabase, existingVenue.id, "logo", file);
    setUploadingLogo(false);
    if (error) { toast.error("Error al subir logo: " + error); return; }
    setLogoUrl(url);
    toast.success("Logo actualizado");
  }

  async function handlePaymentQrUpload(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const file = e.target.files?.[0];
    if (!file || !existingVenue) return;
    setUploadingQrId(id);
    const { url, error } = await uploadVenueAsset(supabase, existingVenue.id, `payment_qr_${id}`, file);
    setUploadingQrId(null);
    if (error) { toast.error("Error al subir QR: " + error); return; }
    setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, qr_url: url || undefined } : pm));
    toast.success("QR de pago actualizado");
  }

  function addPaymentMethod() {
    setPaymentMethods(prev => [...prev, { id: crypto.randomUUID(), bank_name: "", account_number: "", account_name: "" }]);
  }

  function updatePaymentMethod(id: string, field: keyof VenuePaymentMethod, value: string) {
    setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, [field]: value } : pm));
  }

  function removePaymentMethod(id: string) {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !city.trim() || !address.trim()) {
      toast.error("Nombre, ciudad y dirección son obligatorios.");
      return;
    }
    setSaving(true);

    const input = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      payment_instructions: paymentInstructions.trim() || null,
      payment_methods: paymentMethods.filter(pm => pm.bank_name.trim() && pm.account_number.trim()),
      lat: lat,
      lng: lng,
      ...(bannerUrl != null ? { banner_url: bannerUrl } : {}),
      ...(logoUrl != null ? { logo_url: logoUrl } : {}),
    };

    const { error } = existingVenue
      ? await updateVenue(supabase, existingVenue.id, input)
      : await upsertOwnerVenue(supabase, user.id, input);

    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error);
      return;
    }
    toast.success("Centro actualizado correctamente");
    navigate("/mis-canchas/centro");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <h1 className="font-bold text-xl">{existingVenue ? "Editar Centro" : "Crear Centro Deportivo"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {existingVenue ? "Actualiza la información pública de tu centro." : "Configura el perfil de tu centro deportivo."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Información básica</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre del centro *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Complejo Deportivo Norte"
              className="rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Manizales"
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <AddressGeoPicker 
                city={city}
                value={{ address, lat, lng }}
                onChange={(v) => {
                  setAddress(v.address);
                  setLat(v.lat);
                  setLng(v.lng);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu centro deportivo…"
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contacto</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+57 300 000 0000"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Imágenes</h2>

          {!existingVenue && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
              Guarda primero el centro para poder subir imágenes.
            </p>
          )}

          {/* Banner */}
          <div className="space-y-2">
            <Label>Banner</Label>
            {bannerUrl && (
              <img src={bannerUrl} alt="Banner" className="w-full h-24 object-cover rounded-xl" />
            )}
            {!bannerUrl && (
              <div className="w-full h-24 bg-gradient-to-br from-violet-900 to-indigo-900 rounded-xl flex items-center justify-center">
                <Image className="size-8 text-white/40" />
              </div>
            )}
            <input
              ref={bannerRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerUpload}
              disabled={!existingVenue}
            />
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              disabled={!existingVenue || uploadingBanner}
              className="flex items-center gap-2 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingBanner ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {uploadingBanner ? "Subiendo…" : "Cambiar banner"}
            </button>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                  <Image className="size-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={!existingVenue}
                />
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={!existingVenue || uploadingLogo}
                  className="flex items-center gap-2 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {uploadingLogo ? "Subiendo…" : "Cambiar logo"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Datos de Pago</h2>
          
          <div className="space-y-1.5">
            <Label htmlFor="paymentInstructions">Instrucciones de pago (Generales)</Label>
            <textarea
              id="paymentInstructions"
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Ej. Envía el comprobante por WhatsApp..."
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label>Cuentas Bancarias</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentMethod}
                className="h-8 rounded-lg text-xs"
              >
                <Plus className="size-3 mr-1.5" /> Agregar cuenta
              </Button>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="text-center py-6 bg-muted/30 border border-dashed rounded-xl">
                <p className="text-sm text-muted-foreground">No has agregado ninguna cuenta bancaria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="relative p-4 border rounded-xl bg-muted/10 space-y-4">
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(pm.id)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Banco / Billetera *</Label>
                        <Input
                          value={pm.bank_name}
                          onChange={e => updatePaymentMethod(pm.id, "bank_name", e.target.value)}
                          placeholder="Ej. Nequi, Bancolombia"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número de Cuenta *</Label>
                        <Input
                          value={pm.account_number}
                          onChange={e => updatePaymentMethod(pm.id, "account_number", e.target.value)}
                          placeholder="Ej. 300 000 0000"
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Nombre del Titular (Opcional)</Label>
                        <Input
                          value={pm.account_name ?? ""}
                          onChange={e => updatePaymentMethod(pm.id, "account_name", e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t flex items-start gap-4">
                      {pm.qr_url ? (
                        <img src={pm.qr_url} alt="QR de Pago" className="w-16 h-16 rounded-lg object-contain border border-border bg-white" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                          <Image className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="space-y-1 pt-1">
                        <input
                          id={`qr_upload_${pm.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={e => handlePaymentQrUpload(e, pm.id)}
                          disabled={!existingVenue}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`qr_upload_${pm.id}`)?.click()}
                          disabled={!existingVenue || uploadingQrId === pm.id}
                          className="flex items-center gap-2 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 transition-colors"
                        >
                          {uploadingQrId === pm.id ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                          {uploadingQrId === pm.id ? "Subiendo…" : "Subir código QR"}
                        </button>
                        <p className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
                          Opcional. Puedes subir un código QR asociado a esta cuenta específica.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Guardando…
            </span>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </form>
    </div>
  );
}
