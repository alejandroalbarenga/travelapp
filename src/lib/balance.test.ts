import { describe, expect, it } from "vitest";
import { netBalances, simplifyDebts, type BalanceExpense } from "./balance";
import { splitEqually } from "./money";

const MEMBERS = ["al", "ro", "jo", "ag"];
const GROUP = ["al", "ro", "jo"];

function expense(paidBy: string, amountCents: number, between = GROUP): BalanceExpense {
  const parts = splitEqually(amountCents, between);
  return { paidBy, amountCents, splits: Object.entries(parts).map(([memberId, c]) => ({ memberId, amountCents: c })) };
}

// Gastos del ejemplo de docs/diseño.md.
const EXPENSES = [
  expense("al", 48000), // Vuelo Madrid → Bruselas
  expense("ro", 26400), // Hotel cerca de Grand-Place
  expense("jo", 18000), // Tren Bruselas → Ámsterdam
  expense("al", 42000), // Departamento en De Pijp
  expense("jo", 15600), // Cena en De Pijp
  expense("ro", 8800), // Museo Van Gogh
];

describe("netBalances", () => {
  it("lo que pagó menos lo que le toca", () => {
    expect(netBalances(MEMBERS, EXPENSES)).toEqual({ al: 37066, ro: -17733, jo: -19333, ag: 0 });
  });

  it("los netos suman cero", () => {
    const net = netBalances(MEMBERS, EXPENSES);
    expect(Object.values(net).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("un settlement descuenta la deuda", () => {
    const net = netBalances(MEMBERS, EXPENSES, [{ from: "jo", to: "al", amountCents: 19333 }]);
    expect(net).toEqual({ al: 17733, ro: -17733, jo: 0, ag: 0 });
  });
});

describe("simplifyDebts", () => {
  it("da los números del ejemplo: Josué €193,33 y Rodrigo €177,33 a Ale", () => {
    expect(simplifyDebts(netBalances(MEMBERS, EXPENSES))).toEqual([
      { from: "jo", to: "al", amountCents: 19333 },
      { from: "ro", to: "al", amountCents: 17733 },
    ]);
  });

  it("si está todo saldado no quedan transferencias", () => {
    const net = netBalances(MEMBERS, EXPENSES, [
      { from: "jo", to: "al", amountCents: 19333 },
      { from: "ro", to: "al", amountCents: 17733 },
    ]);
    expect(simplifyDebts(net)).toEqual([]);
  });

  it("con varios acreedores el que más debe le paga al que más le deben", () => {
    expect(simplifyDebts({ a: 500, b: 300, c: -600, d: -200 })).toEqual([
      { from: "c", to: "a", amountCents: 500 },
      { from: "c", to: "b", amountCents: 100 },
      { from: "d", to: "b", amountCents: 200 },
    ]);
  });
});
