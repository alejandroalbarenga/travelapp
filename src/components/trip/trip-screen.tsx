"use client";

import { Bed, Bus, Calendar, Car, ChevronLeft, ChevronRight, Clock, Ellipsis, House, Minus, Plane, Plus, Share, Ticket, TrainFront, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SaveLegInput, SaveStopInput } from "@/app/viaje/[id]/actions";
import type { ChipDisplay } from "@/lib/legs";
import type { Leg, LegMode, Stay, Trip } from "@/lib/trip-types";
import { buildTripView, type StopView } from "@/lib/trip-view";
import { TripTabs } from "../trip-tabs";
import { CitySheet } from "./city-sheet";
import { LegSheet, type LegDraft } from "./leg-sheet";
import { TripMap } from "./trip-map";

// Pantalla 01 · Viaje (docs/diseño.md): mapa de fondo y la lista de ciudades encima como sheet.

const LIST_TOP = 340; // donde arranca la lista; el resto de arriba es mapa

const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};
const RING_COLOR = { missing: "#F5891F", complete: "#1FA971", over: "#A8382B" };

export function TripScreen({
  trip,
  chipDisplay,
  myMemberId,
  saveNights,
  saveLeg,
  saveStop,
  deleteStop,
}: {
  trip: Trip;
  chipDisplay: ChipDisplay;
  myMemberId: string | null;
  /** Guardan en la base. Sin esto (en /demo) los cambios quedan solo en pantalla. */
  saveNights?: (stopId: string, nights: number) => Promise<void>;
  saveLeg?: (input: SaveLegInput) => Promise<{ error: string } | null>;
  saveStop?: (input: SaveStopInput) => Promise<{ error: string } | null>;
  deleteStop?: (stopId: string) => Promise<{ error: string } | null>;
}) {
  const router = useRouter();
  // Copia local del viaje: se actualiza al toque y se reemplaza cuando llegan datos nuevos del servidor.
  const [base, setBase] = useState(trip);
  const [current, setCurrent] = useState(trip);
  if (trip !== base) {
    setBase(trip);
    setCurrent(trip);
  }
  const [openLeg, setOpenLeg] = useState<string | null>(null);
  const [openCity, setOpenCity] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function storeStop(input: SaveStopInput, stay: Stay | null): Promise<string | null> {
    if (saveStop) {
      const result = await saveStop(input);
      if (result) return result.error;
      router.refresh();
    }
    setCurrent((t) => ({
      ...t,
      stops: t.stops.map((s) => (s.id === input.stopId ? { ...s, member_ids: input.memberIds, notes: input.notes || null } : s)),
      stays: [...t.stays.filter((s) => s.stop_id !== input.stopId), ...(stay ? [stay] : [])],
    }));
    return null;
  }

  async function removeStop(stopId: string): Promise<string | null> {
    if (deleteStop) {
      const result = await deleteStop(stopId);
      if (result) return result.error;
      router.refresh();
    }
    // Como en la base: se borra la parada, su tramo y el tramo que llegaba a ella.
    setCurrent((t) => ({
      ...t,
      stops: t.stops.filter((s) => s.id !== stopId),
      legs: t.legs.filter((l) => l.from_stop_id !== stopId && l.to_stop_id !== stopId),
      stays: t.stays.filter((s) => s.stop_id !== stopId),
    }));
    return null;
  }

  async function storeLeg(draft: LegDraft, description: string): Promise<string | null> {
    if (saveLeg) {
      const result = await saveLeg({
        tripId: trip.id,
        fromStopId: draft.from_stop_id,
        toStopId: draft.to_stop_id,
        mode: draft.mode,
        departsAt: draft.departs_at,
        arrivesAt: draft.arrives_at,
        totalPriceCents: draft.total_price_cents,
        paidByMemberId: draft.paid_by_member_id,
        description,
        splits: draft.split,
      });
      if (result) return result.error;
      router.refresh();
    }
    setCurrent((t) => {
      const previous = t.legs.find((l) => l.from_stop_id === draft.from_stop_id);
      const leg: Leg = { ...draft, id: draft.id ?? `nuevo-${draft.from_stop_id}`, attachments: previous?.attachments ?? [] };
      return { ...t, legs: [...t.legs.filter((l) => l.from_stop_id !== draft.from_stop_id), leg] };
    });
    return null;
  }
  const view = buildTripView(current, { chipDisplay, myMemberId });

  function changeNights(stopId: string, delta: number) {
    const stop = current.stops.find((s) => s.id === stopId);
    if (!stop) return;
    const value = Math.max(0, Math.min(60, stop.nights + delta));
    if (value === stop.nights) return;
    setCurrent((t) => ({ ...t, stops: t.stops.map((s) => (s.id === stopId ? { ...s, nights: value } : s)) }));
    if (saveNights) startTransition(() => saveNights(stopId, value));
  }

  const points = [...current.stops]
    .sort((a, b) => a.position - b.position)
    .flatMap((s, i) => (s.lat != null && s.lng != null ? [{ lat: s.lat, lng: s.lng, label: String(i + 1), stopId: s.id }] : []));

  const ring = `conic-gradient(${RING_COLOR[view.nightsStatus]} ${Math.min(100, (view.plannedNights / Math.max(1, view.tripNights)) * 100)}%, #D3DBE4 0)`;
  const travellers = trip.members.length;

  return (
    <div className="fixed inset-0 overflow-hidden bg-white">
      <TripMap points={points} visibleTop={56} visibleBottom={LIST_TOP} onPinClick={setOpenCity} />

      {/* Lista: arranca a LIST_TOP y al scrollear tapa el mapa. */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-x-hidden overflow-y-auto [scrollbar-width:none]">
        <div style={{ height: LIST_TOP }} />
        <div
          className="pointer-events-auto relative min-h-full rounded-t-[28px] bg-white px-4 shadow-[0_-6px_24px_rgb(0_41_61/0.14)]"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 120px)" }}
        >
          <div className="flex justify-center pt-2 pb-2">
            <div className="h-[5px] w-10 rounded-full bg-handle" />
          </div>

          <div className="flex items-center gap-3 pt-1.5">
            <div className="bg-navy-gradient ml-[22px] flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgb(0_41_61/0.25)]">
              <House size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">Empieza el viaje</div>
              <div className="mt-0.5 text-xs font-bold tracking-[0.06em] text-ink-2">{view.startLabel}</div>
            </div>
            <div className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-navy/[.06] bg-surface pr-3 pl-[7px]">
              <div className="flex size-[22px] items-center justify-center rounded-full" style={{ background: ring }}>
                <div className="size-[15px] rounded-full bg-surface" />
              </div>
              <span className="text-[13px] whitespace-nowrap">
                <strong style={{ color: view.nightsStatus === "over" ? "#A8382B" : "#00293D" }}>
                  {view.plannedNights}/{view.tripNights}
                </strong>{" "}
                noches
              </span>
            </div>
          </div>
          <Dots height={14} />

          {view.stops.map((stop, i) => (
            <div key={stop.id}>
              <StopCard stop={stop} onChange={(d) => changeNights(stop.id, d)} onOpen={() => setOpenCity(stop.id)} />
              <LegRow stop={stop} onOpen={() => setOpenLeg(stop.id)} />
              {i === view.stops.length - 1 && (
                <div className="flex items-center gap-2.5 pl-7">
                  <span className="flex size-8 items-center justify-center rounded-full border border-navy/[.07] bg-white text-ink-2 shadow-card">
                    <House size={16} />
                  </span>
                  <span className="text-[13px] font-bold text-ink-2">{view.returnText}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botones flotantes de arriba */}
      <div className="pointer-events-none absolute inset-x-4 z-[2] h-11" style={{ top: "calc(var(--safe-top) + 12px)" }}>
        <Link href="/" aria-label="Volver al inicio" className="glass pointer-events-auto absolute top-0 left-0 flex size-11 items-center justify-center rounded-full">
          <ChevronLeft size={20} />
        </Link>
        <div className="absolute top-0 right-[54px] left-[54px] flex h-11 justify-center">
          <div className="glass flex h-11 max-w-full items-center rounded-full px-[18px] text-center leading-[1.15]">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold">{view.name}</div>
              <div className="text-[11px] font-semibold whitespace-nowrap text-ink-2">{view.range}</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 flex flex-col gap-2.5">
          <button type="button" aria-label="Calendario del viaje" className="glass pointer-events-auto flex size-11 items-center justify-center rounded-full">
            <Calendar size={20} />
          </button>
          <button type="button" aria-label="Integrantes" className="glass pointer-events-auto relative flex size-11 items-center justify-center rounded-full">
            <Users size={20} />
            <span className="absolute -top-[3px] -right-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-orange px-[5px] text-[10px] font-extrabold text-white">
              {travellers}
            </span>
          </button>
          <button type="button" aria-label="Compartir viaje" className="glass pointer-events-auto flex size-11 items-center justify-center rounded-full">
            <Share size={20} />
          </button>
        </div>
      </div>

      <TripTabs />
      <button
        type="button"
        aria-label="Agregar"
        className="fixed right-5 z-[2] flex size-14 items-center justify-center rounded-full border border-white/[.18] bg-[linear-gradient(180deg,rgb(6_56_80/0.95)_0%,rgb(0_41_61/0.95)_100%)] text-white shadow-[0_10px_30px_rgb(0_41_61/0.3),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-xl"
        style={{ bottom: "calc(var(--safe-bottom) + 20px)" }}
      >
        <Plus size={28} />
      </button>

      {openCity && current.stops.some((s) => s.id === openCity) && (
        <CitySheet
          trip={current}
          stopId={openCity}
          myMemberId={myMemberId}
          onClose={() => setOpenCity(null)}
          onNights={(d) => changeNights(openCity, d)}
          onOpenLeg={(fromStopId) => setOpenLeg(fromStopId)}
          onSave={storeStop}
          onDelete={removeStop}
        />
      )}
      {openLeg && (
        <LegSheet trip={current} fromStopId={openLeg} myMemberId={myMemberId} onClose={() => setOpenLeg(null)} onSave={storeLeg} />
      )}
    </div>
  );
}

function Dots({ height }: { height: number }) {
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute top-0 bottom-0 left-[43px] border-l-2 border-dotted border-dots" />
    </div>
  );
}

function StopCard({ stop, onChange, onOpen }: { stop: StopView; onChange: (delta: number) => void; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${stop.name}`}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="bg-card-gradient relative flex cursor-pointer items-center gap-3 rounded-card border border-navy/[.07] py-[9px] pr-1 pl-3 shadow-card"
    >
      <div className="relative size-16 shrink-0">
        <div
          className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-cover bg-center text-[13px] font-extrabold tracking-[0.04em] text-white"
          style={{ backgroundColor: stop.tint, backgroundImage: stop.photoUrl ? `url("${stop.photoUrl}")` : undefined }}
        >
          {!stop.photoUrl && stop.code}
        </div>
        <div className="bg-navy-gradient absolute -top-1.5 -left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white px-1.5 text-xs font-extrabold text-white">
          {stop.number}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[17px] font-bold">{stop.name}</span>
        <span className="text-[13px] text-ink-2">{stop.dates}</span>
        {stop.stay && (
          <span className={`flex items-center gap-1 truncate text-[11px] font-bold ${stop.stay.paid ? "text-success" : "text-ink-2"}`}>
            <Bed size={14} className="shrink-0" />
            <span className="truncate">{stop.stay.text}</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        <button type="button" aria-label="Menos noches" onClick={(e) => {
            e.stopPropagation();
            onChange(-1);
          }} className="flex size-11 items-center justify-center" style={{ opacity: stop.nights === 0 ? 0.35 : 1 }}>
          <span className="flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-line">
            <Minus size={16} />
          </span>
        </button>
        <div className="w-8 text-center">
          <div className="text-[17px] leading-none font-extrabold">{stop.nights}</div>
          <div className="mt-[3px] text-[10px] font-bold text-ink-2">{stop.nightsLabel}</div>
        </div>
        <button type="button" aria-label="Más noches" onClick={(e) => {
            e.stopPropagation();
            onChange(1);
          }} className="flex size-11 items-center justify-center">
          <span className="flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-line">
            <Plus size={16} />
          </span>
        </button>
      </div>
    </div>
  );
}

function LegRow({ stop, onOpen }: { stop: StopView; onOpen: () => void }) {
  const leg = stop.leg;
  const Icon = leg ? MODE_ICON[leg.mode] : null;
  return (
    <div className="relative flex h-[54px] items-center">
      <div className="absolute top-0 bottom-0 left-[43px] border-l-2 border-dotted border-dots" />
      <button type="button" aria-label="Agregar ciudad acá" className="relative ml-[22px] flex size-11 shrink-0 items-center justify-center">
        <span className="flex size-[30px] items-center justify-center rounded-full border border-line bg-white text-navy shadow-[0_2px_6px_rgb(0_41_61/0.08)]">
          <Plus size={16} />
        </span>
      </button>
      {leg && Icon ? (
        <>
          <button type="button" onClick={onOpen} className="relative ml-1.5 flex h-11 min-w-0 items-center gap-2 rounded-full border border-navy/[.07] bg-white pr-3 pl-1.5 shadow-card">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${MODE_CLASS[leg.mode]}`}>
              <Icon size={16} />
            </span>
            <span className="min-w-0 truncate text-[13px] font-bold">{leg.text}</span>
            {leg.timeZoneChange && (
              <span title={leg.timeZoneChange} className="flex size-5 shrink-0 items-center justify-center rounded-full bg-tz-icon-bg text-orange">
                <Clock size={14} />
              </span>
            )}
            <ChevronRight size={16} className="shrink-0 text-ink-2" />
          </button>
          <button type="button" aria-label={leg.hasTicket ? "Ver pasaje" : "Adjuntar pasaje"} className="relative ml-1.5 flex size-11 shrink-0 items-center justify-center">
            {leg.hasTicket ? (
              <span className="bg-navy-gradient flex size-[34px] items-center justify-center rounded-full text-white shadow-button">
                <Ticket size={16} />
              </span>
            ) : (
              <span className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-dashed border-dots bg-white text-ink-3">
                <Ticket size={16} />
              </span>
            )}
          </button>
        </>
      ) : (
        <button type="button" onClick={onOpen} className="relative ml-1.5 flex h-11 items-center gap-2 rounded-full border-[1.5px] border-dashed border-dots bg-white pr-3.5 pl-1.5 text-ink-2">
          <span className="flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-dashed border-dots">
            <Plus size={16} />
          </span>
          <span className="text-[13px] font-bold">{stop.legEmptyLabel}</span>
        </button>
      )}
    </div>
  );
}
