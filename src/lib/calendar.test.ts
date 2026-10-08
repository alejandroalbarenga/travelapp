import { describe, expect, it } from "vitest";
import { arrivalChange, buildCalendar, mondayOf, stopSpans } from "./calendar";
import { DEMO_TRIP } from "./demo-trip";

// El viaje de ejemplo arranca el sábado 17 oct: el calendario empieza el lunes 12.
const ORIGIN = "2026-10-12";

describe("stopSpans", () => {
  const spans = stopSpans(DEMO_TRIP, ORIGIN);

  it("el 17 se reparte entre casa, la escala en Madrid y Bruselas", () => {
    expect(spans.get("s0")).toEqual({ from: 5 + 1 / 3, to: 5 + 2 / 3 });
    expect(spans.get("s1")!.from).toBeCloseTo(5 + 2 / 3);
  });

  it("el día de viaje queda partido: Bruselas hasta la mitad del 21, Ámsterdam desde ahí", () => {
    expect(spans.get("s1")!.to).toBe(9.5);
    expect(spans.get("s2")!.from).toBe(9.5);
  });

  it("la última ciudad termina a mitad del día de la vuelta", () => {
    expect(spans.get("s12")!.to).toBe(39.5); // 20 nov
  });
});

describe("buildCalendar", () => {
  const months = buildCalendar(DEMO_TRIP, "2026-10-19");

  it("de octubre a noviembre, semanas de lunes a domingo", () => {
    expect(months.map((m) => m.label)).toEqual(["octubre 2026", "noviembre 2026"]);
    expect(months[0].weeks[0].days[0].date).toBe("2026-09-28");
    expect(months[0].weeks[0].days.every((d) => d.inMonth === d.date.startsWith("2026-10"))).toBe(true);
    expect(months[0].weeks.flatMap((w) => w.days).find((d) => d.today)?.date).toBe("2026-10-19");
  });

  it("la barra de Bruselas en la semana del 12 y la del 19", () => {
    const week12 = months[0].weeks.find((w) => w.days[0].date === "2026-10-12")!;
    const bru = week12.bars.find((b) => b.name === "Bruselas")!;
    expect(bru.left).toBeCloseTo(5 + 2 / 3);
    expect(bru.startsHere && !bru.endsHere).toBe(true);
    const week19 = months[0].weeks.find((w) => w.days[0].date === "2026-10-19")!;
    expect(week19.bars.find((b) => b.name === "Bruselas")).toMatchObject({ left: 0, width: 2.5, startsHere: false, endsHere: true });
  });

  it("una semana partida entre dos meses se recorta en cada uno", () => {
    const octLast = months[0].weeks[months[0].weeks.length - 1];
    expect(octLast.days[0].date).toBe("2026-10-26");
    expect(Math.max(...octLast.bars.map((b) => b.left + b.width))).toBeLessThanOrEqual(6); // hasta el sáb 31
  });

  it("viaje sin ciudades: solo los días", () => {
    const empty = buildCalendar({ ...DEMO_TRIP, stops: [] }, "2026-10-19");
    expect(empty.flatMap((m) => m.weeks).every((w) => w.bars.length === 0)).toBe(true);
  });

  it("se puede alargar para elegir una llegada más tarde", () => {
    expect(buildCalendar(DEMO_TRIP, "2026-10-19", "2026-12-05").map((m) => m.label)).toContain("diciembre 2026");
  });
});

describe("mondayOf", () => {
  it("lunes de la semana", () => {
    expect(mondayOf("2026-10-17")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
  });
});

describe("arrivalChange", () => {
  it("llegar a Ámsterdam el 22 le da 5 noches a Bruselas", () => {
    expect(arrivalChange(DEMO_TRIP, "s2", "2026-10-22")).toEqual({ prevStopId: "s1", nights: 5 });
  });

  it("no antes de llegar a la anterior, ni la primera ciudad", () => {
    expect(arrivalChange(DEMO_TRIP, "s2", "2026-10-16")).toEqual({ error: "No puede ser antes de llegar a Bruselas." });
    expect(arrivalChange(DEMO_TRIP, "s0", "2026-10-18")).toHaveProperty("error");
  });

  it("el mismo día que se llega a la anterior: la anterior queda de paso", () => {
    expect(arrivalChange(DEMO_TRIP, "s2", "2026-10-17")).toEqual({ prevStopId: "s1", nights: 0 });
  });
});
