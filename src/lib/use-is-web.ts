"use client";

import { useSyncExternalStore } from "react";

// Versión web (docs/diseño.md): desde 1100 px de ancho, dos paneles y modales centrados.
// En el servidor y en el primer render es móvil; si la pantalla es grande, cambia al hidratar.
const QUERY = "(min-width: 1100px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useIsWeb(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
