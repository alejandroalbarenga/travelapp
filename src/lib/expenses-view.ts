import { netBalances, simplifyDebts } from "./balance";
import { formatDay, formatInstant, formatInstantDay, formatStopDates, stopDates } from "./dates";
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

export type TransferView = {
  from: string;
  to: string;
  amountCents: number;
  fromName: string;
  toName: string;
  amount: string;
  /** Contado desde vos: "Josué te debe €193,33", "Le debés €50 a Ale" (decisión 075). */
  text: string;
  /** Si sos uno de los dos: va primero. */
  mine: boolean;
};

export type SettledView = TransferView & { id: string; when: string; note: string | null };

/** Cómo está cada uno: cuánto le deben (+) o debe (−), en palabras. */
export type PersonView = { memberId: string; name: string; initials: string; color: string; cents: number; text: string; isMe: boolean };

/** Lo tuyo, arriba de todo (decisión 075): lo que te tocó, lo que pusiste y cómo quedás. */
export type MySummaryView = { spent: string; paid: string; cents: number; status: string };

/** Un movimiento del historial, listo para mostrar: "Rodrigo borró un gasto: Entradas · €54". */
export type ActivityView = {
  id: string;
  when: string;
  actorName: string;
  actorInitials: string;
  actorColor: string | null;
  verb: string;
  subject: string;
  detail: string;
  /** Borrados y deshechos se marcan en rojo para que salten a la vista. */
  removal: boolean;
};

export type ExpensesView = {
  total: string;
  summary: string;
  myBalance: string;
  me: MySummaryView | null;
  groups: ExpenseGroupView[];
  pending: TransferView[];
  settled: SettledView[];
  allSettled: boolean;
  /** Neto de cada integrante en centavos (positivo: le deben). */
  balances: Record<string, number>;
  people: PersonView[];
  activity: ActivityView[];
};

const CHANGE_LABEL: Record<string, string> = {
  description: "el concepto",
  payer: "quién pagó",
  split: "la división",
  city: "la ciudad",
  category: "la categoría",
};

/** Historial de movimientos (migración 0006), del más nuevo al más viejo. */
export function buildActivityView(trip: Trip): ActivityView[] {
  const members = new Map(trip.members.map((m) => [m.id, m]));
  return trip.activity.map((a) => {
    const member = a.actor_member_id ? members.get(a.actor_member_id) : undefined;
    const actorName = member?.display_name ?? a.actor_name ?? "Alguien";
    const amount = a.amount_cents !== null ? formatEuros(a.amount_cents) : "";
    let verb = "";
    let subject = a.description ?? "";
    let detail = amount;
    switch (a.action) {
      case "expense_added":
        verb = "cargó un gasto:";
        break;
      case "expense_deleted":
        verb = "borró un gasto:";
        break;
      case "expense_edited": {
        verb = "editó un gasto:";
        const parts: string[] = [];
        if (a.changes?.includes("amount") && a.previous_amount_cents !== null) {
          parts.push(`el monto de ${formatEuros(a.previous_amount_cents)} a ${amount}`);
        }
        for (const c of a.changes ?? []) if (CHANGE_LABEL[c]) parts.push(CHANGE_LABEL[c]);
        detail = parts.length ? `cambió ${parts.join(", ").replace(/, ([^,]*)$/, " y $1")}` : amount;
        break;
      }
      case "settled":
      case "settle_undone":
        verb = a.action === "settled" ? "registró un pago:" : "borró un pago:";
        subject = `${a.from_name ?? "Alguien"} le pagó a ${a.to_name ?? "alguien"}`;
        detail = a.description ? `${amount} · ${a.description}` : amount;
        break;
    }
    return {
      id: a.id,
      when: formatInstant(a.created_at),
      actorName,
      actorInitials: member?.initials ?? actorName.slice(0, 2),
      actorColor: member?.color ?? null,
      verb,
      subject,
      detail,
      removal: a.action === "expense_deleted" || a.action === "settle_undone",
    };
  });
}

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

  const toTransfer = (from: string, to: string, amountCents: number): TransferView => {
    const amount = formatEuros(amountCents);
    const text =
      from === myMemberId
        ? `Le debés ${amount} a ${name(to)}`
        : to === myMemberId
          ? `${name(from)} te debe ${amount}`
          : `${name(from)} le debe ${amount} a ${name(to)}`;
    return { from, to, amountCents, fromName: name(from), toName: name(to), amount, text, mine: from === myMemberId || to === myMemberId };
  };

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
    const mine = myMemberId ? e.splits.find((s) => s.member_id === myMemberId) : undefined;
    // Fecha del gasto: la del viaje para pasajes (salida) y alojamientos (llegada); si no, cuándo se cargó.
    const fromIndex = leg ? order.get(leg.from_stop_id) : undefined;
    const stayIndex = stay ? order.get(stay.stop_id) : undefined;
    const day =
      fromIndex !== undefined
        ? formatDay(dates[fromIndex].departure)
        : stayIndex !== undefined
          ? formatDay(dates[stayIndex].arrival)
          : formatInstantDay(e.created_at);
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
      sub: `${day} · ${e.paid_by_member_id === myMemberId ? "Pagaste vos" : `Pagó ${name(e.paid_by_member_id)}`}`,
      myShare: mine ? `tu parte ${formatEuros(mine.amount_cents)}` : "no participás",
    });
  }

  // Primero las que te tocan a vos.
  const pending = simplifyDebts(net)
    .map((t) => toTransfer(t.from, t.to, t.amountCents))
    .sort((a, b) => Number(b.mine) - Number(a.mine));
  const settled = [...trip.settlements]
    .sort((a, b) => a.settled_at.localeCompare(b.settled_at))
    .map((s) => ({ ...toTransfer(s.from_member_id, s.to_member_id, s.amount_cents), id: s.id, when: formatInstantDay(s.settled_at), note: s.note }));

  const mine = myMemberId ? (net[myMemberId] ?? 0) : 0;
  const myBalance = mine > 0 ? `Te deben ${formatEuros(mine)}` : mine < 0 ? `Debés ${formatEuros(-mine)}` : "Estás a mano";
  const spent = trip.expenses.reduce((sum, e) => sum + (e.splits.find((s) => s.member_id === myMemberId)?.amount_cents ?? 0), 0);
  const paid = trip.expenses.reduce((sum, e) => sum + (e.paid_by_member_id === myMemberId ? e.amount_cents : 0), 0);
  return {
    total: formatEuros(total),
    summary: `${trip.expenses.length} ${trip.expenses.length === 1 ? "gasto" : "gastos"} · ${trip.members.length} viajeros`,
    myBalance,
    me: myMemberId ? { spent: formatEuros(spent), paid: formatEuros(paid), cents: mine, status: myBalance } : null,
    groups,
    pending,
    settled,
    allSettled: pending.length === 0 && settled.length > 0,
    balances: net,
    // Vos primero; después los que más ponen, y los que deben al final.
    people: [...trip.members]
      .sort((a, b) => Number(b.id === myMemberId) - Number(a.id === myMemberId) || (net[b.id] ?? 0) - (net[a.id] ?? 0))
      .map((m) => {
        const cents = net[m.id] ?? 0;
        const isMe = m.id === myMemberId;
        const amount = formatEuros(Math.abs(cents));
        return {
          memberId: m.id,
          name: isMe ? "Vos" : m.display_name,
          initials: m.initials,
          color: m.color,
          cents,
          text: cents > 0 ? `${isMe ? "te deben" : "le deben"} ${amount}` : cents < 0 ? `${isMe ? "debés" : "debe"} ${amount}` : isMe ? "estás a mano" : "a mano",
          isMe,
        };
      }),
    activity: buildActivityView(trip),
  };
}
