"use client";

import { MapPin, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Place } from "@/lib/places";
import type { Trip } from "@/lib/trip-types";
import { BottomSheet } from "../bottom-sheet";

// Pantalla 10 · Agregar ciudad (docs/diseño.md). También sirve para cambiar la ciudad de una parada.
// Busca en OpenStreetMap mientras escribís; al elegir un resultado se completan país, ubicación y huso.

export type CitySearchMode = { kind: "add"; afterStopId: string | null } | { kind: "change"; stopId: string };

export function CitySearchSheet({
  trip,
  mode,
  onClose,
  search,
  onPick,
}: {
  trip: Trip;
  mode: CitySearchMode;
  onClose: () => void;
  search: (query: string) => Promise<Place[]>;
  /** Agrega o cambia la ciudad. Devuelve un mensaje si falló. */
  onPick: (place: Place, afterStopId: string | null) => Promise<string | null>;
}) {
  const stops = [...trip.stops].sort((a, b) => a.position - b.position);
  const [after, setAfter] = useState<string | null>(mode.kind === "add" ? mode.afterStopId : null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Place | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const lastQuery = useRef("");

  // Busca medio segundo después de dejar de escribir (OpenStreetMap pide no más de una consulta por segundo).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (picked && q === picked.name)) return;
    const timer = setTimeout(async () => {
      lastQuery.current = q;
      setSearching(true);
      const found = await search(q);
      if (lastQuery.current === q) {
        setResults(found);
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, picked, search]);

  const afterIndex = stops.findIndex((s) => s.id === after);
  const before = mode.kind === "add" ? (afterIndex >= 0 ? stops[afterIndex] : null) : null;
  const next = mode.kind === "add" ? stops[afterIndex + 1] ?? null : null;
  const legToRemove = before && next ? trip.legs.find((l) => l.from_stop_id === before.id) : null;
  const current = mode.kind === "change" ? stops.find((s) => s.id === mode.stopId) : null;

  function confirm(close: () => void) {
    if (!picked) {
      setError("Elegí una ciudad de la lista.");
      return;
    }
    setError("");
    startTransition(async () => {
      const message = await onPick(picked, after);
      if (message) setError(message);
      else close();
    });
  }

  return (
    <BottomSheet onClose={onClose} label={mode.kind === "add" ? "Agregar ciudad" : "Cambiar ciudad"} top="calc(var(--safe-top) + 12px)" scrim={0.4}>
      {(close) => (
        <>
          <div className="flex items-start justify-between gap-3 px-5 pt-2">
            <div className="min-w-0">
              <div className="text-[22px] font-extrabold tracking-[-0.02em]">
                {mode.kind === "add" ? "¿Qué ciudad agregás?" : `Cambiar ${current?.city ?? "la ciudad"}`}
              </div>
              <div className="mt-0.5 text-[13px] text-ink-2">
                {mode.kind === "add"
                  ? before
                    ? `Va después de ${before.city}${next ? ` y antes de ${next.city}` : ""}`
                    : "Va al principio del viaje"
                  : "Elegí la ciudad correcta: se actualizan el país, el mapa y el huso horario."}
              </div>
            </div>
            <button type="button" onClick={close} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 [scrollbar-width:none]">
            <label className="mt-4 flex h-14 items-center gap-2.5 rounded-[18px] border-[1.5px] border-navy px-4 text-navy shadow-[0_0_0_4px_rgb(0_0_0/0.06)]">
              <MapPin size={20} className="shrink-0" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPicked(null);
                }}
                placeholder="Buscá una ciudad"
                aria-label="Ciudad"
                autoFocus
                className="h-[52px] min-w-0 flex-1 bg-transparent text-[17px] font-bold text-ink outline-none"
              />
            </label>

            {query.trim().length >= 2 && !picked && (
              <div className="mt-3 overflow-hidden rounded-[18px] border border-line">
                {searching && results.length === 0 && <div className="px-4 py-3 text-sm text-ink-2">Buscando…</div>}
                {!searching && results.length === 0 && <div className="px-4 py-3 text-sm text-ink-2">No encontramos esa ciudad.</div>}
                {results.map((p, i) => (
                  <button
                    key={`${p.name}-${p.lat}-${p.lng}`}
                    type="button"
                    onClick={() => {
                      setPicked(p);
                      setQuery(p.name);
                      setResults([]);
                    }}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i ? "border-t border-divider" : ""}`}
                  >
                    <span
                      className="size-7 shrink-0 rounded-full bg-surface bg-cover bg-center"
                      style={{ backgroundImage: p.countryCode ? `url("https://flagcdn.com/w80/${p.countryCode}.png")` : undefined }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{p.name}</span>
                      <span className="block truncate text-xs text-ink-2">{[p.region, p.country].filter(Boolean).join(", ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {picked && (
              <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-navy-tint px-3.5 py-2.5">
                <span
                  className="size-7 shrink-0 rounded-full bg-surface bg-cover bg-center"
                  style={{ backgroundImage: picked.countryCode ? `url("https://flagcdn.com/w80/${picked.countryCode}.png")` : undefined }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-navy">{picked.name}</span>
                  <span className="block truncate text-xs text-ink-2">{[picked.region, picked.country].filter(Boolean).join(", ")}</span>
                </span>
              </div>
            )}

            {mode.kind === "add" && (
              <label className="mt-4 block">
                <span className="mx-1 mb-2 block text-[13px] font-bold text-ink-2">Ubicación en el recorrido</span>
                <select
                  value={after ?? ""}
                  onChange={(e) => setAfter(e.target.value || null)}
                  className="h-[50px] w-full rounded-field border border-line bg-white px-3 text-[15px] font-semibold text-ink outline-none"
                >
                  <option value="">Al principio</option>
                  {stops.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      Después de {i + 1}. {s.city}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {legToRemove && before && next && (
              <div className="mt-3 flex items-start gap-2.5 rounded-field border border-tz-border bg-tz-bg px-3.5 py-3 text-[13px] leading-[1.4] text-tz-text">
                <TriangleAlert size={16} className="mt-px shrink-0 text-orange" />
                <span>
                  El tramo de {before.city} a {next.city} se va a borrar, con su gasto y sus pasajes: ahora vas a ir de {before.city} a la ciudad nueva.
                </span>
              </div>
            )}
            {error && <p className="mx-1 mt-3 text-[13px] font-bold text-danger">{error}</p>}
          </div>

          <div className="px-5 pt-4" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
            <button
              type="button"
              onClick={() => confirm(close)}
              disabled={pending}
              className="bg-pink h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-70"
            >
              {pending ? "Guardando…" : mode.kind === "add" ? "Agregar ciudad" : "Cambiar ciudad"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
