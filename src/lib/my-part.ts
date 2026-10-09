import { stopDates } from "./dates";
import type { Stop } from "./trip-types";

// La parte del viaje de cada uno (decisión 054): quien se suma más tarde o se va antes ve todo el
// viaje, pero con su parte en primer plano. Su parte va de la primera a la última ciudad donde está.

export type MyPart = {
  /** Índices (en el orden del viaje) de su primera y su última ciudad. */
  first: number;
  last: number;
  /** Cuándo llega a su primera ciudad y cuándo se va de la última. */
  arrival: string;
  departure: string;
  firstCity: string;
  lastCity: string;
};

/**
 * Su parte del viaje, o null si hace el viaje entero (o no está en ninguna ciudad): en ese caso no
 * hay nada que plegar.
 */
export function myPart(startDate: string, stops: Pick<Stop, "position" | "nights" | "member_ids" | "city">[], memberId: string | null): MyPart | null {
  if (!memberId) return null;
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const mine = sorted.flatMap((s, i) => (s.member_ids.includes(memberId) ? [i] : []));
  if (!mine.length) return null;
  const first = mine[0];
  const last = mine[mine.length - 1];
  if (first === 0 && last === sorted.length - 1) return null;
  const dates = stopDates(startDate, sorted.map((s) => s.nights));
  return {
    first,
    last,
    arrival: dates[first].arrival,
    departure: dates[last].departure,
    firstCity: sorted[first].city,
    lastCity: sorted[last].city,
  };
}

/** "Madrid → Málaga · 7 ciudades" para el bloque plegado. */
export function foldLabel(cities: string[]): string {
  if (!cities.length) return "";
  const route = cities.length === 1 ? cities[0] : `${cities[0]} → ${cities[cities.length - 1]}`;
  return `${route} · ${cities.length} ${cities.length === 1 ? "ciudad" : "ciudades"}`;
}
