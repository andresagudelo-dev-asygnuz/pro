import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { CANCHAS_SPORT_OPTIONS, ENABLED_CITIES } from "@/lib/types/db";
import { updateTeam, type TeamWithMembers } from "@/lib/teams/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TeamEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
  onUpdate: (updatedTeam: TeamWithMembers) => void;
}

export function TeamEditModal({ isOpen, onOpenChange, team, onUpdate }: TeamEditModalProps) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [sportType, setSportType] = useState(team.sport_type);
  const [city, setCity] = useState(team.city);
  const [maxMembers, setMaxMembers] = useState(team.max_members);

  useEffect(() => {
    if (isOpen) {
      setName(team.name);
      setDescription(team.description || "");
      setSportType(team.sport_type);
      setCity(team.city);
      setMaxMembers(team.max_members);
    }
  }, [isOpen, team]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("El nombre es requerido."); return; }
    if (!city) { toast.error("Elegí una ciudad."); return; }

    setPending(true);
    try {
      await updateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        city,
        max_members: maxMembers,
      });
      toast.success("Equipo actualizado");
      onUpdate({ ...team, name: name.trim(), description: description.trim() || null, sport_type: sportType, city, max_members: maxMembers });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al actualizar el equipo");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[36px] bg-zinc-50 dark:bg-zinc-950 border-none p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <SheetHeader className="px-6 pt-8 pb-4 text-left border-b border-border/40 shrink-0 bg-white dark:bg-zinc-900">
          <SheetTitle className="text-xl font-bold">Editar Equipo</SheetTitle>
          <SheetDescription>Actualiza la información de tu equipo.</SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="edit-team-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del equipo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Los Cracks FC"
                required
                maxLength={60}
                className="bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un poco sobre el equipo…"
                rows={3}
                maxLength={300}
                className="bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deporte</Label>
                <Select value={sportType} onValueChange={setSportType}>
                  <SelectTrigger className="rounded-xl bg-white dark:bg-zinc-900">
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
                  <SelectTrigger className="rounded-xl bg-white dark:bg-zinc-900">
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

            <div className="space-y-1.5">
              <Label htmlFor="max">Máx. miembros (capacidad)</Label>
              <Input
                id="max"
                type="number"
                min={2}
                max={50}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="rounded-xl bg-white dark:bg-zinc-900"
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-border/40 bg-white dark:bg-zinc-900 shrink-0">
          <Button 
            type="submit" 
            form="edit-team-form" 
            className="w-full rounded-2xl h-12 text-base font-bold bg-violet-600 hover:bg-violet-700 text-white" 
            disabled={pending}
          >
            {pending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {pending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
