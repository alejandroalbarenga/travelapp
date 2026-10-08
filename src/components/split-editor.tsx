"use client";

import { Check } from "lucide-react";
import { formatEuros } from "@/lib/money";
import { computeSplits, equalCustom, type SplitState } from "@/lib/splits";
import type { Member } from "@/lib/trip-types";

// "Se divide entre": quiénes participan y si es en partes iguales o con montos distintos.
// Se usa en el tramo, el alojamiento y el nuevo gasto (diseño: pantalla 05, decisión 032).
export function SplitEditor({
  members,
  totalCents,
  value,
  onChange,
}: {
  members: Member[];
  totalCents: number;
  value: SplitState;
  onChange: (next: SplitState) => void;
}) {
  const order = members.map((m) => m.id);
  const result = computeSplits(totalCents, value);
  const n = value.memberIds.length;

  function toggle(id: string) {
    const on = value.memberIds.includes(id);
    if (on && n === 1) return; // tiene que quedar al menos una persona
    const memberIds = order.filter((m) => (m === id ? !on : value.memberIds.includes(m)));
    onChange({ ...value, memberIds });
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-ink-2">Se divide entre</span>
        <span className="text-[13px] font-bold text-navy">
          {value.mode === "custom" ? "Montos por persona" : totalCents > 0 ? `${formatEuros(Math.round(totalCents / n))} c/u` : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => {
          const on = value.memberIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={on}
              className={`flex h-10 items-center gap-1.5 rounded-full border pr-3 pl-1 text-[13px] font-bold ${on ? "border-navy/20 bg-navy-tint text-navy" : "border-line bg-white text-ink-2"}`}
            >
              <span className="relative flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color, opacity: on ? 1 : 0.4 }}>
                {m.initials}
                {on && (
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-navy">
                    <Check size={9} strokeWidth={4} />
                  </span>
                )}
              </span>
              {m.display_name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
        {(["equal", "custom"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() =>
              onChange({
                ...value,
                mode,
                custom: mode === "custom" && Object.keys(value.custom).length === 0 ? equalCustom(totalCents, value.memberIds) : value.custom,
              })
            }
            className={`h-[38px] rounded-full text-[13px] font-bold ${value.mode === mode ? "bg-white text-navy shadow-[0_2px_8px_rgb(0_41_61/0.12)]" : "text-ink-2"}`}
          >
            {mode === "equal" ? "Partes iguales" : "Montos distintos"}
          </button>
        ))}
      </div>

      {value.mode === "custom" && (
        <>
          <div className="mt-2.5 overflow-hidden rounded-[18px] border border-line">
            {value.memberIds.map((id, i) => {
              const m = members.find((x) => x.id === id)!;
              return (
                <div key={id} className={`flex items-center gap-2.5 py-1.5 pr-2 pl-2.5 ${i ? "border-t border-divider" : ""}`}>
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>
                    {m.initials}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold">{m.display_name}</span>
                  <label className="flex h-10 items-center gap-1 rounded-xl border border-divider-2 bg-surface-2 px-3">
                    <span className="text-sm font-bold text-ink-2">€</span>
                    <input
                      inputMode="decimal"
                      value={value.custom[id] ?? ""}
                      onChange={(e) => onChange({ ...value, custom: { ...value.custom, [id]: e.target.value.replace(/[^\d,.]/g, "") } })}
                      placeholder="0,00"
                      aria-label={`Monto de ${m.display_name}`}
                      className="w-[70px] bg-transparent text-right text-[15px] font-extrabold outline-none"
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`text-[13px] font-bold ${result.remainingCents === 0 ? "text-success" : "text-danger"}`}>
              {result.remainingCents === 0
                ? "Cierra justo con el total"
                : result.remainingCents > 0
                  ? `Faltan ${formatEuros(result.remainingCents)} por repartir`
                  : `Te pasaste ${formatEuros(-result.remainingCents)}`}
            </span>
            <button type="button" onClick={() => onChange({ ...value, custom: equalCustom(totalCents, value.memberIds) })} className="h-9 px-1 text-[13px] font-bold text-navy">
              Repartir en partes iguales
            </button>
          </div>
        </>
      )}
    </div>
  );
}
