import tzLookup from "@photostructure/tz-lookup";
import COUNTRY_CITIES from "./country-cities.json";

// Búsqueda de ciudades con Nominatim (OpenStreetMap), gratis y sin clave (decisión 030).
// Pide una consulta por segundo como máximo y un User-Agent que identifique a la app.
// La zona horaria sale de las coordenadas, sin otro servicio (decisión 022).
// Si lo que se escribe es un país, se suman sus ciudades principales (decisión 056), para cuando no
// te acordás el nombre de la ciudad. Salen de una lista sacada una vez de Wikidata y guardada en
// country-cities.json (las diez más pobladas y la capital de cada país): consultar Wikidata en cada
// búsqueda era lento y desde Vercel no andaba.

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

const USER_AGENT = "Vamo/0.1 (https://travelapp-two-cyan.vercel.app)";

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
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    const results = (await res.json()) as NominatimResult[];
    // ¿Escribiste un país? Sus ciudades principales van después de los resultados.
    const country = results.find((r) => r.addresstype === "country" && r.address?.country_code);
    const countryCities = country ? citiesOfCountry(country.address!.country_code!.toLowerCase(), country.address?.country ?? country.name) : [];
    const places = [...results
      .filter((r) => !r.addresstype || PLACE_TYPES.has(r.addresstype))
      .map(toPlace)
      .filter((p): p is Place => p !== null), ...countryCities];
    // Sin repetidos (a veces vuelve la misma ciudad dos veces).
    const seen = new Set<string>();
    return places.filter((p) => {
      const key = `${p.name}|${p.region}|${p.countryCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, country ? 14 : 6);
  } catch {
    return [];
  }
}

/** Las ciudades principales de un país ("it" → Roma, Milán, Nápoles…), de la lista guardada. */
export function citiesOfCountry(countryCode: string, country: string): Place[] {
  const cities = (COUNTRY_CITIES as unknown as Record<string, [string, number, number][]>)[countryCode] ?? [];
  return cities
    .map(([name, lat, lng]) => toPlace({ name, lat: String(lat), lon: String(lng), address: { country, country_code: countryCode } }))
    .filter((p): p is Place => p !== null);
}
