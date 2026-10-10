"use client";

import { Bed, BedDouble, Bus, Calendar, Car, ChevronRight, DoorClosed, DoorOpen, Ellipsis, FileText, Hotel, House, Lock, Minus, Plane, Plus, Pencil, StickyNote, TrainFront, Trash2, Upload, X, type LucideIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { SaveStopInput } from "@/app/viaje/[id]/actions";
import { formatDay, formatRange, stopDates } from "@/lib/dates";
import { localTime } from "@/lib/legs";
import { formatAmountInput, formatEuros, parseAmount } from "@/lib/money";
import { computeSplits, splitStateFrom, type SplitState } from "@/lib/splits";
import type { Attachment, BookingSource, Leg, LegMode, Stay, Trip } from "@/lib/trip-types";
import { BOOKING_LABEL } from "@/lib/trip-view";
import { parseBooking } from "@/lib/booking-pdf";
import { namesList } from "@/lib/members";
import { readDocumentLines } from "@/lib/read-document";
import { BackButton, BottomSheet } from "../bottom-sheet";
import { SplitEditor } from "../split-editor";
import { AttachmentRow, type AttachmentInput } from "./attachment-controls";

// Pantalla 06 · Ciudad (decisión 051, referencia: el detalle de un viaje en Airbnb).
// Arriba la planificación (fechas y noches); después el alojamiento como tarjeta, con quién está;
// y una línea de tiempo por día: el transporte que te trae, el check-in, el checkout y el transporte
// con el que te vas. Abajo, las notas.
// Dos modos: vista (ciudad bloqueada o solo ver) es una lectura limpia, sin controles; edición
// (sin bloquear) permite cambiar noches, alojamiento (con las horas de check-in y checkout), quién
// está y notas. El check-in y el checkout se cargan en el alojamiento; la línea de tiempo los muestra.

const VIAS: { via: BookingSource; label: string }[] = [
  { via: "booking", label: "Booking" },
  { via: "airbnb", label: "Airbnb" },
  { via: "hostelworld", label: "Hostelworld" },
  { via: "other", label: "Otro" },
];
const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_NAME: Record<LegMode, string> = { plane: "Vuelo", train: "Tren", bus: "Bus", car: "Auto", other: "Traslado" };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
// Ícono del alojamiento según dónde se reservó: hotel, casa, hostel… (no la foto de la ciudad).
const STAY_ICON: Record<BookingSource, LucideIcon> = { booking: Hotel, airbnb: House, hostelworld: BedDouble, direct: Hotel, other: Bed };

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
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
  canPickArrival = false,
  onOpenCalendar,
}: {
  trip: Trip;
  stopId: string;
  myMemberId: string | null;
  onClose: () => void;
  onNights: (delta: number) => void;
  onOpenLeg: (fromStopId: string) => void;
  /** Con `receipt`: la reserva elegida antes de que el alojamiento existiera, para subirla al guardar. */
  onSave: (input: SaveStopInput, stay: Stay | null, receipt?: File) => Promise<string | null>;
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
  /** Si se puede elegir el día de llegada (cambia las noches de la anterior). */
  canPickArrival?: boolean;
  /** Abre el calendario con esta ciudad marcada; con pick, para elegir la llegada. */
  onOpenCalendar?: (pick: boolean) => void;
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
  const [checkIn, setCheckIn] = useState(stay?.check_in_time ?? "");
  const [checkOut, setCheckOut] = useState(stay?.check_out_time ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Qué se está editando: el alojamiento o quién está (se abren desde la tarjeta). Si todavía no hay
  // alojamiento y se puede cargar, arranca abierto para completarlo.
  const [editingStay, setEditingStay] = useState(!readOnly && !stop.locked && !stay && stop.nights > 0);
  const receiptInput = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  // La reserva elegida antes de guardar el alojamiento: se sube al guardar (decisión 057).
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const [readNote, setReadNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const priceCents = parseAmount(price);
  // La división guardada vale mientras no cambie quién está; si cambia, pasa a partes iguales entre los que quedan.
  const peopleChanged = people.join() !== stop.member_ids.join();
  const savedSplit =
    !peopleChanged && stay?.split.length && stay.total_price_cents ? splitStateFrom(stay.total_price_cents, stay.split, order) : null;
  const splitValue: SplitState = split ?? savedSplit ?? { memberIds: order.filter((id) => people.includes(id)), mode: "equal", custom: {} };
  const hasStay = !!(stayName.trim() || via || priceCents > 0);

  const dirty =
    peopleChanged ||
    notes !== (stop.notes ?? "") ||
    stayName !== (stay?.name ?? "") ||
    via !== (stay?.booked_via ?? null) ||
    priceCents !== (stay?.total_price_cents ?? 0) ||
    (priceCents > 0 && paidBy !== (stay?.paid_by_member_id ?? paidBy)) ||
    split !== null ||
    checkIn !== (stay?.check_in_time ?? "") ||
    checkOut !== (stay?.check_out_time ?? "") ||
    pendingReceipt !== null;

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

  // Debajo del nombre del alojamiento: dónde se reservó y cuánto salió.
  const staySub = [via ? BOOKING_LABEL[via] : stayName ? "Sin confirmar" : "", priceCents > 0 ? `${formatEuros(priceCents)} · pagó ${name(paidBy)}` : ""]
    .filter(Boolean)
    .join(" · ");

  // Subir la reserva: completa lo que esté vacío (nombre, dónde se reservó, horarios y precio). El PDF
  // se lee con pdf.js y la imagen con OCR (decisión 067), las dos en el teléfono.
  async function pickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    const message = await addReceipt({ file });
    setReading(false);
    if (message) setError(message);
  }

  async function addReceipt(input: AttachmentInput): Promise<string | null> {
    if ("file" in input && !input.file.type.startsWith("image/") && input.file.type !== "application/pdf" && !input.file.name.toLowerCase().endsWith(".pdf")) {
      return "Tiene que ser un PDF o una imagen.";
    }
    if ("file" in input) {
      const file = input.file;
      const info = await readDocumentLines(file).then(parseBooking).catch(() => null);
      const found: string[] = [];
      if (info?.name && !stayName.trim()) {
        setStayName(info.name);
        found.push("el nombre");
      }
      if (info?.via && !via) {
        setVia(info.via);
        found.push("dónde se reservó");
      }
      if (info?.checkIn && !checkIn) {
        setCheckIn(info.checkIn);
        found.push("el check-in");
      }
      if (info?.checkOut && !checkOut) {
        setCheckOut(info.checkOut);
        found.push("el checkout");
      }
      if (info?.priceCents && !priceCents) {
        setPrice(formatAmountInput(info.priceCents));
        found.push("el precio");
      }
      setReadNote(found.length ? `Sacamos de la reserva ${namesList(found)}. Revisá que esté bien.` : "No pudimos leer los datos de la reserva: completalos a mano.");
    }
    if (savedStayId) return onAddReceipt(savedStayId, input);
    if ("file" in input) setPendingReceipt(input.file);
    return null;
  }

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
    if (pendingReceipt && !hasStay) {
      setError("Poné el nombre del alojamiento para guardar la reserva.");
      return;
    }
    // Con precio pero sin "Reservado en", cuenta como "Otro" para que se guarde con su gasto.
    const bookedVia = via ?? (priceCents > 0 ? "other" : null);
    const hasExpense = !!bookedVia && priceCents > 0;
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
      bookedVia,
      stayPriceCents: bookedVia ? priceCents || null : null,
      stayPaidByMemberId: hasExpense ? paidBy : null,
      stayDescription: `${stayName.trim() || "Alojamiento"} · ${nightsText}`,
      staySplits: hasExpense ? splits : [],
      checkIn: checkIn || null,
      checkOut: checkOut || null,
    };
    const newStay: Stay | null = hasStay
      ? {
          id: stay?.id ?? `nuevo-${stopId}`,
          stop_id: stopId,
          name: stayName.trim() || null,
          booked_via: bookedVia,
          total_price_cents: input.stayPriceCents,
          paid_by_member_id: input.stayPaidByMemberId,
          split: input.staySplits,
          attachments: stay?.attachments ?? [],
          check_in_time: input.checkIn,
          check_out_time: input.checkOut,
        }
      : null;
    setError("");
    startTransition(async () => {
      const message = await onSave(input, newStay, pendingReceipt ?? undefined);
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

  const legIn = prev ? (trip.legs.find((l) => l.from_stop_id === prev.id) ?? null) : null;
  const legOut = trip.legs.find((l) => l.from_stop_id === stopId) ?? null;

  return (
    <BottomSheet onClose={onClose} label={stop.city} top="calc(var(--safe-top) + 12px)" overlayHandle>
      {(close) => (
        <>
          <div className="relative flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none]">
            {/* Sin foto (decisión 072; la foto queda en la lista): volver, el país con su bandera, el
                nombre y la frase; a la derecha, cambiar la ciudad. */}
            <div className="flex items-center justify-between pt-[calc(var(--safe-top)+8px)]">
              <BackButton onClick={close} />
              {!readOnly && onChangePlace && (
                <button type="button" onClick={onChangePlace} aria-label="Cambiar ciudad" className="flex size-11 items-center justify-center rounded-full bg-surface">
                  <Pencil size={18} />
                </button>
              )}
            </div>
            <div className="mt-3 px-1">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink-2">
                {stop.country_code && (
                  <span
                    className="size-6 shrink-0 rounded-full bg-surface bg-cover bg-center shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
                    style={{ backgroundImage: `url("https://flagcdn.com/w80/${stop.country_code}.png")` }}
                  />
                )}
                {stop.country}
              </div>
              <h2 className="mt-1 truncate text-[38px] leading-[1.1] font-extrabold tracking-[-0.03em]">{stop.city}</h2>
              {stop.tagline && <div className="font-hand mt-0.5 text-[24px] leading-[1.1] text-ink-2">{stop.tagline}</div>}
            </div>

            {/* Planificación: fechas (abren el calendario) y noches. */}
            <div className="mt-4 flex items-center gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenCalendar?.(canPickArrival)}
                onKeyDown={(e) => e.key === "Enter" && onOpenCalendar?.(canPickArrival)}
                aria-label={canPickArrival ? "Elegir el día de llegada" : "Ver en el calendario"}
                className="flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-[15px] font-bold"
              >
                <Calendar size={18} className="shrink-0" />
                <span className="truncate">
                  {stop.nights === 0 ? `${formatDay(arrival)} · de paso` : formatRange(arrival, departure)}
                </span>
              </div>
              {!nightsEditable || readOnly ? (
                <span className="flex h-12 shrink-0 items-center rounded-full border border-line px-4 text-[15px] font-extrabold">
                  {stop.nights === 0 ? "De paso" : `${stop.nights} ${stop.nights === 1 ? "noche" : "noches"}`}
                </span>
              ) : (
                <div className="flex h-12 shrink-0 items-center rounded-full border border-line">
                  <button type="button" aria-label="Menos noches" onClick={() => onNights(-1)} className="flex h-12 w-10 items-center justify-center" style={{ opacity: stop.nights === 0 ? 0.35 : 1 }}>
                    <Minus size={18} />
                  </button>
                  <span className="min-w-[68px] text-center text-[15px] font-extrabold">
                    {stop.nights} {stop.nights === 1 ? "noche" : "noches"}
                  </span>
                  <button type="button" aria-label="Más noches" onClick={() => onNights(1)} className="flex h-12 w-10 items-center justify-center">
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>

            {stop.locked && (
              <div className="mt-3 flex items-center gap-3 rounded-field bg-surface px-3.5 py-3">
                <Lock size={18} className="shrink-0" />
                <div className="min-w-0 flex-1 text-[13px] leading-[1.4]">
                  <div className="font-bold">Bloqueada</div>
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
                    className="h-10 shrink-0 rounded-full border border-line bg-white px-3.5 text-[13px] font-bold disabled:opacity-50"
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            )}

            <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
              {/* El alojamiento (decisión 064): en vista es una tarjeta con todo lo de la estadía; al editar,
                  la misma tarjeta se convierte en el formulario, con quiénes están adentro. */}
              {editingStay ? (
                <div className="mt-5 rounded-[22px] border border-line bg-white p-4 shadow-card">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-[17px] font-bold">Alojamiento</div>
                    <button type="button" onClick={() => setEditingStay(false)} className="h-10 shrink-0 rounded-full bg-surface px-4 text-sm font-bold">
                      Listo
                    </button>
                  </div>

                  {/* La reserva primero: un solo botón, PDF o imagen; el PDF completa el resto (decisión 057). */}
                  {stay && stay.attachments.length > 0 ? (
                    <div className="overflow-hidden rounded-[16px] border border-line">
                      {stay.attachments.map((a, k) => (
                        <AttachmentRow
                          key={a.id}
                          attachment={a}
                          title="Reserva"
                          first={k === 0}
                          onOpen={() => onViewReceipt(stay.id, a.id)}
                          onRemove={readOnly ? undefined : () => onRemoveReceipt(stay.id, a)}
                        />
                      ))}
                    </div>
                  ) : pendingReceipt ? (
                    <div className="flex items-center gap-3 rounded-[16px] border border-line px-3.5 py-3">
                      <FileText size={18} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{pendingReceipt.name}</div>
                        <div className="text-xs text-ink-2">Se sube al guardar</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingReceipt(null);
                          setReadNote("");
                        }}
                        aria-label="Sacar la reserva"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input ref={receiptInput} type="file" accept="application/pdf,.pdf,image/*" hidden onChange={pickReceipt} />
                      <button
                        type="button"
                        disabled={reading}
                        onClick={() => receiptInput.current?.click()}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-dash text-sm font-bold disabled:opacity-60"
                      >
                        <Upload size={17} /> {reading ? "Leyendo la reserva…" : "Subir la reserva · PDF o imagen"}
                      </button>
                      <p className="mt-1.5 text-xs text-ink-2">Completamos el nombre, los horarios y el precio. Con el PDF sale mejor que con una captura.</p>
                    </>
                  )}
                  {readNote && <p className="mt-2 text-[13px] text-ink-2">{readNote}</p>}

                  <input
                    value={stayName}
                    onChange={(e) => setStayName(e.target.value)}
                    placeholder="Nombre del alojamiento"
                    aria-label="Alojamiento"
                    className="mt-3 h-12 w-full rounded-field border border-line px-4 text-[16px] font-bold outline-none focus:border-ink"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <TimeField label="Check-in después de" value={checkIn} onChange={setCheckIn} />
                    <TimeField label="Checkout antes de" value={checkOut} onChange={setCheckOut} />
                  </div>

                  <div className="mt-4 mb-2 text-xs font-bold text-ink-2">Reservado en</div>
                  <div className="flex flex-wrap gap-2">
                    {/* "Directo" ya no se ofrece (decisión 045), pero se sigue viendo si estaba elegido. */}
                    {[...VIAS, ...(via === "direct" ? [{ via: "direct" as const, label: BOOKING_LABEL.direct }] : [])].map((v) => (
                      <button
                        key={v.via}
                        type="button"
                        onClick={() => setVia(via === v.via ? null : v.via)}
                        aria-pressed={via === v.via}
                        className={`h-10 rounded-full border px-4 text-[13px] font-bold ${via === v.via ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 text-xs font-bold text-ink-2">Cuánto salió</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold">€</span>
                    <input
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                      onBlur={() => setPrice(priceCents ? formatAmountInput(priceCents) : "")}
                      placeholder="0,00"
                      aria-label="Precio total"
                      className="h-10 min-w-0 flex-1 bg-transparent text-2xl font-extrabold outline-none placeholder:text-ink-5"
                    />
                  </div>
                  {priceCents > 0 && (
                    <>
                      <div className="mt-3 mb-2 text-xs font-bold text-ink-2">Pagó</div>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.members.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaidBy(m.id)}
                            aria-pressed={paidBy === m.id}
                            className={`flex h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-bold ${paidBy === m.id ? "bg-ink text-white" : "bg-surface"}`}
                          >
                            <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>
                              {m.initials}
                            </span>
                            {m.display_name}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4">
                        <SplitEditor members={trip.members} totalCents={priceCents} value={splitValue} onChange={setSplit} />
                      </div>
                    </>
                  )}

                  {/* Quiénes están en esta ciudad. */}
                  <div className="mt-4 mb-2 text-xs font-bold text-ink-2">Quiénes están</div>
                  <div className="flex flex-wrap gap-2">
                    {trip.members.map((m) => {
                      const on = people.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => togglePerson(m.id)}
                          aria-pressed={on}
                          className={`flex h-11 items-center gap-2 rounded-full border pr-3.5 pl-[5px] text-sm font-bold ${on ? "border-ink bg-white" : "border-line bg-white text-ink-3"}`}
                        >
                          <span className="flex size-[34px] items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: m.color, opacity: on ? 1 : 0.45 }}>
                            {m.initials}
                          </span>
                          {m.display_name}
                        </button>
                      );
                    })}
                  </div>
                  {peopleNote && <p className="mx-1 mt-2 text-[13px] text-ink-2">{peopleNote}</p>}
                </div>
              ) : hasStay || stop.nights > 0 ? (
                <div className="mt-5 overflow-hidden rounded-[22px] border border-line bg-white shadow-card">
                  <div className="flex gap-3.5 p-3">
                    <StayIcon via={via} />
                    <div className="min-w-0 flex-1 py-1">
                      <div className={`text-[19px] leading-[1.2] font-bold ${hasStay ? "" : "text-ink-3"}`}>{stayName.trim() || (hasStay ? "Alojamiento" : "¿Dónde se quedan?")}</div>
                      {staySub && <div className="mt-0.5 text-sm text-ink-2">{staySub}</div>}
                      <div className="mt-2 text-sm text-ink-2">{stop.nights === 0 ? formatDay(arrival) : formatRange(arrival, departure)}</div>
                      {(checkIn || checkOut) && (
                        <div className="mt-0.5 text-sm text-ink-2">{[checkIn && `Entrada ${checkIn}`, checkOut && `Salida ${checkOut}`].filter(Boolean).join(" · ")}</div>
                      )}
                    </div>
                  </div>
                  <div className="mx-3 h-px bg-divider" />
                  <div className="flex items-center gap-2 p-3">
                    <button type="button" onClick={() => !readOnly && setEditingStay(true)} aria-label="Quiénes están" className="flex min-w-0 flex-1 items-center">
                      {trip.members
                        .filter((m) => people.includes(m.id))
                        .slice(0, 5)
                        .map((m, k) => (
                          <span
                            key={m.id}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                            style={{ background: m.color, marginLeft: k ? -8 : 0 }}
                          >
                            {m.initials}
                          </span>
                        ))}
                      {people.length > 5 && (
                        <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-white bg-surface text-xs font-bold">+{people.length - 5}</span>
                      )}
                    </button>
                    {stay && stay.attachments.length > 0 && (
                      <button type="button" onClick={() => onViewReceipt(stay.id, stay.attachments[0].id)} className="h-10 shrink-0 rounded-full bg-surface px-4 text-sm font-bold">
                        Ver reserva
                      </button>
                    )}
                    {!readOnly && (
                      <button type="button" onClick={() => setEditingStay(true)} className="h-10 shrink-0 rounded-full bg-surface px-4 text-sm font-bold">
                        {hasStay ? "Editar" : "Agregar"}
                      </button>
                    )}
                  </div>
                </div>
              ) : readOnly ? null : (
                <button
                  type="button"
                  onClick={() => setEditingStay(true)}
                  className="mt-5 flex h-14 w-full items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-dash px-4 text-left text-sm"
                >
                  <Bed size={18} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 text-ink-2">De paso, sin noche acá</span>
                  <span className="font-bold">Agregar alojamiento</span>
                </button>
              )}

              {/* Línea de tiempo: el día que llegás y el día que te vas. */}
              <div className="mt-7">
                <DayBlock date={arrival} last={stop.nights === 0}>
                  <TimelineItem
                    icon={legIn ? MODE_ICON[legIn.mode] : prev ? Plus : House}
                    iconClass={legIn ? MODE_CLASS[legIn.mode] : "bg-surface text-ink-2"}
                    title={prev ? `Llegás desde ${prev.city}` : "Salís de casa"}
                    sub={legIn ? legText(legIn, prev?.timezone ?? stop.timezone, stop.timezone) : prev ? "Tocá para cargar el tramo" : undefined}
                    onClick={prev ? () => onOpenLeg(prev.id) : undefined}
                  />
                  {hasStay && stop.nights > 0 && (
                    <TimelineItem icon={DoorOpen} title="Check-in" sub={checkIn ? `Después de las ${checkIn}` : readOnly ? undefined : "Cargá la hora en el alojamiento"} />
                  )}
                  {stop.nights === 0 && (
                    <TimelineItem
                      icon={legOut ? MODE_ICON[legOut.mode] : next ? Plus : House}
                      iconClass={legOut ? MODE_CLASS[legOut.mode] : "bg-surface text-ink-2"}
                      title={next ? `Te vas a ${next.city}` : "Vuelta a casa"}
                      sub={legOut ? legText(legOut, stop.timezone, next?.timezone ?? stop.timezone) : "Tocá para cargar el tramo"}
                      onClick={() => onOpenLeg(stopId)}
                    />
                  )}
                </DayBlock>
                {stop.nights > 0 && (
                  <>
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex w-12 shrink-0 flex-col items-center">
                        <span className="h-4 border-l-2 border-dotted border-dots" />
                        <span className="size-3 rounded-full border-2 border-dots bg-white" />
                        <span className="h-4 border-l-2 border-dotted border-dots" />
                      </div>
                      <span className="text-[13px] text-ink-2">
                        {stop.nights} {stop.nights === 1 ? "noche" : "noches"} en {stop.city}
                      </span>
                    </div>
                    <DayBlock date={departure} last>
                      {hasStay && (
                        <TimelineItem icon={DoorClosed} title="Checkout" sub={checkOut ? `Antes de las ${checkOut}` : readOnly ? undefined : "Cargá la hora en el alojamiento"} />
                      )}
                      <TimelineItem
                        icon={legOut ? MODE_ICON[legOut.mode] : next ? Plus : House}
                        iconClass={legOut ? MODE_CLASS[legOut.mode] : "bg-surface text-ink-2"}
                        title={next ? `Te vas a ${next.city}` : "Vuelta a casa"}
                        sub={legOut ? legText(legOut, stop.timezone, next?.timezone ?? stop.timezone) : "Tocá para cargar el tramo"}
                        onClick={() => onOpenLeg(stopId)}
                      />
                    </DayBlock>
                  </>
                )}
              </div>

              {/* Notas: en modo vista, como texto (y nada si están vacías). */}
              {readOnly ? (
                notes.trim() && (
                  <>
                    <h3 className="mx-1 mt-8 mb-2 text-xl font-extrabold tracking-[-0.01em]">Notas</h3>
                    <p className="mx-1 text-[15px] leading-[1.5] whitespace-pre-line text-ink-2">{notes}</p>
                  </>
                )
              ) : (
              <>
              <h3 className="mx-1 mt-8 mb-3 text-xl font-extrabold tracking-[-0.01em]">Notas</h3>
              <label className="flex gap-3 rounded-field border border-line bg-white py-4 pr-4 pl-[18px] focus-within:border-ink">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={notes ? 4 : 1}
                  placeholder="Agregá tus notas"
                  aria-label="Notas"
                  className="min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-[1.45] outline-none focus:min-h-[120px]"
                />
                <StickyNote size={20} className="shrink-0 text-ink-3" />
              </label>
              </>
              )}

              {!readOnly && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="mt-6 flex h-11 items-center gap-2 px-1 text-[13px] font-bold text-danger">
                  <Trash2 size={16} /> Borrar {stop.city}
                </button>
              )}
            </fieldset>
          </div>

          <div className="shrink-0 border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            {error && <p className="mb-2 text-[13px] font-bold text-danger">{error}</p>}
            {readOnly ? (
              <button type="button" onClick={close} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white">
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
              <button type="button" onClick={() => save(close)} disabled={pending} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-70">
                {pending ? "Guardando…" : dirty ? "Guardar cambios" : "Listo"}
              </button>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function StayIcon({ via }: { via: BookingSource | null }) {
  const Icon = via ? STAY_ICON[via] : Bed;
  return (
    <span className="flex size-[96px] shrink-0 items-center justify-center rounded-[16px] bg-surface text-ink">
      <Icon size={36} strokeWidth={1.6} />
    </span>
  );
}

/** "Tren · 10:15 → 12:07", en la hora local de cada ciudad. */
function legText(leg: Leg, fromTz: string, toTz: string): string {
  const time = leg.departs_at ? localTime(leg.departs_at, fromTz) + (leg.arrives_at ? ` → ${localTime(leg.arrives_at, toTz)}` : "") : "Faltan los horarios";
  return `${MODE_NAME[leg.mode]} · ${time}`;
}

// Un día de la línea de tiempo: a la izquierda el día de la semana y el número, a la derecha lo que pasa.
function DayBlock({ date, last, children }: { date: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span className="text-[13px] font-bold capitalize">{weekdayOf(date)}</span>
        <span className="mt-1 flex size-10 items-center justify-center rounded-full bg-surface text-[15px] font-bold">{Number(date.slice(8))}</span>
        {!last && <span className="mt-1 flex-1 border-l-2 border-dotted border-dots" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">{children}</div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  iconClass = "bg-surface text-ink",
  title,
  sub,
  onClick,
  children,
}: {
  icon: LucideIcon;
  iconClass?: string;
  title: string;
  sub?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] ${iconClass}`}>
        <Icon size={22} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[16px] font-bold">{title}</span>
        {sub && <span className="mt-0.5 block text-sm text-ink-2">{sub}</span>}
        {children}
      </span>
      {onClick && <ChevronRight size={18} className="shrink-0 text-ink-3" />}
    </>
  );
  const box = "flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-2.5";
  // div con role="button": así se puede abrir el tramo aunque la ficha esté en modo lectura.
  return onClick ? (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()} className={`${box} cursor-pointer`}>
      {body}
    </div>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** Hora de check-in o checkout en el formulario del alojamiento. */
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 rounded-field border border-line px-3 py-2 focus-within:border-ink">
      <span className="block text-[11px] font-bold text-ink-2">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 w-full min-w-0 bg-transparent text-[16px] font-bold outline-none" />
    </label>
  );
}
