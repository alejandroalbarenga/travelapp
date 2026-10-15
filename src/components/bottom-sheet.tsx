"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft } from "lucide-react";
import { useIsWeb } from "@/lib/use-is-web";

// En el celular es una pantalla completa que entra desde la derecha (decisión 068: ya no hay sheets,
// salvo el panel del viaje sobre el mapa). Se vuelve con la flecha, deslizando desde el borde
// izquierdo, con el "atrás" del teléfono o del navegador (cada pantalla abierta es una entrada del
// historial) o con Escape.
// En la web (desde 1100 px) también es una pantalla nueva (decisión 077): dentro del viaje ocupa todo
// el panel izquierdo y el mapa queda a la vista; fuera del viaje (ej. "Nuevo viaje"), toda la ventana.

/** Dónde se abren las pantallas en la web: el panel izquierdo del viaje. */
export type SheetPanel = { left: string; width: string };
export const SheetPanelContext = createContext<SheetPanel | null>(null);

const DURATION = 320;

/**
 * El teclado del iPhone. `shift`: cuánto corrió Safari la pantalla al abrirlo; con el teclado
 * abierto, Safari corre la página para mostrar el campo y un sheet `position: fixed` se va para
 * arriba. Corriendo el sheet lo mismo, queda en su lugar, del mismo tamaño, y el teclado le pasa
 * por arriba (decisión 060). `height`: cuánto tapa el teclado de abajo del sheet. Los dos en 0 sin
 * teclado (o en navegadores sin visualViewport).
 */
function useKeyboard() {
  const [keyboard, setKeyboard] = useState({ shift: 0, height: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Contra el alto del layout: en el iPhone window.innerHeight también se achica con el teclado.
      const height = document.documentElement.clientHeight - vv.height;
      const open = height > 80;
      setKeyboard((k) => {
        const next = { shift: open ? vv.offsetTop : 0, height: open ? Math.round(height) : 0 };
        return k.shift === next.shift && k.height === next.height ? k : next;
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return keyboard;
}

/** La lista que scrollea y contiene al campo, sin salir del sheet. */
function scrollerOf(el: HTMLElement, sheet: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== sheet; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Con el teclado abierto, el campo donde se escribe tiene que quedar arriba del teclado: el sheet
 * no se achica (decisión 060), así que se scrollea su lista hasta que el campo se vea. Para que
 * los campos de abajo de todo también puedan subir, las listas suman abajo un espacio del alto del
 * teclado (`--keyboard`, en globals.css).
 */
function revealField(root: HTMLElement | null) {
  const vv = window.visualViewport;
  const field = document.activeElement;
  if (!root || !vv || !(field instanceof HTMLElement) || !root.contains(field)) return;
  if (!field.matches("input, textarea, select, [contenteditable]")) return;
  const scroller = scrollerOf(field, root);
  if (!scroller) return;
  const rect = field.getBoundingClientRect();
  const visibleTop = Math.max(scroller.getBoundingClientRect().top, vv.offsetTop) + 12;
  const visibleBottom = vv.offsetTop + vv.height - 20;
  if (rect.bottom > visibleBottom) scroller.scrollTop += rect.bottom - visibleBottom;
  else if (rect.top < visibleTop) scroller.scrollTop -= visibleTop - rect.top;
}

function useFieldAboveKeyboard(sheet: RefObject<HTMLDivElement | null>, keyboard: { shift: number; height: number }) {
  // Cuando abre el teclado (o Safari corre la pantalla) y cuando se pasa a otro campo.
  useEffect(() => {
    if (!keyboard.height) return;
    const frame = requestAnimationFrame(() => revealField(sheet.current));
    return () => cancelAnimationFrame(frame);
  }, [keyboard.height, keyboard.shift, sheet]);

  useEffect(() => {
    const root = sheet.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;
    // Espera a que termine de subir el teclado.
    const onFocus = () => {
      clearTimeout(timer);
      timer = setTimeout(() => revealField(root), 320);
    };
    root.addEventListener("focusin", onFocus);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("focusin", onFocus);
    };
  }, [sheet]);
}

/** Mientras el historial vuelve una entrada (al cerrar una pantalla), la que se abre espera. */
let pendingBack: Promise<void> | null = null;
let lastScreenId = 0;

function goBack() {
  pendingBack = new Promise((resolve) => {
    const done = () => {
      window.removeEventListener("popstate", done);
      clearTimeout(timer);
      pendingBack = null;
      resolve();
    };
    window.addEventListener("popstate", done);
    // Por si el navegador no avisa.
    const timer = setTimeout(done, 600);
  });
  history.back();
}

function screensInHistory(): string[] {
  return (history.state?.vamoScreens as string[] | undefined) ?? [];
}

/**
 * Cada pantalla abierta suma una entrada al historial (con la misma URL), así el "atrás" del
 * teléfono, del navegador o el gesto de Safari la cierran en vez de salir del viaje. Si se cierra de
 * otra forma (la flecha, al guardar), saca su entrada.
 */
function useHistoryEntry(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    const id = `pantalla-${++lastScreenId}`;
    let pushed = false;
    let cancelled = false;
    const push = () => {
      if (cancelled) return;
      // Next.js le suma su estado a la entrada (pushState sin URL no navega).
      history.pushState({ vamoScreens: [...screensInHistory(), id] }, "");
      pushed = true;
    };
    if (pendingBack) pendingBack.then(push);
    else push();

    const onPop = () => {
      if (pushed && !screensInHistory().includes(id)) {
        pushed = false;
        onBackRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPop);
      if (pushed && screensInHistory().at(-1) === id) goBack();
    };
  }, [active]);
}

/** Volver: la flecha arriba a la izquierda de cada pantalla. */
export function BackButton({ onClick, className = "rounded-full bg-surface" }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Volver" className={`flex size-11 shrink-0 items-center justify-center ${className}`}>
      <ChevronLeft size={24} />
    </button>
  );
}

export function BottomSheet({
  onClose,
  label,
  overlayHandle = false,
  children,
}: {
  onClose: () => void;
  label: string;
  /** El contenido empieza arriba de todo, debajo de la barra de estado (por ejemplo, una foto). */
  overlayHandle?: boolean;
  /** Recibe `close`, que anima la salida y después llama a onClose. */
  children: (close: () => void) => ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const web = useIsWeb();
  const panel = useContext(SheetPanelContext);
  const keyboard = useKeyboard();
  const shift = keyboard.shift;
  const sheetRef = useRef<HTMLDivElement>(null);
  useFieldAboveKeyboard(sheetRef, keyboard);

  // Entra en el próximo cuadro; si el navegador no da cuadros (pestaña en segundo plano), igual entra.
  useEffect(() => {
    const show = () => setShown(true);
    const frame = requestAnimationFrame(show);
    const timer = setTimeout(show, 50);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const close = useCallback(() => {
    setDrag(null);
    setShown(false);
    setTimeout(onClose, DURATION);
  }, [onClose]);

  useHistoryEntry(true, close);

  // Deslizar desde el borde izquierdo hacia la derecha vuelve atrás, como en el iPhone.
  const swipe = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = t.clientX <= 28 ? { x: t.clientX, y: t.clientY, horizontal: null } : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) s.horizontal = dx > Math.abs(dy);
    if (s.horizontal) setDrag(Math.max(0, dx));
  };
  const onTouchEnd = () => {
    const moved = drag ?? 0;
    swipe.current = null;
    if (moved > window.innerWidth * 0.3) close();
    else setDrag(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);


  // En la web, dentro del viaje ocupa todo el panel izquierdo (el mapa queda a la derecha); fuera del
  // viaje (ej. "Nuevo viaje"), toda la pantalla con el contenido centrado.
  const area = web && panel ? { left: panel.left, width: panel.width, top: 0, bottom: 0 } : { left: 0, right: 0, top: web ? 0 : shift, bottom: web ? 0 : -shift };
  return (
    <div className="fixed z-[5] overflow-hidden" style={area} role="dialog" aria-modal="true" aria-label={label}>
      <div
        ref={sheetRef}
        data-sheet
        className="absolute inset-0 flex flex-col overflow-hidden bg-white shadow-[-8px_0_24px_rgb(0_0_0/0.08)]"
        style={{
          ["--keyboard" as string]: `${keyboard.height}px`,
          // La foto de la ciudad va debajo de la barra de estado; el resto empieza abajo de ella.
          paddingTop: overlayHandle ? 0 : web ? 16 : "calc(var(--safe-top) + 8px)",
          transform: shown ? `translateX(${drag ?? 0}px)` : "translateX(100%)",
          transition: drag !== null && shown ? "none" : `transform ${DURATION}ms cubic-bezier(.2,.8,.2,1)`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {web && !panel ? <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col">{children(close)}</div> : children(close)}
      </div>
    </div>
  );
}
