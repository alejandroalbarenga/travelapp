import { describe, expect, it } from "vitest";
import { countdown, initialsFor, splitTrips, todayInUruguay, tripSubtitle, validateNewTrip } from "./home";

describe("validateNewTrip", () => {
  it("los mensajes del diseño", () => {
    expect(validateNewTrip(" ", "2026-10-17", "2026-11-20")).toBe("Ponele un nombre al viaje");
    expect(validateNewTrip("Europa", "", "2026-11-20")).toBe("Elegí las fechas");
    expect(validateNewTrip("Europa", "2026-11-20", "2026-11-20")).toBe("La vuelta tiene que ser después de la ida");
    expect(validateNewTrip("Europa", "2026-10-17", "2026-11-20")).toBeNull();
  });
});

describe("initialsFor", () => {
  it("una o dos palabras", () => {
    expect(initialsFor("Ale")).toBe("Al");
    expect(initialsFor("juan pérez")).toBe("JP");
    expect(initialsFor("")).toBe("?");
  });
});

describe("countdown", () => {
  it("días, mañana, hoy y en curso", () => {
    expect(countdown("2026-10-17", "2026-11-20", "2026-10-07")).toBe("10 días");
    expect(countdown("2026-10-17", "2026-11-20", "2026-10-16")).toBe("Mañana");
    expect(countdown("2026-10-17", "2026-11-20", "2026-10-17")).toBe("Hoy · empieza");
    expect(countdown("2026-10-17", "2026-11-20", "2026-11-01")).toBe("Ya · en curso");
    expect(countdown("2026-10-17", "2026-11-20", "2026-11-21")).toBe("Terminó");
  });
});

describe("splitTrips", () => {
  it("próximos del más cercano; pasados del más nuevo", () => {
    const trips = [
      { id: "a", start_date: "2026-12-01", end_date: "2026-12-10" },
      { id: "b", start_date: "2026-10-17", end_date: "2026-11-20" },
      { id: "c", start_date: "2025-01-01", end_date: "2025-01-10" },
      { id: "d", start_date: "2026-03-01", end_date: "2026-03-05" },
    ];
    const { upcoming, past } = splitTrips(trips, "2026-11-01");
    expect(upcoming.map((t) => t.id)).toEqual(["b", "a"]);
    expect(past.map((t) => t.id)).toEqual(["d", "c"]);
  });
});

describe("tripSubtitle", () => {
  it("destinos y noches", () => {
    expect(tripSubtitle(12, "2026-10-17", "2026-11-20")).toBe("12 destinos · 34 noches");
    expect(tripSubtitle(0, "2026-10-17", "2026-10-18")).toBe("Sin ciudades todavía · 1 noche");
  });
});

describe("todayInUruguay", () => {
  it("de noche en Montevideo ya es otro día en UTC", () => {
    expect(todayInUruguay(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
  });
});
