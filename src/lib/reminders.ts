import { netBalances, simplifyDebts } from "./balance";
import { addDays, daysBetween, formatDay, stopDates } from "./dates";
import { localTime, zonedToInstant } from "./legs";
import { formatEuros } from "./money";
import type { LegMode, Trip } from "./trip-types";

// Recordatorios del viaje (decisión 095). Salen solos de lo que está cargado; nadie los crea.
// Esta función arma todos los de un viaje con la hora a la que corresponde mandarlos; el revisor
// (/api/recordatorios, cada 15 minutos) manda los que ya llegaron a su hora y la pantalla
// "Recordatorios" del viaje muestra los que vienen.
//
// - Viaje: la noche antes de cada tramo (20 h), unas horas antes de salir (3 h, 4 h en avión), el
//   día que llegan a una ciudad (9 h, con el check-in) y la noche antes del checkout (21 h).
// - Reservas: una ciudad sin alojamiento o un tramo sin cargar o sin horario, a 14, 7 y 2 días; lo
//   que sigue estimado en Planificado, a 7 y 2 días. Solo a los que pueden editar.
// - Plata: los domingos a las 20 h, a quien debe más de €20.
// Las horas son las de la ciudad donde están. Nada entre las 23 y las 8.

export type ReminderGroup = "travel" | "bookings" | "money";

export type Reminder = {
  /** Única: el revisor anota cada una que manda y no la repite. */
  key: string;
  group: ReminderGroup;
  /** Cuándo mandarla (instante ISO), y la zona horaria de la ciudad para mostrar la hora. */
  at: string;
  timeZone: string;
  memberIds: string[];
  title: string;
  body: string;
};

const MODE_NAME: Record<LegMode, string> = { plane: "Vuelo", train: "Tren", bus: "Bus", car: "Auto", other: "Traslado" };
const BOOKING_DAYS = [14, 7, 2];
const ESTIMATE_DAYS = [7, 2];
const MIN_DEBT_CENTS = 2000;

/** Si la hora local cae entre las 23 y las 8, no se manda. */
function quiet(at: string, timeZone: string): boolean {
  const hour = Number(localTime(at, timeZone).slice(0, 2));
  return hour >= 23 || hour < 8;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function tripReminders(trip: Trip): Reminder[] {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  if (!stops.length) return [];
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  const editors = new Set(trip.members.filter((m) => m.role !== "viewer").map((m) => m.id));
  const canBook = (ids: string[]) => {
    const inStop = ids.filter((id) => editors.has(id));
    return inStop.length ? inStop : [...editors];
  };
  const out: Reminder[] = [];

  stops.forEach((stop, i) => {
    const next = stops[i + 1] ?? null;
    const { arrival, departure } = dates[i];
    const stay = trip.stays.find((s) => s.stop_id === stop.id && (s.name || s.booked_via)) ?? null;
    const stayEstimate = trip.planned.find((p) => p.stay_stop_id === stop.id) ?? null;

    // ─── Viaje ───
    // El día que llegan (las ciudades donde duermen).
    if (stop.nights > 0) {
      const name = stay?.name ?? "el alojamiento";
      out.push({
        key: `arrival:${stop.id}:${arrival}`,
        group: "travel",
        timeZone: stop.timezone,
        at: zonedToInstant(arrival, "09:00", stop.timezone),
        memberIds: stop.member_ids,
        title: i === 0 ? `Hoy arranca el viaje en ${stop.city}` : `Hoy llegan a ${stop.city}`,
        body: stay
          ? `Check-in en ${name}${stay.check_in_time ? ` después de las ${stay.check_in_time}` : ""}.`
          : "Todavía no hay alojamiento cargado.",
      });
      if (stay) {
        out.push({
          key: `checkout:${stop.id}:${departure}`,
          group: "travel",
          timeZone: stop.timezone,
          at: zonedToInstant(addDays(departure, -1), "21:00", stop.timezone),
          memberIds: stop.member_ids,
          title: `Mañana dejan ${name}`,
          body: stay.check_out_time ? `Checkout antes de las ${stay.check_out_time}.` : `Último día en ${stop.city}.`,
        });
      }
    }

    // El tramo que sale de esta ciudad (a la siguiente, o la vuelta a casa).
    const leg = trip.legs.find((l) => l.from_stop_id === stop.id) ?? null;
    const destination = next?.city ?? "casa";
    // Viajan los que están en las dos ciudades (decisión 092); la vuelta, los de la última.
    const travellers = next ? stop.member_ids.filter((id) => next.member_ids.includes(id)) : stop.member_ids;
    if (leg && (next || leg.departs_at)) {
      const mode = MODE_NAME[leg.mode];
      const time = leg.departs_at ? localTime(leg.departs_at, stop.timezone) : null;
      const tickets = leg.attachments.some((a) => a.kind !== "link");
      out.push({
        key: `leg-eve:${leg.id}:${departure}`,
        group: "travel",
        timeZone: stop.timezone,
        at: zonedToInstant(addDays(departure, -1), "20:00", stop.timezone),
        memberIds: travellers,
        title: `Mañana: ${mode.toLowerCase()} a ${destination}`,
        body: [
          time ? `Sale de ${stop.city} a las ${time}.` : "Todavía no cargaron el horario.",
          tickets ? "Los pasajes están en la app." : "No hay pasaje cargado.",
        ].join(" "),
      });
      if (leg.departs_at) {
        const hours = leg.mode === "plane" ? 4 : 3;
        const at = new Date(new Date(leg.departs_at).getTime() - hours * 3_600_000).toISOString();
        if (!quiet(at, stop.timezone)) {
          out.push({
            key: `leg-soon:${leg.id}:${leg.departs_at}`,
            group: "travel",
            timeZone: stop.timezone,
            at,
            memberIds: travellers,
            title: `En ${hours} h: ${mode.toLowerCase()} a ${destination}`,
            body: `Sale de ${stop.city} a las ${time}.`,
          });
        }
      }
    }

    // ─── Reservas ───
    if (stop.nights > 0 && !stay && !stayEstimate) {
      for (const days of BOOKING_DAYS) {
        out.push({
          key: `missing-stay:${stop.id}:${days}`,
          group: "bookings",
          timeZone: stop.timezone,
          at: zonedToInstant(addDays(arrival, -days), "10:00", stop.timezone),
          memberIds: canBook(stop.member_ids),
          title: `Falta el alojamiento en ${stop.city}`,
          body: `Llegan el ${formatDay(arrival)}, en ${plural(days, "día", "días")}, y todavía no hay dónde quedarse.`,
        });
      }
    }
    const legEstimate = leg ? (trip.planned.find((p) => p.leg_id === leg.id) ?? null) : null;
    if (next && (!leg || !leg.departs_at) && !legEstimate) {
      for (const days of BOOKING_DAYS) {
        out.push({
          key: `missing-leg:${stop.id}:${days}`,
          group: "bookings",
          timeZone: stop.timezone,
          at: zonedToInstant(addDays(departure, -days), "10:00", stop.timezone),
          memberIds: canBook(travellers),
          title: `Falta el tramo ${stop.city} → ${next.city}`,
          body: `Es el ${formatDay(departure)}, en ${plural(days, "día", "días")}, y ${leg ? "todavía no tiene horario" : "todavía no está cargado"}.`,
        });
      }
    }
    for (const [estimate, what, date, ids] of [
      [stayEstimate, `El alojamiento en ${stop.city}`, arrival, stop.member_ids],
      [legEstimate, `El tramo a ${destination}`, departure, travellers],
    ] as const) {
      if (!estimate) continue;
      for (const days of ESTIMATE_DAYS) {
        out.push({
          key: `estimate:${estimate.id}:${days}`,
          group: "bookings",
          timeZone: stop.timezone,
          at: zonedToInstant(addDays(date, -days), "10:00", stop.timezone),
          memberIds: canBook([...ids]),
          title: `${what} sigue estimado`,
          body: `Es el ${formatDay(date)}, en ${plural(days, "día", "días")}. ¿Ya lo reservaron?`,
        });
      }
    }
  });

  // ─── Plata ───
  // Los domingos del viaje (y el de después), a las 20 h de la ciudad donde están.
  const net = netBalances(
    trip.members.map((m) => m.id),
    trip.expenses.map((e) => ({ paidBy: e.paid_by_member_id, amountCents: e.amount_cents, splits: e.splits.map((s) => ({ memberId: s.member_id, amountCents: s.amount_cents })) })),
    trip.settlements.map((s) => ({ from: s.from_member_id, to: s.to_member_id, amountCents: s.amount_cents })),
  );
  const debts = simplifyDebts(net);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.display_name ?? "";
  const end = addDays(trip.end_date, 7);
  for (let day = trip.start_date; day <= end; day = addDays(day, 1)) {
    if (new Date(`${day}T12:00:00Z`).getUTCDay() !== 0) continue;
    const where = stops[dates.findIndex((d) => d.arrival <= day && day < d.departure)] ?? stops[stops.length - 1];
    for (const debtor of new Set(debts.map((d) => d.from))) {
      const mine = debts.filter((d) => d.from === debtor);
      if (mine.reduce((sum, d) => sum + d.amountCents, 0) < MIN_DEBT_CENTS) continue;
      const list = mine.map((d) => `${formatEuros(d.amountCents)} a ${name(d.to)}`);
      out.push({
        key: `debt:${day}:${debtor}`,
        group: "money",
        timeZone: where.timezone,
        at: zonedToInstant(day, "20:00", where.timezone),
        memberIds: [debtor],
        title: "Cuentas pendientes",
        body: `Le debés ${list.length > 1 ? `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}` : list[0]}.`,
      });
    }
  }

  return out.filter((r) => r.memberIds.length > 0).sort((a, b) => a.at.localeCompare(b.at));
}

/** Los que hay que mandar ahora: ya llegó su hora, hace menos de 2 h, y no se mandaron. */
export function dueReminders(all: Reminder[], now: Date, sent: Set<string>): Reminder[] {
  const from = now.getTime() - 2 * 3_600_000;
  return all.filter((r) => {
    const t = new Date(r.at).getTime();
    return t <= now.getTime() && t > from && !sent.has(r.key);
  });
}

/** Los que vienen para una persona, para la pantalla del viaje. */
export function upcomingReminders(all: Reminder[], memberId: string | null, now: Date, limit = 20): Reminder[] {
  return all.filter((r) => new Date(r.at).getTime() > now.getTime() && (!memberId || r.memberIds.includes(memberId))).slice(0, limit);
}

/**
 * Cuándo llega, contado desde tu celular (decisión 100): "hoy", "mañana" o el día, y la hora, en la
 * zona horaria del teléfono. Si la ciudad tiene otra hora, se agrega la de allá: antes del viaje,
 * desde Uruguay, "mañana · 15:00 (20:00 allá)".
 */
export function reminderWhen(at: string, timeZone: string, now: Date, deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const dayIn = (date: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const day = dayIn(new Date(at), deviceTimeZone);
  const diff = daysBetween(dayIn(now, deviceTimeZone), day);
  const label = diff === 0 ? "hoy" : diff === 1 ? "mañana" : formatDay(day);
  const mine = localTime(at, deviceTimeZone);
  const there = localTime(at, timeZone);
  return `${label} · ${mine}${there !== mine ? ` (${there} allá)` : ""}`;
}
