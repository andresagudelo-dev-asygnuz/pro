import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MatchWithNames } from "@/lib/tournaments/matches";

interface Props {
  match: MatchWithNames | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    matchId: string,
    homeScore: number,
    awayScore: number,
    status: "finalizado" | "w_o",
  ) => void;
  isLoading: boolean;
}

export function MatchResultDialog({
  match,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: Props) {
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [status, setStatus] = useState<"finalizado" | "w_o">("finalizado");
  const [errors, setErrors] = useState<{ home?: string; away?: string }>({});

  useEffect(() => {
    if (match) {
      setHomeScore(match.home_score != null ? String(match.home_score) : "");
      setAwayScore(match.away_score != null ? String(match.away_score) : "");
      setStatus(
        match.status === "w_o" || match.status === "finalizado"
          ? match.status
          : "finalizado",
      );
      setErrors({});
    }
  }, [match]);

  function validate(): boolean {
    const newErrors: { home?: string; away?: string } = {};
    const home = Number(homeScore);
    const away = Number(awayScore);
    if (homeScore === "" || isNaN(home) || home < 0) {
      newErrors.home = "Ingresá un marcador válido (0 o más)";
    }
    if (awayScore === "" || isNaN(away) || away < 0) {
      newErrors.away = "Ingresá un marcador válido (0 o más)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleConfirm() {
    if (!match || !validate()) return;
    onConfirm(match.id, Number(homeScore), Number(awayScore), status);
  }

  const homeName = match?.home_team_name ?? match?.home_player_name ?? "Local";
  const awayName = match?.away_team_name ?? match?.away_player_name ?? "Visitante";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {homeName} <span className="text-muted-foreground font-normal">vs</span> {awayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="home-score" className="text-xs">{homeName}</Label>
              <Input
                id="home-score"
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="rounded-xl"
                placeholder="0"
              />
              {errors.home && (
                <p className="text-xs text-destructive">{errors.home}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="away-score" className="text-xs">{awayName}</Label>
              <Input
                id="away-score"
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="rounded-xl"
                placeholder="0"
              />
              {errors.away && (
                <p className="text-xs text-destructive">{errors.away}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <div className="flex gap-3">
              {(["finalizado", "w_o"] as const).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="match-status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="accent-violet-600"
                  />
                  {s === "finalizado" ? "Finalizado" : "W/O"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-violet-600 hover:bg-violet-700"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Guardando…" : "Guardar resultado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
