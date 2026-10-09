"use client";

import { Bus, Car, Clock, Ellipsis, Pencil, Plane, Ticket, TrainFront, X, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { sortTickets, ticketTitle } from "@/lib/attachments";
import { addDays, formatWeekday, stopDates } from "@/lib/dates";
import { durationMinutes, formatDuration, localTime, timeZoneDiffHours, zonedToInstant } from "@/lib/legs";
import { formatAmountInput, formatEuros, parseAmount } from "@/lib/money";
import { computeSplits, splitStateFrom, type SplitState } from "@/lib/splits";
import type { Leg, LegAttachment, LegMode, Trip } from "@/lib/trip-types";
import { BottomSheet } from "../bottom-sheet";
import { SplitEditor } from "../split-editor";
import { AddAttachmentButtons, AttachmentRow, type AttachmentInput } from "./attachment-controls";

// Pantalla 02 · Detalle del tramo (docs/diseño.md). Bottom sheet sobre el Viaje.

const MODES: { mode: LegMode; label: string; name: string; Icon: LucideIcon; on: string }[] = [
  { mode: "car", label: "Auto", name: "Auto", Icon: Car, on: "border-car bg-car-bg text-car" },
  { mode: "train", label: "Tren", name: "Tren", Icon: TrainFront, on: "border-train bg-train-bg text-train" },
  { mode: "plane", label: "Avión", name: "Vuelo", Icon: Plane, on: "border-plane bg-plane-bg text-plane" },
  { mode: "bus", label: "Bus", name: "Bus", Icon: Bus, on: "border-bus bg-bus-bg text-bus" },
  { mode: "other", label: "Otro", name: "Traslado", Icon: Ellipsis, on: "border-other bg-other-bg text-other" },
];
const MODE_ICON_COLOR: Record<LegMode, string> = { car: "text-car", train: "text-train", plane: "text-plane", bus: "text-bus", other: "text-other" };
const MODE_BG: Record<LegMode, string> = {
  car: "bg-car-bg text-car",
  train: "bg-train-bg text-train",
  plane: "bg-plane-bg text-plane",
  bus: "bg-bus-bg text-bus",
  other: "bg-other-bg text-other",
};

export type LegDraft = Omit<Leg, "id" | "attachments"> & { id?: string };

export function LegSheet({
  trip,
  fromStopId,
  myMemberId,
  onClose,
  onSave,
  onAddTicket,
  onRemoveTicket,
  onViewTicket,
  readOnly = false,
}: {
  trip: Trip;
  fromStopId: string;
  myMemberId: string | null;
  onClose: () => void;
  /** Guarda el tramo. Devuelve un mensaje si falló. */
  onSave: (draft: LegDraft, description: string) => Promise<string | null>;
  /** Adjunta un pasaje al tramo ya guardado; memberId es de quién es (null: del grupo). */
  onAddTicket: (legId: string, memberId: string | null, input: AttachmentInput) => Promise<string | null>;
  onRemoveTicket: (legId: string, ticket: LegAttachment) => Promise<string | null>;
  /** Abre el visor en ese pasaje. */
  onViewTicket: (fromStopId: string, ticketId: string) => void;
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
  // Modo vista (decisión 055): un tramo ya cargado se abre para leerlo, como un itinerario; "Editar"
  // pasa al formulario. Uno nuevo se abre directo en edición. Quien solo ve, siempre en vista.
  const [editing, setEditing] = useState(!readOnly && !leg);

  const totalCents = parseAmount(price);
  const departsAt = dep ? zonedToInstant(date, dep, fromTz) : null;
  let arrivesAt = arr ? zonedToInstant(date, arr, toTz) : null;
  if (departsAt && arrivesAt && arrivesAt <= departsAt) arrivesAt = zonedToInstant(addDays(date, 1), arr, toTz); // llega al día siguiente
  const duration = departsAt && arrivesAt ? durationMinutes(departsAt, arrivesAt) : null;
  const tzDiff = to ? timeZoneDiffHours(fromTz, toTz, departsAt ?? `${date}T12:00:00Z`) : 0;
  const perPerson = totalCents > 0 && split.mode === "equal" ? ` · ${formatEuros(Math.round(totalCents / split.memberIds.length))} por persona` : "";

  const tickets = sortTickets(leg?.attachments ?? [], myMemberId, trip.members);
  const withTicket = new Set(tickets.map((t) => t.member_id).filter(Boolean)).size;
  // "Ver mi pasaje": el tuyo, o el del grupo si no tenés uno propio.
  const myTicket = tickets.find((t) => t.kind !== "link" && (t.member_id === myMemberId || t.member_id === null)) ?? null;
  // Un tramo recién creado todavía no tiene id en la base: primero se guarda.
  const savedLegId = leg && !leg.id.startsWith("nuevo-") ? leg.id : null;
  const owners = trip.members.filter((m) => travellers.includes(m.id));
  const [owner, setOwner] = useState<string | null>(myMemberId && travellers.includes(myMemberId) ? myMemberId : null);

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
          {!editing && !readOnly && (
            <button type="button" onClick={() => setEditing(true)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-bold">
              <Pencil size={15} /> Editar
            </button>
          )}
          <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
            <X size={20} />
          </button>
        </div>

        {!editing && leg ? (
          <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 [scrollbar-width:none]">
            <LegView
              leg={leg}
              fromCity={from.city}
              toCity={to?.city ?? "casa"}
              date={date}
              dep={dep}
              arr={arr}
              nextDay={!!(dep && arr && arr <= dep)}
              duration={duration}
              tzNote={
                tzDiff !== 0 && to
                  ? `${to.city} está ${Math.abs(tzDiff)} h ${tzDiff > 0 ? "adelante" : "atrás"} de ${from.city}. Los horarios van en la hora de cada ciudad.`
                  : null
              }
              members={trip.members}
              travellers={travellers}
              myMemberId={myMemberId}
              tickets={tickets}
              withTicket={withTicket}
              onOpenTicket={(t) => (t.kind === "link" && t.url ? window.open(t.url, "_blank", "noopener") : onViewTicket(fromStopId, t.id))}
            />
          </div>
        ) : (
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
              <input type="time" value={dep} onChange={(e) => setDep(e.target.value)} className="mt-0.5 w-full min-w-0 bg-transparent text-[16px] font-bold outline-none" />
            </label>
            <label className={box}>
              <div className="text-[11px] font-bold text-ink-2">Llegada</div>
              <input type="time" value={arr} onChange={(e) => setArr(e.target.value)} className="mt-0.5 w-full min-w-0 bg-transparent text-[16px] font-bold outline-none" />
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

          </fieldset>

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
                const ticketOwner = trip.members.find((m) => m.id === t.member_id);
                return (
                  <AttachmentRow
                    key={t.id}
                    attachment={t}
                    title={t.kind === "link" ? "Link de la reserva" : ticketTitle(t.member_id, myMemberId, trip.members)}
                    owner={ticketOwner}
                    first={k === 0}
                    onOpen={() => (t.kind === "link" && t.url ? window.open(t.url, "_blank", "noopener") : onViewTicket(fromStopId, t.id))}
                    onRemove={readOnly || !savedLegId ? undefined : () => onRemoveTicket(savedLegId, t)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-ink-2">Todavía no hay un pasaje adjunto.</div>
          )}
          {!readOnly &&
            (savedLegId ? (
              <>
                <div className="mt-3.5 mb-2 text-xs font-bold text-ink-2">Agregar el pasaje de</div>
                <div className="flex flex-wrap gap-1.5">
                  {[...owners.map((m) => ({ id: m.id as string | null, label: m.id === myMemberId ? "Vos" : m.display_name })), { id: null, label: "Todo el grupo" }].map((o) => (
                    <button
                      key={o.id ?? "grupo"}
                      type="button"
                      onClick={() => setOwner(o.id)}
                      aria-pressed={owner === o.id}
                      className={`h-9 rounded-full px-3.5 text-[13px] font-bold ${owner === o.id ? "bg-navy text-white" : "bg-surface text-ink"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <AddAttachmentButtons onAdd={(input) => onAddTicket(savedLegId, owner, input)} />
              </>
            ) : (
              <p className="mt-2.5 text-[13px] text-ink-2">Guardá el tramo para adjuntar los pasajes.</p>
            ))}
        </div>
        )}

        <div className="border-t border-divider bg-white px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
          {error && <p className="mb-2 text-[13px] font-bold text-danger">{error}</p>}
          {!editing ? (
            myTicket ? (
              <button type="button" onClick={() => onViewTicket(fromStopId, myTicket.id)} className="bg-pink flex h-14 w-full items-center justify-center gap-2 rounded-button text-base font-bold text-white">
                <Ticket size={18} /> {myTicket.member_id ? "Ver mi pasaje" : "Ver pasaje"}
              </button>
            ) : (
              <button type="button" onClick={close} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white">
                Cerrar
              </button>
            )
          ) : (
          <div className={myTicket && !readOnly ? "grid grid-cols-2 gap-2" : ""}>
            {myTicket && (
              <button
                type="button"
                onClick={() => onViewTicket(fromStopId, myTicket.id)}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-button text-base font-bold ${readOnly ? "bg-pink text-white" : "border border-line bg-white text-navy"}`}
              >
                <Ticket size={18} /> {myTicket.member_id ? "Ver mi pasaje" : "Ver pasaje"}
              </button>
            )}
            {readOnly ? (
              !myTicket && (
                <button type="button" onClick={close} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white">
                  Cerrar
                </button>
              )
            ) : (
              <button type="button" onClick={() => save(close)} disabled={pending} className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50">
                {pending ? "Guardando…" : myTicket ? "Guardar" : "Guardar tramo"}
              </button>
            )}
          </div>
          )}
        </div>
      </>
      )}
    </BottomSheet>
  );
}

// Modo vista del tramo (decisión 055): en qué vas, a qué hora salís y llegás, cuánto salió y los pasajes.
function LegView({
  leg,
  fromCity,
  toCity,
  date,
  dep,
  arr,
  nextDay,
  duration,
  tzNote,
  members,
  travellers,
  myMemberId,
  tickets,
  withTicket,
  onOpenTicket,
}: {
  leg: Leg;
  fromCity: string;
  toCity: string;
  date: string;
  dep: string;
  arr: string;
  nextDay: boolean;
  duration: number | null;
  tzNote: string | null;
  members: Trip["members"];
  travellers: string[];
  myMemberId: string | null;
  tickets: LegAttachment[];
  withTicket: number;
  onOpenTicket: (ticket: LegAttachment) => void;
}) {
  const mode = MODES.find((m) => m.mode === leg.mode)!;
  const Icon = mode.Icon;
  const payer = members.find((m) => m.id === leg.paid_by_member_id);
  const people = members.filter((m) => travellers.includes(m.id));
  const mine = myMemberId ? leg.split.find((s) => s.member_id === myMemberId) : undefined;
  return (
    <>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] ${MODE_BG[leg.mode]}`}>
          <Icon size={24} />
        </span>
        <div className="min-w-0">
          <div className="text-[17px] font-bold">{mode.name}</div>
          <div className="text-sm text-ink-2">
            {formatWeekday(date)}
            {duration != null ? ` · ${formatDuration(duration)}` : ""}
          </div>
        </div>
      </div>

      {/* Salida y llegada, como en un pasaje. */}
      <div className="mt-5 rounded-[22px] border border-line p-4">
        <div className="flex items-start gap-3">
          <div className="w-16 shrink-0 text-[26px] leading-none font-extrabold tracking-[-0.02em]">{dep || "--:--"}</div>
          <div className="min-w-0 pt-0.5">
            <div className="text-[16px] font-bold">{fromCity}</div>
            <div className="text-[13px] text-ink-2">Salida</div>
          </div>
        </div>
        <div className="my-2 ml-[30px] h-6 border-l-2 border-dotted border-dots" />
        <div className="flex items-start gap-3">
          <div className="w-16 shrink-0 text-[26px] leading-none font-extrabold tracking-[-0.02em]">
            {arr || "--:--"}
            {nextDay && <sup className="ml-0.5 text-xs font-bold text-orange">+1</sup>}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="text-[16px] font-bold">{toCity}</div>
            <div className="text-[13px] text-ink-2">Llegada{nextDay ? " · al día siguiente" : ""}</div>
          </div>
        </div>
        {!dep && !arr && <p className="mt-3 text-[13px] text-ink-2">Todavía no se cargaron los horarios.</p>}
      </div>
      {tzNote && (
        <div className="mt-2.5 flex items-start gap-2.5 rounded-field border border-tz-border bg-tz-bg px-3.5 py-3 text-[13px] leading-[1.4] text-tz-text">
          <Clock size={16} className="mt-px shrink-0 text-orange" />
          <span>{tzNote}</span>
        </div>
      )}

      {/* Quiénes viajan y cuánto salió. */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex shrink-0">
          {people.slice(0, 5).map((m, k) => (
            <span key={m.id} className="flex size-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white" style={{ background: m.color, marginLeft: k ? -8 : 0 }}>
              {m.initials}
            </span>
          ))}
        </div>
        <div className="min-w-0 text-sm text-ink-2">
          {leg.total_price_cents
            ? `${formatEuros(leg.total_price_cents)}${payer ? ` · pagó ${payer.display_name}` : ""}${mine ? ` · tu parte ${formatEuros(mine.amount_cents)}` : ""}`
            : "Sin precio cargado"}
        </div>
      </div>

      {/* Pasajes */}
      <div className="mt-6 mb-2.5 flex items-baseline justify-between">
        <span className="text-[17px] font-bold">Pasajes</span>
        {tickets.length > 0 && (
          <span className="text-xs font-bold text-ink-2">
            {withTicket} de {travellers.length} viajeros
          </span>
        )}
      </div>
      {tickets.length ? (
        <div className="overflow-hidden rounded-[18px] border border-line">
          {tickets.map((t, k) => (
            <AttachmentRow
              key={t.id}
              attachment={t}
              title={t.kind === "link" ? "Link de la reserva" : ticketTitle(t.member_id, myMemberId, members)}
              owner={members.find((m) => m.id === t.member_id)}
              first={k === 0}
              onOpen={() => onOpenTicket(t)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-2">Todavía no hay un pasaje adjunto.</p>
      )}
    </>
  );
}
