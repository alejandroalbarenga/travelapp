import { netBalances, simplifyDebts } from "./balance";
import { formatStopDates, stopDates } from "./dates";
import { formatEuros } from "./money";
import type { ExpenseCategory, LegMode, Trip } from "./trip-types";

// Arma lo que muestra la pantalla de Gastos (diseño: pantalla 04): total, gastos por ciudad,
// tu parte, el balance de cada uno, lo que falta pagar y lo ya saldado.

export type ExpenseRowView = {
  id: string;
  description: string;
  category: ExpenseCategory;
  /** Si es el gasto de un tramo, el medio (para el ícono y el color). */
  legMode: LegMode | null;
  /** De dónde se edita: un gasto suelto, el tramo (por su parada de origen) o el alojamiento (por su parada). */
  editTarget: { kind: "expense"; id: string } | { kind: "leg"; fromStopId: string } | { kind: "stay"; stopId: string };
  amount: string;
  sub: string;
  myShare: string;
};

export type ExpenseGroupView = { key: string; name: string; dates: string; rows: ExpenseRowView[] };

export type TransferView = { from: string; to: string; amountCents: number; fromName: string; toName: string; amount: string };

export type SettledView = TransferView & { id: string };

export type ExpensesView = {
  total: string;
  summary: string;
  myBalance: string;
  groups: ExpenseGroupView[];
  pending: TransferView[];
  settled: SettledView[];
  allSettled: boolean;
  /** Neto de cada integrante en centavos (positivo: le deben). */
  balances: Record<string, number>;
};

export function buildExpensesView(trip: Trip, myMemberId: string | null): ExpensesView {
  const members = new Map(trip.members.map((m) => [m.id, m]));
  const name = (id: string) => members.get(id)?.display_name ?? "Alguien";
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  const total = trip.expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  const net = netBalances(
    trip.members.map((m) => m.id),
    trip.expenses.map((e) => ({
      paidBy: e.paid_by_member_id,
      amountCents: e.amount_cents,
      splits: e.splits.map((s) => ({ memberId: s.member_id, amountCents: s.amount_cents })),
    })),
    trip.settlements.map((s) => ({ from: s.from_member_id, to: s.to_member_id, amountCents: s.amount_cents })),
  );

  const toTransfer = (from: string, to: string, amountCents: number): TransferView => ({
    from,
    to,
    amountCents,
    fromName: name(from),
    toName: name(to),
    amount: formatEuros(amountCents),
  });

  // Grupos por ciudad, en el orden del viaje; los gastos sin ciudad van al final.
  const order = new Map(stops.map((s, i) => [s.id, i]));
  const sorted = [...trip.expenses].sort((a, b) => {
    const pa = a.stop_id ? (order.get(a.stop_id) ?? 999) : 1000;
    const pb = b.stop_id ? (order.get(b.stop_id) ?? 999) : 1000;
    return pa - pb || a.created_at.localeCompare(b.created_at);
  });
  const groups: ExpenseGroupView[] = [];
  for (const e of sorted) {
    const i = e.stop_id ? order.get(e.stop_id) : undefined;
    const key = i !== undefined ? stops[i].id : "sin-ciudad";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        name: i !== undefined ? stops[i].city : "Sin ciudad",
        dates: i !== undefined ? formatStopDates(dates[i], i === 0) : "",
        rows: [],
      };
      groups.push(group);
    }
    const leg = e.leg_id ? trip.legs.find((l) => l.id === e.leg_id) : undefined;
    const stay = e.stay_id ? trip.stays.find((s) => s.id === e.stay_id) : undefined;
    const equal = e.splits.every((s) => Math.abs(s.amount_cents - e.amount_cents / e.splits.length) < 1);
    const mine = myMemberId ? e.splits.find((s) => s.member_id === myMemberId) : undefined;
    group.rows.push({
      id: e.id,
      description: e.description,
      category: e.category,
      legMode: leg?.mode ?? null,
      editTarget: leg
        ? { kind: "leg", fromStopId: leg.from_stop_id }
        : stay
          ? { kind: "stay", stopId: stay.stop_id }
          : { kind: "expense", id: e.id },
      amount: formatEuros(e.amount_cents),
      sub: `Pagó ${name(e.paid_by_member_id)} · entre ${e.splits.length}${equal ? "" : " · montos distintos"}`,
      myShare: mine ? `tu parte ${formatEuros(mine.amount_cents)}` : "no participás",
    });
  }

  const pending = simplifyDebts(net).map((t) => toTransfer(t.from, t.to, t.amountCents));
  const settled = [...trip.settlements]
    .sort((a, b) => a.settled_at.localeCompare(b.settled_at))
    .map((s) => ({ ...toTransfer(s.from_member_id, s.to_member_id, s.amount_cents), id: s.id }));

  const mine = myMemberId ? (net[myMemberId] ?? 0) : 0;
  return {
    total: formatEuros(total),
    summary: `${trip.expenses.length} ${trip.expenses.length === 1 ? "gasto" : "gastos"} · ${trip.members.length} viajeros`,
    myBalance: mine > 0 ? `Te deben ${formatEuros(mine)}` : mine < 0 ? `Debés ${formatEuros(-mine)}` : "Estás a mano",
    groups,
    pending,
    settled,
    allSettled: pending.length === 0 && settled.length > 0,
    balances: net,
  };
}
