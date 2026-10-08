import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatDay,
  formatRange,
  formatStopDates,
  formatWeekday,
  nightsStatus,
  stopDates,
} from "./dates";

// Noches de Otoño en Europa (docs/diseño.md): Madrid, Bruselas, … , Madrid.
const NIGHTS = [0, 4, 3, 1, 3, 3, 3, 3, 3, 3, 2, 3, 3];

describe("addDays y daysBetween", () => {
  it("cruzan fin de mes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(daysBetween("2026-10-17", "2026-11-20")).toBe(34);
  });

  it("no se corren con el cambio de horario de octubre", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("stopDates", () => {
  const dates = stopDates("2026-10-17", NIGHTS);

  it("la escala de 0 noches llega y sale el mismo día", () => {
    expect(dates[0]).toEqual({ arrival: "2026-10-17", departure: "2026-10-17" });
  });

  it("cada parada arranca cuando termina la anterior", () => {
    expect(dates[1]).toEqual({ arrival: "2026-10-17", departure: "2026-10-21" });
    expect(dates[6]).toEqual({ arrival: "2026-10-31", departure: "2026-11-03" });
  });

  it("la última termina el 20 de noviembre", () => {
    expect(dates[12].departure).toBe("2026-11-20");
  });
});

describe("nightsStatus", () => {
  it("compara las noches cargadas con la duración del viaje", () => {
    const total = daysBetween("2026-10-17", "2026-11-20");
    expect(nightsStatus(34, total)).toBe("complete");
    expect(nightsStatus(30, total)).toBe("missing");
    expect(nightsStatus(35, total)).toBe("over");
  });
});

describe("formato", () => {
  it("día y día de la semana", () => {
    expect(formatDay("2026-10-17")).toBe("17 oct");
    expect(formatWeekday("2026-10-17")).toBe("sáb 17 oct");
  });

  it("rango en el mismo mes y entre meses", () => {
    expect(formatRange("2026-10-17", "2026-10-21")).toBe("17 – 21 oct");
    expect(formatRange("2026-10-31", "2026-11-03")).toBe("31 oct – 3 nov");
  });

  it("fechas de una parada", () => {
    const dates = stopDates("2026-10-17", NIGHTS);
    expect(formatStopDates(dates[0], true)).toBe("17 oct · escala");
    expect(formatStopDates({ arrival: "2026-10-24", departure: "2026-10-24" }, false)).toBe("24 oct");
    expect(formatStopDates(dates[1], false)).toBe("17 – 21 oct");
  });
});
