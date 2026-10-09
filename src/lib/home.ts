import { daysBetween, stopDates } from "./dates";

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

export type StatsTrip = {
  /** Inicio del viaje (no el de tu parte): de ahí salen las fechas de cada ciudad. */
  trip_start: string;
  /** Tu parte del viaje (decisión 054). */
  start_date: string;
  end_date: string;
  stops: { nights: number; country: string | null; country_code: string | null; member_ids: string[] }[];
  myMemberId: string | null;
};

export type TravelStats = { countries: { code: string; name: string }[]; tripsDone: number; nightsAway: number };

/**
 * Tus estadísticas del inicio (decisión 071), con lo que ya pasó: los países de las ciudades donde
 * dormiste al menos una noche (sin escalas), los viajes terminados y las noches afuera (contando el
 * viaje en curso hasta hoy). null si todavía no empezó ningún viaje.
 */
export function travelStats(trips: StatsTrip[], today: string): TravelStats | null {
  const started = trips.filter((t) => t.start_date <= today);
  if (!started.length) return null;
  const countries = new Map<string, string>();
  let nightsAway = 0;
  for (const t of started) {
    nightsAway += Math.max(0, daysBetween(t.start_date, t.end_date < today ? t.end_date : today));
    const dates = stopDates(t.trip_start, t.stops.map((s) => s.nights));
    t.stops.forEach((s, i) => {
      const mine = !t.myMemberId || !s.member_ids.length || s.member_ids.includes(t.myMemberId);
      if (mine && s.nights > 0 && s.country_code && dates[i].arrival <= today && !countries.has(s.country_code)) {
        countries.set(s.country_code, s.country ?? s.country_code.toUpperCase());
      }
    });
  }
  return {
    countries: [...countries].map(([code, name]) => ({ code, name })),
    tripsDone: started.filter((t) => t.end_date < today).length,
    nightsAway,
  };
}
