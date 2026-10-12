import { formatEuros } from "./money";
import type { ExpenseCategory, LegMode, PlannedItem, Trip } from "./trip-types";

// Planificado (decisión 084): cuánto se estima que sale el viaje. Lo estimado no es un gasto: no
// entra en el balance. "El viaje sale" = lo ya gastado + lo estimado que falta pagar.

/** Cuánto le toca a cada uno de un estimado: partes iguales, el resto en centavos a los primeros. */
export function plannedShare(item: Pick<PlannedItem, "amount_cents" | "member_ids">, memberId: string | null): number {
  const n = item.member_ids.length;
  const i = memberId ? item.member_ids.indexOf(memberId) : -1;
  if (!n || i < 0) return 0;
  const base = Math.floor(item.amount_cents / n);
  return base + (i < item.amount_cents - base * n ? 1 : 0);
}

export type PlannedRowView = {
  id: string;
  title: string;
  sub: string;
  amount: string;
  myShare: string;
  category: ExpenseCategory;
  legMode: LegMode | null;
  /** Qué se abre al tocarlo: el tramo, la ciudad (alojamiento) o el estimado suelto. */
  target: { kind: "leg"; fromStopId: string } | { kind: "stay"; stopId: string } | { kind: "item"; id: string };
};

export type PlanView = {
  /** Lo ya gastado + lo estimado. */
  tripTotal: string;
  myTotal: string;
  spent: string;
  mySpent: string;
  planned: string;
  myPlanned: string;
  count: number;
  rows: PlannedRowView[];
};

export function buildPlanView(trip: Trip, myMemberId: string | null): PlanView {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const order = new Map(stops.map((s, i) => [s.id, i]));
  const city = (id: string | null) => stops.find((s) => s.id === id)?.city ?? null;

  const spent = trip.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const mySpent = trip.expenses.reduce((sum, e) => sum + (e.splits.find((s) => s.member_id === myMemberId)?.amount_cents ?? 0), 0);
  const planned = trip.planned.reduce((sum, p) => sum + p.amount_cents, 0);
  const myPlanned = trip.planned.reduce((sum, p) => sum + plannedShare(p, myMemberId), 0);

  // En el orden del viaje: los tramos por su ciudad de salida, los alojamientos y los sueltos por su ciudad.
  const position = (p: PlannedItem) => {
    const leg = p.leg_id ? trip.legs.find((l) => l.id === p.leg_id) : undefined;
    const stopId = leg?.from_stop_id ?? p.stay_stop_id ?? p.stop_id;
    return stopId ? (order.get(stopId) ?? 999) : 1000;
  };

  const rows = [...trip.planned]
    .sort((a, b) => position(a) - position(b) || a.created_at.localeCompare(b.created_at))
    .map((p): PlannedRowView => {
      const leg = p.leg_id ? trip.legs.find((l) => l.id === p.leg_id) : undefined;
      const share = plannedShare(p, myMemberId);
      const people = `entre ${p.member_ids.length}`;
      if (leg) {
        const from = city(leg.from_stop_id) ?? "";
        const to = city(leg.to_stop_id) ?? "casa";
        return {
          id: p.id,
          title: `${from} → ${to}`,
          sub: `Tramo · ${people}`,
          amount: formatEuros(p.amount_cents),
          myShare: share ? `tu parte ${formatEuros(share)}` : "no participás",
          category: "transport",
          legMode: leg.mode,
          target: { kind: "leg", fromStopId: leg.from_stop_id },
        };
      }
      if (p.stay_stop_id) {
        const stay = trip.stays.find((s) => s.stop_id === p.stay_stop_id);
        return {
          id: p.id,
          title: stay?.name || `Alojamiento en ${city(p.stay_stop_id)}`,
          sub: `Alojamiento en ${city(p.stay_stop_id)} · ${people}`,
          amount: formatEuros(p.amount_cents),
          myShare: share ? `tu parte ${formatEuros(share)}` : "no participás",
          category: "lodging",
          legMode: null,
          target: { kind: "stay", stopId: p.stay_stop_id },
        };
      }
      return {
        id: p.id,
        title: p.description || "Estimado",
        sub: [city(p.stop_id), people].filter(Boolean).join(" · "),
        amount: formatEuros(p.amount_cents),
        myShare: share ? `tu parte ${formatEuros(share)}` : "no participás",
        category: p.category,
        legMode: null,
        target: { kind: "item", id: p.id },
      };
    });

  return {
    tripTotal: formatEuros(spent + planned),
    myTotal: formatEuros(mySpent + myPlanned),
    spent: formatEuros(spent),
    mySpent: formatEuros(mySpent),
    planned: formatEuros(planned),
    myPlanned: formatEuros(myPlanned),
    count: trip.planned.length,
    rows,
  };
}
