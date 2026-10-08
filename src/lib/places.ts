import tzLookup from "@photostructure/tz-lookup";

// Búsqueda de ciudades con Nominatim (OpenStreetMap), gratis y sin clave (decisión 030).
// Pide una consulta por segundo como máximo y un User-Agent que identifique a la app.
// La zona horaria sale de las coordenadas, sin otro servicio (decisión 022).

export type Place = {
  name: string;
  region: string; // provincia o estado, para distinguir "Roma, Lacio" de "Roma, Texas"
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  timezone: string;
  code: string; // tres letras para cuando no hay foto: "ROM"
};

type NominatimResult = {
  name: string;
  lat: string;
  lon: string;
  addresstype?: string;
  address?: { country?: string; country_code?: string; state?: string; region?: string; province?: string };
};

const PLACE_TYPES = new Set(["city", "town", "village", "municipality", "hamlet", "suburb", "island", "borough"]);

/** "Ámsterdam" → "AMS" */
export function placeCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export function toPlace(r: NominatimResult): Place | null {
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!r.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let timezone = "UTC";
  try {
    timezone = tzLookup(lat, lng);
  } catch {
    // coordenadas raras: queda en UTC
  }
  return {
    name: r.name,
    region: r.address?.state ?? r.address?.region ?? r.address?.province ?? "",
    country: r.address?.country ?? "",
    countryCode: (r.address?.country_code ?? "").toLowerCase(),
    lat,
    lng,
    timezone,
    code: placeCode(r.name),
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=es&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "VamoYVamo/0.1 (https://travelapp-two-cyan.vercel.app)" } });
    if (!res.ok) return [];
    const results = (await res.json()) as NominatimResult[];
    const places = results
      .filter((r) => !r.addresstype || PLACE_TYPES.has(r.addresstype))
      .map(toPlace)
      .filter((p): p is Place => p !== null);
    // Sin repetidos (a veces vuelve la misma ciudad dos veces).
    const seen = new Set<string>();
    return places.filter((p) => {
      const key = `${p.name}|${p.region}|${p.countryCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  } catch {
    return [];
  }
}
