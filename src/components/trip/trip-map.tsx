"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

export type MapPoint = { lat: number; lng: number; label: string; stopId: string };

// Mapa del recorrido (decisión 030): OpenStreetMap con Leaflet, línea punteada navy
// sobre una blanca y pines numerados. Basado en TripMap.js del diseño.
export function TripMap({
  points,
  visibleTop,
  visibleBottom,
  onPinClick,
}: {
  points: MapPoint[];
  /** Píxeles tapados arriba (botones flotantes) y desde dónde tapa la lista, para centrar el recorrido en lo visible. */
  visibleTop: number;
  visibleBottom: number;
  onPinClick?: (stopId: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const clickRef = useRef(onPinClick);

  useEffect(() => {
    clickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
      m.attributionControl.setPrefix(false).setPosition("topleft");
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      draw(L);
      observer = new ResizeObserver(() => {
        m.invalidateSize();
        fit(L);
      });
      observer.observe(el.current);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // Se monta una sola vez; los cambios de puntos los maneja el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current) return;
    import("leaflet").then((L) => draw(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  function fit(L: typeof import("leaflet")) {
    const m = map.current;
    if (!m || !el.current) return;
    // Un viaje sin ciudades todavía: Europa entera.
    if (points.length === 0) {
      m.setView([48, 10], 4, { animate: false });
      return;
    }
    const h = el.current.clientHeight;
    m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
      paddingTopLeft: [30, visibleTop + 14],
      paddingBottomRight: [30, Math.max(20, h - visibleBottom + 14)],
      maxZoom: 7,
      animate: false,
    });
  }

  function draw(L: typeof import("leaflet")) {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    if (points.length === 0) return;
    const line = points.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(line, { color: "#fff", weight: 6, opacity: 0.9, interactive: false }).addTo(g);
    L.polyline(line, { color: "#00293D", weight: 3, dashArray: "1 7", lineCap: "round", interactive: false }).addTo(g);

    // Una ciudad que aparece dos veces (Madrid) comparte pin: "1 · 13".
    const groups = new Map<string, { lat: number; lng: number; labels: string[]; stopId: string }>();
    for (const p of points) {
      const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
      const g2 = groups.get(key) ?? { lat: p.lat, lng: p.lng, labels: [], stopId: p.stopId };
      g2.labels.push(p.label);
      groups.set(key, g2);
    }
    for (const pin of groups.values()) {
      L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,-50%);display:inline-flex;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#00293D;color:#fff;font:800 12px var(--font-jakarta),system-ui,sans-serif;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">${pin.labels.join(" · ")}</div>`,
          iconSize: [0, 0],
        }),
      })
        .on("click", () => clickRef.current?.(pin.stopId))
        .addTo(g);
    }
    fit(L);
  }

  return <div ref={el} className="absolute inset-0 z-0 bg-[#E8EEF4]" />;
}
