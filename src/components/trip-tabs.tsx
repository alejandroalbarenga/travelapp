"use client";

import { useState } from "react";

type Tab = "trip" | "expenses";

const TABS: { id: Tab; label: string }[] = [
  { id: "trip", label: "Viaje" },
  { id: "expenses", label: "Gastos" },
];

// Control flotante Viaje / Gastos, abajo a la izquierda (diseño: pantalla 01).
export function TripTabs() {
  const [tab, setTab] = useState<Tab>("trip");

  return (
    <nav
      aria-label="Secciones del viaje"
      className="glass-dark fixed left-5 flex h-14 gap-0.5 rounded-full p-1"
      style={{ bottom: "calc(var(--safe-bottom) + 20px)" }}
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "h-[46px] rounded-full bg-linear-to-b from-white to-[#F1F6FB] px-6 text-[15px] font-extrabold text-navy shadow-[0_2px_10px_rgb(0_41_61/0.14),inset_0_1px_0_#fff] transition-all"
                : "h-[46px] rounded-full px-6 text-[15px] font-semibold text-white transition-all"
            }
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
