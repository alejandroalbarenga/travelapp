"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { parseAmount } from "@/lib/money";
import type { Member } from "@/lib/trip-types";
import { AmountField } from "../amount-field";
import { BottomSheet } from "../bottom-sheet";

// Registrar una transferencia: "le transferí €50 a Josué". Es un pago entre dos integrantes
// (un settlement), cuenta para el balance y queda en el historial.

export type TransferInput = { from: string; to: string; amountCents: number; note: string };

export function TransferSheet({
  members,
  myMemberId,
  onClose,
  onSave,
}: {
  members: Member[];
  myMemberId: string | null;
  onClose: () => void;
  onSave: (input: TransferInput) => Promise<string | null>;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(myMemberId ?? members[0]?.id);
  const [to, setTo] = useState(members.find((m) => m.id !== (myMemberId ?? members[0]?.id))?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function pickFrom(id: string) {
    setFrom(id);
    if (id === to) setTo(members.find((m) => m.id !== id)?.id ?? "");
  }

  function save(close: () => void) {
    const cents = parseAmount(amount);
    if (cents <= 0) return setError("Ingresá un monto.");
    if (!to || from === to) return setError("Elegí a quién le pagó.");
    setError("");
    startTransition(async () => {
      const message = await onSave({ from, to, amountCents: cents, note });
      if (message) setError(message);
      else close();
    });
  }

  return (
    <BottomSheet onClose={onClose} label="Registrar transferencia" top="calc(var(--safe-top) + 12px)">
      {(close) => (
        <>
          <div className="flex h-[52px] shrink-0 items-center justify-between px-3">
            <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 items-center justify-center">
              <X size={20} />
            </button>
            <span className="text-base font-bold">Transferencia</span>
            <button type="button" onClick={() => save(close)} disabled={pending} className="flex h-11 items-center disabled:opacity-50">
              <span className="bg-navy-gradient flex h-9 items-center rounded-full px-4 text-sm font-bold text-white">{pending ? "…" : "Guardar"}</span>
            </button>
          </div>

          <AmountField value={amount} onChange={setAmount} label="Monto de la transferencia" />

          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
            <MemberPicker title="Pagó" members={members} value={from} onChange={pickFrom} />
            <MemberPicker title="A quién" members={members.filter((m) => m.id !== from)} value={to} onChange={setTo} />

            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Nota (opcional)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej. Bizum, efectivo, por la cena"
                className="h-[50px] w-full rounded-field border border-line bg-white px-4 text-[15px] outline-none focus:border-navy"
              />
            </label>
            <p className="mt-3 text-[13px] leading-[1.4] text-ink-2">Cuenta para el balance como un pago y queda en los movimientos.</p>
            {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function MemberPicker({ title, members, value, onChange }: { title: string; members: Member[]; value: string; onChange: (id: string) => void }) {
  return (
    <>
      <div className="mt-4 mb-2 text-[13px] font-bold text-ink-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={value === m.id}
            className={`flex h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-bold ${value === m.id ? "bg-navy text-white" : "bg-surface text-ink"}`}
          >
            <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>
              {m.initials}
            </span>
            {m.display_name}
          </button>
        ))}
      </div>
    </>
  );
}
