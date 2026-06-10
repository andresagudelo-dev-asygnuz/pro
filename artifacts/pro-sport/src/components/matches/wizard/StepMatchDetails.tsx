import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_LEVELS, type Sport } from "@/lib/types/db";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { MatchInfo } from "./types";

export interface StepMatchDetailsProps {
  matchInfo: MatchInfo;
  sports: Sport[];
  isPublic: boolean;
  fieldErrors: Record<string, string>;
  preselectedBookingId: string | null;
  onChangeMatchInfo: (update: Partial<MatchInfo>) => void;
  onTogglePublic: () => void;
  onNext: () => void;
}

export function StepMatchDetails({
  matchInfo, sports, isPublic, fieldErrors, preselectedBookingId,
  onChangeMatchInfo, onTogglePublic, onNext,
}: StepMatchDetailsProps) {
  return (
    <div className="flex flex-col gap-5">
      {preselectedBookingId && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Cancha reservada — completá los datos del partido</span>
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold">Información del partido</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Nombre, deporte y configuración básica.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Nombre del partido *</Label>
        <Input
          id="title"
          placeholder='Ej: "Pichanga de los martes"'
          value={matchInfo.title}
          onChange={(e) => onChangeMatchInfo({ title: e.target.value })}
        />
        {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Deporte *</Label>
        <Select value={matchInfo.sport_id} onValueChange={(v) => onChangeMatchInfo({ sport_id: v })}>
          <SelectTrigger><SelectValue placeholder="Seleccioná el deporte" /></SelectTrigger>
          <SelectContent>
            {sports.map((sp) => (
              <SelectItem key={sp.id} value={sp.id}>
                {sp.icon && <span className="mr-1">{sp.icon}</span>}{sp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.sport_id && <p className="text-xs text-destructive">{fieldErrors.sport_id}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Nivel de dificultad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Select value={matchInfo.skill_level} onValueChange={(v) => onChangeMatchInfo({ skill_level: v })}>
          <SelectTrigger><SelectValue placeholder="Cualquier nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Cualquier nivel</SelectItem>
            {SKILL_LEVELS.map((lvl) => <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="duration">Duración (min) *</Label>
          <Input
            id="duration" type="number" min={15} max={600} step={15}
            value={matchInfo.duration_minutes}
            onChange={(e) => onChangeMatchInfo({ duration_minutes: parseInt(e.target.value) || 60 })}
          />
          {fieldErrors.duration_minutes && <p className="text-xs text-destructive">{fieldErrors.duration_minutes}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="max_players">Máx. jugadores *</Label>
          <Input
            id="max_players" type="number" min={2} max={64}
            value={matchInfo.max_players}
            onChange={(e) => onChangeMatchInfo({ max_players: parseInt(e.target.value) || 10 })}
          />
          {fieldErrors.max_players && <p className="text-xs text-destructive">{fieldErrors.max_players}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Textarea
          id="description" placeholder="Detalles del partido, reglas especiales…" rows={3}
          value={matchInfo.description}
          onChange={(e) => onChangeMatchInfo({ description: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between p-4 border border-border/60 rounded-xl bg-muted/30">
        <div>
          <p className="text-sm font-medium">Partido público</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPublic ? "Aparece en el feed y cualquiera puede unirse." : "Solo visible para quienes tengan el enlace."}
          </p>
        </div>
        <button
          type="button" onClick={onTogglePublic}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPublic ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>
      <Button onClick={onNext} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700">
        Siguiente — Elegir lugar <ArrowRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
