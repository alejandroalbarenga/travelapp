import { cacheLife } from "next/cache";
import { NOT_A_PHOTO, pickPhoto, type MediaList, type Summary } from "./photo-url";

// Foto de una ciudad desde Wikipedia en español (decisión 016). Gratis y sin clave.
// La foto principal del artículo muchas veces es la bandera o el escudo, así que se descarta
// y se busca la primera foto de verdad del artículo.
// La frase de la ciudad sale sola de la descripción corta del mismo artículo (decisión 058).

const HEADERS = { "User-Agent": "Vamo/0.1 (https://travelapp-two-cyan.vercel.app)" };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Completa la foto y la frase de las paradas que no tienen una guardada. */
export async function withCityPhotos<T extends { city: string; photo_url: string | null; tagline: string | null }>(stops: T[]): Promise<T[]> {
  return Promise.all(
    stops.map(async (s) => ({
      ...s,
      photo_url: s.photo_url ?? (await findCityPhoto(s.city)),
      tagline: s.tagline ?? (await findCityTagline(s.city)),
    })),
  );
}

/** "capital de Italia" → "Capital de Italia". Null si Wikipedia no tiene una o el nombre es ambiguo. */
export async function findCityTagline(city: string): Promise<string | null> {
  "use cache";
  cacheLife("weeks");
  const title = encodeURIComponent(city.trim().replace(/ /g, "_"));
  const summary = await getJson<{ type?: string; description?: string }>(`https://es.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const text = summary?.type === "standard" ? summary.description?.trim() : "";
  return text ? text[0].toUpperCase() + text.slice(1) : null;
}

/** Busca la foto de una ciudad. Queda en caché varias semanas: las fotos no cambian. */
export async function findCityPhoto(city: string): Promise<string | null> {
  "use cache";
  cacheLife("weeks");
  const title = encodeURIComponent(city.trim().replace(/ /g, "_"));
  const base = "https://es.wikipedia.org/api/rest_v1/page";
  const summary = await getJson<Summary>(`${base}/summary/${title}`);
  if (!summary) return null;
  const main = summary.thumbnail?.source;
  if (main && !NOT_A_PHOTO.test(decodeURIComponent(main))) return pickPhoto(summary, null);
  return pickPhoto(summary, await getJson<MediaList>(`${base}/media-list/${title}`));
}
