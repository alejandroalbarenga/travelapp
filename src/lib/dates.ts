// Fechas de calendario como texto "YYYY-MM-DD", sin hora ni zona horaria.
// Las fechas de las paradas no se guardan: salen de trips.start_date y las noches.

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Días entre dos fechas (positivo si `to` es después de `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export type StopDates = { arrival: string; departure: string };

/** Llegada y salida de cada parada, en orden, a partir del inicio del viaje y las noches. */
export function stopDates(startDate: string, nights: number[]): StopDates[] {
  let current = startDate;
  return nights.map((n) => {
    const dates = { arrival: current, departure: addDays(current, n) };
    current = dates.departure;
    return dates;
  });
}

export type NightsStatus = "missing" | "complete" | "over";

/** Estado del anillo de noches planeadas (decisión 029). */
export function nightsStatus(plannedNights: number, tripNights: number): NightsStatus {
  if (plannedNights > tripNights) return "over";
  if (plannedNights === tripNights) return "complete";
  return "missing";
}

/** "17 oct" */
export function formatDay(date: string): string {
  const d = toUtc(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Día de un instante en la hora del teléfono: "22 oct". */
export function formatInstantDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Día y hora de un instante en la hora del teléfono: "22 oct · 21:40". */
export function formatInstant(iso: string): string {
  const d = new Date(iso);
  return `${formatInstantDay(iso)} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "sáb 17 oct" */
export function formatWeekday(date: string): string {
  return `${WEEKDAYS[toUtc(date).getUTCDay()]} ${formatDay(date)}`;
}

/** "17 – 21 oct" en el mismo mes, "31 oct – 3 nov" si cambia. */
export function formatRange(from: string, to: string): string {
  const a = toUtc(from);
  const b = toUtc(to);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  }
  return `${formatDay(from)} – ${formatDay(to)}`;
}

/** Fechas de una parada como se ven en la lista: rango, o una sola fecha si es de paso. */
export function formatStopDates(dates: StopDates, isFirst: boolean): string {
  if (dates.arrival === dates.departure) return formatDay(dates.arrival) + (isFirst ? " · escala" : "");
  return formatRange(dates.arrival, dates.departure);
}
