"use client";

import { ArrowRight, Bed, Bus, Car, Check, ChevronLeft, ChevronRight, Ellipsis, Landmark, Plane, Receipt, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { ExpenseRowView, ExpensesView, TransferView } from "@/lib/expenses-view";
import type { ExpenseCategory, LegMode, Member } from "@/lib/trip-types";

// Pantalla 04 · Gastos (docs/diseño.md).

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
}: {
  tripName: string;
  view: ExpensesView;
  members: Member[];
  myMemberId: string | null;
  canEdit: boolean;
  onEdit: (row: ExpenseRowView) => void;
  onSettle: (t: TransferView) => Promise<string | null>;
  onUndo: (settlementId: string) => Promise<string | null>;
}) {
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

      <section className="mt-1.5 rounded-card-lg border border-navy/[.07] bg-white p-[18px] shadow-card">
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
                <div className="opacity-50">
                  <TransferLine t={t} member={member} verb="le pagó" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-settled-bg px-3 text-[13px] font-bold text-settled">
                    <Check size={16} /> Saldado
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
