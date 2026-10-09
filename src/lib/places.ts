import tzLookup from "@photostructure/tz-lookup";
import { cacheLife } from "next/cache";

// Búsqueda de ciudades con Nominatim (OpenStreetMap), gratis y sin clave (decisión 030).
// Pide una consulta por segundo como máximo y un User-Agent que identifique a la app.
// La zona horaria sale de las coordenadas, sin otro servicio (decisión 022).
// Si lo que se escribe es un país, se suman sus ciudades principales desde Wikidata (decisión 056),
// para cuando no te acordás el nombre de la ciudad.

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
  extratags?: { wikidata?: string };
};

const USER_AGENT = "VamoYVamo/0.1 (https://travelapp-two-cyan.vercel.app)";

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
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=8&accept-language=es&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    const results = (await res.json()) as NominatimResult[];
    // ¿Escribiste un país? Sus ciudades principales van después de los resultados.
    const country = results.find((r) => r.addresstype === "country" && r.extratags?.wikidata);
    const countryCities = country
      ? await citiesOfCountry(country.extratags!.wikidata!, country.address?.country ?? country.name, (country.address?.country_code ?? "").toLowerCase())
      : [];
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

type SparqlRow = { cityLabel: { value: string }; coord: { value: string } };

/**
 * Las ciudades más pobladas de un país, desde Wikidata (gratis y sin clave). Si Wikidata tarda o
 * falla, no hay sugerencias y listo.
 */
export async function citiesOfCountry(countryQid: string, country: string, countryCode: string): Promise<Place[]> {
  if (!/^Q\d+$/.test(countryQid)) return [];
  try {
    return await fetchCitiesOfCountry(countryQid, country, countryCode);
  } catch {
    return [];
  }
}

/** Queda en caché semanas (no cambian). Si falla tira el error, para que no se guarde un vacío. */
async function fetchCitiesOfCountry(countryQid: string, country: string, countryCode: string): Promise<Place[]> {
  "use cache";
  cacheLife("weeks");
  // Ciudad, gran ciudad, ciudad millonaria, metrópolis y capital. Recorrer todos los subtipos de
  // "ciudad" (wdt:P279*) tardaba más de 10 segundos con algunos países.
  const query = `SELECT ?city ?cityLabel ?pop ?coord WHERE {
    VALUES ?type { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q200250 wd:Q5119 }
    ?city wdt:P31 ?type; wdt:P17 wd:${countryQid}; wdt:P1082 ?pop; wdt:P625 ?coord.
    FILTER NOT EXISTS { ?city wdt:P576 ?ended }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  } ORDER BY DESC(?pop) LIMIT 40`;
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Wikidata respondió ${res.status}`);
  const rows = ((await res.json()) as { results: { bindings: SparqlRow[] } }).results.bindings;
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const row of rows) {
    const name = row.cityLabel.value.replace(/^ciudad de /i, ""); // "Ciudad de Madrid" → "Madrid"
    const point = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value);
    // Sin nombre en ningún idioma Wikidata devuelve el código (Q123): se descarta.
    if (!point || seen.has(name) || /^Q\d+$/.test(name)) continue;
    seen.add(name);
    const place = toPlace({ name, lat: point[2], lon: point[1], address: { country, country_code: countryCode } });
    if (place) places.push(place);
    if (places.length === 10) break;
  }
  return places;
}
