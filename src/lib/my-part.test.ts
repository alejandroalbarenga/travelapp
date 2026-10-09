import { describe, expect, it } from "vitest";
import { DEMO_TRIP } from "./demo-trip";
import { foldLabel, myPart } from "./my-part";

// En el viaje de ejemplo: Ale y Rodrigo hacen todo, Josué hasta Riga (s0–s5) y Agustín desde Alicante (s7–s12).
const part = (id: string | null) => myPart(DEMO_TRIP.start_date, DEMO_TRIP.stops, id);

describe("myPart", () => {
  it("quien hace todo el viaje no tiene nada que plegar", () => {
    expect(part("m-al")).toBeNull();
    expect(part(null)).toBeNull();
  });

  it("Agustín se suma en Alicante el 3 nov y sigue hasta el final", () => {
    expect(part("m-ag")).toEqual({ first: 7, last: 12, arrival: "2026-11-03", departure: "2026-11-20", firstCity: "Alicante", lastCity: "Madrid" });
  });

  it("Josué arranca con todos y se va después de Riga", () => {
    expect(part("m-jo")).toMatchObject({ first: 0, last: 5, arrival: "2026-10-17", departure: "2026-10-31", lastCity: "Riga" });
  });

  it("alguien que no está en ninguna ciudad", () => {
    expect(part("m-nadie")).toBeNull();
  });
});

describe("foldLabel", () => {
  it("ruta y cantidad", () => {
    expect(foldLabel(["Madrid", "Bruselas", "Oslo"])).toBe("Madrid → Oslo · 3 ciudades");
    expect(foldLabel(["Oslo"])).toBe("Oslo · 1 ciudad");
    expect(foldLabel([])).toBe("");
  });
});
