import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { createTeam, generateSlug, RlsPolicyError } from "@/lib/teams/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { CANCHAS_SPORT_OPTIONS, ENABLED_CITIES } from "@/lib/types/db";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "lucide-react";

const SUPABASE_SQL_EDITOR = "https://supabase.com/dashboard/project/ewzpwldtaeaxtesimjau/sql/new";

function RlsErrorBanner({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Falta configuración en la base de datos
          </p>
          <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
            Copiá este SQL y ejecutalo en el Editor SQL de Supabase.
          </p>
        </div>
      </div>

      <pre className="bg-zinc-900 text-green-300 rounded-xl p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono">
        {sql}
      </pre>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "¡Copiado!" : "Copiar SQL"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl gap-1.5 border-amber-300 text-amber-700 dark:text-amber-300"
          onClick={() => window.open(SUPABASE_SQL_EDITOR, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir SQL Editor
        </Button>
      </div>

      <p className="text-[11px] text-amber-600 dark:text-amber-500 text-center">
        Luego de ejecutar el SQL, volvé aquí e intentá crear el equipo de nuevo.
      </p>
    </div>
  );
}

export default function NewTeamPage() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] = useState("futbol_5");
  const [city, setCity] = useState(profile?.city ?? "");
  const [maxMembers, setMaxMembers] = useState(20);
  const [isPublic, setIsPublic] = useState(true);
  const [rlsSql, setRlsSql] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { toast.error("El nombre es requerido."); return; }
    if (!city) { toast.error("Elegí una ciudad."); return; }

    setPending(true);
    setRlsSql(null);
    setRawError(null);
    try {
      const slug = generateSlug(name) + "-" + Math.random().toString(36).slice(2, 6);
      const team = await createTeam({
        name: name.trim(),
        slug,
        description: description.trim() || null,
        sport_type: sportType,
        city,
        owner_id: user.id,
        max_members: maxMembers,
        is_public: isPublic,
      });
      toast.success("¡Equipo creado!");
      setLocation(`/equipos/${team.id}`);
    } catch (err: any) {
      console.error("[createTeam] raw error:", JSON.stringify(err, null, 2));
      if (err instanceof RlsPolicyError) {
        setRlsSql(err.sql);
      } else {
        const detail = err?.code ? ` (code: ${err.code})` : "";
        setRawError((err?.message ?? "Error desconocido") + detail);
      }
    }
    setPending(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Crear equipo" backHref="/equipos" />

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
        {rlsSql && <RlsErrorBanner sql={rlsSql} />}
        {rawError && (
          <div className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-700 p-4">
            <p className="font-semibold text-red-700 dark:text-red-300 text-sm mb-1">Error al crear equipo</p>
            <p className="text-red-600 dark:text-red-400 text-xs font-mono break-all">{rawError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">

            <div className="flex justify-center pb-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-4xl shadow-sm">
                ⚽
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del equipo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Los Cracks FC"
                required
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un poco sobre el equipo…"
                rows={2}
                maxLength={300}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deporte</Label>
                <Select value={sportType} onValueChange={setSportType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCHAS_SPORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ciudad *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Elegí…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENABLED_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="max">Máx. miembros</Label>
                <Input
                  id="max"
                  type="number"
                  min={2}
                  max={50}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Visibilidad</Label>
                <Select value={isPublic ? "publico" : "privado"} onValueChange={(v) => setIsPublic(v === "publico")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">🌐 Público</SelectItem>
                    <SelectItem value="privado">🔒 Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setLocation("/equipos")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700">
              {pending ? "Creando…" : "Crear equipo"}
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
