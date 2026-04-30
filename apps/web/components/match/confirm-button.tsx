"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { confirmAttendance } from "@/lib/match/actions";
import { toast } from "sonner";

export function ConfirmButton({ matchId }: { matchId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const res = await confirmAttendance(matchId);
    setLoading(false);

    if (res.ok) {
      toast.success("Asistencia confirmada!");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Button 
      size="sm" 
      onClick={handleConfirm} 
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      <Check className="mr-2 h-4 w-4" />
      Confirmar Asistencia
    </Button>
  );
}
