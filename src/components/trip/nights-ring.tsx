import type { TripView } from "@/lib/trip-view";

// Anillo de noches planeadas (decisión 029): naranja si faltan, verde si coinciden con la
// duración del viaje, rojo si se pasan. En SVG para que quede redondo en el iPhone.

const RING_COLOR = { missing: "#F5891F", complete: "#1FA971", over: "#A8382B" };

export function NightsRing({ view, label = "noches" }: { view: Pick<TripView, "plannedNights" | "tripNights" | "nightsStatus">; label?: string }) {
  const progress = Math.min(1, view.plannedNights / Math.max(1, view.tripNights));
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-navy/[.06] bg-surface pr-3 pl-[7px]">
      <svg viewBox="0 0 22 22" className="size-[22px] shrink-0 -rotate-90" aria-hidden>
        <circle cx="11" cy="11" r="8.5" fill="none" stroke="#E0E0E0" strokeWidth="3.5" />
        {progress > 0 && (
          <circle
            cx="11"
            cy="11"
            r="8.5"
            fill="none"
            stroke={RING_COLOR[view.nightsStatus]}
            strokeWidth="3.5"
            strokeLinecap={progress < 1 ? "round" : "butt"}
            pathLength={100}
            strokeDasharray={`${progress * 100} 100`}
          />
        )}
      </svg>
      <span className="text-[13px] whitespace-nowrap">
        <strong style={{ color: view.nightsStatus === "over" ? "#A8382B" : "#222222" }}>
          {view.plannedNights}/{view.tripNights}
        </strong>{" "}
        {label}
      </span>
    </div>
  );
}
