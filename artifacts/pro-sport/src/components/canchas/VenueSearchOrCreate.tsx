import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getVenuesByCity, createVenue } from "@/lib/venues/api";
import type { Venue } from "@/lib/types/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressGeoPicker, type GeoPickerValue } from "./AddressGeoPicker";

interface VenueSearchOrCreateProps {
  city: string;
  value: string | null;
  onChange: (venueId: string | null) => void;
}

const CREATE_SENTINEL = "__create__";

export function VenueSearchOrCreate({ city, value, onChange }: VenueSearchOrCreateProps) {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New venue form state
  const [newName, setNewName] = useState("");
  const [geo, setGeo] = useState<GeoPickerValue>({ address: "", lat: null, lng: null });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!city.trim()) {
      setVenues([]);
      return;
    }
    setLoadingVenues(true);
    getVenuesByCity(supabase, city).then(({ data }) => {
      setVenues(data ?? []);
      setLoadingVenues(false);
    });
  }, [city]);

  function handleSelectChange(v: string) {
    if (v === CREATE_SENTINEL) {
      setShowCreateDialog(true);
    } else if (v === "__none__") {
      onChange(null);
    } else {
      onChange(v);
    }
  }

  async function handleCreateVenue() {
    if (!user) return;
    if (!newName.trim()) {
      setCreateError("Ingresá el nombre del centro.");
      return;
    }
    if (!geo.address.trim()) {
      setCreateError("Ingresá la dirección.");
      return;
    }
    setCreateError(null);
    setCreating(true);

    const { data: created, error } = await createVenue(
      supabase,
      {
        name: newName.trim(),
        address: geo.address.trim(),
        city: city.trim(),
        lat: geo.lat ?? undefined,
        lng: geo.lng ?? undefined,
      },
      user.id,
    );

    setCreating(false);
    if (error || !created) {
      setCreateError(error ?? "Error al crear el centro.");
      return;
    }

    setVenues((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(created.id);
    setShowCreateDialog(false);
    setNewName("");
    setGeo({ address: "", lat: null, lng: null });
  }

  const selectValue = value ?? "__none__";

  return (
    <>
      <div className="space-y-2">
        <Label>Centro deportivo (opcional)</Label>
        <Select value={selectValue} onValueChange={handleSelectChange} disabled={loadingVenues}>
          <SelectTrigger>
            <SelectValue placeholder="Sin centro deportivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin centro deportivo</SelectItem>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
            <SelectItem value={CREATE_SENTINEL} className="text-violet-600 dark:text-violet-400 font-medium">
              + Crear nuevo centro deportivo…
            </SelectItem>
          </SelectContent>
        </Select>
        {!city.trim() && (
          <p className="text-xs text-muted-foreground">
            Ingresá la ciudad para ver centros disponibles.
          </p>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo centro deportivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="venue-name">Nombre del centro *</Label>
              <Input
                id="venue-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Complejo Deportivo Norte"
              />
            </div>

            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={city} readOnly className="bg-muted/30 text-muted-foreground" />
            </div>

            <AddressGeoPicker value={geo} onChange={setGeo} city={city} />

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={creating}
                onClick={() => void handleCreateVenue()}
              >
                {creating ? "Creando…" : "Crear centro"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
