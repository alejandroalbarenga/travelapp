import { stopDates } from "./dates";
import type { Trip } from "./trip-types";

// Lógica de "Nuevo gasto" (diseño: pantalla 05).

export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "del";

/** Teclado numérico propio: hasta 6 dígitos enteros y 2 decimales, con coma. */
export function applyKey(amount: string, key: Key): string {
  if (key === "del") return amount.slice(0, -1);
  if (key === ",") return amount.includes(",") ? amount : `${amount || "0"},`;
  const [whole, decimals] = amount.split(",");
  if (decimals !== undefined) return decimals.length >= 2 ? amount : amount + key;
  if (whole.length >= 6) return amount;
  return whole === "0" ? key : amount + key;
}

/**
 * Ciudad por defecto de un gasto nuevo (decisión 033): la ciudad donde están hoy según las fechas del
 * viaje; si el viaje no está en curso, la del último gasto cargado; si no hay ninguno, la primera.
 */
export function defaultStopId(trip: Trip, today: string): string | null {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  if (!stops.length) return null;
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  // El día de viaje cuenta para la ciudad a la que se llega (la que tiene llegada ese día y noches).
  const here = stops.findIndex((_, i) => dates[i].arrival <= today && today < dates[i].departure);
  if (here >= 0) return stops[here].id;
  const lastUsed = [...trip.expenses].sort((a, b) => b.created_at.localeCompare(a.created_at)).find((e) => e.stop_id)?.stop_id;
  return lastUsed ?? stops[0].id;
}
