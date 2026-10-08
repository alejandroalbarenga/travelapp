import { describe, expect, it } from "vitest";
import { DEMO_TRIP } from "./demo-trip";
import { deleteLock, lockMessage, nightsLock } from "./stop-lock";

// s1 Bruselas (17–21 oct), s2 Ámsterdam (21–24 oct), s3 Eindhoven (24–25 oct)
const withLocked = (...ids: string[]) => ({ ...DEMO_TRIP, stops: DEMO_TRIP.stops.map((s) => ({ ...s, locked: ids.includes(s.id) })) });
const BEFORE = "2026-10-10";

describe("nightsLock", () => {
  it("sin nada bloqueado y antes del viaje, se puede", () => {
    expect(nightsLock(DEMO_TRIP, "s2", BEFORE)).toBeNull();
  });

  it("la ciudad bloqueada", () => {
    expect(nightsLock(withLocked("s2"), "s2", BEFORE)).toEqual({ kind: "locked" });
  });

  it("una anterior a una bloqueada: sus fechas se correrían", () => {
    expect(nightsLock(withLocked("s2"), "s1", BEFORE)).toEqual({ kind: "locked-after", city: "Ámsterdam" });
    expect(nightsLock(withLocked("s2"), "s3", BEFORE)).toBeNull();
  });

  it("una ciudad de la que ya se fueron", () => {
    expect(nightsLock(DEMO_TRIP, "s1", "2026-10-22")).toEqual({ kind: "past" });
    expect(nightsLock(DEMO_TRIP, "s1", "2026-10-21")).toBeNull(); // el día que se van, todavía se puede alargar
    expect(nightsLock(DEMO_TRIP, "s2", "2026-10-22")).toBeNull(); // donde están ahora, sí
  });

  it("mensajes", () => {
    expect(lockMessage({ kind: "past" }, "Bruselas")).toBe("Ya pasaste por Bruselas: las noches no se cambian.");
    expect(lockMessage({ kind: "locked-after", city: "Ámsterdam" }, "Bruselas")).toBe("Ámsterdam está bloqueada y sus fechas no se pueden correr.");
  });
});

describe("deleteLock", () => {
  it("bloqueada, o con noches antes de una bloqueada", () => {
    expect(deleteLock(withLocked("s2"), "s2")).toBe("Ámsterdam está bloqueada. Desbloqueala para borrarla.");
    expect(deleteLock(withLocked("s2"), "s1")).toBe("Ámsterdam está bloqueada y sus fechas no se pueden correr.");
    expect(deleteLock(withLocked("s2"), "s3")).toBeNull();
    expect(deleteLock(withLocked("s2"), "s0")).toBeNull(); // Madrid es escala de 0 noches: no corre nada
  });
});
