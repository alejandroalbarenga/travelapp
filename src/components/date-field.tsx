"use client";

import { Calendar } from "lucide-react";
import { formatWeekday } from "@/lib/dates";

/**
 * Fecha con el mismo aspecto que los otros campos: en el iPhone el campo de fecha nativo queda
 * desalineado y vacío no muestra nada. Se ve la fecha escrita ("sáb 17 oct") y, encima, el campo
 * nativo transparente, que abre el selector del teléfono al tocarlo.
 */
export function DateField({ value, min, onChange }: { value: string; min?: string; onChange: (value: string) => void }) {
  return (
    <span className="relative flex h-[52px] w-full items-center gap-2 rounded-field border border-line bg-white px-3.5 focus-within:border-navy">
      <Calendar size={17} className="shrink-0 text-ink-2" />
      <span className={`truncate text-[16px] font-semibold ${value ? "text-ink" : "text-ink-4"}`}>{value ? `${formatWeekday(value)}${value.slice(0, 4) === String(new Date().getFullYear()) ? "" : ` ${value.slice(0, 4)}`}` : "Elegir"}</span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        // En la compu, tocar cualquier parte abre el calendario (si no, se escribiría a ciegas).
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Algunos navegadores no lo permiten: queda el comportamiento de siempre.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
