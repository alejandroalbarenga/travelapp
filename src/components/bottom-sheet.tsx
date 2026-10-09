"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useIsWeb } from "@/lib/use-is-web";

// Sheet desde abajo (docs/diseño.md): entra deslizándose, el fondo oscuro aparece con un fundido,
// se cierra tocando el fondo, con Escape o arrastrando el handle hacia abajo.
// En la web (desde 1100 px), dentro del viaje sube dentro del panel izquierdo, debajo del header, y el
// mapa queda a la vista (como en el diseño); fuera del viaje (ej. "Nuevo viaje") es una ventana centrada.

/** Zona donde suben los sheets en la web: el panel izquierdo del viaje, debajo de su header. */
export type SheetPanel = { left: string; width: string; top: string };
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

export function BottomSheet({
  onClose,
  label,
  top = "calc(var(--safe-top) + 52px)",
  scrim = 0.45,
  overlayHandle = false,
  children,
}: {
  onClose: () => void;
  label: string;
  /** Hasta dónde sube el sheet. "auto" = lo que ocupe el contenido. */
  top?: string;
  scrim?: number;
  /** La rayita va encima del contenido (por ejemplo, sobre una foto) en vez de ocupar una franja propia. */
  overlayHandle?: boolean;
  /** Recibe `close`, que anima la salida y después llama a onClose. */
  children: (close: () => void) => ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
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
    setDrag(0);
    setShown(false);
    setTimeout(onClose, DURATION);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);


  if (web && panel) {
    return (
      <div className="fixed bottom-0 z-[5] overflow-hidden" style={{ left: panel.left, width: panel.width, top: panel.top }} role="dialog" aria-modal="true" aria-label={label}>
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={-1}
          onClick={close}
          className="absolute inset-0 transition-opacity duration-[250ms]"
          style={{ background: `rgb(15 16 18 / ${scrim * 0.6})`, opacity: shown ? 1 : 0 }}
        />
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgb(0_0_0/0.18)]"
          style={{
            top: top === "auto" ? undefined : 12,
            maxHeight: top === "auto" ? "calc(100% - 12px)" : undefined,
            transform: shown ? "translateY(0)" : "translateY(calc(100% + 40px))",
            transition: `transform ${DURATION}ms cubic-bezier(.2,.8,.2,1)`,
          }}
        >
          {overlayHandle ? null : <div className="h-3 shrink-0" />}
          {children(close)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 z-[5]"
      style={{ top: web ? 0 : shift, bottom: web ? 0 : -shift }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 transition-opacity duration-[250ms]"
        style={{ background: `rgb(15 16 18 / ${scrim})`, opacity: shown ? 1 : 0 }}
      />
      {web ? (
        <div
          className="absolute top-1/2 left-1/2 flex w-[min(560px,calc(100vw-48px))] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgb(0_0_0/0.25)]"
          style={{
            height: top === "auto" ? undefined : "min(860px, calc(100dvh - 64px))",
            maxHeight: "calc(100dvh - 64px)",
            transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.96})`,
            opacity: shown ? 1 : 0,
            transition: `transform ${DURATION}ms cubic-bezier(.2,.8,.2,1), opacity 200ms`,
          }}
        >
          {overlayHandle ? null : <div className="h-3 shrink-0" />}
          {children(close)}
        </div>
      ) : (
      <div
        ref={sheetRef}
        data-sheet
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgb(0_0_0/0.18)]"
        style={{
          ["--keyboard" as string]: `${keyboard.height}px`,
          top: top === "auto" ? undefined : top,
          maxHeight: top === "auto" ? "calc(100% - var(--safe-top) - 52px)" : undefined,
          transform: shown ? `translateY(${drag}px)` : "translateY(calc(100% + 40px))",
          transition: dragging ? "none" : `transform ${DURATION}ms cubic-bezier(.2,.8,.2,1)`,
        }}
      >
        {/* Handle: se puede arrastrar hacia abajo para cerrar. */}
        <div
          className={`flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 ${overlayHandle ? "absolute inset-x-0 top-0 z-10" : ""}`}
          onPointerDown={(e) => {
            start.current = e.clientY;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            const moved = drag;
            start.current = null;
            setDragging(false);
            if (moved > 110) close();
            else setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDragging(false);
            setDrag(0);
          }}
        >
          <div className={`h-[5px] w-10 rounded-full ${overlayHandle ? "bg-white/70" : "bg-handle"}`} />
        </div>
        {children(close)}
      </div>
      )}
    </div>
  );
}
