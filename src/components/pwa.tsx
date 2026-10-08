"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect } from "react";

// Registra el service worker (public/sw.js, decisión 047). Solo en producción: en desarrollo
// guardaría versiones viejas de la app mientras se programa.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si no se puede registrar, la app anda igual, sin el caché.
    });
  }, []);
  return null;
}

// Aviso arriba cuando no hay señal. Lo que se guarde mientras tanto espera y se manda solo al volver.
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ top: "calc(var(--safe-top) + 8px)" }}
    >
      <span className="flex h-9 items-center gap-2 rounded-full bg-navy px-4 text-[13px] font-bold text-white shadow-button">
        <WifiOff size={16} /> Sin conexión · lo que cargues se manda al volver
      </span>
    </div>
  );
}

/** Al salir de la cuenta, borrar las páginas y los pasajes guardados en este teléfono. */
export function clearPrivateCache() {
  navigator.serviceWorker?.controller?.postMessage("clear-private");
}
