import { describe, expect, it } from "vitest";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "./demo-trip";
import { buildTripView } from "./trip-view";

const view = buildTripView(DEMO_TRIP, { chipDisplay: "time", myMemberId: DEMO_MY_MEMBER_ID });

describe("buildTripView", () => {
  it("encabezado del viaje", () => {
    expect(view.range).toBe("17 oct – 20 nov 2026");
    expect(view.startLabel).toBe("SÁB 17 OCT 2026");
    expect(view.plannedNights).toBe(34);
    expect(view.tripNights).toBe(34);
    expect(view.nightsStatus).toBe("complete");
    expect(view.returnText).toBe("Vuelta a casa · 20 nov");
  });

  it("fechas y noches de cada ciudad", () => {
    expect(view.stops).toHaveLength(13);
    expect(view.stops[0]).toMatchObject({ number: 1, name: "Madrid", dates: "17 oct · escala", nights: 0, nightsLabel: "noches" });
    expect(view.stops[1]).toMatchObject({ name: "Bruselas", dates: "17 – 21 oct", nights: 4 });
    expect(view.stops[3]).toMatchObject({ name: "Eindhoven", nightsLabel: "noche" });
    expect(view.stops[6].dates).toBe("31 oct – 3 nov");
  });

  it("alojamiento: pagado o reservado", () => {
    expect(view.stops[1].stay).toEqual({ text: "Booking · pagado", paid: true });
    expect(view.stops[2].stay).toEqual({ text: "Airbnb · pagado", paid: true });
    expect(view.stops[3].stay).toBeNull();
  });

  it("chip del tramo con hora local y aviso de huso", () => {
    expect(view.stops[0].leg).toMatchObject({ mode: "plane", text: "13:40 → 15:49", timeZoneChange: null, hasTicket: true });
    expect(view.stops[3].leg?.text).toBe("09:30 → 13:05");
    expect(view.stops[3].leg?.timeZoneChange).toContain("Vilna está 1 h adelante");
    expect(view.stops[11].leg?.timeZoneChange).toContain("Madrid está 1 h adelante");
    expect(view.stops[1].leg?.hasTicket).toBe(false);
  });

  it("tramos sin cargar", () => {
    expect(view.stops[7].leg).toBeNull();
    expect(view.stops[7].legEmptyLabel).toBe("Agregar tramo");
    expect(view.stops[12].leg).toBeNull();
    expect(view.stops[12].legEmptyLabel).toBe("Agregar vuelta");
  });

  it("con duración en el chip", () => {
    const v = buildTripView(DEMO_TRIP, { chipDisplay: "duration", myMemberId: null });
    expect(v.stops[0].leg?.text).toBe("2h 9m");
    expect(v.stops[0].leg?.hasTicket).toBe(false);
  });

  it("si se cargan más noches que las del viaje, se pasa", () => {
    const longer = { ...DEMO_TRIP, stops: DEMO_TRIP.stops.map((s, i) => (i === 1 ? { ...s, nights: 6 } : s)) };
    const v = buildTripView(longer, { chipDisplay: "time", myMemberId: null });
    expect(v.nightsStatus).toBe("over");
    expect(v.stops[2].dates).toBe("23 – 26 oct");
  });
});
