"use client";

import { ArrowLeftRight, ArrowRight, Bed, Bus, Car, Check, ChevronLeft, ChevronRight, Ellipsis, Landmark, Plane, Receipt, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { ActivityView, ExpenseRowView, ExpensesView, TransferView } from "@/lib/expenses-view";
import type { ExpenseCategory, LegMode, Member } from "@/lib/trip-types";
import { BalanceBubbles } from "./balance-bubbles";

// Pantalla 04 · Gastos (docs/diseño.md), con las burbujas del balance arriba, las transferencias
// y el historial de movimientos abajo del todo.

const ACTIVITY_PREVIEW = 5;

const MODE_ICON: Record<LegMode, LucideIcon> = { plane: Plane, train: TrainFront, bus: Bus, car: Car, other: Ellipsis };
const MODE_CLASS: Record<LegMode, string> = {
  plane: "bg-plane-bg text-plane",
  train: "bg-train-bg text-train",
  bus: "bg-bus-bg text-bus",
  car: "bg-car-bg text-car",
  other: "bg-other-bg text-other",
};
const CATEGORY_ICON: Record<ExpenseCategory, LucideIcon> = {
  transport: Bus,
  lodging: Bed,
  food: UtensilsCrossed,
  activities: Landmark,
  other: Receipt,
};

export function ExpensesScreen({
  tripName,
  view,
  members,
  myMemberId,
  canEdit,
  onEdit,
  onSettle,
  onUndo,
  onTransfer,
}: {
  tripName: string;
  view: ExpensesView;
  members: Member[];
  myMemberId: string | null;
  canEdit: boolean;
  onEdit: (row: ExpenseRowView) => void;
  onSettle: (t: TransferView) => Promise<string | null>;
  onUndo: (settlementId: string) => Promise<string | null>;
  onTransfer: () => void;
}) {
  const [showAllActivity, setShowAllActivity] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const member = (id: string) => members.find((m) => m.id === id);
  const me = myMemberId ? member(myMemberId) : undefined;

  function run(action: () => Promise<string | null>) {
    setError("");
    startTransition(async () => {
      const message = await action();
      if (message) setError(message);
    });
  }

  return (
    <div className="absolute inset-0 z-[1] overflow-y-auto bg-white px-5 [scrollbar-width:none]" style={{ paddingBottom: "calc(var(--safe-bottom) + 120px)" }}>
      <div className="sticky top-0 z-[2] -mx-5 bg-white px-5 pb-3.5" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Volver al inicio" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgb(0_41_61/0.08),0_4px_12px_rgb(0_41_61/0.06)]">
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-navy">{tripName}</div>
            <h1 className="mt-0.5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">Gastos</h1>
          </div>
        </div>
      </div>

      {view.groups.length > 0 && (
        <section className="bg-navy-gradient mt-1.5 rounded-card-lg px-3 pt-4 pb-3 shadow-card">
          <div className="flex items-center justify-between px-2">
            <span className="text-[13px] font-bold text-white/75">Cómo está cada uno</span>
            <span className="flex items-center gap-2.5 text-[11px] font-bold text-white/75">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-complete" /> le deben
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange" /> debe
              </span>
            </span>
          </div>
          <div className="mt-2">
            <BalanceBubbles bubbles={view.bubbles} />
          </div>
        </section>
      )}

      <section className="mt-3 rounded-card-lg border border-navy/[.07] bg-white p-[18px] shadow-card">
        <div className="text-[13px] font-bold text-ink-2">Total del viaje</div>
        <div className="mt-1 text-[40px] leading-[1.1] font-extrabold tracking-[-0.02em]">{view.total}</div>
        <div className="mt-1 text-[13px] text-ink-2">{view.summary}</div>
        <div className="my-3.5 h-px bg-divider" />
        <div className="flex items-center gap-3">
          {me && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: me.color }}>
              {me.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-ink-2">Tu balance</div>
            <div className="text-[15px] font-bold">{view.myBalance}</div>
          </div>
          <button
            type="button"
            onClick={() => balanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex h-11 items-center gap-0.5 text-[13px] font-bold text-navy"
          >
            Ver balance <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {view.groups.length === 0 && (
        <p className="mt-8 text-center text-[15px] text-ink-2">Todavía no hay gastos. {canEdit ? "Cargá el primero con el +." : ""}</p>
      )}

      {view.groups.map((g) => (
        <div key={g.key} className="mt-6">
          <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
            <span className="text-[17px] font-bold">{g.name}</span>
            <span className="text-[13px] text-ink-2">{g.dates}</span>
          </div>
          <div className="overflow-hidden rounded-card border border-navy/[.07] bg-white shadow-card">
            {g.rows.map((r, i) => {
              const Icon = r.legMode ? MODE_ICON[r.legMode] : CATEGORY_ICON[r.category];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onEdit(r)}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${i ? "border-t border-divider" : ""}`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${r.legMode ? MODE_CLASS[r.legMode] : "bg-surface text-ink"}`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] leading-[1.3] font-semibold">{r.description}</div>
                    <div className="mt-0.5 text-[13px] text-ink-2">{r.sub}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-bold">{r.amount}</div>
                    <div className="mt-0.5 text-xs text-ink-2">{r.myShare}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div ref={balanceRef} className="mt-8 scroll-mt-28">
        <div className="px-1">
          <div className="text-xl font-extrabold tracking-[-0.01em]">Balance</div>
          <div className="mt-1 text-[13px] text-ink-2">
            {view.allSettled
              ? "Todo saldado. Quedan todos a mano."
              : view.pending.length
                ? "Con estos pagos quedan todos a mano."
                : "Por ahora están todos a mano."}
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onTransfer}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-line bg-white text-sm font-bold"
          >
            <ArrowLeftRight size={16} /> Registrar una transferencia
          </button>
        )}
        {(view.pending.length > 0 || view.settled.length > 0) && (
          <div className="mt-3 overflow-hidden rounded-card border border-navy/[.07] bg-white shadow-card">
            {view.pending.map((t, i) => (
              <div key={`p-${t.from}-${t.to}`} className={`flex flex-col gap-3 p-3.5 ${i ? "border-t border-divider" : ""}`}>
                <TransferLine t={t} member={member} verb="le debe" />
                {canEdit && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => onSettle(t))}
                    className="flex h-11 items-center justify-center gap-2 rounded-field border-[1.5px] border-line text-sm font-bold disabled:opacity-50"
                  >
                    <Check size={16} /> Marcar como saldado
                  </button>
                )}
              </div>
            ))}
            {view.settled.map((t, i) => (
              <div key={t.id} className={`flex flex-col gap-3 p-3.5 ${i || view.pending.length ? "border-t border-divider" : ""}`}>
                <div className="opacity-60">
                  <TransferLine t={t} member={member} verb="le pagó" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-[30px] min-w-0 items-center gap-1.5 rounded-full bg-settled-bg px-3 text-[13px] font-bold text-settled">
                    <Check size={16} className="shrink-0" />
                    <span className="truncate">
                      Pagado el {t.when}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                  </span>
                  {canEdit && (
                    <button type="button" disabled={pending} onClick={() => run(() => onUndo(t.id))} className="h-11 px-1 text-[13px] font-bold text-ink-2">
                      Deshacer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mx-1 mt-2 text-[13px] font-bold text-danger">{error}</p>}
      </div>

      {view.activity.length > 0 && (
        <div className="mt-8">
          <div className="px-1">
            <div className="text-xl font-extrabold tracking-[-0.01em]">Movimientos</div>
            <div className="mt-1 text-[13px] text-ink-2">Todo lo que se cargó, cambió o borró. No se puede editar.</div>
          </div>
          <div className="mt-3 overflow-hidden rounded-card border border-navy/[.07] bg-white shadow-card">
            {(showAllActivity ? view.activity : view.activity.slice(0, ACTIVITY_PREVIEW)).map((a, i) => (
              <ActivityRow key={a.id} a={a} first={i === 0} />
            ))}
            {view.activity.length > ACTIVITY_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllActivity((s) => !s)}
                className="flex h-12 w-full items-center justify-center border-t border-divider text-sm font-bold text-navy"
              >
                {showAllActivity ? "Ver menos" : `Ver todos (${view.activity.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ a, first }: { a: ActivityView; first: boolean }) {
  return (
    <div className={`flex gap-3 px-3.5 py-3 ${first ? "" : "border-t border-divider"}`}>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${a.actorColor ? "text-white" : "bg-surface text-ink-2"}`}
        style={a.actorColor ? { background: a.actorColor } : undefined}
      >
        {a.actorInitials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink-3">{a.when}</div>
        <div className="mt-0.5 text-sm leading-[1.4]">
          <strong>{a.actorName}</strong> <span className={a.removal ? "font-semibold text-danger" : ""}>{a.verb}</span> <strong>{a.subject}</strong>
        </div>
        {a.detail && <div className="mt-0.5 text-[13px] text-ink-2">{a.detail}</div>}
      </div>
    </div>
  );
}

function TransferLine({ t, member, verb }: { t: TransferView; member: (id: string) => Member | undefined; verb: string }) {
  const from = member(t.from);
  const to = member(t.to);
  return (
    <div className="flex items-center gap-3">
      <div className="flex shrink-0 items-center gap-1">
        <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: from?.color }}>
          {from?.initials}
        </span>
        <ArrowRight size={16} className="text-ink-2" />
        <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: to?.color }}>
          {to?.initials}
        </span>
      </div>
      <div className="min-w-0 flex-1 text-[15px] leading-[1.35]">
        <strong>{t.fromName}</strong> {verb} <strong>{t.amount}</strong> a <strong>{t.toName}</strong>
      </div>
    </div>
  );
}
