"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { SaveExpenseInput } from "@/app/viaje/[id]/actions";
import { defaultStopId } from "@/lib/expense-form";
import { namesList } from "@/lib/members";
import { formatAmountInput, parseAmount } from "@/lib/money";
import { readDocumentLines } from "@/lib/read-document";
import { parseReceipt } from "@/lib/receipt";
import { computeSplits, splitStateFrom, type SplitState } from "@/lib/splits";
import type { Expense, ExpenseCategory, Trip } from "@/lib/trip-types";
import { AmountField } from "../amount-field";
import { BackButton, BottomSheet } from "../bottom-sheet";
import { SplitEditor } from "../split-editor";

// Pantalla 05 · Nuevo gasto (docs/diseño.md), también para editar un gasto suelto.
// Monto (con el teclado numérico del teléfono), concepto, ciudad (decisión 033), categoría, quién pagó y entre quiénes.

const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: "food", label: "Comida" },
  { id: "activities", label: "Actividades" },
  { id: "transport", label: "Transporte" },
  { id: "lodging", label: "Alojamiento" },
  { id: "other", label: "Otros" },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseSheet({
  trip,
  expense,
  myMemberId,
  onClose,
  onSave,
  onDelete,
}: {
  trip: Trip;
  /** El gasto a editar; sin esto es uno nuevo. */
  expense: Expense | null;
  myMemberId: string | null;
  onClose: () => void;
  onSave: (input: SaveExpenseInput) => Promise<string | null>;
  onDelete: (expenseId: string) => Promise<string | null>;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const order = trip.members.map((m) => m.id);
  const [amount, setAmount] = useState(expense ? formatAmountInput(expense.amount_cents).replace(/\./g, "").replace(/,00$/, "") : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [stopId, setStopId] = useState<string | null>(() => (expense ? expense.stop_id : defaultStopId(trip, today())));
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "food");
  const [paidBy, setPaidBy] = useState(expense?.paid_by_member_id ?? myMemberId ?? order[0]);
  const [split, setSplit] = useState<SplitState | null>(() =>
    expense ? splitStateFrom(expense.amount_cents, expense.splits, order) : null,
  );
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const receiptInput = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const cents = parseAmount(amount);
  // Mientras no se toque, la división sigue a los que están en la ciudad elegida.
  const cityPeople = stops.find((s) => s.id === stopId)?.member_ids ?? order;
  const splitValue: SplitState = split ?? { memberIds: order.filter((id) => cityPeople.includes(id)), mode: "equal", custom: {} };

  // Foto del ticket (decisión 074): completa el monto, el concepto y la categoría si están vacíos.
  async function scanReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setScanNote("");
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
    if (info?.category && !expense) {
      setCategory(info.category);
      found.push("la categoría");
    }
    setScanNote(found.length ? `Sacamos del ticket ${namesList(found)}. Revisá que esté bien.` : "No pudimos leer el ticket: completalo a mano.");
  }

  function save(close: () => void) {
    if (cents <= 0) {
      setError("Ingresá un monto.");
      return;
    }
    const { splits, remainingCents } = computeSplits(cents, splitValue);
    if (remainingCents !== 0) {
      setError("La división no suma el total.");
      return;
    }
    setError("");
    startTransition(async () => {
      const message = await onSave({
        id: expense?.id ?? null,
        tripId: trip.id,
        stopId,
        description,
        category,
        amountCents: cents,
        paidByMemberId: paidBy,
        splits,
      });
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
    <BottomSheet onClose={onClose} label={expense ? "Editar gasto" : "Nuevo gasto"}>
      {(close) => (
        <>
          <div className="flex h-[52px] shrink-0 items-center justify-between px-3">
            <BackButton onClick={close} className="" />
            <span className="text-base font-bold">{expense ? "Editar gasto" : "Nuevo gasto"}</span>
            <button type="button" onClick={() => save(close)} disabled={pending} className="flex h-11 items-center disabled:opacity-50">
              <span className="bg-pink flex h-9 items-center rounded-full px-4 text-sm font-bold text-white">{pending ? "…" : "Guardar"}</span>
            </button>
          </div>

          <AmountField value={amount} onChange={setAmount} label="Monto" />
          <div className="px-5">
            <input ref={receiptInput} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={scanReceipt} />
            <button
              type="button"
              disabled={scanning}
              onClick={() => receiptInput.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-dash text-sm font-bold disabled:opacity-60"
            >
              <Camera size={17} /> {scanning ? "Leyendo el ticket…" : "Escanear el ticket"}
            </button>
            {scanNote && <p className="mt-1.5 text-[13px] text-ink-2">{scanNote}</p>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
            <label className="mt-2 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Concepto</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Cena en Bruselas"
                className="h-[50px] w-full rounded-field border border-line bg-white px-4 text-[16px] outline-none focus:border-navy"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Ciudad</span>
              <select
                value={stopId ?? ""}
                onChange={(e) => setStopId(e.target.value || null)}
                className="h-[50px] w-full rounded-field border border-line bg-white px-3 text-[16px] font-semibold outline-none"
              >
                {stops.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.city}
                  </option>
                ))}
                <option value="">Sin ciudad</option>
              </select>
            </label>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Categoría</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                  className={`h-9 rounded-full border px-3.5 text-[13px] font-bold ${category === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Pagó</div>
            <div className="flex flex-wrap gap-1.5">
              {trip.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  aria-pressed={paidBy === m.id}
                  className={`flex h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-bold ${paidBy === m.id ? "bg-navy text-white" : "bg-surface text-ink"}`}
                >
                  <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>
                    {m.initials}
                  </span>
                  {m.display_name}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <SplitEditor members={trip.members} totalCents={cents} value={splitValue} onChange={setSplit} />
            </div>

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

        </>
      )}
    </BottomSheet>
  );
}
