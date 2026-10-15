"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { namesList } from "@/lib/members";
import { formatAmountInput, parseAmount } from "@/lib/money";
import type { PersonalExpense } from "@/lib/personal";
import { readDocumentLines } from "@/lib/read-document";
import { parseReceipt } from "@/lib/receipt";
import type { ExpenseCategory } from "@/lib/trip-types";
import { AmountField } from "../amount-field";
import { BackButton, BottomSheet } from "../bottom-sheet";
import { DateField } from "../date-field";

// Gasto personal (decisión 076): monto (o la foto del ticket), concepto, categoría y día. Solo lo
// ves vos y no entra en el balance del grupo.

/** La categoría del ticket, en las personales que hay por defecto. */
const FROM_RECEIPT: Partial<Record<ExpenseCategory, string>> = { food: "Comida", activities: "Salidas" };

export type PersonalExpenseDraft = Omit<PersonalExpense, "id" | "created_at"> & { id: string | null };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PersonalExpenseSheet({
  expense,
  categories,
  initialCategory,
  onClose,
  onSave,
  onDelete,
}: {
  expense: PersonalExpense | null;
  categories: string[];
  initialCategory?: string;
  onClose: () => void;
  onSave: (draft: PersonalExpenseDraft) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState(expense ? formatAmountInput(expense.amount_cents).replace(/\./g, "").replace(/,00$/, "") : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState(expense?.category ?? initialCategory ?? categories[0]);
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? today());
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const receiptInput = useRef<HTMLInputElement>(null);
  const cents = parseAmount(amount);

  async function scan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setNote("");
    const info = await readDocumentLines(file).then(parseReceipt).catch(() => null);
    setScanning(false);
    const found: string[] = [];
    if (info?.amountCents && !cents) {
      setAmount(formatAmountInput(info.amountCents).replace(/\./g, "").replace(/,00$/, ""));
      found.push("el monto");
    }
    if (info?.merchant && !description.trim()) {
      setDescription(info.merchant);
      found.push("dónde");
    }
    const fromReceipt = info?.category ? FROM_RECEIPT[info.category] : undefined;
    if (fromReceipt && !expense && categories.includes(fromReceipt)) {
      setCategory(fromReceipt);
      found.push("la categoría");
    }
    setNote(found.length ? `Sacamos del ticket ${namesList(found)}. Revisá que esté bien.` : "No pudimos leer el ticket: completalo a mano.");
  }

  function save(close: () => void) {
    if (cents <= 0) {
      setError("Ingresá un monto.");
      return;
    }
    setError("");
    startTransition(async () => {
      const message = await onSave({ id: expense?.id ?? null, category, description, amount_cents: cents, spent_on: spentOn || today() });
      if (message) setError(message);
      else close();
    });
  }

  function remove(close: () => void) {
    if (!expense) return;
    startTransition(async () => {
      const message = await onDelete(expense.id);
      if (message) setError(message);
      else close();
    });
  }

  return (
    <BottomSheet onClose={onClose} label={expense ? "Editar gasto personal" : "Gasto personal"}>
      {(close) => (
        <>
          <div className="flex h-[52px] shrink-0 items-center justify-between px-3">
            <BackButton onClick={close} className="" />
            <span className="text-base font-bold">{expense ? "Editar gasto personal" : "Gasto personal"}</span>
            <span className="size-11 shrink-0" />
          </div>

          <AmountField value={amount} onChange={setAmount} label="Monto" />
          <div className="px-5">
            <input ref={receiptInput} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={scan} />
            <button
              type="button"
              disabled={scanning}
              onClick={() => receiptInput.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-dash text-sm font-bold disabled:opacity-60"
            >
              <Camera size={17} /> {scanning ? "Leyendo el ticket…" : "Escanear el ticket"}
            </button>
            {note && <p className="mt-1.5 text-[13px] text-ink-2">{note}</p>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]" style={{ paddingBottom: 24 }}>
            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Concepto</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Campera en Zara"
                className="h-[50px] w-full rounded-field border border-line bg-white px-4 text-[16px] outline-none focus:border-navy"
              />
            </label>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Categoría</div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`h-9 rounded-full border px-3.5 text-[13px] font-bold ${category === c ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Día</div>
            <DateField value={spentOn} onChange={setSpentOn} />

            <p className="mt-4 text-[13px] text-ink-2">Solo lo ves vos. No entra en las cuentas del grupo.</p>

            {expense && (
              <div className="mt-5">
                {confirmDelete ? (
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="h-12 rounded-button bg-surface text-sm font-bold">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => remove(close)} disabled={pending} className="h-12 rounded-button bg-delete text-sm font-bold text-white">
                      Borrar el gasto
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 items-center gap-2 text-[13px] font-bold text-danger">
                    <Trash2 size={16} /> Borrar este gasto
                  </button>
                )}
              </div>
            )}
            {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
          </div>

          {/* Guardar abajo, como en el resto de las pantallas. */}
          <div className="shrink-0 border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            <button type="button" onClick={() => save(close)} disabled={pending} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar gasto"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
