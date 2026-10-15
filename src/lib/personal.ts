import { formatEuros } from "./money";

// Gastos personales con presupuesto por categoría (decisión 076): de cada uno, dentro del viaje.
// No entran en el balance del grupo.

export type PersonalCategory = { id: string; name: string; budget_cents: number | null; position: number };
export type PersonalExpense = { id: string; category: string; description: string; amount_cents: number; spent_on: string; created_at: string };
export type PersonalData = { categories: PersonalCategory[]; expenses: PersonalExpense[] };

/** Las categorías con las que arranca cada uno; se guardan cuando les ponés un presupuesto. */
export const DEFAULT_PERSONAL_CATEGORIES = ["Ropa", "Comida", "Regalos", "Salidas", "Otros"];

export type PersonalCategoryView = {
  name: string;
  /** Guardada en la base (con presupuesto, o creada por vos). */
  saved: boolean;
  custom: boolean;
  spentCents: number;
  budgetCents: number | null;
  spent: string;
  /** "Te quedan €40 de €100", "Te pasaste €12 de €100", o "Sin presupuesto". */
  status: string;
  over: boolean;
  /** Cuánto del presupuesto se usó, de 0 a 1 (null sin presupuesto). */
  ratio: number | null;
};

export type PersonalView = {
  total: string;
  /** "de €500 de presupuesto", o "" si no pusiste ninguno. */
  budget: string;
  categories: PersonalCategoryView[];
  expenses: (PersonalExpense & { amount: string })[];
};

export function buildPersonalView(data: PersonalData): PersonalView {
  const spentBy = new Map<string, number>();
  for (const e of data.expenses) spentBy.set(e.category, (spentBy.get(e.category) ?? 0) + e.amount_cents);

  const saved = [...data.categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const names = [
    ...DEFAULT_PERSONAL_CATEGORIES,
    ...saved.map((c) => c.name).filter((n) => !DEFAULT_PERSONAL_CATEGORIES.includes(n)),
    // Gastos de una categoría que ya borraste: siguen sumando con su nombre.
    ...[...spentBy.keys()].filter((n) => !DEFAULT_PERSONAL_CATEGORIES.includes(n) && !saved.some((c) => c.name === n)),
  ];

  const categories = names.map((name): PersonalCategoryView => {
    const row = saved.find((c) => c.name === name);
    const spentCents = spentBy.get(name) ?? 0;
    const budgetCents = row?.budget_cents ?? null;
    const left = budgetCents !== null ? budgetCents - spentCents : null;
    return {
      name,
      saved: !!row,
      custom: !DEFAULT_PERSONAL_CATEGORIES.includes(name),
      spentCents,
      budgetCents,
      spent: formatEuros(spentCents),
      status:
        budgetCents === null
          ? "Sin presupuesto"
          : left! >= 0
            ? `Te quedan ${formatEuros(left!)} de ${formatEuros(budgetCents)}`
            : `Te pasaste ${formatEuros(-left!)} de ${formatEuros(budgetCents)}`,
      over: left !== null && left < 0,
      ratio: budgetCents ? Math.min(1, spentCents / budgetCents) : budgetCents === 0 ? (spentCents > 0 ? 1 : 0) : null,
    };
  });

  const total = data.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const budget = categories.reduce((sum, c) => sum + (c.budgetCents ?? 0), 0);
  return {
    total: formatEuros(total),
    budget: budget ? `de ${formatEuros(budget)} de presupuesto` : "",
    categories,
    expenses: [...data.expenses]
      .sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at))
      .map((e) => ({ ...e, amount: formatEuros(e.amount_cents) })),
  };
}
