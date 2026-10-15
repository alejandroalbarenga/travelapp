import { describe, expect, it } from "vitest";
import { DEMO_TRIP } from "./demo-trip";
import { dueReminders, reminderWhen, tripReminders, upcomingReminders } from "./reminders";

const all = tripReminders(DEMO_TRIP);
const get = (key: string) => all.find((r) => r.key === key);

describe("tripReminders · viaje", () => {
  it("la noche antes del vuelo, con la hora y los pasajes", () => {
    expect(get("leg-eve:l0:2026-10-17")).toEqual({
      key: "leg-eve:l0:2026-10-17",
      group: "travel",
      at: "2026-10-16T18:00:00.000Z", // 20 h en Madrid
      timeZone: "Europe/Madrid",
      memberIds: ["m-al", "m-ro", "m-jo"],
      title: "Mañana: vuelo a Bruselas",
      body: "Sale de Madrid a las 13:40. Los pasajes están en la app.",
    });
  });

  it("4 h antes de un vuelo, 3 h antes de un tren", () => {
    expect(get("leg-soon:l0:2026-10-17T11:40:00.000Z")?.at).toBe("2026-10-17T07:40:00.000Z");
    expect(get("leg-soon:l2:2026-10-24T09:04:00.000Z")).toMatchObject({ at: "2026-10-24T06:04:00.000Z", title: "En 3 h: tren a Eindhoven" });
    // El tren de Bruselas sale a las 10:15: 3 h antes son las 7:15, antes de las 8. No avisa.
    expect(all.some((r) => r.key.startsWith("leg-soon:l1:"))).toBe(false);
  });

  it("nada entre las 23 y las 8: el bus de las 9 en Vilna no avisa a las 6", () => {
    expect(all.some((r) => r.key.startsWith("leg-soon:l4:"))).toBe(false);
    expect(get("leg-eve:l4:2026-10-28")).toBeDefined();
  });

  it("el día que llegan, con el check-in, y la noche antes del checkout", () => {
    expect(get("arrival:s1:2026-10-17")).toMatchObject({
      at: "2026-10-17T07:00:00.000Z",
      title: "Hoy llegan a Bruselas",
      body: "Check-in en Hotel cerca de Grand-Place después de las 15:00.",
    });
    expect(get("checkout:s1:2026-10-21")).toMatchObject({ at: "2026-10-20T19:00:00.000Z", body: "Checkout antes de las 11:00." });
  });

  it("en un tramo viajan los que están en las dos ciudades", () => {
    expect(get("leg-eve:l6:2026-11-03")?.memberIds).toEqual(["m-al", "m-ro"]);
  });
});

describe("tripReminders · reservas", () => {
  it("una ciudad sin alojamiento, a 14, 7 y 2 días, solo a los que pueden editar", () => {
    const eindhoven = all.filter((r) => r.key.startsWith("missing-stay:s3:"));
    expect(eindhoven.map((r) => r.key)).toEqual(["missing-stay:s3:14", "missing-stay:s3:7", "missing-stay:s3:2"]);
    expect(eindhoven[2]).toMatchObject({ group: "bookings", memberIds: ["m-al", "m-ro"], title: "Falta el alojamiento en Eindhoven" });
    expect(eindhoven[2].body).toBe("Llegan el 24 oct, en 2 días, y todavía no hay dónde quedarse.");
  });

  it("un tramo sin cargar", () => {
    expect(get("missing-leg:s7:7")).toMatchObject({ title: "Falta el tramo Alicante → Valencia", memberIds: ["m-al", "m-ro"] });
  });

  it("las ciudades de paso no piden alojamiento", () => {
    expect(all.some((r) => r.key.startsWith("missing-stay:s0:"))).toBe(false);
  });
});

describe("tripReminders · plata", () => {
  it("solo los domingos y solo a quien debe", () => {
    const debts = all.filter((r) => r.group === "money");
    for (const r of debts) {
      expect(new Date(r.at).getUTCDay()).toBe(0);
      expect(r.memberIds).toHaveLength(1);
      expect(r.body).toMatch(/^Le debés €/);
    }
  });
});

describe("dueReminders", () => {
  it("los que llegaron a su hora en las últimas 2 h y no se mandaron", () => {
    const now = new Date("2026-10-16T18:10:00.000Z");
    const due = dueReminders(all, now, new Set());
    expect(due.map((r) => r.key)).toContain("leg-eve:l0:2026-10-17");
    expect(dueReminders(all, now, new Set(["leg-eve:l0:2026-10-17"])).map((r) => r.key)).not.toContain("leg-eve:l0:2026-10-17");
    expect(dueReminders(all, new Date("2026-10-16T21:00:00.000Z"), new Set()).map((r) => r.key)).not.toContain("leg-eve:l0:2026-10-17");
  });
});

describe("upcomingReminders y reminderWhen", () => {
  it("los que vienen para una persona", () => {
    const now = new Date("2026-10-16T12:00:00.000Z");
    const mine = upcomingReminders(all, "m-ag", now);
    expect(mine.every((r) => r.memberIds.includes("m-ag"))).toBe(true);
    expect(mine.some((r) => r.key.startsWith("leg-eve:l0:"))).toBe(false);
  });

  it("cuándo llega, en la hora del celular", () => {
    const now = new Date("2026-10-16T12:00:00.000Z");
    expect(reminderWhen("2026-10-16T18:00:00.000Z", "Europe/Madrid", now, "Europe/Madrid")).toBe("hoy · 20:00");
    expect(reminderWhen("2026-10-17T07:00:00.000Z", "Europe/Brussels", now, "Europe/Brussels")).toBe("mañana · 09:00");
  });

  it("desde Uruguay, el día y la hora de acá, con la de allá al lado", () => {
    // 15 oct 19:27 en Montevideo = 16 oct 00:27 en Madrid: el recordatorio del 16 a las 20 h (Madrid) es mañana.
    const now = new Date("2026-10-15T22:27:00.000Z");
    expect(reminderWhen("2026-10-16T18:00:00.000Z", "Europe/Madrid", now, "America/Montevideo")).toBe("mañana · 15:00 (20:00 allá)");
  });
});
