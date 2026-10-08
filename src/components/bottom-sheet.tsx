"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Sheet desde abajo (docs/diseño.md): entra deslizándose, el fondo oscuro aparece con un fundido,
// se cierra tocando el fondo, con Escape o arrastrando el handle hacia abajo.

const DURATION = 320;

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


  return (
    <div className="fixed inset-0 z-[5]" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 transition-opacity duration-[250ms]"
        style={{ background: `rgb(15 16 18 / ${scrim})`, opacity: shown ? 1 : 0 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgb(0_41_61/0.18)]"
        style={{
          top: top === "auto" ? undefined : top,
          maxHeight: top === "auto" ? "calc(100dvh - var(--safe-top) - 52px)" : undefined,
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
    </div>
  );
}
