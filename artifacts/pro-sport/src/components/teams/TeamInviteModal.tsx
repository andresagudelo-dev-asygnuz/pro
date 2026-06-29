import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Search, Link as LinkIcon, Share2, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchProfilesByUsername } from "@/lib/profiles/api";
import { joinTeam, type TeamWithMembers } from "@/lib/teams/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";

interface TeamInviteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
  onUpdate: () => void;
}

export function TeamInviteModal({ isOpen, onOpenChange, team, onUpdate }: TeamInviteModalProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data, error } = await searchProfilesByUsername(supabase, q);
    setIsSearching(false);
    if (error) {
      toast.error("Error buscando usuarios");
      return;
    }
    // Filter out users that are already in the team
    const currentMemberIds = new Set(team.team_members.map(m => m.user_id));
    setSearchResults((data || []).filter(u => !currentMemberIds.has(u.id)));
  }

  async function handleAddUser(userId: string) {
    setAddingUserId(userId);
    try {
      await joinTeam(team.id, userId);
      toast.success("¡Usuario añadido al equipo!");
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      onUpdate();
    } catch (err: any) {
      toast.error(err?.message ?? "Error al añadir usuario");
    } finally {
      setAddingUserId(null);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/equipos/${team.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `¡Únete a mi equipo ${team.name} en PRO.!`,
          text: `Te invito a formar parte de mi equipo. Haz clic en el enlace para unirte.`,
          url: url,
        });
        toast.success("Invitación compartida");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("No se pudo compartir la invitación");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Enlace de invitación copiado al portapapeles");
    }
  }

  const modalContent = (
    <div className="flex flex-col gap-6 py-4">
      {/* Search Section */}
      <div className="space-y-4 px-6">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Buscar y Añadir</h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre de usuario (ej. messi10)"
            className="pl-9 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl h-11"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 animate-spin" />
          )}
        </div>

        {/* Results list */}
        {searchResults.length > 0 && (
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-border/40">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                    <AvatarFallback>{initialsFromName(user.full_name ?? user.username)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {user.full_name || user.username || "Usuario"}
                    </p>
                    <p className="text-xs text-zinc-500">@{user.username || user.id.slice(0,6)}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleAddUser(user.id)}
                  disabled={addingUserId === user.id}
                  className="rounded-full h-8 px-4 border-brand-primary/20 text-brand-primary bg-brand-primary/5 hover:bg-brand-primary hover:text-white transition-colors"
                >
                  {addingUserId === user.id ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5 mr-1" />}
                  {addingUserId === user.id ? "" : "Añadir"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-6 text-sm text-zinc-500">
            No se encontraron usuarios o ya están en el equipo.
          </div>
        )}
      </div>

      <div className="px-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-50 dark:bg-zinc-950 px-2 text-zinc-500">O también puedes</span></div>
        </div>
      </div>

      {/* Share Link Section */}
      <div className="px-6 pb-2">
        <Button 
          onClick={handleShare}
          className="w-full h-12 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 font-semibold flex items-center justify-center gap-2"
        >
          <Share2 className="size-5" />
          Compartir Enlace del Equipo
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[36px] bg-zinc-50 dark:bg-zinc-950 border-none p-0 max-h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="px-6 pt-8 pb-4 text-left border-b border-border/40 shrink-0 bg-white dark:bg-zinc-900">
            <SheetTitle className="text-xl font-bold">Invitar al Equipo</SheetTitle>
            <SheetDescription>Busca un jugador en PRO. o comparte el enlace mágico.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto pb-4">
            {modalContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-zinc-50 dark:bg-zinc-950 p-0 overflow-hidden border-border/40">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-white dark:bg-zinc-900">
          <DialogTitle className="text-xl font-bold">Invitar al Equipo</DialogTitle>
          <DialogDescription>Busca un jugador en PRO. o comparte el enlace mágico.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {modalContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
