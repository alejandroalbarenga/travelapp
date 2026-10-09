"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { addDays, formatRange, stopDates } from "@/lib/dates";
import { arrivalChange, buildCalendar } from "@/lib/calendar";
import type { Trip } from "@/lib/trip-types";
import { BottomSheet } from "../bottom-sheet";

// Pantalla 08 · Calendario (decisión 020). Modo ver: cada ciudad es una barra y tocarla abre la
// ciudad. Modo elegir llegada (desde la ciudad): tocás un día y al guardar cambian las noches de la
// ciudad anterior.

/** Ver (con una ciudad marcada, si se abrió desde ella) o elegir la llegada a una ciudad. */
export type CalendarMode = { kind: "view"; stopId?: string } | { kind: "pick"; stopId: string };

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const SHADES = ["bg-[#EBEBEB]", "bg-[#DDDDDD]"];

export function CalendarSheet({
  trip,
  mode,
  today,
  onClose,
  onOpenCity,
  onPickArrival,
}: {
  trip: Trip;
  mode: CalendarMode;
  today: string;
  onClose: () => void;
  onOpenCity: (stopId: string) => void;
  /** Cambia las noches de la ciudad anterior para llegar ese día. Devuelve un mensaje si no se pudo. */
  onPickArrival: (stopId: string, date: string) => Promise<string | null>;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const dates = stops.length ? stopDates(trip.start_date, stops.map((s) => s.nights)) : [];
  const pickIndex = mode.kind === "pick" ? stops.findIndex((s) => s.id === mode.stopId) : -1;
  const picking = pickIndex >= 0;
  // La ciudad que se está viendo o moviendo va en azul.
  const highlighted = mode.stopId ?? null;
  const highlightedArrival = highlighted ? (dates[stops.findIndex((s) => s.id === highlighted)]?.arrival ?? null) : null;
  const currentArrival = picking ? dates[pickIndex].arrival : null;
  const earliest = picking && pickIndex > 0 ? dates[pickIndex - 1].arrival : null;

  const [chosen, setChosen] = useState<string | null>(currentArrival);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // Para elegir una llegada más tarde, el calendario sigue un mes después del fin.
  const months = buildCalendar(trip, today, picking ? addDays(trip.end_date, 31) : undefined);
  const scroller = useRef<HTMLDivElement>(null);

  // Arranca en el mes de la llegada que se elige, o en el de hoy si el viaje está en curso.
  useEffect(() => {
    const target = currentArrival ?? highlightedArrival ?? (today >= trip.start_date && today <= trip.end_date ? today : null);
    if (!target) return;
    scroller.current?.querySelector(`[data-month="${target.slice(0, 7)}"]`)?.scrollIntoView({ block: "start" });
  }, [currentArrival, highlightedArrival, today, trip.start_date, trip.end_date]);

  function save(close: () => void) {
    if (!picking || !chosen) return;
    if (chosen === currentArrival) return close();
    const change = arrivalChange(trip, stops[pickIndex].id, chosen);
    if ("error" in change) return setError(change.error);
    setError("");
    startTransition(async () => {
      const message = await onPickArrival(stops[pickIndex].id, chosen);
      if (message) setError(message);
      else close();
    });
  }

  return (
    <BottomSheet onClose={onClose} label="Calendario">
      {(close) => (
        <>
          <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
            <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
              <X size={20} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-base font-bold">{picking ? `Llegada a ${stops[pickIndex].city}` : trip.name}</div>
              <div className="truncate text-xs text-ink-2">{picking ? "Elegí el día de llegada" : formatRange(trip.start_date, trip.end_date)}</div>
            </div>
            {picking ? (
              <button type="button" onClick={() => save(close)} disabled={pending} className="flex h-11 shrink-0 items-center disabled:opacity-70">
                <span className="bg-pink flex h-9 items-center rounded-full px-4 text-sm font-bold text-white">{pending ? "…" : "Guardar"}</span>
              </button>
            ) : (
              <span className="size-11 shrink-0" />
            )}
          </div>
          {error && <p className="px-5 pb-2 text-center text-[13px] font-bold text-danger">{error}</p>}

          <div className="grid shrink-0 grid-cols-7 border-b border-divider px-2 pb-1.5 text-center text-[11px] font-bold text-ink-3">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-width:none]" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
            {months.map((month) => (
              <section key={month.key} data-month={month.key} className="scroll-mt-1">
                <h3 className="px-2 pt-4 pb-2 text-lg font-extrabold first-letter:uppercase">{month.label}</h3>
                {month.weeks.map((week) => (
                  <div key={week.days[0].date} className="relative grid h-[88px] grid-cols-7 border-t border-divider">
                    {week.days.map((d) => {
                      if (!d.inMonth) return <span key={d.date} />;
                      const disabled = picking && (!earliest || d.date < earliest);
                      const selected = picking && d.date === chosen;
                      const label = (
                        <span
                          className={`flex size-7 items-center justify-center rounded-full text-[13px] font-bold ${
                            selected ? "bg-navy text-white" : d.today ? "bg-orange text-white" : d.inTrip ? "text-ink" : "text-ink-4"
                          }`}
                        >
                          {d.day}
                        </span>
                      );
                      return picking ? (
                        <button
                          key={d.date}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setChosen(d.date);
                            setError("");
                          }}
                          aria-pressed={selected}
                          aria-label={d.date}
                          className={`flex flex-col items-start p-1 ${selected ? "bg-navy-tint" : ""} ${disabled ? "opacity-40" : ""}`}
                        >
                          {label}
                        </button>
                      ) : (
                        <span key={d.date} className="p-1">
                          {label}
                        </span>
                      );
                    })}
                    {week.bars.map((bar) => {
                      const mine = bar.stopId === highlighted;
                      const style = { left: `calc(${(bar.left / 7) * 100}% + 1px)`, width: `calc(${(bar.width / 7) * 100}% - 2px)` };
                      const className = `absolute bottom-2.5 flex h-7 items-center overflow-hidden px-2 text-[11px] font-bold ${
                        mine ? "bg-navy text-white" : `${SHADES[bar.shade]} text-[#222222]`
                      } ${bar.startsHere ? "rounded-l-full" : ""} ${bar.endsHere ? "rounded-r-full" : ""}`;
                      return picking ? (
                        <span key={bar.stopId} className={`pointer-events-none ${className}`} style={style}>
                          <span className="truncate">{bar.width >= 0.9 ? bar.name : ""}</span>
                        </span>
                      ) : (
                        <button key={bar.stopId} type="button" onClick={() => onOpenCity(bar.stopId)} className={className} style={style} aria-label={`Abrir ${bar.name}`}>
                          <span className="truncate">{bar.width >= 0.9 ? bar.name : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
