"use client";

import { Bed, Bus, Calendar, Car, ChevronLeft, Ellipsis, Lock, LockOpen, Minus, Plane, Plus, Share, TrainFront, Trash2, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LegMode, Member } from "@/lib/trip-types";
import type { StopView, TripView } from "@/lib/trip-view";
import type { TripTab } from "../trip-tabs";
import { NightsRing } from "./nights-ring";
import { TripMap, type MapPoint } from "./trip-map";

// Versión web (desde 1100 px), igual al diseño ("01 Viaje (web)" en Viajes en grupo.dc.html):
// panel izquierdo (58 %) con un header de 128 px y las ciudades en una grilla que se recorre en
// zigzag; el mapa a la derecha (42 %, con 16 px de margen y radio 24). Arriba de cada foto corre
// la línea punteada con el número de la ciudad y el chip del tramo que sale; al final de cada fila
// la línea baja por el costado a la siguiente. Los sheets suben dentro del panel (BottomSheet).

export const WEB_HEADER_HEIGHT = 128;

const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};

// Medidas del diseño: columnas de al menos 230 px, 56 px entre columnas y 72 px entre filas.
const COL_MIN = 230;
const COL_GAP = 56;
const ROW_GAP = 72;
const DOTS = "2px dotted #B0B0B0";

export function WebTrip({
  view,
  members,
  points,
  tab,
  onTab,
  canEdit,
  nightsFrozen,
  focusStopId,
  onOpenCity,
  onOpenLeg,
  onAddCity,
  onAddExpense,
  onNights,
  onLock,
  onDelete,
  onCalendar,
  onMembers,
  expenses,
}: {
  view: TripView;
  members: Member[];
  points: MapPoint[];
  tab: TripTab;
  onTab: (tab: TripTab) => void;
  canEdit: boolean;
  nightsFrozen: (stopId: string) => boolean;
  /** La ciudad abierta: el mapa se acerca a ella. */
  focusStopId: string | null;
  onOpenCity: (stopId: string) => void;
  onOpenLeg: (fromStopId: string) => void;
  /** Agregar una ciudad después de esa (null: al principio; undefined: antes de la vuelta). */
  onAddCity: (afterStopId?: string | null) => void;
  onAddExpense: () => void;
  onNights: (stopId: string, delta: number) => void;
  onLock: (stopId: string) => void;
  onDelete: (stopId: string) => void;
  onCalendar: () => void;
  onMembers: () => void;
  /** La pantalla de Gastos, ya armada para el panel. */
  expenses: ReactNode;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const iconButton = "flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06)]";

  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute inset-y-0 left-0 w-[58%] overflow-hidden bg-white">
        <header className="absolute inset-x-0 top-0 z-[2] border-b border-divider bg-white px-8 pt-[18px]" style={{ height: WEB_HEADER_HEIGHT }}>
          <div className="flex items-center gap-3.5">
            {/* En Gastos, la flecha vuelve al viaje (Viaje y Gastos van separados, como en el celular: decisión 049). */}
            {tab === "expenses" ? (
              <button type="button" onClick={() => onTab("trip")} aria-label="Volver al viaje" className={iconButton}>
                <ChevronLeft size={20} />
              </button>
            ) : (
              <Link href="/" aria-label="Volver al inicio" className={iconButton}>
                <ChevronLeft size={20} />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              {tab === "expenses" ? (
                <>
                  <div className="truncate text-[13px] font-bold text-ink-2">{view.name}</div>
                  <h1 className="truncate text-[22px] font-extrabold tracking-[-0.02em]">Gastos</h1>
                </>
              ) : (
                <>
                  <h1 className="truncate text-[22px] font-extrabold tracking-[-0.02em]">{view.name}</h1>
                  <div className="mt-0.5 truncate text-[13px] text-ink-2">
                    {view.range} · {view.stops.length} {view.stops.length === 1 ? "destino" : "destinos"}
                  </div>
                </>
              )}
            </div>
            {tab === "trip" && <NightsRing view={view} label="noches planeadas" />}
          </div>
          <div className="mt-3.5 flex min-w-0 items-center gap-2">
            <button type="button" onClick={onMembers} aria-label="Integrantes" className="flex h-11 shrink-0 items-center rounded-full border border-line bg-white px-1.5">
              {members.slice(0, 5).map((m, i) => (
                <span
                  key={m.id}
                  className="flex size-[30px] items-center justify-center rounded-full border-2 border-white text-[10px] font-extrabold text-white"
                  style={{ background: m.color, marginLeft: i ? -9 : 0 }}
                >
                  {m.initials}
                </span>
              ))}
            </button>
            <div className="min-w-0 flex-1" />
            {tab === "trip" && (
              <button type="button" onClick={() => onTab("expenses")} className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold">
                <Wallet size={17} /> Gastos
              </button>
            )}
            <button type="button" onClick={onCalendar} aria-label="Calendario" className={iconButton}>
              <Calendar size={18} />
            </button>
            <button type="button" aria-label="Compartir" className={iconButton}>
              <Share size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => (tab === "expenses" ? onAddExpense() : onAddCity())}
                className="bg-pink flex h-11 shrink-0 items-center rounded-full px-5 text-sm font-bold whitespace-nowrap text-white"
              >
                {tab === "expenses" ? "Agregar gasto" : "Agregar ciudad"}
              </button>
            )}
          </div>
        </header>

        <div className="absolute inset-x-0 bottom-0" style={{ top: WEB_HEADER_HEIGHT }}>
          {tab === "expenses" ? (
            expenses
          ) : (
            <div className="h-full overflow-x-hidden overflow-y-auto px-11 pt-6 pb-20 [isolation:isolate]">
              {view.stops.length === 0 ? (
                <div className="rounded-card border-[1.5px] border-dashed border-dash p-8 text-center">
                  <div className="text-base font-bold">Todavía no hay ciudades</div>
                  <p className="mt-1 text-sm text-ink-2">Cargá la primera y después las que siguen, con sus noches. Las fechas se calculan solas.</p>
                  {canEdit && (
                    <button type="button" onClick={() => onAddCity(null)} className="bg-pink mt-4 h-12 rounded-button px-6 text-[15px] font-bold text-white">
                      Agregar la primera ciudad
                    </button>
                  )}
                </div>
              ) : (
                <Grid
                  stops={view.stops}
                  canEdit={canEdit}
                  nightsFrozen={nightsFrozen}
                  onHover={setHovered}
                  onOpenCity={onOpenCity}
                  onOpenLeg={onOpenLeg}
                  onNights={onNights}
                  onLock={onLock}
                  onDelete={onDelete}
                />
              )}
              {view.stops.length > 0 && <div className="mt-10 text-center text-[13px] font-bold text-ink-2">{view.returnText}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-y-4 right-4 left-[58%] overflow-hidden rounded-[24px]">
        <TripMap points={points} visibleTop={16} visibleBottom={100000} onPinClick={onOpenCity} highlightStopId={hovered} focusStopId={focusStopId} />
      </div>
    </div>
  );
}

type CardHandlers = {
  canEdit: boolean;
  nightsFrozen: (stopId: string) => boolean;
  onHover: (stopId: string | null) => void;
  onOpenCity: (stopId: string) => void;
  onOpenLeg: (fromStopId: string) => void;
  onNights: (stopId: string, delta: number) => void;
  onLock: (stopId: string) => void;
  onDelete: (stopId: string) => void;
};

// La grilla en zigzag del diseño: las filas pares van de izquierda a derecha y las impares vuelven.
function Grid({ stops, ...handlers }: { stops: StopView[] } & CardHandlers) {
  const box = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setCols(Math.max(2, Math.min(4, Math.floor((el.clientWidth + COL_GAP) / (COL_MIN + COL_GAP)))));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: COL_GAP, rowGap: ROW_GAP }}>
      {stops.map((stop, i) => (
        <WebStopCard key={stop.id} stop={stop} index={i} last={i === stops.length - 1} cols={cols} {...handlers} />
      ))}
    </div>
  );
}

function WebStopCard({
  stop,
  index: i,
  last,
  cols,
  canEdit,
  nightsFrozen,
  onHover,
  onOpenCity,
  onOpenLeg,
  onNights,
  onLock,
  onDelete,
}: { stop: StopView; index: number; last: boolean; cols: number } & CardHandlers) {
  const row = Math.floor(i / cols);
  const even = row % 2 === 0;
  const col = i % cols;
  const rowStart = col === 0;
  const rowEnd = col === cols - 1 || last;
  // El riel de arriba: hacia la ciudad anterior y la siguiente, y en las puntas de la fila se mete
  // en el hueco para encontrarse con la línea que baja (igual que el diseño).
  const prevEdge = i > 0 ? (rowStart ? "-28px" : "0") : "50%";
  const nextEdge = !last ? (rowEnd ? "-28px" : "0") : "50%";
  const railLeft = even ? prevEdge : nextEdge;
  const railRight = even ? nextEdge : prevEdge;
  const goesDown = !last && col === cols - 1;
  const crossesGap = !last && col !== cols - 1;

  const leg = stop.leg;
  const Icon = leg ? MODE_ICON[leg.mode] : Plus;
  const frozen = nightsFrozen(stop.id);

  return (
    <div
      onMouseEnter={() => onHover(stop.id)}
      onMouseLeave={() => onHover(null)}
      className="group relative flex min-w-0 flex-col gap-2.5 pt-[50px]"
      style={{ gridRow: row + 1, gridColumn: (even ? col : cols - 1 - col) + 1 }}
    >
      <div className="absolute top-[17px]" style={{ left: railLeft, right: railRight, borderTop: DOTS }} />
      <div className="absolute top-9 left-1/2 h-3.5" style={{ borderLeft: DOTS }} />
      <button
        type="button"
        onClick={() => onOpenCity(stop.id)}
        aria-label={`Destino ${stop.number}`}
        className="bg-navy absolute top-0 left-1/2 z-[3] flex h-9 min-w-9 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white px-2.5 text-sm font-extrabold text-white shadow-[0_4px_12px_rgb(0_0_0/0.22)]"
      >
        {stop.number}
      </button>
      {(leg || canEdit) && (
        <button
          type="button"
          onClick={() => onOpenLeg(stop.id)}
          aria-label={leg ? `Tramo · ${leg.text}` : stop.legEmptyLabel}
          title={leg?.timeZoneChange ?? undefined}
          className="absolute top-0 z-[2] flex h-9"
          style={{ width: "calc(50% + 10px)", left: even ? "calc(50% + 24px)" : "auto", right: even ? "auto" : "calc(50% + 24px)", justifyContent: even ? "flex-start" : "flex-end" }}
        >
          <span
            className={`flex h-9 max-w-full items-center gap-1.5 overflow-hidden rounded-full bg-white pr-2.5 pl-1 text-xs font-bold whitespace-nowrap shadow-[0_2px_8px_rgb(0_0_0/0.1)] ${leg ? "border border-line text-ink" : "border-[1.5px] border-dashed border-dots text-ink-2"}`}
          >
            <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full ${leg ? MODE_CLASS[leg.mode] : "bg-surface text-ink-2"}`}>
              <Icon size={14} />
              {leg?.timeZoneChange && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border-2 border-white bg-orange text-[8px] font-black text-white">!</span>
              )}
            </span>
            <span className="truncate">{leg ? leg.text : last ? "Vuelta" : "Agregar"}</span>
          </span>
        </button>
      )}
      {goesDown && (
        <div className="absolute top-[18px] z-[2] w-0" style={{ height: `calc(100% + ${ROW_GAP}px)`, borderLeft: DOTS, left: even ? "auto" : "-29px", right: even ? "-29px" : "auto" }} />
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenCity(stop.id)}
          aria-label={stop.name}
          className="relative block aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-cover bg-center shadow-[0_6px_18px_rgb(0_0_0/0.1)]"
          style={{ backgroundColor: stop.tint, backgroundImage: stop.photoUrl ? `url("${stop.photoUrl}")` : undefined }}
        >
          {!stop.photoUrl && <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tracking-[0.04em] text-white">{stop.code}</span>}
          <span className="absolute top-3 right-3 flex h-[30px] items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 text-xs font-bold text-ink backdrop-blur-[14px]">
            {stop.locked && <Lock size={12} className="text-navy" />}
            {stop.nights} {stop.nightsLabel}
          </span>
          {stop.stay && (
            <span
              className={`absolute bottom-3 left-3 flex h-[30px] max-w-[calc(100%-24px)] items-center gap-1.5 overflow-hidden rounded-full bg-white/[.88] pr-3 pl-[9px] text-xs font-bold whitespace-nowrap backdrop-blur-[14px] ${stop.stay.paid ? "text-success" : "text-ink-2"}`}
            >
              <Bed size={14} className="shrink-0" />
              <span className="truncate">{stop.stay.text}</span>
            </span>
          )}
        </button>
        {/* Bloquear y borrar (decisión 042): en la compu no se desliza, aparecen al pasar el mouse. */}
        {canEdit && (
          <span className="absolute top-3 left-3 hidden gap-1.5 group-hover:flex">
            <button
              type="button"
              aria-label={stop.locked ? `Desbloquear ${stop.name}` : `Bloquear ${stop.name}`}
              title={stop.locked ? "Desbloquear" : "Bloquear"}
              onClick={() => onLock(stop.id)}
              className="flex size-[30px] items-center justify-center rounded-full border border-white/80 bg-white/90 text-navy backdrop-blur-[14px]"
            >
              {stop.locked ? <LockOpen size={14} /> : <Lock size={14} />}
            </button>
            {!stop.locked && (
              <button
                type="button"
                aria-label={`Borrar ${stop.name}`}
                title="Borrar"
                onClick={() => onDelete(stop.id)}
                className="flex size-[30px] items-center justify-center rounded-full border border-white/80 bg-white/90 text-danger backdrop-blur-[14px]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </span>
        )}
        {crossesGap && <div className="absolute -top-[33px] z-[2] h-0" style={{ width: COL_GAP, borderTop: DOTS, left: even ? "100%" : "auto", right: even ? "auto" : "100%" }} />}
      </div>

      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onOpenCity(stop.id)} className="min-w-0 text-left">
          <div className="truncate text-base font-bold">{stop.name}</div>
          <div className="mt-0.5 text-sm text-ink-2">{stop.dates}</div>
          {stop.country && <div className="mt-px text-[13px] text-ink-3">{stop.country}</div>}
        </button>
        {canEdit && !stop.locked ? (
          <div className="flex shrink-0 items-center rounded-full border border-line" style={{ opacity: frozen ? 0.4 : 1 }}>
            <button type="button" aria-label="Menos noches" onClick={() => onNights(stop.id, -1)} className="flex size-[34px] items-center justify-center" style={{ opacity: stop.nights === 0 ? 0.35 : 1 }}>
              <Minus size={14} />
            </button>
            <span className="min-w-4 text-center text-sm font-extrabold">{stop.nights}</span>
            <button type="button" aria-label="Más noches" onClick={() => onNights(stop.id, 1)} className="flex size-[34px] items-center justify-center">
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <span className="flex h-[34px] shrink-0 items-center gap-1.5 text-sm font-bold">
            {stop.locked && <Lock size={14} />}
            {stop.nights === 0 ? "De paso" : `${stop.nights} ${stop.nightsLabel}`}
          </span>
        )}
      </div>
    </div>
  );
}
