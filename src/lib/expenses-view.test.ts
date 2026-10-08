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

  it("cada fila: quién pagó, entre cuántos y tu parte", () => {
    const vuelo = view.groups[0].rows[0];
    expect(vuelo).toMatchObject({ description: "Vuelo Madrid → Bruselas", amount: "€480", sub: "Pagó Ale · entre 3", myShare: "tu parte €160", legMode: "plane" });
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
      settlements: [{ id: "x1", from_member_id: "m-jo", to_member_id: "m-al", amount_cents: 19333, settled_at: "2026-10-20T10:00:00Z" }],
    };
    const v = buildExpensesView(trip, DEMO_MY_MEMBER_ID);
    expect(v.pending.map((t) => `${t.fromName} → ${t.toName}: ${t.amount}`)).toEqual(["Rodrigo → Ale: €177,33"]);
    expect(v.settled.map((t) => `${t.fromName} → ${t.toName}: ${t.amount}`)).toEqual(["Josué → Ale: €193,33"]);
    expect(v.myBalance).toBe("Te deben €177,33");
    expect(v.allSettled).toBe(false);
  });

  it("montos distintos se marcan", () => {
    const trip = {
      ...DEMO_TRIP,
      expenses: [
        {
          ...DEMO_TRIP.expenses[5],
          splits: [
            { member_id: "m-al", amount_cents: 6000 },
            { member_id: "m-ro", amount_cents: 2800 },
          ],
        },
      ],
    };
    const v = buildExpensesView(trip, DEMO_MY_MEMBER_ID);
    expect(v.groups[0].rows[0].sub).toBe("Pagó Rodrigo · entre 2 · montos distintos");
  });
});
