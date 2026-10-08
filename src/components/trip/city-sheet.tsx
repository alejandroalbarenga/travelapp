"use client";

import { Bed, Bus, Calendar, Car, ChevronRight, Ellipsis, FileText, House, Lock, Minus, Plane, Plus, Pencil, StickyNote, TrainFront, Trash2, X, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import type { SaveStopInput } from "@/app/viaje/[id]/actions";
import { largePhoto } from "@/lib/photo-url";
import { formatDay, formatRange, formatWeekday, stopDates } from "@/lib/dates";
import { durationMinutes, formatDuration, localTime } from "@/lib/legs";
import { formatAmountInput, formatEuros, parseAmount } from "@/lib/money";
import { computeSplits, splitStateFrom, type SplitState } from "@/lib/splits";
import type { Attachment, BookingSource, Leg, LegMode, Stay, Trip } from "@/lib/trip-types";
import { BOOKING_LABEL } from "@/lib/trip-view";
import { BottomSheet } from "../bottom-sheet";
import { SplitEditor } from "../split-editor";
import { AddAttachmentButtons, AttachmentRow, type AttachmentInput } from "./attachment-controls";

// Pantalla 06 · Ciudad (docs/diseño.md): foto grande, noches, quién está, notas, alojamiento y transporte.

const VIAS: { via: BookingSource; label: string }[] = [
  { via: "booking", label: "Booking" },
  { via: "airbnb", label: "Airbnb" },
  { via: "hostelworld", label: "Hostelworld" },
  { via: "other", label: "Otro" },
];
const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};

function namesList(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function CitySheet({
  trip,
  stopId,
  myMemberId,
  onClose,
  onNights,
  onOpenLeg,
  onSave,
  onDelete,
  readOnly = false,
  onChangePlace,
  onAddReceipt,
  onRemoveReceipt,
  onViewReceipt,
  onUnlock,
  nightsEditable = true,
}: {
  trip: Trip;
  stopId: string;
  myMemberId: string | null;
  onClose: () => void;
  onNights: (delta: number) => void;
  onOpenLeg: (fromStopId: string) => void;
  onSave: (input: SaveStopInput, stay: Stay | null) => Promise<string | null>;
  onDelete: (stopId: string) => Promise<string | null>;
  /** Solo ver (decisión 034): todo deshabilitado, sin guardar ni borrar. */
  readOnly?: boolean;
  /** Abre el buscador para cambiar la ciudad (renombrar). */
  onChangePlace?: () => void;
  /** Comprobante de la reserva del alojamiento ya guardado (PDF o imagen). */
  onAddReceipt: (stayId: string, input: AttachmentInput) => Promise<string | null>;
  onRemoveReceipt: (stayId: string, attachment: Attachment) => Promise<string | null>;
  onViewReceipt: (stayId: string, attachmentId: string) => void;
  /** Desbloquear la ciudad (decisión 042); solo si está bloqueada y podés editar. */
  onUnlock?: () => Promise<string | null>;
  /** Sin el más y el menos cuando no se pueden cambiar (solo ver, bloqueada o ya pasó). */
  nightsEditable?: boolean;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const i = stops.findIndex((s) => s.id === stopId);
  const stop = stops[i];
  const prev = stops[i - 1] ?? null;
  const next = stops[i + 1] ?? null;
  const dates = stopDates(trip.start_date, stops.map((s) => s.nights));
  const { arrival, departure } = dates[i];
  const order = trip.members.map((m) => m.id);
  const stay = trip.stays.find((s) => s.stop_id === stopId) ?? null;
  // El comprobante se cuelga de un alojamiento que ya está en la base.
  const savedStayId = stay && !stay.id.startsWith("nuevo-") ? stay.id : null;

  const [people, setPeople] = useState<string[]>(stop.member_ids);
  const [notes, setNotes] = useState(stop.notes ?? "");
  const [stayName, setStayName] = useState(stay?.name ?? "");
  const [via, setVia] = useState<BookingSource | null>(stay?.booked_via ?? null);
  const [price, setPrice] = useState(stay?.total_price_cents ? formatAmountInput(stay.total_price_cents) : "");
  const [paidBy, setPaidBy] = useState(stay?.paid_by_member_id ?? myMemberId ?? order[0]);
  const [split, setSplit] = useState<SplitState | null>(null); // null = todavía no se tocó: sigue a "quién está"
  const [confirmDelete, setConfirmDelete] = useState(false);
  // De paso (0 noches) y sin alojamiento: la tarjeta va plegada; se abre si hace falta.
  const [stayOpen, setStayOpen] = useState(stop.nights > 0 || !!stay);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const priceCents = parseAmount(price);
  // La división guardada vale mientras no cambie quién está; si cambia, pasa a partes iguales entre los que quedan.
  const peopleChanged = people.join() !== stop.member_ids.join();
  const savedSplit =
    !peopleChanged && stay?.split.length && stay.total_price_cents ? splitStateFrom(stay.total_price_cents, stay.split, order) : null;
  const splitValue: SplitState = split ?? savedSplit ?? { memberIds: order.filter((id) => people.includes(id)), mode: "equal", custom: {} };

  const dirty =
    peopleChanged ||
    notes !== (stop.notes ?? "") ||
    stayName !== (stay?.name ?? "") ||
    via !== (stay?.booked_via ?? null) ||
    priceCents !== (stay?.total_price_cents ?? 0) ||
    (priceCents > 0 && paidBy !== (stay?.paid_by_member_id ?? paidBy)) ||
    split !== null;

  const joined = prev ? people.filter((id) => !prev.member_ids.includes(id)) : [];
  const left = prev ? prev.member_ids.filter((id) => !people.includes(id)) : [];
  const name = (id: string) => trip.members.find((m) => m.id === id)?.display_name ?? "";
  const peopleNote = !prev
    ? ""
    : joined.length || left.length
      ? [
          joined.length ? `${joined.length > 1 ? "Se suman" : "Se suma"} ${namesList(joined.map(name))}` : "",
          left.length ? `${left.length > 1 ? "Se fueron" : "Se fue"} ${namesList(left.map(name))}` : "",
        ]
          .filter(Boolean)
          .join(" · ") + ` respecto a ${prev.city}`
      : `Los mismos que en ${prev.city}`;

  const stayStatus =
    via && stay?.total_price_cents
      ? `${formatEuros(stay.total_price_cents)} · pagó ${name(stay.paid_by_member_id ?? "")}`
      : stayName || via
        ? via
          ? `Reservado en ${BOOKING_LABEL[via]}`
          : "Sin confirmar"
        : "Sin reservar";

  function togglePerson(id: string) {
    const on = people.includes(id);
    if (on && people.length === 1) return;
    setPeople(order.filter((m) => (m === id ? !on : people.includes(m))));
  }

  function save(close: () => void) {
    if (!dirty) {
      close();
      return;
    }
    const hasExpense = !!via && priceCents > 0;
    const { splits, remainingCents } = computeSplits(priceCents, splitValue);
    if (hasExpense && remainingCents !== 0) {
      setError("La división del alojamiento no suma el total.");
      return;
    }
    const nightsText = `${stop.nights} ${stop.nights === 1 ? "noche" : "noches"}`;
    const input: SaveStopInput = {
      stopId,
      memberIds: people,
      notes,
      stayName,
      bookedVia: via,
      stayPriceCents: via ? priceCents || null : null,
      stayPaidByMemberId: hasExpense ? paidBy : null,
      stayDescription: `${stayName.trim() || "Alojamiento"} · ${nightsText}`,
      staySplits: hasExpense ? splits : [],
    };
    const newStay: Stay | null =
      stayName.trim() || via
        ? {
            id: stay?.id ?? `nuevo-${stopId}`,
            stop_id: stopId,
            name: stayName.trim() || null,
            booked_via: via,
            total_price_cents: input.stayPriceCents,
            paid_by_member_id: input.stayPaidByMemberId,
            split: input.staySplits,
            attachments: stay?.attachments ?? [],
          }
        : null;
    setError("");
    startTransition(async () => {
      const message = await onSave(input, newStay);
      if (message) setError(message);
      else close();
    });
  }

  function remove(close: () => void) {
    startTransition(async () => {
      const message = await onDelete(stopId);
      if (message) setError(message);
      else close();
    });
  }

  const photo = stop.photo_url ? largePhoto(stop.photo_url) : null;
  const legIn = prev ? trip.legs.find((l) => l.from_stop_id === prev.id) ?? null : null;
  const legOut = trip.legs.find((l) => l.from_stop_id === stopId) ?? null;

  return (
    <BottomSheet onClose={onClose} label={stop.city} top="calc(var(--safe-top) + 12px)" overlayHandle>
      {(close) => (
        <>
          <div className="relative flex-1 overflow-y-auto [scrollbar-width:none]">
            {/* Foto grande */}
            <div className="relative h-[300px] bg-cover bg-center" style={{ backgroundColor: "#4E6F86", backgroundImage: photo ? `url("${photo}")` : undefined }}>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_16_18/0.3)_0%,rgb(15_16_18/0.3)_55%,#fff_100%)]" />
              <div className="relative flex flex-col items-center px-6 pt-12 text-center text-white">
                <div className="flex items-center gap-2 text-[15px] font-bold [text-shadow:0_1px_6px_rgb(0_0_0/0.35)]">
                  {stop.country_code && (
                    <span
                      className="size-6 shrink-0 rounded-full bg-white/30 bg-cover bg-center shadow-[0_0_0_2px_rgb(255_255_255/0.6)]"
                      style={{ backgroundImage: `url("https://flagcdn.com/w80/${stop.country_code}.png")` }}
                    />
                  )}
                  {stop.country}
                </div>
                <div className="mt-1.5 w-full truncate text-[44px] leading-[1.1] font-extrabold tracking-[-0.03em] [text-shadow:0_2px_16px_rgb(0_0_0/0.35)]">{stop.city}</div>
                {stop.tagline && <div className="font-hand mt-1 text-[28px] leading-[1.05] text-balance [text-shadow:0_1px_10px_rgb(0_0_0/0.45)]">{stop.tagline}</div>}
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-ink shadow-[0_6px_18px_rgb(0_0_0/0.18)] backdrop-blur-xl">
                <X size={20} />
              </button>
              {!readOnly && onChangePlace && (
                <button
                  type="button"
                  onClick={onChangePlace}
                  aria-label="Cambiar ciudad"
                  className="absolute top-4 right-[68px] flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-ink shadow-[0_6px_18px_rgb(0_0_0/0.18)] backdrop-blur-xl"
                >
                  <Pencil size={18} />
                </button>
              )}
              {!readOnly && (
              <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Borrar ciudad" className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/90 text-danger shadow-[0_6px_18px_rgb(0_0_0/0.18)] backdrop-blur-xl">
                <Trash2 size={18} />
              </button>
              )}
            </div>

            <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
            {/* Fechas y noches */}
            <div className="glass relative mx-4 -mt-[62px] flex h-[68px] items-center rounded-full p-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-3.5 text-base font-bold text-navy">
                <Calendar size={20} className="shrink-0" />
                <span className="truncate text-ink">{stop.nights === 0 ? `${formatDay(arrival)} · de paso` : formatRange(arrival, departure)}</span>
              </div>
              {!nightsEditable ? (
                <span className="flex h-14 shrink-0 items-center rounded-full bg-white/[.92] px-5 text-base font-extrabold shadow-[0_2px_8px_rgb(0_41_61/0.08),inset_0_1px_0_#fff]">
                  {stop.nights === 0 ? "De paso" : `${stop.nights} ${stop.nights === 1 ? "noche" : "noches"}`}
                </span>
              ) : (
              <div className="flex h-14 shrink-0 items-center rounded-full bg-white/[.92] shadow-[0_2px_8px_rgb(0_41_61/0.08),inset_0_1px_0_#fff]">
                <button type="button" aria-label="Menos noches" onClick={() => onNights(-1)} className="flex h-14 w-11 items-center justify-center" style={{ opacity: stop.nights === 0 ? 0.35 : 1 }}>
                  <Minus size={20} />
                </button>
                <span className="min-w-[76px] text-center text-base font-extrabold">
                  {stop.nights} {stop.nights === 1 ? "noche" : "noches"}
                </span>
                <button type="button" aria-label="Más noches" onClick={() => onNights(1)} className="flex h-14 w-11 items-center justify-center">
                  <Plus size={20} />
                </button>
              </div>
              )}
            </div>

            </fieldset>

            {stop.locked && (
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-field border border-navy/[.08] bg-navy-tint px-3.5 py-3">
                <Lock size={18} className="shrink-0 text-navy" />
                <div className="min-w-0 flex-1 text-[13px] leading-[1.4]">
                  <div className="font-bold text-navy">Bloqueada</div>
                  <div className="text-ink-2">Ya está todo listo: no se cambia nada, salvo cargar gastos.</div>
                </div>
                {onUnlock && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const message = await onUnlock();
                        if (message) setError(message);
                      })
                    }
                    className="h-10 shrink-0 rounded-full border border-line bg-white px-3.5 text-[13px] font-bold text-navy disabled:opacity-50"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            )}

            <div className="px-4 pb-8">
              <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
              {/* Quién está */}
              <div className="mx-1 mt-[26px] mb-2.5 flex items-baseline justify-between gap-2">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em]">Quién está</h3>
                <span className="text-[13px] font-bold text-ink-2">
                  {people.length} {people.length === 1 ? "persona" : "personas"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trip.members.map((m) => {
                  const on = people.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => togglePerson(m.id)}
                      aria-pressed={on}
                      className={`flex h-11 items-center gap-2 rounded-full border pr-3.5 pl-[5px] text-sm font-bold ${on ? "border-navy/20 bg-navy-tint text-navy" : "border-line bg-white text-ink-2"}`}
                    >
                      <span className="flex size-[34px] items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: m.color, opacity: on ? 1 : 0.55 }}>
                        {m.initials}
                      </span>
                      {m.display_name}
                    </button>
                  );
                })}
              </div>
              {peopleNote && <p className="mx-1 mt-2.5 text-[13px] text-ink-2">{peopleNote}</p>}

              {/* Notas */}
              <h3 className="mx-1 mt-7 mb-3 text-2xl font-extrabold tracking-[-0.02em]">Notas</h3>
              <div className="rounded-card-xl bg-[linear-gradient(180deg,#FFA445_0%,#F5891F_100%)] p-[3px] shadow-[0_10px_26px_rgb(245_137_31/0.25)]">
                <label className="flex gap-3 rounded-[27px] bg-[#FFF8F0] py-4 pr-4 pl-[18px]">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={notes ? 4 : 1}
                    placeholder="Agregá tus notas"
                    aria-label="Notas"
                    className="min-w-0 flex-1 resize-none bg-transparent text-[17px] leading-[1.45] outline-none focus:min-h-[120px]"
                  />
                  <StickyNote size={20} className="shrink-0 text-orange" />
                </label>
              </div>

              {/* Alojamiento */}
              <div className="mx-1 mt-[30px] mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em]">Alojamiento</h3>
                {(stayOpen || stop.nights > 0) && <span className="text-[13px] font-bold text-ink-2">{stayStatus}</span>}
              </div>
              {!stayOpen && stop.nights === 0 ? (
                <button
                  type="button"
                  onClick={() => setStayOpen(true)}
                  className="flex h-14 w-full items-center gap-3 rounded-card border-[1.5px] border-dashed border-dash px-4 text-left text-sm"
                >
                  <Bed size={18} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 text-ink-2">De paso, sin noche acá</span>
                  {!readOnly && <span className="font-bold text-navy">Agregar</span>}
                </button>
              ) : (
              <>
              <div className="rounded-card-xl bg-[linear-gradient(180deg,#053650_0%,#00293D_100%)] p-[18px] text-white shadow-[0_12px_30px_rgb(0_41_61/0.25),inset_0_1px_0_rgb(255_255_255/0.12)]">
                <div className="flex items-center gap-3">
                  <input
                    value={stayName}
                    onChange={(e) => setStayName(e.target.value)}
                    placeholder="Agregá tu alojamiento"
                    aria-label="Alojamiento"
                    className="h-11 min-w-0 flex-1 bg-transparent text-[19px] font-bold text-white outline-none placeholder:text-white/50"
                  />
                  <Bed size={20} className="text-white/70" />
                </div>
                <div className="mt-3 mb-2 text-xs font-bold text-white/70">Reservado en</div>
                <div className="flex flex-wrap gap-2">
                  {/* "Directo" ya no se ofrece (decisión 045), pero se sigue viendo si estaba elegido. */}
                  {[...VIAS, ...(via === "direct" ? [{ via: "direct" as const, label: BOOKING_LABEL.direct }] : [])].map((v) => (
                    <button
                      key={v.via}
                      type="button"
                      onClick={() => setVia(via === v.via ? null : v.via)}
                      aria-pressed={via === v.via}
                      className={`h-11 rounded-full border px-4 text-[13px] font-bold ${via === v.via ? "border-white bg-white text-navy" : "border-white/20 bg-white/[.08] text-white"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {stay && stay.attachments.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-[18px] bg-white/[.08]">
                    {stay.attachments.map((a, k) => (
                      <AttachmentRow
                        key={a.id}
                        attachment={a}
                        title="Comprobante"
                        first={k === 0}
                        dark
                        onOpen={() => onViewReceipt(stay.id, a.id)}
                        onRemove={readOnly ? undefined : () => onRemoveReceipt(stay.id, a)}
                      />
                    ))}
                  </div>
                )}
                {!readOnly &&
                  (savedStayId ? (
                    stay!.attachments.length === 0 && (
                      <>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white/70">
                          <FileText size={14} /> Subir comprobante
                        </div>
                        <AddAttachmentButtons dark withLink={false} onAdd={(input) => onAddReceipt(savedStayId, input)} />
                      </>
                    )
                  ) : (
                    (stayName.trim() || via) && <p className="mt-3 text-[13px] text-white/70">Guardá para poder subir el comprobante.</p>
                  ))}
                {via && (
                  <>
                    <div className="my-3.5 h-px bg-white/[.14]" />
                    <div className="text-xs font-bold text-white/70">Precio total</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold">€</span>
                      <input
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                        onBlur={() => setPrice(priceCents ? formatAmountInput(priceCents) : "")}
                        placeholder="0,00"
                        aria-label="Precio total"
                        className="h-10 min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-white outline-none placeholder:text-white/50"
                      />
                    </div>
                    {priceCents > 0 && (
                      <>
                        <div className="mt-3 mb-2 text-xs font-bold text-white/70">Pagó</div>
                        <div className="flex flex-wrap gap-1.5">
                          {trip.members.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaidBy(m.id)}
                              aria-pressed={paidBy === m.id}
                              className={`flex h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-bold ${paidBy === m.id ? "bg-white text-navy" : "bg-white/10 text-white"}`}
                            >
                              <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>
                                {m.initials}
                              </span>
                              {m.display_name}
                            </button>
                          ))}
                        </div>
                        {stop.nights > 0 && splitValue.mode === "equal" && (
                          <div className="mt-2.5 text-xs text-white/80">
                            {formatEuros(Math.round(priceCents / splitValue.memberIds.length))} c/u · {formatEuros(Math.round(priceCents / stop.nights))} por noche
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              {via && priceCents > 0 && (
                <div className="mt-4 px-1">
                  <SplitEditor members={trip.members} totalCents={priceCents} value={splitValue} onChange={setSplit} />
                </div>
              )}
              </>
              )}

              </fieldset>

              {/* Transporte */}
              <h3 className="mx-1 mt-[30px] mb-3 text-2xl font-extrabold tracking-[-0.02em]">Transporte</h3>
              <div className="bg-card-gradient overflow-hidden rounded-card border border-navy/[.07] shadow-card">
                <LegLine
                  kind={prev ? `Llegás · ${formatWeekday(arrival)}` : "Llegás"}
                  title={prev ? `Desde ${prev.city}` : "Desde casa"}
                  leg={legIn}
                  fromTz={prev?.timezone ?? stop.timezone}
                  toTz={stop.timezone}
                  people={stop.member_ids.length}
                  onClick={prev ? () => onOpenLeg(prev.id) : undefined}
                  fallback={prev ? undefined : formatWeekday(arrival)}
                />
                <div className="border-t border-divider" />
                <LegLine
                  kind={`Te vas · ${formatWeekday(departure)}`}
                  title={next ? `Hacia ${next.city}` : "Vuelta a casa"}
                  leg={legOut}
                  fromTz={stop.timezone}
                  toTz={next?.timezone ?? stop.timezone}
                  people={(next ?? stop).member_ids.length}
                  onClick={() => onOpenLeg(stopId)}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            {error && <p className="mb-2 text-[13px] font-bold text-danger">{error}</p>}
            {readOnly ? (
              <button type="button" onClick={close} className="bg-navy-gradient h-14 w-full rounded-button text-base font-bold text-white">
                Cerrar
              </button>
            ) : confirmDelete ? (
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-14 rounded-button bg-surface text-[15px] font-bold">
                  Cancelar
                </button>
                <button type="button" onClick={() => remove(close)} disabled={pending} className="h-14 rounded-button bg-delete text-[15px] font-bold text-white disabled:opacity-50">
                  Borrar {stop.city}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => save(close)}
                disabled={pending}
                className="bg-navy-gradient h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-70"
              >
                {pending ? "Guardando…" : dirty ? "Guardar cambios" : "Listo"}
              </button>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function LegLine({
  kind,
  title,
  leg,
  fromTz,
  toTz,
  people,
  onClick,
  fallback,
}: {
  kind: string;
  title: string;
  leg: Leg | null;
  fromTz: string;
  toTz: string;
  people: number;
  onClick?: () => void;
  fallback?: string;
}) {
  const Icon = leg ? MODE_ICON[leg.mode] : onClick ? Plus : House;
  const parts: string[] = [];
  if (leg?.departs_at) parts.push(localTime(leg.departs_at, fromTz) + (leg.arrives_at ? ` → ${localTime(leg.arrives_at, toTz)}` : ""));
  if (leg?.departs_at && leg.arrives_at) parts.push(formatDuration(durationMinutes(leg.departs_at, leg.arrives_at)));
  if (leg?.total_price_cents) parts.push(`${formatEuros(Math.round(leg.total_price_cents / Math.max(1, people)))} c/u`);
  const sub = fallback ?? (leg ? parts.join(" · ") || "Faltan horarios y precio" : "Tocá para cargar el tramo");

  const content = (
    <>
      <span className={`flex size-[42px] shrink-0 items-center justify-center rounded-full ${leg ? MODE_CLASS[leg.mode] : "bg-surface text-ink-2"}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-xs font-bold text-ink-2">{kind}</div>
        <div className="mt-px text-[15px] font-bold">{title}</div>
        <div className="mt-px text-[13px] text-ink-2">{sub}</div>
      </div>
      {onClick && <ChevronRight size={16} className="text-ink-3" />}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-3">
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 px-3.5 py-3">{content}</div>
  );
}
