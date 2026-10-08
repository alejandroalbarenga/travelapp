import { stopDates } from "./dates";
import type { Stop, Trip } from "./trip-types";

// Ciudades bloqueadas (decisión 042) y ciudades que ya pasaron: qué no se puede tocar y por qué.
// La base lo hace cumplir igual (migración 0008); esto es para avisar antes en la pantalla.

export type NightsLock = { kind: "locked" } | { kind: "past" } | { kind: "locked-after"; city: string };

/** Por qué no se pueden cambiar las noches de la ciudad en esa posición; null si se puede. */
export function nightsLock(trip: Pick<Trip, "start_date" | "stops">, stopId: string, today: string): NightsLock | null {
  const stops = sortedStops(trip.stops);
  const i = stops.findIndex((s) => s.id === stopId);
  if (i < 0) return null;
  if (stops[i].locked) return { kind: "locked" };
  // Ya se fueron de esa ciudad: cambiarle las noches correría todo el viaje para atrás.
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  if (dates[i].departure < today) return { kind: "past" };
  const after = stops.slice(i + 1).find((s) => s.locked);
  if (after) return { kind: "locked-after", city: after.city };
  return null;
}

/** Por qué no se puede borrar la ciudad; null si se puede. */
export function deleteLock(trip: Pick<Trip, "stops">, stopId: string): string | null {
  const stops = sortedStops(trip.stops);
  const i = stops.findIndex((s) => s.id === stopId);
  if (i < 0) return null;
  if (stops[i].locked) return `${stops[i].city} está bloqueada. Desbloqueala para borrarla.`;
  const after = stops.slice(i + 1).find((s) => s.locked);
  if (after && stops[i].nights > 0) return lockedAfterMessage(after.city);
  return null;
}

export function lockMessage(lock: NightsLock, city: string): string {
  if (lock.kind === "locked") return `${city} está bloqueada: ya está todo listo.`;
  if (lock.kind === "past") return `Ya pasaste por ${city}: las noches no se cambian.`;
  return lockedAfterMessage(lock.city);
}

function lockedAfterMessage(city: string) {
  return `${city} está bloqueada y sus fechas no se pueden correr.`;
}

function sortedStops(stops: Stop[]) {
  return [...stops].sort((a, b) => a.position - b.position);
}
