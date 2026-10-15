import { describe, expect, it } from "vitest";
import { expenseMessage, type ExpenseForPush } from "./expense-message";

const dinner: ExpenseForPush = {
  tripId: "t",
  description: "Cena en Bruselas",
  amountCents: 6600,
  paidByMemberId: "ro",
  splits: [
    { member_id: "al", amount_cents: 2200 },
    { member_id: "ro", amount_cents: 2200 },
    { member_id: "jo", amount_cents: 2200 },
  ],
};

describe("expenseMessage", () => {
  it("a quien le toca una parte", () => {
    expect(expenseMessage("new", dinner, "Rodrigo", "al")).toEqual({ title: "Cena en Bruselas · €66", body: "Rodrigo lo cargó: te tocan €22." });
  });

  it("a quien pagó (si lo cargó otro)", () => {
    expect(expenseMessage("new", dinner, "Ale", "ro").body).toBe("Ale lo cargó: pagaste vos y te tocan €22.");
  });

  it("al cambiarlo dice cuánto te toca ahora", () => {
    expect(expenseMessage("edit", dinner, "Rodrigo", "jo").body).toBe("Rodrigo lo cambió: ahora te tocan €22.");
  });

  it("al borrarlo", () => {
    expect(expenseMessage("delete", dinner, "Rodrigo", "al").body).toBe("Rodrigo lo borró.");
  });
});
