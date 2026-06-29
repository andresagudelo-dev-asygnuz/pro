import "leaflet/dist/leaflet.css";
import { useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { geocodeAddress } from "@/lib/geo/nominatim";
import { MapPin, Navigation } from "lucide-react";

export interface GeoPickerValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressGeoPickerProps {
  value: GeoPickerValue;
  onChange: (v: GeoPickerValue) => void;
  city: string;
}

const pinIcon = L.divIcon({
  html: '<div style="width:20px;height:20px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "",
});

interface DraggableMarkerProps {
  position: [number, number];
  onDrag: (lat: number, lng: number) => void;
}

function DraggableMarker({ position, onDrag }: DraggableMarkerProps) {
  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const latlng = (e.target as L.Marker).getLatLng();
          onDrag(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function AddressGeoPicker({ value, onChange, city }: AddressGeoPickerProps) {
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    value.lat != null && value.lng != null
      ? [value.lat, value.lng]
      : [4.5709, -74.2973],
  );
  const [mapKey, setMapKey] = useState(0);

  async function handleSearch() {
    if (!value.address.trim()) return;
    setSearching(true);
    const result = await geocodeAddress(value.address, city);
    setSearching(false);
    if (result) {
      onChange({ ...value, lat: result.lat, lng: result.lng });
      setMapCenter([result.lat, result.lng]);
      setMapKey((k) => k + 1);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onChange({ ...value, lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setMapKey((k) => k + 1);
        setSearching(false);
      },
      () => {
        alert("No se pudo obtener tu ubicación. Verifica los permisos.");
        setSearching(false);
      }
    );
  }

  const hasCoords = value.lat != null && value.lng != null;

  return (
    <div className="space-y-2">
      <Label>Dirección del centro</Label>
      <div className="flex gap-2">
        <Input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Calle 50 #23-45"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleSearch()}
          disabled={searching}
          className="shrink-0"
        >
          Buscar
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={searching}
          className="shrink-0 flex items-center gap-1"
          title="Usar mi ubicación actual"
        >
          <Navigation className="size-4" />
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/60 mt-2">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={16}
          style={{ height: "240px", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {hasCoords && (
            <DraggableMarker
              position={[value.lat!, value.lng!]}
              onDrag={(lat, lng) => onChange({ ...value, lat, lng })}
            />
          )}
          <MapClickHandler
            onClick={(lat, lng) => onChange({ ...value, lat, lng })}
          />
        </MapContainer>
        <p className="text-xs text-muted-foreground px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50">
          Arrastrá el pin o hacé clic en el mapa para ajustar la ubicación exacta.
        </p>
      </div>
    </div>
  );
}
