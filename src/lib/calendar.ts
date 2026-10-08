import { addDays, daysBetween, stopDates } from "./dates";
import type { Trip } from "./trip-types";

// Pantalla 08 · Calendario (decisión 020): meses en vertical, semanas de lunes a domingo y cada
// ciudad como una barra. El día en que se viaja queda partido entre las ciudades que lo tocan
// (la que se deja, las escalas y la que se llega); el primer y el último día arrancan con medio
// día "de casa". Las posiciones van en días desde el lunes de la primera semana.

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type CalendarDay = { date: string; day: number; inMonth: boolean; inTrip: boolean; today: boolean };

export type CalendarBar = {
  stopId: string;
  name: string;
  /** Desde el borde izquierdo de la semana, en días (0 a 7). */
  left: number;
  width: number;
  /** Si la barra empieza o termina en esta semana (para redondear las puntas). */
  startsHere: boolean;
  endsHere: boolean;
  /** Para alternar los dos grises del diseño. */
  shade: 0 | 1;
};

export type CalendarWeek = { days: CalendarDay[]; bars: CalendarBar[] };
export type CalendarMonth = { key: string; label: string; weeks: CalendarWeek[] };

/** Desde y hasta qué día ocupa cada ciudad, en días contados desde `origin` (fracciones de día). */
export function stopSpans(trip: Pick<Trip, "start_date" | "stops">, origin: string): Map<string, { from: number; to: number }> {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const spans = new Map<string, { from: number; to: number }>();
  if (!stops.length) return spans;
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  const last = dates[dates.length - 1].departure;

  for (let d = trip.start_date; d <= last; d = addDays(d, 1)) {
    // Quiénes tocan ese día, en orden; el primero y el último día suman medio día de casa.
    const touching: (string | null)[] = stops.filter((_, i) => dates[i].arrival <= d && d <= dates[i].departure).map((s) => s.id);
    if (d === trip.start_date) touching.unshift(null);
    if (d === last) touching.push(null);
    const base = daysBetween(origin, d);
    touching.forEach((id, k) => {
      if (!id) return;
      const from = base + k / touching.length;
      const to = base + (k + 1) / touching.length;
      const span = spans.get(id);
      spans.set(id, span ? { from: Math.min(span.from, from), to: Math.max(span.to, to) } : { from, to });
    });
  }
  return spans;
}

/** Lunes de la semana de esa fecha. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(date, -weekday);
}

/**
 * Arma los meses del viaje. `until` alarga el calendario (para elegir una llegada después del fin).
 */
export function buildCalendar(trip: Pick<Trip, "start_date" | "end_date" | "stops">, today: string, until?: string): CalendarMonth[] {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const dates = stops.length ? stopDates(trip.start_date, stops.map((s) => s.nights)) : [];
  const lastDeparture = dates.length ? dates[dates.length - 1].departure : trip.end_date;
  const end = [trip.end_date, lastDeparture, until ?? trip.end_date].sort().pop()!;
  const origin = mondayOf(trip.start_date);
  const spans = stopSpans(trip, origin);
  const tripEnd = lastDeparture > trip.end_date ? lastDeparture : trip.end_date;

  const months: CalendarMonth[] = [];
  for (let first = `${trip.start_date.slice(0, 7)}-01`; first <= end; first = nextMonth(first)) {
    const lastOfMonth = addDays(nextMonth(first), -1);
    const monthFrom = daysBetween(origin, first);
    const monthTo = daysBetween(origin, lastOfMonth) + 1;
    const weeks: CalendarWeek[] = [];
    for (let monday = mondayOf(first); monday <= lastOfMonth; monday = addDays(monday, 7)) {
      const rowStart = daysBetween(origin, monday);
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        return {
          date,
          day: Number(date.slice(8)),
          inMonth: date.slice(0, 7) === first.slice(0, 7),
          inTrip: date >= trip.start_date && date <= tripEnd,
          today: date === today,
        };
      });
      // Cada barra, recortada a la semana y al mes (una semana partida entre dos meses se ve en los dos).
      const lo = Math.max(rowStart, monthFrom);
      const hi = Math.min(rowStart + 7, monthTo);
      const bars: CalendarBar[] = [];
      stops.forEach((stop, i) => {
        const span = spans.get(stop.id);
        if (!span) return;
        const from = Math.max(span.from, lo);
        const to = Math.min(span.to, hi);
        if (to - from <= 1e-9) return;
        bars.push({
          stopId: stop.id,
          name: stop.city,
          left: from - rowStart,
          width: to - from,
          startsHere: Math.abs(from - span.from) < 1e-9,
          endsHere: Math.abs(to - span.to) < 1e-9,
          shade: (i % 2) as 0 | 1,
        });
      });
      weeks.push({ days, bars });
    }
    months.push({ key: first.slice(0, 7), label: `${MONTHS[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`, weeks });
  }
  return months;
}

function nextMonth(first: string): string {
  const [y, m] = first.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/**
 * Elegir el día de llegada a una ciudad cambia las noches de la anterior. Devuelve las noches nuevas
 * de la anterior, o un mensaje si no se puede.
 */
export function arrivalChange(trip: Pick<Trip, "start_date" | "stops">, stopId: string, date: string): { prevStopId: string; nights: number } | { error: string } {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const i = stops.findIndex((s) => s.id === stopId);
  if (i <= 0) return { error: "La llegada a la primera ciudad es el inicio del viaje." };
  const prev = stops[i - 1];
  const prevArrival = stopDates(trip.start_date, stops.map((s) => s.nights))[i - 1].arrival;
  if (date < prevArrival) return { error: `No puede ser antes de llegar a ${prev.city}.` };
  const nights = daysBetween(prevArrival, date);
  if (nights > 60) return { error: "Son demasiadas noches." };
  return { prevStopId: prev.id, nights };
}
