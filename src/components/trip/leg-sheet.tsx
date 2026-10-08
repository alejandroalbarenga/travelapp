"use client";

import { Bus, Car, Clock, Ellipsis, FileText, Image as ImageIcon, Link2, Plane, TrainFront, X, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { addDays, formatWeekday, stopDates } from "@/lib/dates";
import { durationMinutes, formatDuration, localTime, timeZoneDiffHours, zonedToInstant } from "@/lib/legs";
import { formatAmountInput, formatEuros, parseAmount } from "@/lib/money";
import { computeSplits, splitStateFrom, type SplitState } from "@/lib/splits";
import type { Leg, LegMode, Trip } from "@/lib/trip-types";
import { BottomSheet } from "../bottom-sheet";
import { SplitEditor } from "../split-editor";

// Pantalla 02 · Detalle del tramo (docs/diseño.md). Bottom sheet sobre el Viaje.

const MODES: { mode: LegMode; label: string; name: string; Icon: LucideIcon; on: string }[] = [
  { mode: "car", label: "Auto", name: "Auto", Icon: Car, on: "border-car bg-car-bg text-car" },
  { mode: "train", label: "Tren", name: "Tren", Icon: TrainFront, on: "border-train bg-train-bg text-train" },
  { mode: "plane", label: "Avión", name: "Vuelo", Icon: Plane, on: "border-plane bg-plane-bg text-plane" },
  { mode: "bus", label: "Bus", name: "Bus", Icon: Bus, on: "border-bus bg-bus-bg text-bus" },
  { mode: "other", label: "Otro", name: "Traslado", Icon: Ellipsis, on: "border-other bg-other-bg text-other" },
];
const MODE_ICON_COLOR: Record<LegMode, string> = { car: "text-car", train: "text-train", plane: "text-plane", bus: "text-bus", other: "text-other" };

export type LegDraft = Omit<Leg, "id" | "attachments"> & { id?: string };

export function LegSheet({
  trip,
  fromStopId,
  myMemberId,
  onClose,
  onSave,
  readOnly = false,
}: {
  trip: Trip;
  fromStopId: string;
  myMemberId: string | null;
  onClose: () => void;
  /** Guarda el tramo. Devuelve un mensaje si falló. */
  onSave: (draft: LegDraft, description: string) => Promise<string | null>;
  /** Solo ver (decisión 034): todo deshabilitado y sin guardar. */
  readOnly?: boolean;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const i = stops.findIndex((s) => s.id === fromStopId);
  const from = stops[i];
  const to = stops[i + 1] ?? null;
  const date = stopDates(trip.start_date, stops.map((s) => s.nights))[i].departure;
  const fromTz = from.timezone;
  const toTz = to?.timezone ?? fromTz;
  const leg = trip.legs.find((l) => l.from_stop_id === fromStopId);
  const order = trip.members.map((m) => m.id);
  const travellers = to ? to.member_ids : from.member_ids;

  const [mode, setMode] = useState<LegMode | null>(leg?.mode ?? null);
  const [dep, setDep] = useState(leg?.departs_at ? localTime(leg.departs_at, fromTz) : "");
  const [arr, setArr] = useState(leg?.arrives_at ? localTime(leg.arrives_at, toTz) : "");
  const [price, setPrice] = useState(leg?.total_price_cents ? formatAmountInput(leg.total_price_cents) : "");
  const [paidBy, setPaidBy] = useState(leg?.paid_by_member_id ?? myMemberId ?? order[0]);
  const [split, setSplit] = useState<SplitState>(() =>
    leg && leg.split.length && leg.total_price_cents
      ? splitStateFrom(leg.total_price_cents, leg.split, order)
      : { memberIds: order.filter((id) => travellers.includes(id)), mode: "equal", custom: {} },
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const totalCents = parseAmount(price);
  const departsAt = dep ? zonedToInstant(date, dep, fromTz) : null;
  let arrivesAt = arr ? zonedToInstant(date, arr, toTz) : null;
  if (departsAt && arrivesAt && arrivesAt <= departsAt) arrivesAt = zonedToInstant(addDays(date, 1), arr, toTz); // llega al día siguiente
  const duration = departsAt && arrivesAt ? durationMinutes(departsAt, arrivesAt) : null;
  const tzDiff = to ? timeZoneDiffHours(fromTz, toTz, departsAt ?? `${date}T12:00:00Z`) : 0;
  const perPerson = totalCents > 0 && split.mode === "equal" ? ` · ${formatEuros(Math.round(totalCents / split.memberIds.length))} por persona` : "";

  const tickets = [...(leg?.attachments ?? [])].sort((a, b) => Number(b.member_id === myMemberId) - Number(a.member_id === myMemberId));
  const withTicket = new Set(tickets.map((t) => t.member_id).filter(Boolean)).size;

  function save(close: () => void) {
    if (!mode) {
      setError("Elegí el medio de transporte.");
      return;
    }
    const { splits, remainingCents } = computeSplits(totalCents, split);
    if (totalCents > 0 && remainingCents !== 0) {
      setError("La división no suma el total.");
      return;
    }
    const name = MODES.find((m) => m.mode === mode)!.name;
    const description = `${name} ${from.city} → ${to?.city ?? "casa"}`;
    setError("");
    startTransition(async () => {
      const message = await onSave(
        {
          id: leg?.id,
          from_stop_id: from.id,
          to_stop_id: to?.id ?? null,
          mode,
          departs_at: departsAt,
          arrives_at: arrivesAt,
          total_price_cents: totalCents || null,
          paid_by_member_id: totalCents ? paidBy : null,
          split: totalCents ? splits : [],
        },
        description,
      );
      if (message) setError(message);
      else close();
    });
  }

  const label = "mb-2.5 mt-[22px] text-[13px] font-bold text-ink-2";
  const box = "min-w-0 rounded-field border border-line px-3 py-[9px]";

  return (
    <BottomSheet onClose={onClose} label={`Tramo de ${from.city} a ${to?.city ?? "casa"}`}>
      {(close) => (
      <>
        <div className="flex items-start gap-3 px-5 pt-2 pb-1">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-ink-2">
              {to ? `Tramo ${i + 1} de ${stops.length - 1}` : "Vuelta a casa"}
              {i === 0 && from.nights === 0 ? " · escala" : ""}
            </div>
            <div className="mt-1 text-2xl leading-[1.15] font-extrabold tracking-[-0.02em]">
              De {from.city} a {to?.city ?? "casa"}
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6 [scrollbar-width:none]">
          <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
          <div className={label}>Medio de transporte</div>
          <div className="grid grid-cols-5 gap-2">
            {MODES.map(({ mode: m, label: l, Icon, on }) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-field border-[1.5px] text-xs font-bold ${mode === m ? on : "border-line bg-white text-ink"}`}
              >
                <Icon size={20} className={MODE_ICON_COLOR[m]} />
                {l}
              </button>
            ))}
          </div>

          <div className={label}>Fecha y hora</div>
          <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
            <div className={box}>
              <div className="text-[11px] font-bold text-ink-2">Fecha</div>
              <div className="mt-0.5 text-[15px] font-bold whitespace-nowrap">{formatWeekday(date)}</div>
            </div>
            <label className={box}>
              <div className="text-[11px] font-bold text-ink-2">Salida</div>
              <input type="time" value={dep} onChange={(e) => setDep(e.target.value)} className="mt-0.5 w-full min-w-0 bg-transparent text-[15px] font-bold outline-none" />
            </label>
            <label className={box}>
              <div className="text-[11px] font-bold text-ink-2">Llegada</div>
              <input type="time" value={arr} onChange={(e) => setArr(e.target.value)} className="mt-0.5 w-full min-w-0 bg-transparent text-[15px] font-bold outline-none" />
            </label>
          </div>
          <div className="mt-2 text-[13px] text-ink-2">
            {duration != null ? `Duración ${formatDuration(duration)}` : "Cargá salida y llegada para ver la duración"}
          </div>
          {tzDiff !== 0 && to && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-field border border-tz-border bg-tz-bg px-3.5 py-3 text-[13px] leading-[1.4] text-tz-text">
              <Clock size={16} className="mt-px shrink-0 text-orange" />
              <span>
                {to.city} está {Math.abs(tzDiff)} h {tzDiff > 0 ? "adelante" : "atrás"} de {from.city}. Los horarios van en hora local de cada ciudad
                {arrivesAt ? `: llegás ${arr} en ${to.city}, que son las ${localTime(arrivesAt, fromTz)} en ${from.city}.` : "."}
              </span>
            </div>
          )}

          <div className={label}>Precio</div>
          <label className="flex items-center gap-3 rounded-field border border-line py-2.5 pr-2.5 pl-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-ink-2">Total del grupo{perPerson}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold">€</span>
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                  onBlur={() => setPrice(totalCents ? formatAmountInput(totalCents) : "")}
                  placeholder="0,00"
                  className="min-w-0 flex-1 bg-transparent text-xl font-extrabold outline-none"
                />
              </div>
            </div>
          </label>

          {totalCents > 0 && (
            <>
              <div className={label}>Pagó</div>
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
              <div className="mt-[22px]">
                <SplitEditor members={trip.members} totalCents={totalCents} value={split} onChange={setSplit} />
              </div>
            </>
          )}

          <div className="mt-[22px] mb-2.5 flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-ink-2">{tickets.length ? "Pasajes" : "Pasaje"}</span>
            {tickets.length > 0 && (
              <span className="text-xs font-bold text-ink-2">
                {withTicket} de {travellers.length} viajeros
              </span>
            )}
          </div>
          {tickets.length ? (
            <div className="overflow-hidden rounded-[18px] border border-line">
              {tickets.map((t, k) => {
                const owner = trip.members.find((m) => m.id === t.member_id);
                return (
                  <div key={t.id} className={`flex items-center gap-3 py-2.5 pr-2 pl-2.5 ${k ? "border-t border-divider" : ""}`}>
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/[.08] text-[10px] font-extrabold tracking-[0.04em] text-navy">
                      {t.kind === "link" ? "LINK" : t.kind === "image" ? "IMG" : "PDF"}
                      {owner && (
                        <span className="absolute -right-[5px] -bottom-[5px] flex size-[22px] items-center justify-center rounded-full border-2 border-white text-[9px] font-extrabold text-white" style={{ background: owner.color }}>
                          {owner.initials}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{t.member_id === myMemberId ? "Tu pasaje" : owner ? `Pasaje de ${owner.display_name}` : "Pasaje del grupo"}</div>
                      <div className="mt-0.5 truncate text-xs text-ink-2">{t.file_name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-ink-2">Todavía no hay un pasaje adjunto.</div>
          )}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { Icon: FileText, l: "PDF" },
              { Icon: ImageIcon, l: "Captura" },
              { Icon: Link2, l: "Link" },
            ].map(({ Icon, l }) => (
              <button key={l} type="button" disabled title="Próximamente" className="flex h-11 items-center justify-center gap-1.5 rounded-field border-[1.5px] border-dashed border-dash text-[13px] font-bold opacity-50">
                <Icon size={16} /> {l}
              </button>
            ))}
          </div>
          </fieldset>
        </div>

        <div className="border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
          {error && <p className="mb-2 text-[13px] font-bold text-danger">{error}</p>}
          {readOnly ? (
            <button type="button" onClick={close} className="h-14 w-full rounded-button border border-line bg-white text-base font-bold text-navy">
              Cerrar
            </button>
          ) : (
          <button type="button" onClick={() => save(close)} disabled={pending} className="bg-navy-gradient h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar tramo"}
          </button>
          )}
        </div>
      </>
      )}
    </BottomSheet>
  );
}
