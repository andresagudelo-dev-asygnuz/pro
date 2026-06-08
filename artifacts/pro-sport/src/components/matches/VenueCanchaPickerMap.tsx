import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { SPORT_TYPE_ICONS, SPORT_TYPE_LABELS, type Cancha, type Venue } from "@/lib/types/db";

interface GeoPoint {
  lat: number;
  lng: number;
}

interface VenueCanchaPickerMapProps {
  canchas: Cancha[];
  venues: Venue[];
  userLocation: GeoPoint | null;
  selectedCanchaId: string | null;
  onSelectCancha: (cancha: Cancha) => void;
  height?: string;
}

function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: '<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: "",
  });
}

function venueMarkerIcon(venueName: string, count: number): L.DivIcon {
  const label = `${venueName} · ${count} ${count === 1 ? "cancha" : "canchas"}`;
  const html = `<div style="background:#7c3aed;color:white;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${label}</div>`;
  return L.divIcon({ html, className: "", iconAnchor: [label.length * 3.5, 28] });
}

function singleCanchaIcon(sportEmoji: string, selected: boolean): L.DivIcon {
  const bg = selected ? "#059669" : "#7c3aed";
  const shadow = selected ? "rgba(5,150,105,0.5)" : "rgba(124,58,237,0.45)";
  const html = `<div style="display:flex;flex-direction:column;align-items:center;width:38px"><div style="width:38px;height:38px;background:${bg};border-radius:50%;border:3px solid white;box-shadow:0 3px 10px ${shadow};display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1">${selected ? "✓" : sportEmoji}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${bg};margin-top:-2px"></div></div>`;
  return L.divIcon({ html, iconSize: [38, 46], iconAnchor: [19, 46], className: "" });
}

function FitBounds({ markers, userLocation }: { markers: [number, number][]; userLocation: GeoPoint | null }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (didFitRef.current) return;
    if (markers.length === 0) return;
    didFitRef.current = true;
    if (markers.length === 1) {
      map.setView(markers[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(markers), { padding: [40, 40] });
    }
  }, [map, markers]);

  useEffect(() => {
    if (!userLocation) return;
    const venueMarkers = markers.filter((m) => m[0] !== userLocation.lat || m[1] !== userLocation.lng);
    if (venueMarkers.length === 0) {
      map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [map, userLocation, markers]);

  return null;
}

function CanchaPickerPopup({ cancha, isSelected, onSelect }: { cancha: Cancha; isSelected: boolean; onSelect: () => void }) {
  const finalPrice = cancha.discount_percent > 0
    ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
    : cancha.price_per_hour;

  return (
    <div style={{ minWidth: "180px", maxWidth: "220px", fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "22px", lineHeight: 1 }}>{SPORT_TYPE_ICONS[cancha.sport_type]}</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: "13px", margin: 0, color: "#18181b" }}>{cancha.name}</p>
          <p style={{ fontSize: "11px", color: "#71717a", margin: 0 }}>{SPORT_TYPE_LABELS[cancha.sport_type]}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "#52525b" }}>👥 {cancha.capacity} jug.</span>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#7c3aed" }}>
          ${finalPrice.toLocaleString("es-CO")}/h
          {cancha.discount_percent > 0 && (
            <span style={{ marginLeft: "4px", fontSize: "10px", background: "#dcfce7", color: "#16a34a", borderRadius: "4px", padding: "1px 4px" }}>
              -{cancha.discount_percent}%
            </span>
          )}
        </span>
      </div>
      <button
        onClick={onSelect}
        style={{
          display: "block", width: "100%",
          background: isSelected ? "#059669" : "#7c3aed",
          color: "white", border: "none", borderRadius: "8px",
          padding: "8px 12px", fontWeight: 700, fontSize: "13px",
          cursor: "pointer", textAlign: "center",
        }}
      >
        {isSelected ? "✓ Seleccionada" : "Seleccionar →"}
      </button>
    </div>
  );
}

export function VenueCanchaPickerMap({
  canchas,
  venues,
  userLocation,
  selectedCanchaId,
  onSelectCancha,
  height = "300px",
}: VenueCanchaPickerMapProps) {
  const venueMap = new Map<string, Venue>(venues.map((v) => [v.id, v]));

  const canchasByVenue = new Map<string, Cancha[]>();
  const canchasWithoutVenue: Cancha[] = [];

  for (const c of canchas) {
    if (c.venue_id) {
      const group = canchasByVenue.get(c.venue_id) ?? [];
      group.push(c);
      canchasByVenue.set(c.venue_id, group);
    } else {
      canchasWithoutVenue.push(c);
    }
  }

  const allMarkerPositions: [number, number][] = [];
  if (userLocation) allMarkerPositions.push([userLocation.lat, userLocation.lng]);

  for (const [venueId, venueCanchas] of canchasByVenue.entries()) {
    const venue = venueMap.get(venueId);
    if (venue?.lat != null && venue?.lng != null) {
      allMarkerPositions.push([venue.lat, venue.lng]);
      void venueCanchas;
    }
  }
  for (const c of canchasWithoutVenue) {
    if (c.lat != null && c.lng != null) allMarkerPositions.push([c.lat, c.lng]);
  }
  for (const [venueId, venueCanchas] of canchasByVenue.entries()) {
    const venue = venueMap.get(venueId);
    if (!venue || venue.lat == null || venue.lng == null) {
      for (const c of venueCanchas) {
        if (c.lat != null && c.lng != null) allMarkerPositions.push([c.lat, c.lng]);
      }
    }
  }

  const defaultCenter: [number, number] = [4.5709, -74.2973];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      style={{ height, width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <FitBounds markers={allMarkerPositions} userLocation={userLocation} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()}>
          <Popup><span style={{ fontSize: "13px", fontWeight: 600 }}>Tu ubicación</span></Popup>
        </Marker>
      )}

      {Array.from(canchasByVenue.entries()).map(([venueId, venueCanchas]) => {
        const venue = venueMap.get(venueId);

        // Venue has no coords → render individual cancha markers
        if (!venue || venue.lat == null || venue.lng == null) {
          return venueCanchas
            .filter((c) => c.lat != null && c.lng != null)
            .map((c) => (
              <Marker
                key={c.id}
                position={[c.lat!, c.lng!]}
                icon={singleCanchaIcon(SPORT_TYPE_ICONS[c.sport_type], c.id === selectedCanchaId)}
              >
                <Popup>
                  <CanchaPickerPopup
                    cancha={c}
                    isSelected={c.id === selectedCanchaId}
                    onSelect={() => onSelectCancha(c)}
                  />
                </Popup>
              </Marker>
            ));
        }

        // Venue with coords → show venue pill, popup with cancha list
        return (
          <Marker
            key={venueId}
            position={[venue.lat, venue.lng]}
            icon={venueMarkerIcon(venue.name, venueCanchas.length)}
          >
            <Popup>
              <div style={{ minWidth: "180px", maxWidth: "240px", fontFamily: "inherit" }}>
                <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#18181b" }}>{venue.name}</p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {venueCanchas.map((c) => {
                    const finalPrice = c.discount_percent > 0
                      ? c.price_per_hour * (1 - c.discount_percent / 100)
                      : c.price_per_hour;
                    const isSelected = c.id === selectedCanchaId;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => onSelectCancha(c)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: "8px",
                            background: isSelected ? "#f0fdf4" : "#fafafa",
                            border: `1px solid ${isSelected ? "#bbf7d0" : "#e4e4e7"}`,
                            borderRadius: "8px", padding: "6px 8px",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "16px" }}>{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#18181b" }}>{c.name}</span>
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: isSelected ? "#059669" : "#7c3aed", whiteSpace: "nowrap" }}>
                            {isSelected ? "✓" : `$${finalPrice.toLocaleString("es-CO")}/h`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {canchasWithoutVenue
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => (
          <Marker
            key={c.id}
            position={[c.lat!, c.lng!]}
            icon={singleCanchaIcon(SPORT_TYPE_ICONS[c.sport_type], c.id === selectedCanchaId)}
          >
            <Popup>
              <CanchaPickerPopup
                cancha={c}
                isSelected={c.id === selectedCanchaId}
                onSelect={() => onSelectCancha(c)}
              />
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
