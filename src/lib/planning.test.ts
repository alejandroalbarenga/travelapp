import { describe, expect, it } from "vitest";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "./demo-trip";
import { buildPlanView, plannedShare } from "./planning";

describe("plannedShare", () => {
  it("partes iguales, el centavo que sobra a los primeros", () => {
    const item = { amount_cents: 1000, member_ids: ["a", "b", "c"] };
    expect([plannedShare(item, "a"), plannedShare(item, "b"), plannedShare(item, "c"), plannedShare(item, "x")]).toEqual([334, 333, 333, 0]);
  });
});

describe("buildPlanView", () => {
  it("el viaje sale lo gastado más lo estimado, y tu parte", () => {
    const v = buildPlanView(DEMO_TRIP, DEMO_MY_MEMBER_ID);
    expect(v).toMatchObject({ spent: "€1.588", planned: "€360", tripTotal: "€1.948", myPlanned: "€100", count: 2 });
    expect(v.rows.map((r) => `${r.title}: ${r.amount} (${r.myShare})`)).toEqual(["Excursión a Sintra: €120 (tu parte €40)", "Cena de despedida: €240 (tu parte €60)"]);
  });

  it("el estimado de un tramo se muestra con su recorrido y abre el tramo", () => {
    const leg = DEMO_TRIP.legs[0];
    const trip = { ...DEMO_TRIP, planned: [{ id: "x", leg_id: leg.id, stay_stop_id: null, stop_id: null, description: "", category: "transport" as const, amount_cents: 9000, member_ids: ["m-al", "m-ro"], created_at: "2026-10-01T00:00:00Z" }] };
    const v = buildPlanView(trip, DEMO_MY_MEMBER_ID);
    expect(v.rows[0]).toMatchObject({ title: "Madrid → Bruselas", amount: "€90", myShare: "tu parte €45", target: { kind: "leg", fromStopId: leg.from_stop_id } });
  });
});
