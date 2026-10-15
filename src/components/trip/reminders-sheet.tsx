"use client";

import { BedDouble, Bell, Plane, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { reminderWhen, tripReminders, upcomingReminders, type ReminderGroup } from "@/lib/reminders";
import type { Trip } from "@/lib/trip-types";
import { BackButton, BottomSheet } from "../bottom-sheet";

// Los próximos recordatorios del viaje (decisión 095): lo mismo que va a llegar como notificación,
// para verlo de un vistazo. Solo los tuyos (los de tus ciudades y tramos, y lo que podés reservar).

const ICON: Record<ReminderGroup, LucideIcon> = { travel: Plane, bookings: BedDouble, money: Wallet };

export function RemindersSheet({ trip, myMemberId, onClose }: { trip: Trip; myMemberId: string | null; onClose: () => void }) {
  const [now] = useState(() => new Date());
  const upcoming = useMemo(() => upcomingReminders(tripReminders(trip), myMemberId, now, 30), [trip, myMemberId, now]);

  return (
    <BottomSheet onClose={onClose} label="Recordatorios">
      {(close) => (
        <>
          <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
            <BackButton onClick={close} />
            <div className="min-w-0 flex-1 text-center text-base font-bold">Recordatorios</div>
            <span className="size-11 shrink-0" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
            <p className="mb-3 text-[13px] leading-[1.4] text-ink-2">
              Te llegan como notificación, a la hora de la ciudad donde estés. Para recibirlas, activalas en el inicio.
            </p>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bell size={28} className="text-ink-3" />
                <p className="mt-3 text-[15px] text-ink-2">No hay recordatorios por delante.</p>
              </div>
            ) : (
              <ul>
                {upcoming.map((r, i) => {
                  const Icon = ICON[r.group];
                  return (
                    <li key={r.key} className={`flex gap-3 py-3 ${i ? "border-t border-divider" : ""}`}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-ink-2">{reminderWhen(r.at, r.timeZone, now)}</div>
                        <div className="text-[15px] leading-[1.3] font-bold">{r.title}</div>
                        <div className="text-sm leading-[1.35] text-ink-2">{r.body}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
