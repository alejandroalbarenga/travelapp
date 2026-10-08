// Horarios de tramos: se guardan como instantes (timestamptz) y se muestran
// en la hora local de cada ciudad (decisiones 009 y 022).

/** Hora local "13:40" de un instante en una zona horaria IANA. */
export function localTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/** Diferencia en minutos entre la hora local de una zona y UTC, en un instante dado. */
function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * Pasa una fecha y hora local ("2026-10-17", "13:40") de una zona horaria a un instante ISO en UTC.
 * Es lo que se guarda en legs.departs_at y legs.arrives_at.
 */
export function zonedToInstant(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Dos pasadas para acertar el offset también cerca de un cambio de horario.
  let instant = guess - offsetMinutes(timeZone, new Date(guess)) * 60_000;
  instant = guess - offsetMinutes(timeZone, new Date(instant)) * 60_000;
  return new Date(instant).toISOString();
}

/** Horas que la zona `to` está adelante de `from` (negativo si está atrás). */
export function timeZoneDiffHours(from: string, to: string, at: string): number {
  const when = new Date(at);
  return (offsetMinutes(to, when) - offsetMinutes(from, when)) / 60;
}

/** Duración real entre salida y llegada; ya descuenta la diferencia de huso. */
export function durationMinutes(departsAt: string, arrivesAt: string): number {
  return Math.round((new Date(arrivesAt).getTime() - new Date(departsAt).getTime()) / 60_000);
}

/** "2h 9m" */
export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export type ChipDisplay = "time" | "duration";

export type ChipLeg = {
  departsAt: string | null;
  arrivesAt: string | null;
  fromTimeZone: string;
  toTimeZone: string;
};

/**
 * Texto del chip del tramo según la preferencia del usuario (decisión 021).
 * Si falta el dato elegido se muestra el otro; si no hay ninguno, "Completar datos".
 */
export function chipText(leg: ChipLeg, display: ChipDisplay): string {
  const dep = leg.departsAt ? localTime(leg.departsAt, leg.fromTimeZone) : null;
  const arr = leg.arrivesAt ? localTime(leg.arrivesAt, leg.toTimeZone) : null;
  const time = dep ? dep + (arr ? ` → ${arr}` : "") : null;
  const duration =
    leg.departsAt && leg.arrivesAt ? formatDuration(durationMinutes(leg.departsAt, leg.arrivesAt)) : null;
  if (display === "duration") return duration ?? time ?? "Completar datos";
  return time ?? duration ?? "Completar datos";
}
