// Elegir y armar la URL de la foto de una ciudad (sin llamadas a la red).
// Se puede usar tanto en el servidor como en el navegador; la búsqueda está en city-photo.ts.

export const NOT_A_PHOTO = /\.svg|flag|bandera|escudo|coat_of_arms|coat-of-arms|mapa|map_|locator|ubicaci|logo|seal|sello/i;
const SIZE = 500; // ancho de la imagen que se guarda; alcanza para la tarjeta y se agranda para la foto grande

export type Summary = { thumbnail?: { source: string }; originalimage?: { source: string } };
export type MediaList = { items?: { type: string; title: string; srcset?: { src: string }[] }[] };

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
