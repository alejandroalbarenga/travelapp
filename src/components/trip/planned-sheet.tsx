"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { SavePlannedInput } from "@/app/viaje/[id]/actions";
import { formatAmountInput, formatEuros, parseAmount } from "@/lib/money";
import type { ExpenseCategory, PlannedItem, Trip } from "@/lib/trip-types";
import { AmountField } from "../amount-field";
import { BackButton, BottomSheet } from "../bottom-sheet";

// Un estimado suelto (decisión 084): algo que todavía no se pagó (entradas, una excursión, comidas),
// con cuánto se cree que va a salir, en qué ciudad y entre quiénes. No es un gasto: no entra en el
// balance, pero suma en lo que sale el viaje.

const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: "activities", label: "Actividades" },
  { id: "food", label: "Comida" },
  { id: "transport", label: "Transporte" },
  { id: "lodging", label: "Alojamiento" },
  { id: "other", label: "Otros" },
];

export function PlannedSheet({
  trip,
  item,
  readOnly = false,
  onClose,
  onSave,
  onDelete,
}: {
  trip: Trip;
  /** El estimado a editar; sin esto es uno nuevo. */
  item: PlannedItem | null;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (input: SavePlannedInput) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  // Se carga por persona y se multiplica por los que van (decisión 089).
  const [amount, setAmount] = useState(
    item ? formatAmountInput(Math.round(item.amount_cents / Math.max(1, item.member_ids.length))).replace(/\./g, "").replace(/,00$/, "") : "",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [stopId, setStopId] = useState<string | null>(item?.stop_id ?? null);
  const [category, setCategory] = useState<ExpenseCategory>(item?.category ?? "activities");
  const [memberIds, setMemberIds] = useState<string[]>(item?.member_ids ?? trip.members.map((m) => m.id));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const cents = parseAmount(amount);

  function toggle(id: string) {
    setMemberIds((ids) => (ids.includes(id) ? (ids.length > 1 ? ids.filter((x) => x !== id) : ids) : trip.members.map((m) => m.id).filter((x) => x === id || ids.includes(x))));
  }

  function save(close: () => void) {
    if (cents <= 0) return setError("Ingresá cuánto va a salir por persona.");
    if (!description.trim()) return setError("Poné qué es.");
    setError("");
    startTransition(async () => {
      const message = await onSave({ id: item?.id ?? null, tripId: trip.id, stopId, description, category, amountCents: cents * memberIds.length, memberIds });
      if (message) setError(message);
      else close();
    });
  }

  function remove(close: () => void) {
    if (!item) return;
    startTransition(async () => {
      const message = await onDelete(item.id);
      if (message) setError(message);
      else close();
    });
  }

  return (
    <BottomSheet onClose={onClose} label={item ? "Editar estimado" : "Nuevo estimado"}>
      {(close) => (
        <>
          <div className="flex h-[52px] shrink-0 items-center justify-between px-3">
            <BackButton onClick={close} className="" />
            <span className="text-base font-bold">{item ? "Estimado" : "Nuevo estimado"}</span>
            <span className="size-11 shrink-0" />
          </div>

          <AmountField value={amount} onChange={readOnly ? () => {} : setAmount} label="Cuánto va a salir por persona" />
          <p className="px-5 text-center text-[13px] text-ink-2">
            Por persona{cents > 0 ? ` · × ${memberIds.length} = ${formatEuros(cents * memberIds.length)}` : ""}. No es un gasto: no entra en el balance.
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]" style={{ paddingBottom: 24 }}>
            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Qué es</span>
              <input
                value={description}
                readOnly={readOnly}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Entradas a la Alhambra"
                className="h-[50px] w-full rounded-field border border-line bg-white px-4 text-[16px] outline-none focus:border-navy"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Ciudad</span>
              <select
                value={stopId ?? ""}
                disabled={readOnly}
                onChange={(e) => setStopId(e.target.value || null)}
                className="h-[50px] w-full rounded-field border border-line bg-white px-3 text-[16px] font-semibold outline-none"
              >
                <option value="">Sin ciudad</option>
                {stops.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.city}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Categoría</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                  className={`h-9 rounded-full border px-3.5 text-[13px] font-bold ${category === c.id ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">Se divide entre</div>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((m) => {
                const on = memberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggle(m.id)}
                    aria-pressed={on}
                    className={`flex h-11 items-center gap-2 rounded-full border pr-3.5 pl-[5px] text-sm font-bold ${on ? "border-ink bg-white" : "border-line bg-white text-ink-3"}`}
                  >
                    <span className="flex size-[34px] items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: m.color, opacity: on ? 1 : 0.45 }}>
                      {m.initials}
                    </span>
                    {m.display_name}
                  </button>
                );
              })}
            </div>

            {item && !readOnly && (
              <div className="mt-5">
                {confirmDelete ? (
                  <div className="grid grid-cols-[1fr_2fr] gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="h-12 rounded-button bg-surface text-sm font-bold">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => remove(close)} disabled={pending} className="h-12 rounded-button bg-delete text-sm font-bold text-white">
                      Borrar el estimado
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 items-center gap-2 text-[13px] font-bold text-danger">
                    <Trash2 size={16} /> Borrar este estimado
                  </button>
                )}
              </div>
            )}
            {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
          </div>

          {!readOnly && (
            <div className="shrink-0 border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
              <button type="button" onClick={() => save(close)} disabled={pending} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50">
                {pending ? "Guardando…" : "Guardar estimado"}
              </button>
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
