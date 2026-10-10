"use client";

import { ArrowLeftRight, Bed, Bus, Calendar, Car, ChevronDown, ChevronLeft, ChevronRight, Clock, Ellipsis, House, Lock, MapPin, Minus, Plane, Plus, Receipt, Route, Ticket, TrainFront, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteLock, lockMessage, nightsLock } from "@/lib/stop-lock";
import { foldLabel, myPart } from "@/lib/my-part";
import { formatWeekday } from "@/lib/dates";
import type { SaveExpenseInput, SaveLegInput, SaveStopInput } from "@/app/viaje/[id]/actions";
import { buildExpensesView, type ExpenseRowView, type TransferView } from "@/lib/expenses-view";
import type { ChipDisplay } from "@/lib/legs";
import type { Place } from "@/lib/places";
import { fileKind, sortTickets, ticketTitle } from "@/lib/attachments";
import { addLinkAttachment, deleteAttachment, signedUrl, uploadAttachment, type AttachmentTarget } from "@/lib/supabase/attachments";
import { initialsFor, pickColor } from "@/lib/members";
import type { Activity, Attachment, Expense, Leg, LegAttachment, LegMode, Member, MemberRole, Stay, Trip } from "@/lib/trip-types";
import { buildTripView, type StopView } from "@/lib/trip-view";
import type { TripTab } from "../trip-tabs";
import { CitySheet } from "./city-sheet";
import { CitySearchSheet, type CitySearchMode } from "./city-search-sheet";
import { LegSheet, type LegDraft } from "./leg-sheet";
import { ExpenseSheet } from "./expense-sheet";
import type { PersonalData } from "@/lib/personal";
import { ExpensesScreen } from "./expenses-screen";
import type { PersonalActions } from "./personal-expenses";
import { MembersSheet } from "./members-sheet";
import { TransferSheet, type TransferInput } from "./transfer-sheet";
import type { AttachmentInput } from "./attachment-controls";
import { TicketViewer, type ViewerItem } from "./ticket-viewer";
import { SwipeRow, type SwipeSide } from "./swipe-row";
import { NightsRing } from "./nights-ring";
import { WebTrip } from "./web-trip";
import { SheetPanelContext } from "../bottom-sheet";
import { useIsWeb } from "@/lib/use-is-web";
import { CalendarSheet, type CalendarMode } from "./calendar-sheet";
import { arrivalChange } from "@/lib/calendar";
import { TripMap } from "./trip-map";
import { useDragSheet } from "./use-drag-sheet";

// Pantalla 01 · Viaje (docs/diseño.md): mapa de fondo y la lista de ciudades encima como sheet.

const WEB_SHEET_PANEL = { left: "0px", width: "58%" };
const LIST_TOP = 340; // donde arranca la lista; el resto de arriba es mapa
const PEEK = 170; // lo que se ve de la lista abajo del todo (rayita + "Empieza el viaje" + aire para los botones de abajo)

const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};
export function TripScreen({
  trip,
  chipDisplay,
  myMemberId,
  saveNights,
  saveLeg,
  saveStop,
  deleteStop,
  setMemberRole,
  findPlaces,
  addStop,
  changeStopPlace,
  saveExpense,
  deleteExpense,
  settleDebt,
  undoSettlement,
  deleteTrip,
  setStopLocked,
  addMember,
  personal = null,
  personalActions,
}: {
  trip: Trip;
  chipDisplay: ChipDisplay;
  myMemberId: string | null;
  /** Guardan en la base. Sin esto (en /demo) los cambios quedan solo en pantalla. */
  saveNights?: (stopId: string, nights: number) => Promise<{ error: string } | null>;
  setStopLocked?: (stopId: string, locked: boolean) => Promise<{ error: string } | null>;
  addMember?: (tripId: string, name: string) => Promise<{ member: Member } | { error: string }>;
  saveLeg?: (input: SaveLegInput) => Promise<{ error: string } | { legId: string }>;
  saveStop?: (input: SaveStopInput) => Promise<{ error: string } | { stayId: string | null }>;
  deleteStop?: (stopId: string) => Promise<{ error: string } | null>;
  setMemberRole?: (memberId: string, role: "editor" | "viewer") => Promise<{ error: string } | null>;
  findPlaces?: (query: string) => Promise<Place[]>;
  addStop?: (tripId: string, afterStopId: string | null, place: Place) => Promise<{ id: string } | { error: string }>;
  changeStopPlace?: (stopId: string, place: Place) => Promise<{ error: string } | null>;
  saveExpense?: (input: SaveExpenseInput) => Promise<{ id: string } | { error: string }>;
  deleteExpense?: (expenseId: string) => Promise<{ error: string } | null>;
  settleDebt?: (tripId: string, from: string, to: string, amountCents: number, note?: string | null) => Promise<{ id: string } | { error: string }>;
  undoSettlement?: (settlementId: string) => Promise<{ error: string } | null>;
  deleteTrip?: (tripId: string) => Promise<{ error: string } | null>;
  /** Tus gastos personales (decisión 076); null si la base no tiene la migración 0010. */
  personal?: PersonalData | null;
  personalActions?: PersonalActions;
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
  const [openMembers, setOpenMembers] = useState(false);
  const [citySearch, setCitySearch] = useState<CitySearchMode | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [tab, setTab] = useState<TripTab>("trip");
  // Gasto abierto: "new" para uno nuevo, o el id del que se edita.
  const [openExpense, setOpenExpense] = useState<string | null>(null);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [calendar, setCalendar] = useState<CalendarMode | null>(null);
  // Tu parte del viaje (decisión 054): lo de antes de que llegues y después de que te vas, plegado.
  const [showBefore, setShowBefore] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  // Versión web desde 1100 px: dos paneles (web-trip.tsx). Los sheets y avisos son los mismos.
  const isWeb = useIsWeb();
  // Deslizar ciudades (decisión 042): cuál está abierta, las borradas que todavía se pueden
  // deshacer, y el aviso de abajo.
  const [swiped, setSwiped] = useState<{ stopId: string; side: SwipeSide } | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [toast, setToast] = useState<{ id: number; text: string; action?: { label: string; run: () => void } } | null>(null);
  const today = localToday();
  // Visor de pasajes y comprobantes (pantalla 03).
  const [viewer, setViewer] = useState<{ title: string; items: ViewerItem[]; startIndex: number; wallet: boolean; airlineUrl?: string | null } | null>(null);
  // Permisos (decisión 034): "solo ver" no ve los controles de edición y los sheets se abren en modo lectura.
  const myRole = current.members.find((m) => m.id === myMemberId)?.role ?? "viewer";
  const canEdit = myRole === "admin" || myRole === "editor";
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Abajo del todo se ven la rayita y "Empieza el viaje" por encima del control Viaje / Gastos y del +.
  const { top: sheetTop, animating: sheetAnimating, toggle: toggleSheet } = useDragSheet(sheetRef, listRef, LIST_TOP, PEEK);

  // De la posición de la lista salen el header blanco, las esquinas y el margen de arriba (como en el diseño).
  const headerOpacity = Math.min(1, Math.max(0, 1 - sheetTop / 112));
  const sheetRadius = Math.min(28, sheetTop);
  const openness = 1 - sheetTop / LIST_TOP; // 0 abajo, 1 arriba del todo
  const [, startTransition] = useTransition();

  /** Con `receipt`, después de guardar le sube la reserva que se eligió antes de que existiera el alojamiento. */
  async function storeStop(input: SaveStopInput, stay: Stay | null, receipt?: File): Promise<string | null> {
    let stayId = stay?.id ?? null;
    if (saveStop) {
      const result = await saveStop(input);
      if ("error" in result) return result.error;
      stayId = result.stayId ?? stayId;
      router.refresh();
    }
    setCurrent((t) => ({
      ...t,
      stops: t.stops.map((s) => (s.id === input.stopId ? { ...s, member_ids: input.memberIds, notes: input.notes || null } : s)),
      stays: [...t.stays.filter((s) => s.stop_id !== input.stopId), ...(stay && stayId ? [{ ...stay, id: stayId }] : [])],
    }));
    if (receipt && stayId) return addAttachment({ kind: "stay", tripId: trip.id, stayId }, { file: receipt });
    return null;
  }

  // Agregar una ciudad (o cambiar la de una parada) con lo que se eligió en el buscador.
  async function pickPlace(place: Place, afterStopId: string | null): Promise<string | null> {
    if (citySearch?.kind === "change") {
      const stopId = citySearch.stopId;
      if (changeStopPlace) {
        const result = await changeStopPlace(stopId, place);
        if (result) return result.error;
        router.refresh();
      }
      setCurrent((t) => ({
        ...t,
        stops: t.stops.map((s) =>
          s.id === stopId
            ? { ...s, city: place.name, country: place.country, country_code: place.countryCode, code: place.code, lat: place.lat, lng: place.lng, timezone: place.timezone, photo_url: null }
            : s,
        ),
      }));
      return null;
    }

    // Entra con 2 noches: antes de una ciudad bloqueada le correría las fechas (decisión 042).
    const afterPosition = current.stops.find((s) => s.id === afterStopId)?.position ?? -1;
    const lockedAfter = [...current.stops].sort((a, b) => a.position - b.position).find((s) => s.locked && s.position > afterPosition);
    if (lockedAfter) return `${lockedAfter.city} está bloqueada y sus fechas no se pueden correr. Agregá la ciudad después.`;

    let id = `nueva-${Date.now()}`;
    if (addStop) {
      const result = await addStop(trip.id, afterStopId, place);
      if ("error" in result) return result.error;
      id = result.id;
      router.refresh();
    }
    // Como en la base: se corre el resto, copia las personas de la anterior y se borra el tramo que salía de ella.
    setCurrent((t) => {
      const after = t.stops.find((s) => s.id === afterStopId);
      const position = after ? after.position + 1 : 0;
      const stop = {
        id,
        position,
        city: place.name,
        country: place.country,
        country_code: place.countryCode,
        code: place.code,
        tagline: null,
        notes: null,
        nights: 2,
        timezone: place.timezone,
        lat: place.lat,
        lng: place.lng,
        photo_url: null,
        locked: false,
        member_ids: after ? after.member_ids : t.members.map((m) => m.id),
      };
      return {
        ...t,
        stops: [...t.stops.map((s) => (s.position >= position ? { ...s, position: s.position + 1 } : s)), stop],
        legs: after ? t.legs.filter((l) => l.from_stop_id !== after.id) : t.legs,
      };
    });
    setOpenCity(id);
    return null;
  }

  // ─── Pasajes y comprobantes ───
  // En la app real el archivo va directo a Storage; en /demo queda en el navegador (local_url).
  const live = !!saveLeg;

  async function addAttachment(target: AttachmentTarget, input: AttachmentInput): Promise<string | null> {
    let attachment: Attachment | LegAttachment;
    if (live) {
      const result = "file" in input ? await uploadAttachment(target, input.file, myMemberId) : await addLinkAttachment(target, input.url, myMemberId);
      if ("error" in result) return result.error;
      attachment = result.attachment;
      router.refresh();
    } else {
      const kind = "file" in input ? fileKind(input.file) : "link";
      if (!kind) return "Tiene que ser un PDF o una imagen.";
      attachment = {
        id: `adjunto-${Date.now()}`,
        kind,
        storage_path: null,
        url: "url" in input ? input.url : null,
        file_name: "file" in input ? input.file.name : null,
        size_bytes: "file" in input ? input.file.size : null,
        local_url: "file" in input ? URL.createObjectURL(input.file) : undefined,
      };
    }
    setCurrent((t) =>
      target.kind === "leg"
        ? { ...t, legs: t.legs.map((l) => (l.id === target.legId ? { ...l, attachments: [...l.attachments, { member_id: target.memberId, ...attachment }] } : l)) }
        : { ...t, stays: t.stays.map((s) => (s.id === target.stayId ? { ...s, attachments: [...s.attachments, attachment] } : s)) },
    );
    return null;
  }

  async function removeAttachment(kind: "leg" | "stay", parentId: string, attachment: Attachment): Promise<string | null> {
    if (live) {
      const message = await deleteAttachment(kind, attachment);
      if (message) return message;
      router.refresh();
    }
    setCurrent((t) =>
      kind === "leg"
        ? { ...t, legs: t.legs.map((l) => (l.id === parentId ? { ...l, attachments: l.attachments.filter((a) => a.id !== attachment.id) } : l)) }
        : { ...t, stays: t.stays.map((s) => (s.id === parentId ? { ...s, attachments: s.attachments.filter((a) => a.id !== attachment.id) } : s)) },
    );
    return null;
  }

  const attachmentUrl = useCallback(
    async (a: Attachment) => a.local_url ?? (live && a.storage_path ? signedUrl(a.storage_path) : null),
    [live],
  );

  /** Abre el visor con los pasajes del tramo que sale de esa parada, en el pedido (o el tuyo). */
  function viewTickets(fromStopId: string, ticketId?: string) {
    const leg = current.legs.find((l) => l.from_stop_id === fromStopId);
    if (!leg?.attachments.length) return setOpenLeg(fromStopId);
    const stops = [...current.stops].sort((a, b) => a.position - b.position);
    const i = stops.findIndex((s) => s.id === fromStopId);
    // Los links van en "Abrir en la web de la aerolínea"; si solo hay links, se muestran igual.
    const files = leg.attachments.filter((a) => a.kind !== "link");
    const tickets = sortTickets(files.length ? files : leg.attachments, myMemberId, current.members);
    const items = tickets.map((a) => ({ attachment: a, title: a.kind === "link" ? "Link" : ticketTitle(a.member_id, myMemberId, current.members) }));
    const start = Math.max(0, ticketId ? items.findIndex((it) => it.attachment.id === ticketId) : 0);
    const airlineUrl = leg.attachments.find((a) => a.kind === "link")?.url ?? null;
    setViewer({ title: `${stops[i]?.city ?? ""} → ${stops[i + 1]?.city ?? "casa"}`, items, startIndex: start, wallet: true, airlineUrl });
  }

  function viewStayAttachment(stayId: string, attachmentId: string) {
    const stay = current.stays.find((s) => s.id === stayId);
    if (!stay) return;
    const items = stay.attachments.map((a) => ({ attachment: a, title: "Comprobante" }));
    setViewer({ title: stay.name ?? "Alojamiento", items, startIndex: Math.max(0, items.findIndex((it) => it.attachment.id === attachmentId)), wallet: false });
  }

  // En /demo no hay base que anote el historial (migración 0006): se anota acá.
  function logDemo(entry: Pick<Activity, "action" | "description" | "amount_cents"> & Partial<Activity>) {
    if (saveExpense) return;
    const me = current.members.find((m) => m.id === myMemberId);
    const activity: Activity = {
      id: `local-${Date.now()}`,
      actor_member_id: myMemberId,
      actor_name: me?.display_name ?? null,
      from_name: null,
      to_name: null,
      previous_amount_cents: null,
      changes: null,
      created_at: new Date().toISOString(),
      ...entry,
    };
    setCurrent((t) => ({ ...t, activity: [activity, ...t.activity] }));
  }

  async function storeExpense(input: SaveExpenseInput): Promise<string | null> {
    let id = input.id ?? `nuevo-${Date.now()}`;
    if (saveExpense) {
      const result = await saveExpense(input);
      if ("error" in result) return result.error;
      id = result.id;
      router.refresh();
    }
    const before = current.expenses.find((e) => e.id === input.id);
    const description = input.description.trim() || "Gasto";
    if (!before) logDemo({ action: "expense_added", description, amount_cents: input.amountCents });
    else {
      const sameSplit = JSON.stringify([...before.splits].sort((a, b) => a.member_id.localeCompare(b.member_id))) ===
        JSON.stringify([...input.splits].sort((a, b) => a.member_id.localeCompare(b.member_id)));
      const changes = [
        before.amount_cents !== input.amountCents && "amount",
        before.description !== description && "description",
        before.paid_by_member_id !== input.paidByMemberId && "payer",
        !sameSplit && before.amount_cents === input.amountCents && "split",
        before.stop_id !== input.stopId && "city",
        before.category !== input.category && "category",
      ].filter((c): c is string => !!c);
      if (changes.length) {
        logDemo({ action: "expense_edited", description, amount_cents: input.amountCents, previous_amount_cents: before.amount_cents, changes });
      }
    }
    setCurrent((t) => {
      const previous = t.expenses.find((e) => e.id === input.id);
      const expense: Expense = {
        id,
        stop_id: input.stopId,
        leg_id: null,
        stay_id: null,
        description: input.description.trim() || "Gasto",
        category: input.category,
        amount_cents: input.amountCents,
        paid_by_member_id: input.paidByMemberId,
        created_at: previous?.created_at ?? new Date().toISOString(),
        splits: input.splits,
      };
      return { ...t, expenses: [...t.expenses.filter((e) => e.id !== input.id), expense] };
    });
    return null;
  }

  async function removeExpense(expenseId: string): Promise<string | null> {
    if (deleteExpense) {
      const result = await deleteExpense(expenseId);
      if (result) return result.error;
      router.refresh();
    }
    const gone = current.expenses.find((e) => e.id === expenseId);
    if (gone) logDemo({ action: "expense_deleted", description: gone.description, amount_cents: gone.amount_cents });
    setCurrent((t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) }));
    return null;
  }

  // "Marcar como saldado" y "Registrar una transferencia" guardan lo mismo: un pago entre dos.
  async function settle(transfer: Pick<TransferView, "from" | "to" | "amountCents">, note: string | null = null): Promise<string | null> {
    let id = `saldo-${Date.now()}`;
    if (settleDebt) {
      const result = await settleDebt(trip.id, transfer.from, transfer.to, transfer.amountCents, note);
      if ("error" in result) return result.error;
      id = result.id;
      router.refresh();
    }
    const name = (memberId: string) => current.members.find((m) => m.id === memberId)?.display_name ?? null;
    logDemo({ action: "settled", description: note?.trim() || null, amount_cents: transfer.amountCents, from_name: name(transfer.from), to_name: name(transfer.to) });
    const settlement = {
      id,
      from_member_id: transfer.from,
      to_member_id: transfer.to,
      amount_cents: transfer.amountCents,
      settled_at: new Date().toISOString(),
      note: note?.trim() || null,
    };
    setCurrent((t) => ({ ...t, settlements: [...t.settlements, settlement] }));
    return null;
  }

  async function undoSettle(settlementId: string): Promise<string | null> {
    if (undoSettlement) {
      const result = await undoSettlement(settlementId);
      if (result) return result.error;
      router.refresh();
    }
    const undone = current.settlements.find((s) => s.id === settlementId);
    if (undone) {
      const name = (memberId: string) => current.members.find((m) => m.id === memberId)?.display_name ?? null;
      logDemo({ action: "settle_undone", description: undone.note, amount_cents: undone.amount_cents, from_name: name(undone.from_member_id), to_name: name(undone.to_member_id) });
    }
    setCurrent((t) => ({ ...t, settlements: t.settlements.filter((s) => s.id !== settlementId) }));
    return null;
  }

  function editExpenseRow(row: ExpenseRowView) {
    const target = row.editTarget;
    if (target.kind === "leg") setOpenLeg(target.fromStopId);
    else if (target.kind === "stay") setOpenCity(target.stopId);
    else if (canEdit) setOpenExpense(target.id);
  }

  async function changeRole(memberId: string, role: MemberRole): Promise<string | null> {
    if (role === "admin") return "Solo hay un organizador.";
    if (setMemberRole) {
      const result = await setMemberRole(memberId, role);
      if (result) return result.error;
      router.refresh();
    }
    setCurrent((t) => ({ ...t, members: t.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }));
    return null;
  }

  const toastSeq = useRef(0);
  function showToast(text: string, action?: { label: string; run: () => void }) {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, action });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.action ? 5000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Borrar deslizando: la ciudad desaparece al toque y se borra de verdad a los 5 segundos,
  // salvo que se toque "Deshacer" (como en el diseño).
  function swipeDelete(stopId: string) {
    const stop = current.stops.find((s) => s.id === stopId);
    if (!stop) return;
    const blocked = deleteLock(current, stopId);
    if (blocked) return showToast(blocked);
    setHidden((h) => [...h, stopId]);
    const timer = setTimeout(async () => {
      deleteTimers.current.delete(stopId);
      const message = await removeStop(stopId);
      setHidden((h) => h.filter((id) => id !== stopId));
      if (message) showToast(message);
    }, 5000);
    deleteTimers.current.set(stopId, timer);
    showToast(`Borraste ${stop.city}`, {
      label: "Deshacer",
      run: () => {
        clearTimeout(deleteTimers.current.get(stopId));
        deleteTimers.current.delete(stopId);
        setHidden((h) => h.filter((id) => id !== stopId));
        setToast(null);
      },
    });
  }

  async function toggleLock(stopId: string): Promise<string | null> {
    const stop = current.stops.find((s) => s.id === stopId);
    if (!stop) return null;
    const locked = !stop.locked;
    if (setStopLocked) {
      const result = await setStopLocked(stopId, locked);
      if (result) {
        showToast(result.error);
        return result.error;
      }
      router.refresh();
    }
    setCurrent((t) => ({ ...t, stops: t.stops.map((s) => (s.id === stopId ? { ...s, locked } : s)) }));
    showToast(locked ? `${stop.city} quedó bloqueada: ya no se cambia nada, salvo los gastos.` : `Desbloqueaste ${stop.city}.`);
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

  /** Con `ticket`, después de guardar le sube el pasaje que se eligió antes de que existiera el tramo. */
  async function storeLeg(draft: LegDraft, description: string, ticket?: { file: File; memberId: string | null }): Promise<string | null> {
    let legId = draft.id ?? `nuevo-${draft.from_stop_id}`;
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
      if ("error" in result) return result.error;
      legId = result.legId;
      router.refresh();
    }
    setCurrent((t) => {
      const previous = t.legs.find((l) => l.from_stop_id === draft.from_stop_id);
      const leg: Leg = { ...draft, id: legId, attachments: previous?.attachments ?? [] };
      return { ...t, legs: [...t.legs.filter((l) => l.from_stop_id !== draft.from_stop_id), leg] };
    });
    if (ticket) return addAttachment({ kind: "leg", tripId: trip.id, legId, memberId: ticket.memberId }, { file: ticket.file });
    return null;
  }
  const listTrip = hidden.length ? { ...current, stops: current.stops.filter((s) => !hidden.includes(s.id)) } : current;
  const view = buildTripView(listTrip, { chipDisplay, myMemberId });
  // Tu parte del viaje: null si hacés el viaje entero (decisión 054).
  const part = myPart(listTrip.start_date, listTrip.stops, myMemberId);
  const listOrder = [...listTrip.stops].sort((a, b) => a.position - b.position);
  const partStopIds = part ? listOrder.slice(part.first, part.last + 1).map((s) => s.id) : null;
  const foldStopIds = part ? listOrder.filter((_, i) => i < part.first || i > part.last).map((s) => s.id) : [];

  function changeNights(stopId: string, delta: number) {
    const stop = current.stops.find((s) => s.id === stopId);
    if (!stop) return;
    const message = setNights(stopId, Math.max(0, Math.min(60, stop.nights + delta)));
    if (message) showToast(message);
  }

  /** Cambia las noches de una ciudad. Devuelve un mensaje si no se puede (bloqueada, ya pasó…). */
  function setNights(stopId: string, value: number): string | null {
    const stop = current.stops.find((s) => s.id === stopId);
    if (!stop || value === stop.nights) return null;
    const lock = nightsLock(current, stopId, today);
    if (lock) return lockMessage(lock, stop.city);
    setCurrent((t) => ({ ...t, stops: t.stops.map((s) => (s.id === stopId ? { ...s, nights: value } : s)) }));
    if (saveNights)
      startTransition(async () => {
        const result = await saveNights(stopId, value);
        if (result) {
          showToast(result.error);
          router.refresh();
        }
      });
    return null;
  }

  // Elegir el día de llegada en el calendario: cambian las noches de la ciudad anterior (decisión 020).
  async function pickArrival(stopId: string, date: string): Promise<string | null> {
    const change = arrivalChange(current, stopId, date);
    if ("error" in change) return change.error;
    return setNights(change.prevStopId, change.nights);
  }

  const points = [...current.stops]
    .sort((a, b) => a.position - b.position)
    .flatMap((s, i) => (s.lat != null && s.lng != null ? [{ lat: s.lat, lng: s.lng, label: String(i + 1), stopId: s.id, city: s.city }] : []));

  const ordered = [...current.stops].sort((a, b) => a.position - b.position);
  // "Agregar ciudad" desde el +: después de la última ciudad (decisión 068).
  const lastStop = ordered[ordered.length - 1]?.id ?? null;
  const expensesView = buildExpensesView(current, myMemberId);
  const firstMissingLeg = ordered.slice(0, -1).find((s) => !current.legs.some((l) => l.from_stop_id === s.id))?.id ?? null;

  const travellers = trip.members.length;

  return (
    // En la web, los sheets suben dentro del panel izquierdo, debajo del header (como en el diseño).
    <SheetPanelContext.Provider value={isWeb ? WEB_SHEET_PANEL : null}>
    <div className="fixed inset-0 overflow-hidden bg-white">
      {isWeb ? (
        <WebTrip
          view={view}
          members={current.members}
          points={points}
          tab={tab}
          onTab={setTab}
          canEdit={canEdit}
          nightsFrozen={(stopId) => !!nightsLock(current, stopId, today)}
          onOpenCity={setOpenCity}
          onOpenLeg={setOpenLeg}
          focusStopId={openCity}
          part={part}
          partStopIds={partStopIds}
          onAddCity={(afterStopId) => setCitySearch({ kind: "add", afterStopId: afterStopId === undefined ? lastStop : afterStopId })}
          onAddExpense={() => setOpenExpense("new")}
          onNights={changeNights}
          onLock={(stopId) => toggleLock(stopId)}
          onDelete={swipeDelete}
          onCalendar={() => setCalendar({ kind: "view" })}
          onMembers={() => setOpenMembers(true)}
          expenses={
            <ExpensesScreen
              tripName={current.name}
              view={expensesView}
              members={current.members}
              myMemberId={myMemberId}
              canEdit={canEdit}
              onEdit={editExpenseRow}
              onSettle={settle}
              onUndo={undoSettle}
              onTransfer={() => setOpenTransfer(true)}
              foldStopIds={foldStopIds}
              personal={{ tripId: trip.id, initial: personal, actions: personalActions }}
              embedded
            />
          }
        />
      ) : (
      <>
      <TripMap points={points} visibleTop={56} visibleBottom={LIST_TOP} onPinClick={setOpenCity} partStopIds={partStopIds} />


      {/* Header blanco: aparece de a poco cuando la lista llega arriba (el mapa deja de verse). */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-[2] border-b border-navy/[.07] bg-white/[.88] backdrop-blur-[20px] backdrop-saturate-[1.8] ${tab === "expenses" ? "hidden" : ""}`}
        style={{ height: "calc(var(--safe-top) + 64px)", opacity: headerOpacity }}
      />

      {/* Lista: se arrastra como en Google Maps (use-drag-sheet). Arriba queda el mapa libre para moverlo
          y hacer zoom. El contenido se scrollea recién con la lista arriba del todo, y pasa por debajo
          del header translúcido. */}
      <div
        ref={sheetRef}
        className={`absolute inset-x-0 bottom-0 z-[1] overflow-hidden bg-white shadow-[0_-6px_24px_rgb(0_0_0/0.14)] ${
          sheetAnimating ? "transition-[top,border-radius] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]" : ""
        }`}
        style={{ top: sheetTop, borderRadius: `${sheetRadius}px ${sheetRadius}px 0 0` }}
      >
        <div
          ref={listRef}
          className={`h-full overflow-x-hidden overscroll-contain px-4 select-none [scrollbar-width:none] ${sheetTop <= 0 ? "overflow-y-auto" : "overflow-y-hidden"}`}
          style={{
            paddingTop: `calc((var(--safe-top) + 64px) * ${openness})`,
            paddingBottom: "calc(var(--safe-bottom) + 120px)",
          }}
        >
          <button
            type="button"
            aria-label={sheetTop > 0 ? "Subir la lista" : "Bajar la lista"}
            onClick={toggleSheet}
            className="flex w-full justify-center pt-2 pb-2"
          >
            <div className="h-[5px] w-10 rounded-full bg-handle" />
          </button>

          <div className="flex items-center gap-3 pt-1.5">
            <div className="bg-navy ml-[22px] flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgb(0_0_0/0.25)]">
              <House size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{part && part.first > 0 ? `Empezás en ${part.firstCity}` : "Empieza el viaje"}</div>
              <div className="mt-0.5 text-xs font-bold tracking-[0.06em] text-ink-2">
                {part && part.first > 0 ? `${formatWeekday(part.arrival)} ${part.arrival.slice(0, 4)}`.toUpperCase() : view.startLabel}
              </div>
            </div>
            <NightsRing view={view} />
          </div>
          <Dots height={14} />

          {view.stops.length === 0 && (
            <div className="mx-1 mt-1 rounded-card border-[1.5px] border-dashed border-dash bg-white p-5 text-center">
              <div className="text-[15px] font-bold">Todavía no hay ciudades</div>
              <p className="mt-1 text-[13px] leading-[1.4] text-ink-2">Cargá la primera y después las que siguen, con sus noches. Las fechas se calculan solas.</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setCitySearch({ kind: "add", afterStopId: null })}
                  className="bg-pink mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-button text-[15px] font-bold text-white"
                >
                  <MapPin size={18} /> Agregar la primera ciudad
                </button>
              )}
            </div>
          )}

          {part && part.first > 0 && (
            <FoldRow
              title="Antes de que llegues"
              sub={foldLabel(view.stops.slice(0, part.first).map((s) => s.name))}
              open={showBefore}
              onToggle={() => setShowBefore((o) => !o)}
            />
          )}

          {view.stops.map((stop, i) => {
            const beforeHidden = !!part && i < part.first && !showBefore;
            const afterHidden = !!part && i > part.last && !showAfter;
            if (afterHidden) return null;
            // Plegado lo de antes: igual se ve el tramo que te trae a tu primera ciudad.
            if (beforeHidden)
              return i === part!.first - 1 ? (
                <LegRow
                  key={stop.id}
                  stop={stop}
                  canEdit={canEdit}
                  onOpen={() => setOpenLeg(stop.id)}
                  onTicket={() => (stop.leg?.hasTicket ? viewTickets(stop.id) : setOpenLeg(stop.id))}
                  onAddCity={() => setCitySearch({ kind: "add", afterStopId: stop.id })}
                />
              ) : null;
            return (
            <div key={stop.id}>
              <SwipeRow
                enabled={canEdit}
                locked={stop.locked}
                open={swiped?.stopId === stop.id ? swiped.side : null}
                onOpenChange={(side) => setSwiped(side ? { stopId: stop.id, side } : null)}
                onLock={() => toggleLock(stop.id)}
                onDelete={() => swipeDelete(stop.id)}
              >
                <StopCard
                  stop={stop}
                  canEdit={canEdit}
                  nightsFrozen={!!nightsLock(current, stop.id, today)}
                  onChange={(d) => changeNights(stop.id, d)}
                  onOpen={() => setOpenCity(stop.id)}
                />
              </SwipeRow>
              <LegRow
                stop={stop}
                canEdit={canEdit}
                onOpen={() => setOpenLeg(stop.id)}
                onTicket={() => (stop.leg?.hasTicket ? viewTickets(stop.id) : setOpenLeg(stop.id))}
                onAddCity={() => setCitySearch({ kind: "add", afterStopId: stop.id })}
              />
              {part && i === part.last && part.last < view.stops.length - 1 && (
                <FoldRow
                  title="Después de que te vas"
                  sub={foldLabel(view.stops.slice(part.last + 1).map((s) => s.name))}
                  open={showAfter}
                  onToggle={() => setShowAfter((o) => !o)}
                />
              )}
              {i === view.stops.length - 1 && (
                <div className="flex items-center gap-2.5 pl-7">
                  <span className="flex size-8 items-center justify-center rounded-full border border-navy/[.07] bg-white text-ink-2 shadow-card">
                    <House size={16} />
                  </span>
                  <span className="text-[13px] font-bold text-ink-2">{view.returnText}</span>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {tab === "expenses" && (
        <ExpensesScreen
          tripName={current.name}
          view={expensesView}
          members={current.members}
          myMemberId={myMemberId}
          canEdit={canEdit}
          onEdit={editExpenseRow}
          onSettle={settle}
          onUndo={undoSettle}
          onTransfer={() => setOpenTransfer(true)}
          foldStopIds={foldStopIds}
          personal={{ tripId: trip.id, initial: personal, actions: personalActions }}
          onBack={() => {
            setTab("trip");
            setFabOpen(false);
          }}
        />
      )}

      {/* Botones flotantes de arriba */}
      <div className={`pointer-events-none absolute inset-x-4 z-[3] h-11 ${tab === "expenses" ? "hidden" : ""}`} style={{ top: "calc(var(--safe-top) + 12px)" }}>
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
          <button
            type="button"
            aria-label="Gastos"
            onClick={() => {
              setTab("expenses");
              setFabOpen(false);
            }}
            className="glass pointer-events-auto flex size-11 items-center justify-center rounded-full"
          >
            <Wallet size={20} />
          </button>
          <button type="button" aria-label="Calendario del viaje" onClick={() => setCalendar({ kind: "view" })} className="glass pointer-events-auto flex size-11 items-center justify-center rounded-full">
            <Calendar size={20} />
          </button>
          {/* Con la lista arriba, estos dos se esconden para no taparla (como en el diseño). */}
          <button
            type="button"
            aria-label="Integrantes"
            onClick={() => setOpenMembers(true)}
            className={`glass relative flex size-11 items-center justify-center rounded-full ${headerOpacity > 0.5 ? "pointer-events-none" : "pointer-events-auto"}`}
            style={{ opacity: 1 - headerOpacity }}
          >
            <Users size={20} />
            <span className="absolute -top-[3px] -right-[3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-pink px-[5px] text-[10px] font-extrabold text-white">
              {travellers}
            </span>
          </button>
        </div>
      </div>

      {canEdit && fabOpen && (
        <>
          <button type="button" aria-label="Cerrar el menú" onClick={() => setFabOpen(false)} className="fixed inset-0 z-[3] bg-[rgb(15_16_18/0.38)]" />
          <div className="fixed inset-x-0 z-[4] flex flex-col items-center gap-2.5" style={{ bottom: "calc(var(--safe-bottom) + 90px)" }}>
            {(tab === "expenses"
              ? [
                  { label: "Agregar gasto", Icon: Receipt, onClick: () => setOpenExpense("new"), disabled: false },
                  { label: "Registrar transferencia", Icon: ArrowLeftRight, onClick: () => setOpenTransfer(true), disabled: false },
                ]
              : [
                  { label: "Agregar ciudad", Icon: MapPin, onClick: () => setCitySearch({ kind: "add", afterStopId: lastStop }), disabled: false },
                  { label: "Agregar tramo", Icon: Route, onClick: () => (firstMissingLeg ? setOpenLeg(firstMissingLeg) : undefined), disabled: !firstMissingLeg },
                  { label: "Agregar gasto", Icon: Receipt, onClick: () => setOpenExpense("new"), disabled: false },
                ]
            ).map(({ label, Icon, onClick, disabled }, k, all) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setFabOpen(false);
                  onClick();
                }}
                className="glass flex h-[52px] items-center gap-2.5 rounded-full pr-[18px] pl-2 text-[15px] font-bold disabled:opacity-50"
                // Aparecen de a una, de abajo hacia arriba (tuk, tuk, tuk).
                style={{ animation: `fab-pop 260ms cubic-bezier(.2,.9,.3,1.2) ${(all.length - 1 - k) * 70}ms both` }}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-navy/10 text-navy">
                  <Icon size={16} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {canEdit && (
      <button
        type="button"
        aria-expanded={fabOpen}
        onClick={() => setFabOpen((o) => !o)}
        className="fixed left-1/2 z-[4] flex h-11 -translate-x-1/2 items-center rounded-full bg-navy px-6 text-[15px] font-bold text-white shadow-[0_8px_24px_rgb(0_0_0/0.22)]"
        style={{ bottom: "calc(var(--safe-bottom) + 20px)" }}
      >
        {fabOpen ? "Cerrar" : "Agregar"}
      </button>
      )}

      </>
      )}

      {openCity && current.stops.some((s) => s.id === openCity) && (
        <CitySheet
          // Una ficha nueva por ciudad: si se cambia de ciudad con la ficha abierta (un pin del mapa,
          // el calendario), no se arrastran los datos de la anterior.
          key={openCity}
          trip={current}
          stopId={openCity}
          myMemberId={myMemberId}
          onClose={() => setOpenCity(null)}
          onNights={(d) => changeNights(openCity, d)}
          onOpenLeg={(fromStopId) => setOpenLeg(fromStopId)}
          onSave={storeStop}
          onDelete={removeStop}
          readOnly={!canEdit || !!current.stops.find((s) => s.id === openCity)?.locked}
          nightsEditable={canEdit && !nightsLock(current, openCity, today)}
          canPickArrival={(() => {
            // Se elige la llegada si se pueden cambiar las noches de la ciudad anterior.
            const ordered = [...current.stops].sort((a, b) => a.position - b.position);
            const i = ordered.findIndex((s) => s.id === openCity);
            return canEdit && i > 0 && !nightsLock(current, ordered[i - 1].id, today);
          })()}
          onOpenCalendar={(pick) => setCalendar(pick ? { kind: "pick", stopId: openCity } : { kind: "view", stopId: openCity })}
          onUnlock={canEdit ? () => toggleLock(openCity) : undefined}
          onChangePlace={() => setCitySearch({ kind: "change", stopId: openCity })}
          onAddReceipt={(stayId, input) => addAttachment({ kind: "stay", tripId: trip.id, stayId }, input)}
          onRemoveReceipt={(stayId, a) => removeAttachment("stay", stayId, a)}
          onViewReceipt={viewStayAttachment}
        />
      )}
      {openLeg && (
        <LegSheet
          key={openLeg}
          trip={current}
          fromStopId={openLeg}
          myMemberId={myMemberId}
          onClose={() => setOpenLeg(null)}
          onSave={storeLeg}
          onAddTicket={(legId, memberId, input) => addAttachment({ kind: "leg", tripId: trip.id, legId, memberId }, input)}
          onRemoveTicket={(legId, ticket) => removeAttachment("leg", legId, ticket)}
          onViewTicket={viewTickets}
          readOnly={!canEdit}
        />
      )}
      {citySearch && findPlaces && (
        <CitySearchSheet trip={current} mode={citySearch} onClose={() => setCitySearch(null)} search={findPlaces} onPick={pickPlace} />
      )}
      {openMembers && (
        <MembersSheet
          trip={current}
          myMemberId={myMemberId}
          balances={expensesView.balances}
          onClose={() => setOpenMembers(false)}
          onRoleChange={changeRole}
          onAddMember={async (name) => {
            let member: Member;
            if (addMember) {
              const result = await addMember(trip.id, name);
              if ("error" in result) return result.error;
              member = result.member;
              router.refresh();
            } else {
              if (!name.trim()) return "Escribí el nombre.";
              member = {
                id: `m-${Date.now()}`,
                display_name: name.trim(),
                initials: initialsFor(name),
                color: pickColor(current.members.map((m) => m.color)),
                user_id: null,
                role: "viewer",
              };
            }
            setCurrent((t) => ({
              ...t,
              members: [...t.members, member],
              stops: t.stops.map((s) => (s.locked ? s : { ...s, member_ids: [...s.member_ids, member.id] })),
            }));
            return null;
          }}
          onDeleteTrip={
            deleteTrip &&
            (async () => {
              const result = await deleteTrip(trip.id);
              if (result) return result.error;
              router.push("/");
              return null;
            })
          }
        />
      )}
      {openExpense && (
        <ExpenseSheet
          trip={current}
          expense={openExpense === "new" ? null : (current.expenses.find((e) => e.id === openExpense) ?? null)}
          myMemberId={myMemberId}
          onClose={() => setOpenExpense(null)}
          onSave={storeExpense}
          onDelete={removeExpense}
        />
      )}
      {calendar && (
        <CalendarSheet
          trip={hidden.length ? { ...current, stops: current.stops.filter((s) => !hidden.includes(s.id)) } : current}
          mode={calendar}
          today={today}
          onClose={() => setCalendar(null)}
          onOpenCity={(stopId) => {
            setCalendar(null);
            setOpenCity(stopId);
          }}
          onPickArrival={pickArrival}
        />
      )}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 z-[70] mx-auto flex max-w-[440px] items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-button"
          style={{ bottom: "calc(var(--safe-bottom) + 92px)" }}
        >
          <span className="min-w-0 flex-1 leading-[1.35]">{toast.text}</span>
          {toast.action && (
            <button type="button" onClick={toast.action.run} className="h-9 shrink-0 rounded-full px-2 text-sm font-extrabold text-toast-action">
              {toast.action.label}
            </button>
          )}
        </div>
      )}
      {viewer && (
        <TicketViewer
          title={viewer.title}
          items={viewer.items}
          startIndex={viewer.startIndex}
          wallet={viewer.wallet}
          airlineUrl={viewer.airlineUrl}
          getUrl={attachmentUrl}
          onClose={() => setViewer(null)}
        />
      )}
      {openTransfer && (
        <TransferSheet
          members={current.members}
          myMemberId={myMemberId}
          onClose={() => setOpenTransfer(false)}
          onSave={(input: TransferInput) => settle(input, input.note)}
        />
      )}
    </div>
    </SheetPanelContext.Provider>
  );
}

/** Fecha de hoy en el teléfono, como "YYYY-MM-DD". */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Bloque plegado de la parte del viaje que no hacés (decisión 054): se abre para mirarla.
function FoldRow({ title, sub, open, onToggle }: { title: string; sub: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <div className="absolute top-0 bottom-0 left-[43px] border-l-2 border-dotted border-dots" />
      <button type="button" onClick={onToggle} aria-expanded={open} className="relative flex w-full items-center gap-3 py-2.5 pr-3 text-left">
        <span className="ml-[22px] flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-dots bg-white text-ink-2">
          <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="block truncate text-[13px] text-ink-2">{sub}</span>
        </span>
        <span className="shrink-0 text-[13px] font-bold">{open ? "Ocultar" : "Ver"}</span>
      </button>
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

function StopCard({
  stop,
  canEdit,
  nightsFrozen,
  onChange,
  onOpen,
}: {
  stop: StopView;
  canEdit: boolean;
  /** No se pueden cambiar las noches (bloqueada, ya pasó o hay una bloqueada después): el stepper se atenúa. */
  nightsFrozen: boolean;
  onChange: (delta: number) => void;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${stop.name}`}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="relative flex cursor-pointer items-center gap-3 rounded-card bg-white py-[9px] pr-1 pl-3"
    >
      <div className="relative size-16 shrink-0">
        <div
          className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-cover bg-center text-[13px] font-extrabold tracking-[0.04em] text-white"
          style={{ backgroundColor: stop.tint, backgroundImage: stop.photoUrl ? `url("${stop.photoUrl}")` : undefined }}
        >
          {!stop.photoUrl && stop.code}
        </div>
        {/* Sin el número de la ciudad (decisión 052): el orden ya lo da la lista; en el mapa sigue. */}
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
      {stop.locked ? (
        <div className="flex shrink-0 items-center gap-2 pr-3" aria-label={`Bloqueada · ${stop.nights} ${stop.nightsLabel}`}>
          <Lock size={16} className="text-navy" />
          <div className="w-8 text-center">
            <div className="text-[17px] leading-none font-extrabold">{stop.nights}</div>
            <div className="mt-[3px] text-[10px] font-bold text-ink-2">{stop.nightsLabel}</div>
          </div>
        </div>
      ) : !canEdit ? (
        <div className="w-14 shrink-0 text-center">
          <div className="text-[17px] leading-none font-extrabold">{stop.nights}</div>
          <div className="mt-[3px] text-[10px] font-bold text-ink-2">{stop.nightsLabel}</div>
        </div>
      ) : (
      <div className="flex shrink-0 items-center" style={{ opacity: nightsFrozen ? 0.4 : 1 }}>
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
      )}
    </div>
  );
}

function LegRow({
  stop,
  canEdit,
  onOpen,
  onTicket,
  onAddCity,
}: {
  stop: StopView;
  canEdit: boolean;
  onOpen: () => void;
  onTicket: () => void;
  onAddCity: () => void;
}) {
  const leg = stop.leg;
  const Icon = leg ? MODE_ICON[leg.mode] : null;
  return (
    <div className="relative flex h-[54px] items-center">
      <div className="absolute top-0 bottom-0 left-[43px] border-l-2 border-dotted border-dots" />
      {canEdit ? (
        <button type="button" aria-label="Agregar ciudad acá" onClick={onAddCity} className="relative ml-[22px] flex size-11 shrink-0 items-center justify-center">
          <span className="flex size-[30px] items-center justify-center rounded-full border border-line bg-white text-navy shadow-[0_2px_6px_rgb(0_0_0/0.08)]">
            <Plus size={16} />
          </span>
        </button>
      ) : (
        <span className="ml-[22px] size-11 shrink-0" />
      )}
      {leg && Icon ? (
        <>
          <button type="button" onClick={onOpen} className="relative ml-1.5 flex h-11 min-w-0 items-center gap-2 rounded-full border border-line bg-white pr-3 pl-1.5">
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
          {(leg.hasTicket || canEdit) && (
          <button type="button" onClick={onTicket} aria-label={leg.hasTicket ? "Ver pasaje" : "Adjuntar pasaje"} className="relative ml-1.5 flex size-11 shrink-0 items-center justify-center">
            {leg.hasTicket ? (
              <span className="bg-navy flex size-[34px] items-center justify-center rounded-full text-white shadow-button">
                <Ticket size={16} />
              </span>
            ) : (
              <span className="flex size-[34px] items-center justify-center rounded-full border-[1.5px] border-dashed border-dots bg-white text-ink-3">
                <Ticket size={16} />
              </span>
            )}
          </button>
          )}
        </>
      ) : !canEdit ? (
        <span className="relative ml-1.5 flex h-11 items-center rounded-full border-[1.5px] border-dashed border-dots bg-white px-3.5 text-[13px] font-bold text-ink-3">Sin cargar</span>
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
