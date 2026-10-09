"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
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
          <div className="flex items-start gap-3 px-5 pt-2 pb-1">
            <h2 className="min-w-0 flex-1 text-2xl leading-[1.15] font-extrabold tracking-[-0.02em]">Nuevo viaje</h2>
            <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6">
            <label className="block">
              <span className="mb-2 block text-[13px] font-bold text-ink-2">Nombre del viaje</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Verano en Japón" className={field} />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <label className="block min-w-0">
                <span className="mb-2 block text-[13px] font-bold text-ink-2">Desde</span>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
              </label>
              <label className="block min-w-0">
                <span className="mb-2 block text-[13px] font-bold text-ink-2">Hasta</span>
                <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={field} />
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
