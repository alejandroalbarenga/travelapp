"use client";

import { cleanAmount } from "@/lib/expense-form";

// Monto grande de "Nuevo gasto" y "Registrar transferencia". Abre el teclado numérico del
// teléfono (con coma) en vez de un teclado propio.
export function AmountField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  // El campo mide lo mismo que el número escrito (un texto invisible igual en la misma celda), así el
  // monto queda siempre centrado, también cuando lo completa el ticket (decisión 103).
  return (
    <label className="flex h-[72px] shrink-0 cursor-text items-center justify-center gap-1.5 px-5">
      <span className="text-[28px] font-bold text-ink-2">€</span>
      <span className="inline-grid text-[56px] leading-none font-extrabold tracking-[-0.03em]">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
          {value || "0"}
        </span>
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          size={1}
          placeholder="0"
          value={value}
          onChange={(e) => onChange(cleanAmount(e.target.value))}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent caret-navy outline-none placeholder:text-ink-5"
          style={{ font: "inherit", letterSpacing: "inherit" }}
        />
      </span>
    </label>
  );
}
