"use client";

import { cleanAmount } from "@/lib/expense-form";

// Monto grande de "Nuevo gasto" y "Registrar transferencia". Abre el teclado numérico del
// teléfono (con coma) en vez de un teclado propio.
export function AmountField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="flex h-[72px] shrink-0 cursor-text items-center justify-center gap-1.5 px-5">
      <span className="text-[28px] font-bold text-ink-2">€</span>
      <input
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(cleanAmount(e.target.value))}
        style={{ width: `${Math.max(1, value.length) * 0.62 + 0.3}em` }}
        className="min-w-0 bg-transparent text-[56px] leading-none font-extrabold tracking-[-0.03em] caret-navy outline-none placeholder:text-ink-5"
      />
    </label>
  );
}
