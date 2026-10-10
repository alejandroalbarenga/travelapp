import { describe, expect, it } from "vitest";
import { buildPersonalView, type PersonalExpense } from "./personal";

const expense = (category: string, amount_cents: number, spent_on = "2026-10-20"): PersonalExpense => ({
  id: `${category}-${amount_cents}`,
  category,
  description: "",
  amount_cents,
  spent_on,
  created_at: `${spent_on}T10:00:00Z`,
});

describe("buildPersonalView", () => {
  it("arranca con las categorías por defecto y sin presupuesto", () => {
    const v = buildPersonalView({ categories: [], expenses: [] });
    expect(v.categories.map((c) => `${c.name}: ${c.status}`)).toEqual([
      "Ropa: Sin presupuesto",
      "Comida: Sin presupuesto",
      "Regalos: Sin presupuesto",
      "Salidas: Sin presupuesto",
      "Otros: Sin presupuesto",
    ]);
    expect(v).toMatchObject({ total: "€0", budget: "" });
  });

  it("va descontando del presupuesto y avisa cuando te pasás", () => {
    const v = buildPersonalView({
      categories: [
        { id: "c1", name: "Ropa", budget_cents: 20000, position: 0 },
        { id: "c2", name: "Comida", budget_cents: 5000, position: 1 },
        { id: "c3", name: "Vinilos", budget_cents: null, position: 2 },
      ],
      expenses: [expense("Ropa", 8000), expense("Ropa", 4000, "2026-10-22"), expense("Comida", 6200), expense("Vinilos", 1500)],
    });
    const ropa = v.categories.find((c) => c.name === "Ropa")!;
    expect(ropa).toMatchObject({ spent: "€120", status: "Te quedan €80 de €200", over: false, ratio: 0.6 });
    expect(v.categories.find((c) => c.name === "Comida")).toMatchObject({ status: "Te pasaste €12 de €50", over: true, ratio: 1 });
    expect(v.categories.find((c) => c.name === "Vinilos")).toMatchObject({ custom: true, saved: true, spent: "€15", status: "Sin presupuesto" });
    expect(v).toMatchObject({ total: "€197", budget: "de €250 de presupuesto" });
    expect(v.expenses[0]).toMatchObject({ category: "Ropa", amount: "€40" });
  });

  it("los gastos de una categoría borrada siguen sumando", () => {
    const v = buildPersonalView({ categories: [], expenses: [expense("Souvenirs", 900)] });
    expect(v.categories.at(-1)).toMatchObject({ name: "Souvenirs", saved: false, spent: "€9" });
  });
});
