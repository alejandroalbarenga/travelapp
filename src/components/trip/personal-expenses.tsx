"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SavePersonalExpenseInput } from "@/app/viaje/[id]/actions";
import { formatDay } from "@/lib/dates";
import { formatAmountInput, parseAmount } from "@/lib/money";
import { buildPersonalView, type PersonalData, type PersonalExpense } from "@/lib/personal";
import { PersonalExpenseSheet, type PersonalExpenseDraft } from "./personal-expense-sheet";

// Pestaña "Míos" de Gastos (decisión 076): tus gastos personales del viaje, con un presupuesto por
// categoría que se va descontando. Solo los ves vos. Sin las acciones (en /demo) quedan en memoria.

export type PersonalActions = {
  saveExpense: (input: SavePersonalExpenseInput) => Promise<{ error: string } | { id: string }>;
  deleteExpense: (id: string) => Promise<{ error: string } | null>;
  saveCategory: (tripId: string, name: string, budgetCents: number | null, position: number) => Promise<{ error: string } | null>;
  deleteCategory: (tripId: string, name: string) => Promise<{ error: string } | null>;
};

export function PersonalExpenses({ tripId, initial, actions }: { tripId: string; initial: PersonalData | null; actions?: PersonalActions }) {
  const router = useRouter();
  const [data, setData] = useState<PersonalData>(initial ?? { categories: [], expenses: [] });
  const [open, setOpen] = useState<{ expense: PersonalExpense | null; category?: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [budget, setBudget] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const view = buildPersonalView(data);

  if (actions && !initial) {
    return (
      <p className="mt-8 px-2 text-center text-[15px] leading-[1.45] text-ink-2">
        Falta preparar la base para los gastos personales: hay que pegar la migración <strong>0010_personal.sql</strong> en el SQL Editor de Supabase.
      </p>
    );
  }

  function run(action: () => Promise<string | null>) {
    setError("");
    startTransition(async () => {
      const message = await action();
      if (message) setError(message);
      else if (actions) router.refresh();
    });
  }

  async function saveExpense(draft: PersonalExpenseDraft): Promise<string | null> {
    let id = draft.id ?? `personal-${Date.now()}`;
    if (actions) {
      const result = await actions.saveExpense({ id: draft.id, tripId, category: draft.category, description: draft.description, amountCents: draft.amount_cents, spentOn: draft.spent_on });
      if ("error" in result) return result.error;
      id = result.id;
      router.refresh();
    }
    const created_at = data.expenses.find((e) => e.id === draft.id)?.created_at ?? new Date().toISOString();
    setData((d) => ({ ...d, expenses: [...d.expenses.filter((e) => e.id !== draft.id), { ...draft, id, created_at }] }));
    return null;
  }

  async function deleteExpense(id: string): Promise<string | null> {
    if (actions) {
      const result = await actions.deleteExpense(id);
      if (result) return result.error;
      router.refresh();
    }
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
    return null;
  }

  function saveCategory(name: string, budgetCents: number | null) {
    const clean = name.trim();
    if (!clean) return;
    const position = view.categories.findIndex((c) => c.name === clean);
    run(async () => {
      if (actions) {
        const result = await actions.saveCategory(tripId, clean, budgetCents, position < 0 ? view.categories.length : position);
        if (result) return result.error;
      }
      setData((d) => ({
        ...d,
        categories: [
          ...d.categories.filter((c) => c.name !== clean),
          { id: d.categories.find((c) => c.name === clean)?.id ?? `cat-${Date.now()}`, name: clean, budget_cents: budgetCents, position: position < 0 ? view.categories.length : position },
        ],
      }));
      setEditing(null);
      setNewCategory(null);
      return null;
    });
  }

  function deleteCategory(name: string) {
    run(async () => {
      if (actions) {
        const result = await actions.deleteCategory(tripId, name);
        if (result) return result.error;
      }
      setData((d) => ({ ...d, categories: d.categories.filter((c) => c.name !== name) }));
      setEditing(null);
      return null;
    });
  }

  return (
    <>
      <section className="mt-1.5 rounded-card bg-surface p-4">
        <div className="text-[13px] font-bold text-ink-2">Gastaste</div>
        <div className="mt-0.5 text-[36px] leading-[1.1] font-extrabold tracking-[-0.02em]">{view.total}</div>
        <div className="mt-1 text-[13px] text-ink-2">{view.budget || "Poné un presupuesto en cada categoría y se va descontando."}</div>
        <button
          type="button"
          onClick={() => setOpen({ expense: null })}
          className="bg-pink mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-button text-[15px] font-bold text-white"
        >
          <Plus size={18} /> Gasto personal
        </button>
      </section>

      <section className="mt-7">
        <div className="px-1">
          <h2 className="text-xl font-extrabold tracking-[-0.01em]">Por categoría</h2>
          <div className="mt-0.5 text-[13px] text-ink-2">Tocá una para ponerle presupuesto.</div>
        </div>
        <div className="mt-2 border-y border-divider">
          {view.categories.map((c, i) => (
            <div key={c.name} className={i ? "border-t border-divider" : ""}>
              <button
                type="button"
                onClick={() => {
                  setEditing(editing === c.name ? null : c.name);
                  setBudget(c.budgetCents !== null ? formatAmountInput(c.budgetCents).replace(/\./g, "").replace(/,00$/, "") : "");
                }}
                className="block w-full px-1 py-3 text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">{c.name}</span>
                  <span className="text-[15px] font-bold">{c.spent}</span>
                </div>
                {c.ratio !== null && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                    <div className={`h-full rounded-full ${c.over ? "bg-delete" : "bg-pink"}`} style={{ width: `${Math.max(c.ratio * 100, c.spentCents ? 4 : 0)}%` }} />
                  </div>
                )}
                <div className={`mt-1.5 text-[13px] ${c.over ? "font-bold text-danger" : "text-ink-2"}`}>{c.status}</div>
              </button>
              {editing === c.name && (
                <div className="px-1 pb-3.5">
                  <div className="flex items-center gap-2">
                    <label className="flex h-12 min-w-0 flex-1 items-center gap-1.5 rounded-field border border-line px-3.5 focus-within:border-navy">
                      <span className="text-[16px] font-bold text-ink-2">€</span>
                      <input
                        inputMode="decimal"
                        autoFocus
                        value={budget}
                        onChange={(e) => setBudget(e.target.value.replace(/[^\d,.]/g, ""))}
                        placeholder="Presupuesto"
                        aria-label={`Presupuesto para ${c.name}`}
                        className="min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveCategory(c.name, budget.trim() ? parseAmount(budget) : null)}
                      className="bg-pink h-12 shrink-0 rounded-button px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                  <div className="mt-1 flex gap-4">
                    {c.budgetCents !== null && (
                      <button type="button" onClick={() => saveCategory(c.name, null)} className="h-10 text-[13px] font-bold text-ink-2">
                        Sacar el presupuesto
                      </button>
                    )}
                    <button type="button" onClick={() => setOpen({ expense: null, category: c.name })} className="h-10 text-[13px] font-bold text-navy">
                      Cargar un gasto acá
                    </button>
                    {c.custom && c.saved && (
                      <button type="button" onClick={() => deleteCategory(c.name)} className="flex h-10 items-center gap-1 text-[13px] font-bold text-danger">
                        <Trash2 size={14} /> Borrar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {newCategory === null ? (
          <button type="button" onClick={() => setNewCategory("")} className="mt-2 flex h-11 items-center gap-2 px-1 text-sm font-bold text-navy">
            <Plus size={16} /> Nueva categoría
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value.slice(0, 40))}
              placeholder="Ej. Vinilos"
              aria-label="Nombre de la categoría"
              className="h-12 min-w-0 flex-1 rounded-field border border-line px-3.5 text-[16px] outline-none focus:border-navy"
            />
            <button
              type="button"
              disabled={pending || !newCategory.trim()}
              onClick={() => saveCategory(newCategory, null)}
              className="bg-pink h-12 shrink-0 rounded-button px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Crear
            </button>
          </div>
        )}
        {error && <p className="mx-1 mt-2 text-[13px] font-bold text-danger">{error}</p>}
      </section>

      {view.expenses.length > 0 && (
        <section className="mt-7">
          <h2 className="px-1 text-xl font-extrabold tracking-[-0.01em]">Tus gastos</h2>
          <div className="mt-2 border-y border-divider">
            {view.expenses.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setOpen({ expense: e })}
                className={`flex w-full items-center gap-3 px-1 py-3 text-left ${i ? "border-t border-divider" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{e.description || e.category}</div>
                  <div className="mt-0.5 text-[13px] text-ink-2">
                    {formatDay(e.spent_on)} · {e.category}
                  </div>
                </div>
                <div className="shrink-0 text-[15px] font-bold">{e.amount}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {open && (
        <PersonalExpenseSheet
          expense={open.expense}
          categories={view.categories.map((c) => c.name)}
          initialCategory={open.category}
          onClose={() => setOpen(null)}
          onSave={saveExpense}
          onDelete={deleteExpense}
        />
      )}
    </>
  );
}
