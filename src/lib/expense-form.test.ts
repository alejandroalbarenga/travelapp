import { describe, expect, it } from "vitest";
import { DEMO_TRIP } from "./demo-trip";
import { applyKey, defaultStopId, type Key } from "./expense-form";

const type = (keys: Key[], start = "") => keys.reduce(applyKey, start);

describe("applyKey", () => {
  it("escribe montos con coma", () => {
    expect(type(["6", "4", ",", "5", "0"])).toBe("64,50");
    expect(type([",", "5"])).toBe("0,5");
  });

  it("no deja más de dos decimales ni dos comas", () => {
    expect(type(["1", ",", "2", "3", "4", ","])).toBe("1,23");
  });

  it("hasta seis dígitos enteros", () => {
    expect(type(["1", "2", "3", "4", "5", "6", "7"])).toBe("123456");
  });

  it("no empieza con ceros", () => {
    expect(type(["0", "0", "5"])).toBe("5");
  });

  it("borrar", () => {
    expect(type(["del"], "64,50")).toBe("64,5");
    expect(type(["del"], "")).toBe("");
  });
});

describe("defaultStopId", () => {
  it("durante el viaje, la ciudad donde están hoy", () => {
    expect(defaultStopId(DEMO_TRIP, "2026-10-19")).toBe("s1"); // Bruselas
    expect(defaultStopId(DEMO_TRIP, "2026-10-21")).toBe("s2"); // día de viaje: Ámsterdam
    expect(defaultStopId(DEMO_TRIP, "2026-11-19")).toBe("s12"); // Madrid al final
  });

  it("antes del viaje, la del último gasto cargado", () => {
    expect(defaultStopId(DEMO_TRIP, "2026-10-10")).toBe("s2"); // el museo, en Ámsterdam
  });

  it("sin gastos ni viaje en curso, la primera", () => {
    expect(defaultStopId({ ...DEMO_TRIP, expenses: [] }, "2026-10-10")).toBe("s0");
  });
});
