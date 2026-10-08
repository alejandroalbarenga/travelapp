import { cacheLife } from "next/cache";

// Foto de una ciudad desde Wikipedia en español (decisión 016). Gratis y sin clave.
// La foto principal del artículo muchas veces es la bandera o el escudo, así que se descarta
// y se busca la primera foto de verdad del artículo.

const NOT_A_PHOTO = /\.svg|flag|bandera|escudo|coat_of_arms|coat-of-arms|mapa|map_|locator|ubicaci|logo|seal|sello/i;
const SIZE = 500; // ancho de la imagen que se guarda; alcanza para la tarjeta y se agranda para la foto grande

type Summary = { thumbnail?: { source: string }; originalimage?: { source: string } };
type MediaList = { items?: { type: string; title: string; srcset?: { src: string }[] }[] };

function normalize(url: string): string {
  const https = url.startsWith("//") ? `https:${url}` : url;
  return https.split("?")[0].replace(/\/\d+px-/, `/${SIZE}px-`);
}

/** Elige la foto a partir de las dos respuestas de Wikipedia. Devuelve null si no hay ninguna que sirva. */
export function pickPhoto(summary: Summary | null, media: MediaList | null): string | null {
  const main = summary?.thumbnail?.source;
  if (main && !NOT_A_PHOTO.test(decodeURIComponent(main))) return normalize(main);

  const photo = media?.items?.find(
    (i) => i.type === "image" && /\.jpe?g$/i.test(i.title) && !NOT_A_PHOTO.test(i.title) && !/collage|montage|montaje/i.test(i.title),
  );
  const src = photo?.srcset?.[0]?.src;
  return src ? normalize(src) : null;
}

/** La versión grande de una foto guardada, para la foto de la pantalla de ciudad. */
export function largePhoto(url: string): string {
  return url.replace(`/${SIZE}px-`, "/960px-");
}

const HEADERS = { "User-Agent": "ViajesEnGrupo/0.1 (https://travelapp-two-cyan.vercel.app)" };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Completa la foto de las paradas que no tienen una guardada. */
export async function withCityPhotos<T extends { city: string; photo_url: string | null }>(stops: T[]): Promise<T[]> {
  return Promise.all(stops.map(async (s) => (s.photo_url ? s : { ...s, photo_url: await findCityPhoto(s.city) })));
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
