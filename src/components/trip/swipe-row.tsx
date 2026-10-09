"use client";

import { Lock, LockOpen, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

// Tarjeta que se desliza (decisión 042): a la derecha muestra "Bloquear" (o "Desbloquear") y a la
// izquierda "Borrar", como en el diseño. Se abre una sola a la vez; tocar la tarjeta abierta la cierra.

const ACTION_WIDTH = 96;

export type SwipeSide = "lock" | "delete";

export function SwipeRow({
  children,
  enabled,
  locked,
  open,
  onOpenChange,
  onLock,
  onDelete,
}: {
  children: React.ReactNode;
  /** Solo los que pueden editar deslizan. */
  enabled: boolean;
  locked: boolean;
  open: SwipeSide | null;
  onOpenChange: (side: SwipeSide | null) => void;
  onLock: () => void;
  onDelete: () => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);
  const swiped = useRef(false);

  const resting = open === "lock" ? ACTION_WIDTH : open === "delete" ? -ACTION_WIDTH : 0;
  const offset = drag ?? resting;

  function onPointerDown(e: React.PointerEvent) {
    if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, base: resting, axis: null };
    swiped.current = false;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.axis !== "x") return;
    swiped.current = true;
    const max = ACTION_WIDTH * 1.4;
    setDrag(Math.max(-max, Math.min(max, s.base + dx)));
  }

  function onPointerEnd() {
    const s = start.current;
    start.current = null;
    if (!s || s.axis !== "x" || drag === null) return;
    onOpenChange(drag > ACTION_WIDTH / 2 ? "lock" : drag < -ACTION_WIDTH / 2 ? "delete" : null);
    setDrag(null);
  }

  return (
    <div className="relative">
      {offset > 0 && (
        <button
          type="button"
          onClick={() => {
            onOpenChange(null);
            onLock();
          }}
          className="bg-navy absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-1 rounded-card text-xs font-bold text-white"
          style={{ width: Math.max(offset, ACTION_WIDTH) }}
        >
          {locked ? <LockOpen size={20} /> : <Lock size={20} />}
          {locked ? "Desbloquear" : "Bloquear"}
        </button>
      )}
      {offset < 0 && (
        <button
          type="button"
          onClick={() => {
            onOpenChange(null);
            onDelete();
          }}
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 rounded-card bg-delete text-xs font-bold text-white"
          style={{ width: Math.max(-offset, ACTION_WIDTH) }}
        >
          <Trash2 size={20} />
          Borrar
        </button>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // Después de deslizar, o con la tarjeta abierta, el toque no abre la ciudad.
          if (swiped.current || open) {
            e.stopPropagation();
            e.preventDefault();
            swiped.current = false;
            if (open) onOpenChange(null);
          }
        }}
        className={`relative touch-pan-y ${drag === null ? "transition-transform duration-200" : ""}`}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
