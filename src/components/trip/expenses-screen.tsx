"use client";

import { ArrowLeftRight, ArrowRight, Bed, Bus, Car, Check, ChevronLeft, Ellipsis, Landmark, Plane, Receipt, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActivityView, ExpenseRowView, ExpensesView, TransferView } from "@/lib/expenses-view";
import type { PersonalData } from "@/lib/personal";
import type { ExpenseCategory, LegMode, Member } from "@/lib/trip-types";
import { PersonalExpenses, type PersonalActions } from "./personal-expenses";

// Pantalla 04 · Gastos (docs/diseño.md), reordenada para que se lea fácil (decisión 075): arriba lo
// tuyo, después las cuentas para quedar a mano, cómo está cada uno, los gastos por ciudad, lo ya
// saldado y el historial de movimientos.

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
  canEdit,
  onEdit,
  onSettle,
  onUndo,
  onTransfer,
  embedded = false,
  onBack,
  foldStopIds = [],
  personal,
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
  /** En la web va dentro del panel izquierdo: sin su propio header (lo tiene el panel). */
  embedded?: boolean;
  /** Volver al viaje (en el celular, Gastos se abre desde la bolita de arriba). */
  onBack?: () => void;
  /** Ciudades fuera de tu parte del viaje: sus gastos van plegados al final (decisión 054). */
  foldStopIds?: string[];
  /** Tus gastos personales (decisión 076), en la pestaña "Míos". */
  personal?: { tripId: string; initial: PersonalData | null; actions?: PersonalActions };
}) {
  const [section, setSection] = useState<"group" | "mine">("group");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const member = (id: string) => members.find((m) => m.id === id);

  const [showOthers, setShowOthers] = useState(false);
  const mineGroups = view.groups.filter((g) => !foldStopIds.includes(g.key));
  const otherGroups = view.groups.filter((g) => foldStopIds.includes(g.key));
  const otherCount = otherGroups.reduce((n, g) => n + g.rows.length, 0);

  function renderGroup(g: ExpensesView["groups"][number]) {
    return (
      <div key={g.key} className="mt-6">
        <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
          <span className="text-[17px] font-bold">{g.name}</span>
          <span className="text-[13px] text-ink-2">{g.dates}</span>
        </div>
        <div className="border-y border-divider">
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
                  <div className="truncate text-[15px] leading-[1.3] font-semibold">{r.description}</div>
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
    );
  }

  function run(action: () => Promise<string | null>) {
    setError("");
    startTransition(async () => {
      const message = await action();
      if (message) setError(message);
    });
  }

  return (
    // El header queda fijo afuera del scroll (no sticky): en el iPhone un header sticky quedaba tapado.
    <div className={embedded ? "flex h-full flex-col bg-white" : "absolute inset-0 z-[1] flex flex-col bg-white"}>
      <div className={`relative z-[2] shrink-0 bg-white px-5 pb-3.5 ${embedded ? "hidden" : ""}`} style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}>
        <div className="flex items-center gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Volver al viaje" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_4px_12px_rgb(0_0_0/0.06)]">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Link href="/" aria-label="Volver al inicio" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_4px_12px_rgb(0_0_0/0.06)]">
              <ChevronLeft size={20} />
            </Link>
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-navy">{tripName}</div>
            <h1 className="mt-0.5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">Gastos</h1>
          </div>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] ${embedded ? "mx-auto w-full max-w-[720px] px-8 pt-5" : "px-5"}`}
        style={{ paddingBottom: embedded ? 48 : "calc(var(--safe-bottom) + 120px)" }}
      >

      {/* Del grupo o tus gastos personales (decisión 076). */}
      {personal && (
        <div className="mt-1.5 mb-3 grid grid-cols-2 rounded-full bg-surface p-1" role="tablist">
          {(
            [
              ["group", "Del grupo"],
              ["mine", "Míos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={section === key}
              onClick={() => setSection(key)}
              className={`h-10 rounded-full text-sm font-bold ${section === key ? "bg-white text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {personal && section === "mine" ? (
        <PersonalExpenses tripId={personal.tripId} initial={personal.initial} actions={personal.actions} />
      ) : (
      <>
      {/* Lo tuyo: cuánto te tocó, cuánto pusiste y cómo quedás. */}
      {view.me && (
        <section className="mt-1.5 rounded-card bg-surface p-4">
          <div className="text-[13px] font-bold text-ink-2">Te tocó gastar</div>
          <div className="mt-0.5 text-[36px] leading-[1.1] font-extrabold tracking-[-0.02em]">{view.me.spent}</div>
          <div className="mt-1 text-[13px] text-ink-2">Pusiste {view.me.paid} de tu bolsillo</div>
          <div
            className={`mt-3 inline-flex h-9 items-center rounded-full px-3.5 text-sm font-bold ${
              view.me.cents > 0 ? "bg-settled-bg text-settled" : view.me.cents < 0 ? "bg-delete/10 text-danger" : "bg-white text-ink"
            }`}
          >
            {view.me.status}
          </div>
        </section>
      )}

      {/* Para quedar a mano: las deudas simplificadas, las tuyas primero. */}
      {(view.pending.length > 0 || canEdit) && view.groups.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="Para quedar a mano" sub={view.pending.length ? "Con estos pagos quedan todos a mano." : "Están todos a mano."} />
          {view.pending.length > 0 && (
            <div className="mt-2 border-y border-divider">
              {view.pending.map((t, i) => (
                <div key={`p-${t.from}-${t.to}`} className={`flex items-center gap-3 py-3 ${i ? "border-t border-divider" : ""}`}>
                  <Pair from={member(t.from)} to={member(t.to)} />
                  <div className={`min-w-0 flex-1 text-[15px] leading-[1.35] ${t.mine ? "font-bold" : ""}`}>{t.text}</div>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => onSettle(t))}
                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-bold disabled:opacity-50"
                    >
                      <Check size={15} /> Saldado
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {canEdit && (
            <button type="button" onClick={onTransfer} className="mt-2 flex h-11 items-center gap-2 px-1 text-sm font-bold text-navy">
              <ArrowLeftRight size={16} /> Registrar una transferencia
            </button>
          )}
          {error && <p className="mx-1 mt-1 text-[13px] font-bold text-danger">{error}</p>}
        </section>
      )}

      {/* Cómo está cada uno, en palabras (reemplaza las burbujas). */}
      {view.groups.length > 0 && (
        <section className="mt-7">
          <SectionTitle title="Cómo está cada uno" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {view.people.map((p) => (
              <div key={p.memberId} className="flex items-center gap-2.5 rounded-[16px] border border-line px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: p.color }}>
                  {p.initials}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{p.name}</div>
                  <div className={`text-[13px] leading-[1.3] font-semibold ${p.cents > 0 ? "text-settled" : p.cents < 0 ? "text-danger" : "text-ink-2"}`}>{p.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Los gastos, por ciudad. */}
      <section className="mt-7">
        <SectionTitle title="Gastos" sub={view.groups.length ? `${view.total} en total · ${view.summary}` : undefined} />
        {view.groups.length === 0 && (
          <p className="mt-6 text-center text-[15px] text-ink-2">Todavía no hay gastos. {canEdit ? "Cargá el primero con Agregar." : ""}</p>
        )}
        {mineGroups.map(renderGroup)}

        {/* Tu parte del viaje (decisión 054): los gastos de las ciudades donde no estuviste, plegados. */}
        {otherGroups.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowOthers((o) => !o)}
              aria-expanded={showOthers}
              className="flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-dash px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">Gastos del resto del viaje</span>
                <span className="block text-[13px] text-ink-2">
                  {otherCount} {otherCount === 1 ? "gasto" : "gastos"} de ciudades donde no estuviste
                </span>
              </span>
              <span className="text-[13px] font-bold">{showOthers ? "Ocultar" : "Ver"}</span>
            </button>
            {showOthers && otherGroups.map(renderGroup)}
          </div>
        )}
      </section>

      {/* Lo ya saldado, con "Deshacer". */}
      {view.settled.length > 0 && (
        <section className="mt-8">
          <SectionTitle title="Ya saldado" />
          <div className="mt-2 border-y border-divider">
            {view.settled.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 py-3 ${i ? "border-t border-divider" : ""}`}>
                <Pair from={member(t.from)} to={member(t.to)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-[1.35]">
                    {t.fromName} le pagó {t.amount} a {t.toName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-semibold text-settled">
                    <Check size={14} className="shrink-0" /> {t.when}
                    {t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                {canEdit && (
                  <button type="button" disabled={pending} onClick={() => run(() => onUndo(t.id))} className="h-11 shrink-0 px-1 text-[13px] font-bold text-ink-2">
                    Deshacer
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {view.activity.length > 0 && (
        <div className="mt-8">
          <div className="px-1">
            <div className="text-xl font-extrabold tracking-[-0.01em]">Movimientos</div>
            <div className="mt-1 text-[13px] text-ink-2">Todo lo que se cargó, cambió o borró. No se puede editar.</div>
          </div>
          <div className="mt-3 border-y border-divider">
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
      </>
      )}
      </div>
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

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-1">
      <h2 className="text-xl font-extrabold tracking-[-0.01em]">{title}</h2>
      {sub && <div className="mt-0.5 text-[13px] text-ink-2">{sub}</div>}
    </div>
  );
}

/** Quién le paga a quién: las dos bolitas con una flecha. */
function Pair({ from, to }: { from?: Member; to?: Member }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: from?.color }}>
        {from?.initials}
      </span>
      <ArrowRight size={14} className="text-ink-3" />
      <span className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: to?.color }}>
        {to?.initials}
      </span>
    </div>
  );
}
