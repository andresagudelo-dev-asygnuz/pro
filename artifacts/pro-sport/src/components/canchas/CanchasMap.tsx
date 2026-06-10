import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useLocation } from "wouter";
import { SPORT_TYPE_ICONS, SPORT_TYPE_LABELS, type Cancha, type Venue } from "@/lib/types/db";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface GeoPoint {
  lat: number;
  lng: number;
}

interface CanchasMapProps {
  canchas: Cancha[];
  venues: Venue[];
  userLocation: GeoPoint | null;
  onCanchaSelect: (id: string) => void;
  onVenueSelect?: (id: string) => void;
  mode?: "canchas" | "venues";
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

function venueMarkerIcon(count: number): L.DivIcon {
  const badge = count > 1
    ? `<div style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:999px;min-width:17px;height:17px;padding:0 3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid white;line-height:1;box-sizing:border-box">${count}</div>`
    : "";
  const html = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;width:42px">
    <div style="position:relative;width:42px;height:42px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(124,58,237,0.55);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1">
      ⚽${badge}
    </div>
    <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #7c3aed;margin-top:-2px"></div>
  </div>`;
  return L.divIcon({
    html,
    iconSize: [42, 52],
    iconAnchor: [21, 52],
    className: "",
  });
}

function singleCanchaIcon(sportEmoji: string): L.DivIcon {
  const html = `<div style="display:flex;flex-direction:column;align-items:center;width:38px"><div style="width:38px;height:38px;background:#7c3aed;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(124,58,237,0.45);display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1">${sportEmoji}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #7c3aed;margin-top:-2px"></div></div>`;
  return L.divIcon({
    html,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    className: "",
  });
}

function CanchaPopupContent({ cancha, onGo }: { cancha: Cancha; onGo: () => void }) {
  const finalPrice =
    cancha.discount_percent > 0
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
        onClick={onGo}
        style={{
          display: "block", width: "100%", background: "#7c3aed", color: "white",
          border: "none", borderRadius: "8px", padding: "8px 12px",
          fontWeight: 700, fontSize: "13px", cursor: "pointer", textAlign: "center",
        }}
      >
        Ver cancha →
      </button>
    </div>
  );
}

function FitBounds({ markers, userLocation }: { markers: [number, number][]; userLocation: GeoPoint | null }) {
  const map = useMap();
  const didFitRef = useRef(false);

  // On first load: fit to all markers (venues + user)
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

  // When user location arrives after map is open, center on it if no venue markers exist
  useEffect(() => {
    if (!userLocation) return;
    const venueMarkers = markers.filter(
      (m) => m[0] !== userLocation.lat || m[1] !== userLocation.lng
    );
    if (venueMarkers.length === 0) {
      map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [map, userLocation, markers]);

  return null;
}

export function CanchasMap({ canchas, venues, userLocation, onCanchaSelect, onVenueSelect, mode = "canchas", height = "calc(100dvh - 180px)" }: CanchasMapProps) {
  const [, navigate] = useLocation();

  const venueMap = new Map<string, Venue>(venues.map((v) => [v.id, v]));

  // Group canchas by venue_id or exact coordinates (canchas mode)
  const groupedCanchas = new Map<string, { lat: number; lng: number; name: string; canchas: Cancha[] }>();

  if (mode === "canchas") {
    for (const c of canchas) {
      if (c.lat == null || c.lng == null) continue;

      let groupKey = c.venue_id;
      if (!groupKey) groupKey = `${c.lat},${c.lng}`;

      let lat = c.lat;
      let lng = c.lng;
      let name = c.name.split(" ")[0] || "Sede";

      if (c.venue_id) {
        const venue = venueMap.get(c.venue_id);
        if (venue) {
          if (venue.lat != null && venue.lng != null) { lat = venue.lat; lng = venue.lng; }
          if (venue.name) name = venue.name;
        }
      }

      const group = groupedCanchas.get(groupKey) ?? { lat, lng, name, canchas: [] };
      group.canchas.push(c);
      groupedCanchas.set(groupKey, group);
    }
  }

  // Venues with coordinates for venues mode
  const venuesWithCoords = venues.filter((v) => v.lat != null && v.lng != null);

  // Cancha count per venue (for popup badge)
  const venueCanchaCount = new Map<string, number>();
  for (const c of canchas) {
    if (c.venue_id) venueCanchaCount.set(c.venue_id, (venueCanchaCount.get(c.venue_id) ?? 0) + 1);
  }

  // Collect all marker positions for auto-fit
  const allMarkerPositions: [number, number][] = [];

  if (userLocation) allMarkerPositions.push([userLocation.lat, userLocation.lng]);

  if (mode === "canchas") {
    for (const group of groupedCanchas.values()) allMarkerPositions.push([group.lat, group.lng]);
  } else {
    for (const v of venuesWithCoords) allMarkerPositions.push([v.lat!, v.lng!]);
  }

  const defaultCenter: [number, number] = [4.5709, -74.2973];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      style={{ height, width: "100%" }}
      scrollWheelZoom
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      <FitBounds markers={allMarkerPositions} userLocation={userLocation} />

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userLocationIcon()}
        >
          <Popup>
            <span className="text-sm font-medium">Tu ubicación</span>
          </Popup>
        </Marker>
      )}

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={40}
        iconCreateFunction={(cluster: any) => {
          return L.divIcon({
            html: `<div style="background:#7c3aed;color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;box-shadow:0 3px 10px rgba(124,58,237,0.5)">${cluster.getChildCount()}</div>`,
            className: "custom-cluster-icon",
            iconSize: L.point(34, 34, true)
          });
        }}
      >
        {/* ── CANCHAS MODE ── */}
        {mode === "canchas" && Array.from(groupedCanchas.entries()).map(([key, group]) => {
          if (group.canchas.length === 1) {
            const c = group.canchas[0];
            return (
              <Marker
                key={c.id}
                position={[group.lat, group.lng]}
                icon={singleCanchaIcon(SPORT_TYPE_ICONS[c.sport_type])}
                eventHandlers={{ click: () => onCanchaSelect(c.id) }}
              >
                <Popup>
                  <CanchaPopupContent
                    cancha={c}
                    onGo={() => { onCanchaSelect(c.id); navigate(`/canchas/${c.id}`); }}
                  />
                </Popup>
              </Marker>
            );
          }

          return (
            <Marker
              key={key}
              position={[group.lat, group.lng]}
              icon={venueMarkerIcon(group.canchas.length)}
            >
              <Popup minWidth={220} maxWidth={280}>
                <div style={{ fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #e4e4e7" }}>
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>🏟️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "14px", margin: 0, color: "#18181b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{group.name}</p>
                      <p style={{ fontSize: "11px", color: "#71717a", margin: 0 }}>{group.canchas.length} {group.canchas.length === 1 ? "cancha" : "canchas"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px", maxHeight: "200px", overflowY: "auto" }}>
                    {group.canchas.map((c) => {
                      const finalPrice = c.discount_percent > 0
                        ? c.price_per_hour * (1 - c.discount_percent / 100)
                        : c.price_per_hour;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { onCanchaSelect(c.id); navigate(`/canchas/${c.id}`); }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: "8px", border: "1px solid #e4e4e7", background: "white", cursor: "pointer" }}
                          onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f3ff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#7c3aed"; }}
                          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e4e4e7"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                            <span style={{ fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#18181b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", flexShrink: 0 }}>${finalPrice.toLocaleString("es-CO")}/h</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── VENUES MODE ── */}
        {mode === "venues" && venuesWithCoords.map((venue) => {
          const count = venueCanchaCount.get(venue.id) ?? 0;
          return (
            <Marker
              key={venue.id}
              position={[venue.lat!, venue.lng!]}
              icon={venueMarkerIcon(count || 1)}
              eventHandlers={{ click: () => onVenueSelect?.(venue.id) }}
            >
              <Popup minWidth={200} maxWidth={260}>
                <div style={{ fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "22px", lineHeight: 1 }}>🏟️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "14px", margin: 0, color: "#18181b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{venue.name}</p>
                      <p style={{ fontSize: "11px", color: "#71717a", margin: 0 }}>{venue.city} · {count} {count === 1 ? "cancha" : "canchas"}</p>
                    </div>
                  </div>
                  {venue.address && (
                    <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 10px 0" }}>📍 {venue.address}</p>
                  )}
                  <button
                    onClick={() => { onVenueSelect?.(venue.id); navigate(`/venues/${venue.id}`); }}
                    style={{ display: "block", width: "100%", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 700, fontSize: "13px", cursor: "pointer", textAlign: "center" }}
                  >
                    Ver Centro →
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
