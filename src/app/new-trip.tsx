"use client";

import { Calendar, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BackButton, BottomSheet } from "@/components/bottom-sheet";
import { formatWeekday } from "@/lib/dates";
import { validateNewTrip } from "@/lib/home";
import { createTrip } from "./actions";

// Pantalla 07 · Nuevo viaje: nombre y fechas. Al crearlo abre el viaje vacío para cargar la primera ciudad.
export function NewTripButton({ big = false }: { big?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          big
            ? "bg-pink flex h-14 w-full items-center justify-center gap-2 rounded-button text-base font-bold text-white shadow-button"
            : "flex h-10 items-center gap-1.5 rounded-full bg-navy px-4 text-[13px] font-bold text-white"
        }
      >
        <Plus size={big ? 20 : 16} /> Nuevo viaje
      </button>
      {open && <NewTripSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function NewTripSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function create() {
    const invalid = validateNewTrip(name, start, end);
    if (invalid) return setError(invalid);
    setError("");
    startTransition(async () => {
      const result = await createTrip(name, start, end);
      if ("error" in result) setError(result.error);
      else router.push(`/viaje/${result.id}`);
    });
  }

  const field = "h-[52px] w-full rounded-field border border-line bg-white px-4 text-[16px] font-semibold outline-none focus:border-navy";
  return (
    <BottomSheet onClose={onClose} label="Nuevo viaje">
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 pt-2 pb-1">
            <BackButton onClick={close} />
            <h2 className="min-w-0 flex-1 text-2xl leading-[1.15] font-extrabold tracking-[-0.02em]">Nuevo viaje</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6">
            <label className="block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Nombre del viaje</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Verano en Japón" className={field} />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <label className="block min-w-0">
                <span className="mb-2 block text-[13px] font-bold text-ink-2">Desde</span>
                <DateField value={start} onChange={setStart} />
              </label>
              <label className="block min-w-0">
                <span className="mb-2 block text-[13px] font-bold text-ink-2">Hasta</span>
                <DateField value={end} min={start || undefined} onChange={setEnd} />
              </label>
            </div>
            <p className="mt-3 text-[13px] leading-[1.4] text-ink-2">Después cargás las ciudades con sus noches, y las fechas de cada una se calculan solas.</p>
            {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
          </div>
          <div className="border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            <button type="button" onClick={create} disabled={pending} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50">
              {pending ? "Creando…" : "Crear viaje"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

/**
 * Fecha con el mismo aspecto que los otros campos: en el iPhone el campo de fecha nativo queda
 * desalineado y vacío no muestra nada. Se ve la fecha escrita ("sáb 17 oct") y, encima, el campo
 * nativo transparente, que abre el selector del teléfono al tocarlo.
 */
function DateField({ value, min, onChange }: { value: string; min?: string; onChange: (value: string) => void }) {
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
