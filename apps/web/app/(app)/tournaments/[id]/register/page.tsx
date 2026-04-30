"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createTeam,
  getMyTeams,
  registerSoloToTournament,
  registerTeamToTournament,
  type TeamRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";

type PageProps = { params: Promise<{ id: string }> };

export default function RegisterToTournamentPage({ params }: PageProps) {
  const router = useRouter();
  const { id: tournamentId } = use(params);
  const supabase = createClient();

  const [mode, setMode] = useState<"solo" | "team">("solo");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await getMyTeams(supabase);
      if (!active) return;
      const rows = data ?? [];
      setTeams(rows);
      if (rows.length > 0) setSelectedTeamId(rows[0].id);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSolo() {
    setError(null);
    setLoading(true);
    const { error: err } = await registerSoloToTournament(supabase, {
      tournamentId,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/tournaments/${tournamentId}`);
    router.refresh();
  }

  async function handleTeam() {
    setError(null);
    setLoading(true);

    let teamId = selectedTeamId;

    if (!teamId && newTeamName.trim().length > 0) {
      const { data, error: err } = await createTeam(supabase, {
        name: newTeamName.trim(),
        memberUserIds: [],
      });
      if (err || !data) {
        setLoading(false);
        setError(err ?? "No se pudo crear el equipo.");
        return;
      }
      teamId = data.id;
    }

    if (!teamId) {
      setLoading(false);
      setError("Elegí un equipo existente o creá uno nuevo.");
      return;
    }

    const { error: err } = await registerTeamToTournament(supabase, {
      tournamentId,
      teamId,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push(`/tournaments/${tournamentId}`);
    router.refresh();
  }

  return (
    <div className="container py-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Inscripción al torneo
        </h1>
        <p className="text-muted-foreground mt-1">
          Elegí cómo querés participar.
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Modo de inscripción">
        <Button
          variant={mode === "solo" ? "default" : "outline"}
          onClick={() => setMode("solo")}
          type="button"
        >
          Individual
        </Button>
        <Button
          variant={mode === "team" ? "default" : "outline"}
          onClick={() => setMode("team")}
          type="button"
        >
          Con mi equipo
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {mode === "solo" ? (
        <section className="border rounded-lg p-6 space-y-4">
          <p className="text-sm">
            Te vas a inscribir como jugador individual. Necesitás tener la
            verificación de edad aprobada (RF-007).
          </p>
          <Button onClick={handleSolo} disabled={loading}>
            {loading ? "Inscribiendo…" : "Confirmar inscripción individual"}
          </Button>
        </section>
      ) : (
        <section className="border rounded-lg p-6 space-y-4">
          {teams.length > 0 && (
            <div className="space-y-2">
              <label
                htmlFor="team-select"
                className="text-sm font-medium"
              >
                Elegí un equipo existente
              </label>
              <select
                id="team-select"
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setNewTeamName("");
                }}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="new-team-name" className="text-sm font-medium">
              …o creá uno nuevo
            </label>
            <input
              id="new-team-name"
              type="text"
              value={newTeamName}
              onChange={(e) => {
                setNewTeamName(e.target.value);
                if (e.target.value) setSelectedTeamId("");
              }}
              placeholder="Nombre del equipo"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Vas a quedar como capitán. Podrás agregar miembros después desde
              la ficha del equipo.
            </p>
          </div>

          <Button onClick={handleTeam} disabled={loading}>
            {loading ? "Inscribiendo…" : "Confirmar inscripción de equipo"}
          </Button>
        </section>
      )}
    </div>
  );
}
