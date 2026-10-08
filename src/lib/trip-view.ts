import { daysBetween, formatDay, formatRange, formatStopDates, formatWeekday, nightsStatus, stopDates, type NightsStatus } from "./dates";
import { chipText, timeZoneDiffHours, type ChipDisplay } from "./legs";
import type { BookingSource, LegMode, Trip } from "./trip-types";

// Arma lo que muestra la pantalla del Viaje (diseño: pantalla 01) a partir de los datos del viaje.

export const BOOKING_LABEL: Record<BookingSource, string> = {
  booking: "Booking",
  airbnb: "Airbnb",
  hostelworld: "Hostelworld",
  direct: "Directo",
  other: "Otro",
};

// Color de fondo de la foto mientras no hay foto (tonos del diseño).
const TINTS = ["#B5654A", "#8C6E3F", "#4E6F86", "#5E6B78", "#7A6A55", "#8A4E48", "#4F6A7E", "#A57A43", "#3F7E8C", "#A0603B"];

export type LegView = {
  mode: LegMode;
  text: string;
  timeZoneChange: string | null;
  hasTicket: boolean;
};

export type StopView = {
  id: string;
  number: number;
  name: string;
  country: string | null;
  code: string;
  photoUrl: string | null;
  tint: string;
  dates: string;
  nights: number;
  nightsLabel: string;
  stay: { text: string; paid: boolean } | null;
  /** Bloqueada (decisión 042). */
  locked: boolean;
  leg: LegView | null;
  legEmptyLabel: string;
};

export type TripView = {
  name: string;
  range: string;
  startLabel: string;
  plannedNights: number;
  tripNights: number;
  nightsStatus: NightsStatus;
  returnText: string;
  stops: StopView[];
};

export function buildTripView(trip: Trip, options: { chipDisplay: ChipDisplay; myMemberId: string | null }): TripView {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const dates = stopDates(
    trip.start_date,
    stops.map((s) => s.nights),
  );
  const plannedNights = stops.reduce((sum, s) => sum + s.nights, 0);
  const tripNights = daysBetween(trip.start_date, trip.end_date);

  return {
    name: trip.name,
    range: `${formatRange(trip.start_date, trip.end_date)} ${trip.end_date.slice(0, 4)}`,
    startLabel: `${formatWeekday(trip.start_date)} ${trip.start_date.slice(0, 4)}`.toUpperCase(),
    plannedNights,
    tripNights,
    nightsStatus: nightsStatus(plannedNights, tripNights),
    returnText: `Vuelta a casa · ${formatDay(trip.end_date)}`,
    stops: stops.map((stop, i) => {
      const next = stops[i + 1];
      const isLast = !next;
      const stay = trip.stays.find((s) => s.stop_id === stop.id);
      const leg = trip.legs.find((l) => l.from_stop_id === stop.id);

      let legView: LegView | null = null;
      if (leg) {
        const toTimeZone = next?.timezone ?? stop.timezone;
        const diff = next ? timeZoneDiffHours(stop.timezone, toTimeZone, leg.departs_at ?? `${dates[i].departure}T12:00:00Z`) : 0;
        legView = {
          mode: leg.mode,
          text: chipText(
            { departsAt: leg.departs_at, arrivesAt: leg.arrives_at, fromTimeZone: stop.timezone, toTimeZone },
            options.chipDisplay,
          ),
          timeZoneChange: diff
            ? `Cambio de huso: ${next.city} está ${Math.abs(diff)} h ${diff > 0 ? "adelante" : "atrás"}. La llegada va en hora de ${next.city}.`
            : null,
          // El botón de ticket abre tu pasaje, o el del grupo si no tenés uno propio.
          hasTicket: leg.attachments.some((a) => a.kind !== "link" && (a.member_id === options.myMemberId || a.member_id === null)),
        };
      }

      return {
        id: stop.id,
        number: i + 1,
        name: stop.city,
        country: stop.country,
        code: stop.code ?? stop.city.slice(0, 3).toUpperCase(),
        photoUrl: stop.photo_url,
        locked: stop.locked,
        tint: TINTS[i % TINTS.length],
        dates: formatStopDates(dates[i], i === 0),
        nights: stop.nights,
        nightsLabel: stop.nights === 1 ? "noche" : "noches",
        stay:
          stay && (stay.name || stay.booked_via)
            ? stay.booked_via
              ? {
                  text: `${BOOKING_LABEL[stay.booked_via]} · ${stay.total_price_cents ? "pagado" : "reservado"}`,
                  paid: !!stay.total_price_cents,
                }
              : { text: stay.name!, paid: false }
            : null,
        leg: legView,
        legEmptyLabel: isLast ? "Agregar vuelta" : "Agregar tramo",
      };
    }),
  };
}
