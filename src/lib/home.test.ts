import { describe, expect, it } from "vitest";
import { countdown, coverStopIndex, splitTrips, todayInUruguay, travelStats, tripSubtitle, validateNewTrip } from "./home";

describe("validateNewTrip", () => {
  it("los mensajes del diseño", () => {
    expect(validateNewTrip(" ", "2026-10-17", "2026-11-20")).toBe("Ponele un nombre al viaje");
    expect(validateNewTrip("Europa", "", "2026-11-20")).toBe("Elegí las fechas");
    expect(validateNewTrip("Europa", "2026-11-20", "2026-11-20")).toBe("La vuelta tiene que ser después de la ida");
    expect(validateNewTrip("Europa", "2026-10-17", "2026-11-20")).toBeNull();
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

describe("travelStats", () => {
  const stop = (nights: number, country: string, code: string, member_ids: string[] = []) => ({ nights, country, country_code: code, member_ids });
  const europa = {
    trip_start: "2026-10-17",
    start_date: "2026-10-17",
    end_date: "2026-10-27",
    myMemberId: "ale",
    stops: [stop(0, "Uruguay", "uy"), stop(3, "España", "es"), stop(4, "Portugal", "pt"), stop(3, "Francia", "fr", ["ro"])],
  };

  it("null si todavía no empezó ningún viaje", () => {
    expect(travelStats([europa], "2026-10-09")).toBeNull();
  });

  it("en curso: las noches hasta hoy y los países ya pisados, sin escalas ni ciudades donde no estás", () => {
    expect(travelStats([europa], "2026-10-21")).toEqual({ countries: [{ code: "es", name: "España" }, { code: "pt", name: "Portugal" }], tripsDone: 0, nightsAway: 4 });
  });

  it("terminado: cuenta el viaje y todas sus noches", () => {
    expect(travelStats([europa], "2026-12-01")).toEqual({ countries: [{ code: "es", name: "España" }, { code: "pt", name: "Portugal" }], tripsDone: 1, nightsAway: 10 });
  });
});

describe("coverStopIndex", () => {
  const nights = [0, 3, 5, 2];
  it("antes del viaje, la ciudad con más noches", () => {
    expect(coverStopIndex(nights, "2026-10-17", "2026-10-10", null)).toBe(2);
  });
  it("en curso, la ciudad de hoy", () => {
    expect(coverStopIndex(nights, "2026-10-17", "2026-10-18", null)).toBe(1);
    expect(coverStopIndex(nights, "2026-10-17", "2026-10-25", null)).toBe(3);
  });
  it("solo dentro de tu parte", () => {
    expect(coverStopIndex(nights, "2026-10-17", "2026-10-10", { first: 0, last: 1 })).toBe(1);
  });
  it("sin ciudades", () => {
    expect(coverStopIndex([], "2026-10-17", "2026-10-10", null)).toBe(-1);
  });
});
