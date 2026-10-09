"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";

export type MapPoint = { lat: number; lng: number; label: string; stopId: string; city: string };

/** Un pin dibujado, con lo que hace falta para ubicar su nombre. */
type Pin = { lat: number; lng: number; text: string; city: string; stopIds: string[]; marker: Marker; priority: number };

type Box = [number, number, number, number]; // izquierda, arriba, derecha, abajo, en píxeles
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

// Mapa del recorrido (decisión 030): OpenStreetMap con Leaflet, línea punteada navy
// sobre una blanca y pines numerados. Basado en TripMap.js del diseño.
export function TripMap({
  points,
  visibleTop,
  visibleBottom,
  onPinClick,
  highlightStopId = null,
  focusStopId = null,
  partStopIds = null,
}: {
  points: MapPoint[];
  /** Píxeles tapados arriba (botones flotantes) y desde dónde tapa la lista, para centrar el recorrido en lo visible. */
  visibleTop: number;
  visibleBottom: number;
  onPinClick?: (stopId: string) => void;
  /** Ciudad resaltada (en la web, al pasar el mouse por su tarjeta): pin naranja y más grande. */
  highlightStopId?: string | null;
  /** En la web, la ciudad abierta: el mapa se acerca a ella; al cerrarla vuelve al recorrido. */
  focusStopId?: string | null;
  /** Tu parte del viaje (decisión 054): tu recorrido va fuerte y encuadrado, el resto tenue. null = todo. */
  partStopIds?: string[] | null;
}) {
  const partRef = useRef(partStopIds);
  partRef.current = partStopIds;
  const focusRef = useRef(focusStopId);
  const highlightRef = useRef(highlightStopId);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pins = useRef<Pin[]>([]);
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
      m.on("zoomend moveend", placeNames);
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
    focusRef.current = focusStopId;
    if (!map.current) return;
    import("leaflet").then((L) => fit(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStopId]);

  // Resaltar no re-encuadra el mapa (si no, saltaría con cada movimiento del mouse).
  useEffect(() => {
    highlightRef.current = highlightStopId;
    if (!map.current) return;
    import("leaflet").then((L) => draw(L, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightStopId]);

  useEffect(() => {
    if (!map.current) return;
    import("leaflet").then((L) => draw(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), partStopIds?.join()]);

  function fit(L: typeof import("leaflet")) {
    const m = map.current;
    if (!m || !el.current) return;
    const focus = focusRef.current ? points.find((p) => p.stopId === focusRef.current) : null;
    if (focus) {
      m.setView([focus.lat, focus.lng], 11, { animate: true });
      return;
    }
    // Un viaje sin ciudades todavía: Europa entera.
    if (points.length === 0) {
      m.setView([48, 10], 4, { animate: false });
      return;
    }
    const h = el.current.clientHeight;
    const part = partRef.current;
    const framed = part ? points.filter((p) => part.includes(p.stopId)) : points;
    m.fitBounds(L.latLngBounds((framed.length ? framed : points).map((p) => [p.lat, p.lng])), {
      paddingTopLeft: [30, visibleTop + 14],
      paddingBottomRight: [30, Math.max(20, h - visibleBottom + 14)],
      maxZoom: 7,
      animate: false,
    });
  }

  function draw(L: typeof import("leaflet"), refit = true) {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    pins.current = [];
    if (points.length === 0) return;
    const part = partRef.current;
    const line = points.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(line, { color: "#fff", weight: 6, opacity: part ? 0.5 : 0.9, interactive: false }).addTo(g);
    L.polyline(line, { color: "#222222", weight: 3, dashArray: "1 7", lineCap: "round", opacity: part ? 0.3 : 1, interactive: false }).addTo(g);
    if (part) {
      // Tu recorrido, desde la ciudad de la que venís hasta la última tuya, encima y fuerte.
      const firstMine = points.findIndex((p) => part.includes(p.stopId));
      const lastMine = points.length - 1 - [...points].reverse().findIndex((p) => part.includes(p.stopId));
      const mine = points.slice(Math.max(0, firstMine - 1), lastMine + 1).map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(mine, { color: "#fff", weight: 6, opacity: 0.9, interactive: false }).addTo(g);
      L.polyline(mine, { color: "#222222", weight: 3, dashArray: "1 7", lineCap: "round", interactive: false }).addTo(g);
    }

    // Una ciudad que aparece dos veces (Madrid) comparte pin: "1 · 13".
    const groups = new Map<string, { lat: number; lng: number; labels: string[]; stopId: string; stopIds: string[]; city: string }>();
    for (const p of points) {
      const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
      const g2 = groups.get(key) ?? { lat: p.lat, lng: p.lng, labels: [], stopId: p.stopId, stopIds: [], city: p.city };
      g2.labels.push(p.label);
      g2.stopIds.push(p.stopId);
      groups.set(key, g2);
    }
    for (const pin of groups.values()) {
      const on = !!highlightRef.current && pin.stopIds.includes(highlightRef.current);
      const faded = !!part && !pin.stopIds.some((id) => part.includes(id));
      // El nombre va al lado del número; placeNames decide si se ve y de qué lado (decisión 063).
      const marker = L.marker([pin.lat, pin.lng], {
        zIndexOffset: on ? 1000 : 0,
        icon: L.divIcon({
          className: "",
          html: `<div style="position:relative;opacity:${faded && !on ? 0.4 : 1};transform:translate(-50%,-50%) scale(${on ? 1.3 : 1});transition:transform .15s;display:inline-flex;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:${on ? "#F5891F" : "#222222"};color:#fff;font:800 12px var(--font-jakarta),system-ui,sans-serif;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">${pin.labels.join(" · ")}<span class="map-name" style="display:none;position:absolute;top:50%;transform:translateY(-50%);height:20px;padding:0 7px;border-radius:999px;background:rgba(255,255,255,.94);color:#222;font:700 12px/20px var(--font-jakarta),system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.18);pointer-events:none">${escapeHtml(pin.city)}</span></div>`,
          iconSize: [0, 0],
        }),
      })
        .on("click", () => clickRef.current?.(pin.stopId))
        .addTo(g);
      pins.current.push({
        lat: pin.lat,
        lng: pin.lng,
        text: pin.labels.join(" · "),
        city: pin.city,
        stopIds: pin.stopIds,
        marker,
        priority: on ? 3 : part && pin.stopIds.some((id) => part.includes(id)) ? 2 : 1,
      });
    }
    if (refit) fit(L);
    placeNames();
  }

  /**
   * Los nombres de las ciudades según el zoom (decisión 063): se muestran los que entran sin pisar
   * otro pin u otro nombre, primero la resaltada, después tu parte del viaje y después en orden.
   * Al acercar entran más; bien de cerca, todos.
   */
  function placeNames() {
    const m = map.current;
    if (!m || !el.current) return;
    const width = el.current.clientWidth;
    const height = el.current.clientHeight;
    const placed = pins.current.map((pin) => {
      const pt = m.latLngToContainerPoint([pin.lat, pin.lng]);
      const half = Math.max(24, pin.text.length * 7 + 18) / 2;
      return { pin, x: pt.x, y: pt.y, box: [pt.x - half, pt.y - 12, pt.x + half, pt.y + 12] as Box };
    });
    const taken: Box[] = placed.map((p) => p.box);
    const order = placed.map((p, i) => ({ ...p, i })).sort((a, b) => b.pin.priority - a.pin.priority || a.i - b.i);
    for (const p of order) {
      const label = p.pin.marker.getElement()?.querySelector<HTMLElement>(".map-name");
      if (!label) continue;
      const w = p.pin.city.length * 7.4 + 16;
      const right: Box = [p.box[2] + 4, p.y - 11, p.box[2] + 4 + w, p.y + 11];
      const left: Box = [p.box[0] - 4 - w, p.y - 11, p.box[0] - 4, p.y + 11];
      const fits = (b: Box) => b[0] >= 4 && b[2] <= width - 4 && b[1] >= 0 && b[3] <= height && !taken.some((t) => t !== p.box && overlaps(t, b));
      const side = fits(right) ? "right" : fits(left) ? "left" : p.pin.priority === 3 ? "right" : null;
      label.style.display = side ? "block" : "none";
      label.style.left = side === "right" ? "calc(100% + 6px)" : "";
      label.style.right = side === "left" ? "calc(100% + 6px)" : "";
      if (side) taken.push(side === "right" ? right : left);
    }
  }

  return <div ref={el} className="absolute inset-0 z-0 bg-[#EFEFEF]" />;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
