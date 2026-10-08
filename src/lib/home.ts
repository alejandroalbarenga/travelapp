import { daysBetween } from "./dates";

// Pantalla 00 · Inicio y 07 · Nuevo viaje (docs/diseño.md): reglas sin interfaz.

/** Valida el formulario de "Nuevo viaje" con los mensajes del diseño. null si está bien. */
export function validateNewTrip(name: string, start: string, end: string): string | null {
  if (!name.trim()) return "Ponele un nombre al viaje";
  if (!start || !end) return "Elegí las fechas";
  if (end <= start) return "La vuelta tiene que ser después de la ida";
  return null;
}

/** Cuenta regresiva de la tarjeta de un viaje: "10 días", "Mañana", "Hoy · empieza", "Ya · en curso". */
export function countdown(start: string, end: string, today: string): string {
  if (today > end) return "Terminó";
  if (today > start) return "Ya · en curso";
  if (today === start) return "Hoy · empieza";
  const days = daysBetween(today, start);
  return days === 1 ? "Mañana" : `${days} días`;
}

/** Separa próximos (o en curso) de pasados. Los próximos, del más cercano al más lejano. */
export function splitTrips<T extends { start_date: string; end_date: string }>(trips: T[], today: string) {
  const upcoming = trips.filter((t) => t.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = trips.filter((t) => t.end_date < today).sort((a, b) => b.start_date.localeCompare(a.start_date));
  return { upcoming, past };
}

/** "12 destinos · 34 noches", o "Sin ciudades todavía · 34 noches". */
export function tripSubtitle(stops: number, start: string, end: string): string {
  const nights = daysBetween(start, end);
  const places = stops ? `${stops} ${stops === 1 ? "destino" : "destinos"}` : "Sin ciudades todavía";
  return `${places} · ${nights} ${nights === 1 ? "noche" : "noches"}`;
}

/** Fecha de hoy en Uruguay, como "YYYY-MM-DD" (el servidor corre en UTC). */
export function todayInUruguay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(now);
}
