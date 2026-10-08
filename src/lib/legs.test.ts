import { describe, expect, it } from "vitest";
import {
  chipText,
  durationMinutes,
  formatDuration,
  localTime,
  timeZoneDiffHours,
  zonedToInstant,
} from "./legs";

// Madrid → Bruselas: sale 13:40 y llega 15:49, las dos en hora de Europa central.
const departsAt = zonedToInstant("2026-10-17", "13:40", "Europe/Madrid");
const arrivesAt = zonedToInstant("2026-10-17", "15:49", "Europe/Brussels");

describe("zonedToInstant y localTime", () => {
  it("guarda en UTC y muestra en hora local", () => {
    expect(departsAt).toBe("2026-10-17T11:40:00.000Z");
    expect(localTime(departsAt, "Europe/Madrid")).toBe("13:40");
  });

  it("respeta el cambio de horario (25 oct)", () => {
    expect(zonedToInstant("2026-10-26", "10:00", "Europe/Madrid")).toBe("2026-10-26T09:00:00.000Z");
  });
});

describe("duración", () => {
  it("misma zona", () => {
    expect(formatDuration(durationMinutes(departsAt, arrivesAt))).toBe("2h 9m");
  });

  it("descuenta la diferencia de huso: Eindhoven → Vilna", () => {
    const dep = zonedToInstant("2026-10-25", "09:30", "Europe/Amsterdam");
    const arr = zonedToInstant("2026-10-25", "13:05", "Europe/Vilnius");
    expect(durationMinutes(dep, arr)).toBe(155);
  });
});

describe("timeZoneDiffHours", () => {
  it("Vilna está 1 h adelante de Ámsterdam; Lisboa 1 h atrás de Madrid", () => {
    expect(timeZoneDiffHours("Europe/Amsterdam", "Europe/Vilnius", departsAt)).toBe(1);
    expect(timeZoneDiffHours("Europe/Madrid", "Europe/Lisbon", departsAt)).toBe(-1);
    expect(timeZoneDiffHours("Europe/Madrid", "Europe/Brussels", departsAt)).toBe(0);
  });
});

describe("chipText", () => {
  const leg = { departsAt, arrivesAt, fromTimeZone: "Europe/Madrid", toTimeZone: "Europe/Brussels" };

  it("hora de salida o duración, según la preferencia", () => {
    expect(chipText(leg, "time")).toBe("13:40 → 15:49");
    expect(chipText(leg, "duration")).toBe("2h 9m");
  });

  it("si falta el dato elegido muestra el otro", () => {
    expect(chipText({ ...leg, arrivesAt: null }, "duration")).toBe("13:40");
    expect(chipText({ ...leg, arrivesAt: null }, "time")).toBe("13:40");
  });

  it("sin horarios pide completar", () => {
    expect(chipText({ ...leg, departsAt: null, arrivesAt: null }, "time")).toBe("Completar datos");
  });
});
