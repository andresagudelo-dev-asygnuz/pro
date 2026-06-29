import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import type { MatchParticipant, Profile } from "@/lib/types/db";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  othersToRate: MatchParticipant[];
  profilesById: Map<string, Profile>;
  onSubmit: (ratings: Record<string, number>) => Promise<void>;
  submitting: boolean;
}

export function PostMatchModal({ open, onOpenChange, othersToRate, profilesById, onSubmit, submitting }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const handleSetRating = (uid: string, rating: number) => {
    setRatings(prev => ({ ...prev, [uid]: rating }));
  };

  const handleSubmit = async () => {
    await onSubmit(ratings);
    onOpenChange(false); // Close after successful submit
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-5 text-amber-500 fill-amber-500" />
            Calificá a tus compañeros
          </DialogTitle>
          <DialogDescription>
            Tu opinión construye la comunidad PRO. Califica el desempeño y fair play.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ul className="flex flex-col divide-y divide-border/40">
            {othersToRate.map((p) => {
              const pp = profilesById.get(p.user_id);
              const currentRating = ratings[p.user_id] ?? 0;
              return (
                <li key={p.user_id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9">
                      {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                      <AvatarFallback className="text-xs bg-muted">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{pp?.full_name ?? pp?.username ?? "Jugador"}</p>
                      {(pp?.rating_count ?? 0) > 0 && <p className="text-xs text-muted-foreground">★ {pp?.rating_avg?.toFixed(1)}</p>}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => handleSetRating(p.user_id, star)} className="p-0.5 transition-transform active:scale-90">
                        <Star className={`size-6 transition-colors ${star <= currentRating ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700"}`} />
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Ahora no</Button>
          <Button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold" 
            disabled={submitting || Object.keys(ratings).length === 0} 
            onClick={handleSubmit}
          >
            {submitting ? "Guardando…" : "Enviar calificaciones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
