import { describe, expect, it } from "vitest";
import { computeSplits, equalCustom, splitStateFrom } from "./splits";

const ORDER = ["al", "ro", "jo", "ag"];

describe("computeSplits", () => {
  it("partes iguales con centavos repartidos", () => {
    const r = computeSplits(1000, { memberIds: ["al", "ro", "jo"], mode: "equal", custom: {} });
    expect(r.splits.map((s) => s.amount_cents)).toEqual([334, 333, 333]);
    expect(r.remainingCents).toBe(0);
  });

  it("montos distintos: calcula lo que falta o lo que sobra", () => {
    const state = { memberIds: ["al", "ro"], mode: "custom" as const, custom: { al: "100", ro: "50,50" } };
    expect(computeSplits(20000, state).remainingCents).toBe(4950);
    expect(computeSplits(15050, state).remainingCents).toBe(0);
    expect(computeSplits(10000, state).remainingCents).toBe(-5050);
  });
});

describe("equalCustom", () => {
  it("arranca montos distintos con partes iguales", () => {
    expect(equalCustom(6450, ["al", "ro", "jo", "ag"])).toEqual({ al: "16,13", ro: "16,13", jo: "16,12", ag: "16,12" });
  });
});

describe("splitStateFrom", () => {
  it("reconoce partes iguales", () => {
    const s = splitStateFrom(48000, [{ member_id: "jo", amount_cents: 16000 }, { member_id: "al", amount_cents: 16000 }, { member_id: "ro", amount_cents: 16000 }], ORDER);
    expect(s).toEqual({ memberIds: ["al", "ro", "jo"], mode: "equal", custom: {} });
  });

  it("reconoce montos distintos", () => {
    const s = splitStateFrom(25000, [{ member_id: "al", amount_cents: 10000 }, { member_id: "ro", amount_cents: 15000 }], ORDER);
    expect(s.mode).toBe("custom");
    expect(s.custom).toEqual({ al: "100,00", ro: "150,00" });
  });
});
