import { describe, expect, it } from "vitest";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "./demo-trip";
import { buildExpensesView } from "./expenses-view";

const view = buildExpensesView(DEMO_TRIP, DEMO_MY_MEMBER_ID);

describe("buildExpensesView", () => {
  it("total y resumen", () => {
    expect(view.total).toBe("€1.588");
    expect(view.summary).toBe("6 gastos · 4 viajeros");
  });

  it("agrupa por ciudad en el orden del viaje", () => {
    expect(view.groups.map((g) => `${g.name} (${g.dates}): ${g.rows.length}`)).toEqual([
      "Madrid (17 oct · escala): 1",
      "Bruselas (17 – 21 oct): 2",
      "Ámsterdam (21 – 24 oct): 3",
    ]);
  });

  it("cada fila: la fecha, quién pagó y tu parte", () => {
    const vuelo = view.groups[0].rows[0];
    expect(vuelo).toMatchObject({ description: "Vuelo Madrid → Bruselas", amount: "€480", sub: "17 oct · Pagaste vos", myShare: "tu parte €160", legMode: "plane" });
    expect(vuelo.editTarget).toEqual({ kind: "leg", fromStopId: "s0" });
    const museo = view.groups[2].rows.find((r) => r.description === "Museo Van Gogh")!;
    expect(museo.myShare).toBe("tu parte €29,34");
    expect(museo.editTarget).toEqual({ kind: "expense", id: "e6" });
    expect(view.groups[1].rows[0].editTarget).toEqual({ kind: "stay", stopId: "s1" });
  });

  it("balance: Josué €193,33 y Rodrigo €177,33 a Ale", () => {
    expect(view.myBalance).toBe("Te deben €370,66");
    expect(view.pending.map((t) => `${t.fromName} → ${t.toName}: ${t.amount}`)).toEqual([
      "Josué → Ale: €193,33",
      "Rodrigo → Ale: €177,33",
    ]);
    expect(view.balances["m-ag"]).toBe(0);
  });

  it("para alguien que no participa", () => {
    const v = buildExpensesView(DEMO_TRIP, "m-ag");
    expect(v.groups[0].rows[0].myShare).toBe("no participás");
    expect(v.myBalance).toBe("Estás a mano");
  });

  it("con un saldo: baja la deuda y aparece como saldado", () => {
    const trip = {
      ...DEMO_TRIP,
      settlements: [{ id: "x1", from_member_id: "m-jo", to_member_id: "m-al", amount_cents: 19333, settled_at: "2026-10-20T10:00:00Z", note: null }],
    };
    const v = buildExpensesView(trip, DEMO_MY_MEMBER_ID);
    expect(v.pending.map((t) => `${t.fromName} → ${t.toName}: ${t.amount}`)).toEqual(["Rodrigo → Ale: €177,33"]);
    expect(v.settled.map((t) => `${t.fromName} → ${t.toName}: ${t.amount}`)).toEqual(["Josué → Ale: €193,33"]);
    expect(v.myBalance).toBe("Te deben €177,33");
    expect(v.allSettled).toBe(false);
  });

  it("lo tuyo arriba y las cuentas contadas desde vos", () => {
    expect(view.me).toEqual({ spent: "€529,34", paid: "€900", cents: 37066, status: "Te deben €370,66" });
    expect(view.pending.map((t) => t.text)).toEqual(["Josué te debe €193,33", "Rodrigo te debe €177,33"]);
    const v = buildExpensesView(DEMO_TRIP, "m-ro");
    expect(v.pending.map((t) => t.text)).toEqual(["Le debés €177,33 a Ale", "Josué le debe €193,33 a Ale"]);
    expect(v.groups[0].rows[0].sub).toBe("17 oct · Pagó Ale");
  });
});

describe("fechas, burbujas e historial", () => {
  it("cada gasto con su fecha: el pasaje el día que sale, el alojamiento el día que llegan", () => {
    const rows = view.groups.flatMap((g) => g.rows);
    const sub = (d: string) => rows.find((r) => r.description === d)!.sub;
    expect(sub("Tren Bruselas → Ámsterdam")).toMatch(/^21 oct · /);
    expect(sub("Hotel cerca de Grand-Place · 4 noches")).toMatch(/^17 oct · /);
    expect(sub("Museo Van Gogh")).toMatch(/^23 oct · /);
  });

  it("una burbuja por integrante, con lo que le deben o debe", () => {
    expect(view.bubbles.map((b) => `${b.name} ${b.label} ${b.amount}`)).toEqual([
      "Vos te deben €370,66",
      "Rodrigo debe €177,33",
      "Josué debe €193,33",
      "Agustín a mano €0",
    ]);
  });

  it("los últimos gastos, del más nuevo", () => {
    expect(view.recent.map((r) => r.description)).toHaveLength(4);
    expect(view.recent[0].createdAt >= view.recent[1].createdAt).toBe(true);
  });

  it("historial del más nuevo al más viejo, con lo que cambió", () => {
    const a = view.activity;
    expect(a).toHaveLength(9);
    expect(a[0]).toMatchObject({ actorName: "Rodrigo", verb: "cargó un gasto:", subject: "Museo Van Gogh", detail: "€88" });
    const edit = a.find((x) => x.verb === "editó un gasto:")!;
    expect(edit).toMatchObject({ actorName: "Josué", subject: "Cena en De Pijp", detail: "cambió el monto de €142 a €156" });
    const removed = a.find((x) => x.verb === "borró un gasto:")!;
    expect(removed).toMatchObject({ subject: "Entradas Atomium", detail: "€54", removal: true });
  });

  it("saldos y varios cambios juntos", () => {
    const trip = {
      ...DEMO_TRIP,
      activity: [
        { id: "x", actor_member_id: null, actor_name: "Tomás", action: "settled" as const, description: "Bizum", from_name: "Josué", to_name: "Ale", amount_cents: 19333, previous_amount_cents: null, changes: null, created_at: "2026-10-24T10:00:00Z" },
        { id: "y", actor_member_id: "m-al", actor_name: "Ale", action: "expense_edited" as const, description: "Cena", from_name: null, to_name: null, amount_cents: 100, previous_amount_cents: 100, changes: ["payer", "split", "city"], created_at: "2026-10-24T09:00:00Z" },
      ],
    };
    const [settled, edited] = buildExpensesView(trip, DEMO_MY_MEMBER_ID).activity;
    expect(settled).toMatchObject({ actorName: "Tomás", verb: "registró un pago:", subject: "Josué le pagó a Ale", detail: "€193,33 · Bizum", actorColor: null });
    expect(edited.detail).toBe("cambió quién pagó, la división y la ciudad");
  });
});
