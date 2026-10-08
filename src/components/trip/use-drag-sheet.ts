"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// Lista que se arrastra como en Google Maps: el sheet sigue al dedo entre `max` (abajo, con el mapa
// arriba) y 0 (pantalla completa). El contenido recién se scrollea cuando el sheet está arriba del
// todo; si estás arriba del contenido y tirás para abajo, baja el sheet. Al soltar se acomoda arriba
// o abajo según la velocidad o la mitad del recorrido. En la compu, la ruedita sube o baja el sheet.
export function useDragSheet(
  sheetRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  max: number,
) {
  const [top, setTop] = useState(max);
  const [animating, setAnimating] = useState(false);
  const topRef = useRef(max);

  const moveTo = useCallback((value: number, animate: boolean) => {
    topRef.current = value;
    setAnimating(animate);
    setTop(value);
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    const scroller = scrollRef.current;
    if (!sheet || !scroller) return;

    let startY = 0;
    let startTop = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      startY = lastY = e.touches[0].clientY;
      lastTime = e.timeStamp;
      startTop = topRef.current;
      velocity = 0;
      dragging = false;
    };

    const onMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const dy = y - startY;
      velocity = (y - lastY) / Math.max(1, e.timeStamp - lastTime);
      lastY = y;
      lastTime = e.timeStamp;
      const fullyOpen = startTop <= 0;
      const pullingDownAtTop = fullyOpen && scroller.scrollTop <= 0 && dy > 0;
      if (!fullyOpen || pullingDownAtTop || dragging) {
        e.preventDefault(); // el gesto mueve el sheet, no el contenido
        dragging = true;
        moveTo(Math.min(max, Math.max(0, startTop + dy)), false);
      }
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const current = topRef.current;
      const target = velocity < -0.3 ? 0 : velocity > 0.3 ? max : current < max / 2 ? 0 : max;
      moveTo(target, true);
    };

    const onWheel = (e: WheelEvent) => {
      const current = topRef.current;
      if (current > 0 && e.deltaY > 0) {
        e.preventDefault();
        moveTo(0, true);
      } else if (current <= 0 && scroller.scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault();
        moveTo(max, true);
      }
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    sheet.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
      sheet.removeEventListener("wheel", onWheel);
    };
  }, [sheetRef, scrollRef, max, moveTo]);

  /** Sube o baja el sheet entero (por ejemplo, al tocar la rayita). */
  const toggle = useCallback(() => {
    if (topRef.current > 0) moveTo(0, true);
    else {
      scrollRef.current?.scrollTo({ top: 0 });
      moveTo(max, true);
    }
  }, [max, moveTo, scrollRef]);

  return { top, animating, toggle };
}
