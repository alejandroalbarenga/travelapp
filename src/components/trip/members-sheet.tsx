"use client";

import { Link2, Trash2, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { formatEuros } from "@/lib/money";
import type { Member, MemberRole, Trip } from "@/lib/trip-types";
import { BottomSheet } from "../bottom-sheet";

// Pantalla 09 · Integrantes (docs/diseño.md) con los permisos de la decisión 034.
// El organizador elige para cada uno "Puede editar" o "Solo ver"; el resto solo ve la lista.

const ROLE_LABEL: Record<MemberRole, string> = { admin: "Organizador", editor: "Puede editar", viewer: "Solo ver" };

function partOfTrip(trip: Trip, member: Member): string {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const idx = stops.flatMap((s, i) => (s.member_ids.includes(member.id) ? [i] : []));
  if (!idx.length) return "Sin ciudades";
  if (idx.length === stops.length) return "Todo el viaje";
  const first = stops[idx[0]].city;
  const last = stops[idx[idx.length - 1]].city;
  if (idx[0] === 0) return `Hasta ${last}`;
  if (idx[idx.length - 1] === stops.length - 1) return `Desde ${first}`;
  return `De ${first} a ${last}`;
}

export function MembersSheet({
  trip,
  myMemberId,
  balances,
  onClose,
  onRoleChange,
  onDeleteTrip,
  onAddMember,
}: {
  trip: Trip;
  myMemberId: string | null;
  /** Neto de cada integrante en centavos (positivo: le deben). */
  balances: Record<string, number>;
  onClose: () => void;
  /** Cambia el permiso de un integrante. Devuelve un mensaje si falló. */
  onRoleChange: (memberId: string, role: MemberRole) => Promise<string | null>;
  /** Borra el viaje entero (solo el organizador). Sin esto no se ofrece. */
  onDeleteTrip?: () => Promise<string | null>;
  /** Suma un integrante sin cuenta (solo el organizador, decisión 044). */
  onAddMember?: (name: string) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function addMember() {
    if (!onAddMember) return;
    setError("");
    startTransition(async () => {
      const message = await onAddMember(newName);
      if (message) setError(message);
      else {
        setNewName("");
        setAdding(false);
      }
    });
  }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const me = trip.members.find((m) => m.id === myMemberId);
  const isAdmin = me?.role === "admin";
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function setRole(memberId: string, role: MemberRole) {
    setError("");
    startTransition(async () => {
      const message = await onRoleChange(memberId, role);
      if (message) setError(message);
    });
  }

  async function invite() {
    const url = `${window.location.origin}/invitacion/${trip.invite_code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Sumate a ${trip.name}`, url });
        return;
      } catch {
        // Si cancela la hoja de compartir, copiamos igual.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <BottomSheet onClose={onClose} label="Integrantes" top="auto" scrim={0.4}>
      {(close) => (
        <>
          <div className="flex items-center justify-between px-5 pt-2">
            <div>
              <div className="text-2xl font-extrabold tracking-[-0.02em]">Integrantes</div>
              <div className="mt-0.5 text-[13px] text-ink-2">
                {trip.members.length} {trip.members.length === 1 ? "viajero" : "viajeros"} · {trip.name}
              </div>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-full bg-surface">
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 [scrollbar-width:none]">
            <div className="border-y border-divider">
              {trip.members.map((m, i) => {
                const editable = isAdmin && m.role !== "admin";
                return (
                  <div key={m.id} className={`px-3.5 py-3 ${i ? "border-t border-divider" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: m.color }}>
                        {m.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold">
                          {m.display_name}
                          {m.id === myMemberId && " (vos)"}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-2">
                          {m.role === "admin" ? "Organizador · " : ""}
                          {partOfTrip(trip, m)}
                          {!m.user_id && " · todavía no entró"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-[13px] font-bold ${(balances[m.id] ?? 0) > 0 ? "text-success" : (balances[m.id] ?? 0) < 0 ? "text-danger" : "text-ink-2"}`}>
                          {(balances[m.id] ?? 0) > 0
                            ? `Le deben ${formatEuros(balances[m.id])}`
                            : (balances[m.id] ?? 0) < 0
                              ? `Debe ${formatEuros(-balances[m.id])}`
                              : "A mano"}
                        </div>
                        {!editable && m.role !== "admin" && <div className="mt-0.5 text-xs font-bold text-ink-3">{ROLE_LABEL[m.role]}</div>}
                      </div>
                    </div>
                    {editable && (
                      <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
                        {(["editor", "viewer"] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            disabled={pending}
                            onClick={() => m.role !== role && setRole(m.id, role)}
                            aria-pressed={m.role === role}
                            className={`h-9 rounded-full text-[13px] font-bold ${m.role === role ? "bg-white text-navy shadow-[0_2px_8px_rgb(0_0_0/0.12)]" : "text-ink-2"}`}
                          >
                            {ROLE_LABEL[role]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mx-1 mt-3 text-[13px] text-ink-2">
              {isAdmin
                ? "Quien entra con el link arranca como Solo ver: ve todo, pero no carga ni cambia nada."
                : me?.role === "viewer"
                  ? "Tenés permiso de Solo ver: podés ver todo, pero no cargar ni cambiar nada. Pedíselo al organizador si lo necesitás."
                  : "Solo el organizador puede cambiar los permisos."}
            </p>
            {isAdmin && onAddMember && (
              <div className="mt-3">
                {adding ? (
                  <div className="flex gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                      autoFocus
                      placeholder="Nombre, ej. Tomás"
                      aria-label="Nombre del integrante"
                      className="h-12 min-w-0 flex-1 rounded-field border border-line bg-white px-3.5 text-[15px] outline-none focus:border-navy"
                    />
                    <button type="button" disabled={pending} onClick={addMember} className="bg-pink h-12 shrink-0 rounded-field px-4 text-sm font-bold text-white disabled:opacity-70">
                      Agregar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-dash text-sm font-bold text-navy"
                  >
                    <UserPlus size={18} /> Agregar integrante
                  </button>
                )}
                <p className="mx-1 mt-2 text-xs leading-[1.4] text-ink-3">
                  Queda en el viaje aunque todavía no haya entrado: le podés cargar gastos. Cuando entre con el link, elige su nombre.
                </p>
              </div>
            )}
            {error && <p className="mx-1 mt-2 text-[13px] font-bold text-danger">{error}</p>}
          </div>

          <div className="px-5 pt-4" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            <button
              type="button"
              onClick={invite}
              className="bg-pink flex h-14 w-full items-center justify-center gap-2.5 rounded-button text-base font-bold text-white"
            >
              <Link2 size={20} />
              {copied ? "Link copiado" : "Invitar con un link"}
            </button>
            {isAdmin && onDeleteTrip && (
              <div className="mt-3">
                {confirmDelete ? (
                  <>
                    <p className="mb-2 text-[13px] leading-[1.4] text-ink-2">
                      Se borra <strong>{trip.name}</strong> para todos: ciudades, tramos, pasajes, gastos y saldos. No se puede deshacer.
                    </p>
                    <div className="grid grid-cols-[1fr_2fr] gap-2">
                      <button type="button" onClick={() => setConfirmDelete(false)} className="h-12 rounded-button bg-surface text-sm font-bold">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const message = await onDeleteTrip();
                            if (message) setError(message);
                          })
                        }
                        className="h-12 rounded-button bg-delete text-sm font-bold text-white disabled:opacity-50"
                      >
                        {pending ? "Borrando…" : "Borrar el viaje"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 w-full items-center justify-center gap-2 text-[13px] font-bold text-danger">
                    <Trash2 size={16} /> Borrar este viaje
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
