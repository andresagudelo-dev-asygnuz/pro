export interface GeoPoint {
  lat: number;
  lng: number;
}

export async function geocodeAddress(
  address: string,
  city: string,
): Promise<GeoPoint | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, Colombia`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "pro-sport-app/1.0" },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat +
          Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            sinDLng *
            sinDLng,
      ),
    );
  return R * c;
}
