import { describe, expect, it } from "vitest";
import { formatAmountInput, formatEuros, parseAmount, splitEqually } from "./money";

describe("splitEqually", () => {
  it("divide exacto cuando se puede", () => {
    expect(splitEqually(48000, ["al", "ro", "jo"])).toEqual({ al: 16000, ro: 16000, jo: 16000 });
  });

  it("reparte los centavos que sobran de a uno, desde el primero", () => {
    expect(splitEqually(1000, ["al", "ro", "jo"])).toEqual({ al: 334, ro: 333, jo: 333 });
    expect(splitEqually(1001, ["al", "ro", "jo"])).toEqual({ al: 334, ro: 334, jo: 333 });
  });

  it("la suma siempre da el total", () => {
    for (const total of [1, 99, 6450, 158800, 123457]) {
      const parts = splitEqually(total, ["a", "b", "c", "d"]);
      expect(Object.values(parts).reduce((x, y) => x + y, 0)).toBe(total);
    }
  });

  it("sin personas no reparte nada", () => {
    expect(splitEqually(1000, [])).toEqual({});
  });
});

describe("formatEuros", () => {
  it("sin decimales si es entero, con punto de miles", () => {
    expect(formatEuros(158800)).toBe("€1.588");
    expect(formatEuros(48000)).toBe("€480");
    expect(formatEuros(123456700)).toBe("€1.234.567");
  });

  it("con coma y dos decimales si tiene centavos", () => {
    expect(formatEuros(19333)).toBe("€193,33");
    expect(formatEuros(1613)).toBe("€16,13");
    expect(formatEuros(5)).toBe("€0,05");
  });

  it("negativos", () => {
    expect(formatEuros(-4500)).toBe("-€45");
  });
});

describe("formatAmountInput", () => {
  it("siempre con dos decimales", () => {
    expect(formatAmountInput(48000)).toBe("480,00");
    expect(formatAmountInput(123450)).toBe("1.234,50");
  });
});

describe("parseAmount", () => {
  it("lee coma decimal y punto de miles", () => {
    expect(parseAmount("64,50")).toBe(6450);
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("480")).toBe(48000);
  });

  it("acepta punto decimal si no hay coma", () => {
    expect(parseAmount("12.5")).toBe(1250);
  });

  it("devuelve 0 si no es un monto", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-5")).toBe(0);
  });
});
