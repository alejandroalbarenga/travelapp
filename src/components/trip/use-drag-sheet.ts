"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// Lista que se arrastra como en Google Maps, con tres posiciones:
//   0      → pantalla completa (header blanco),
//   middle → al medio, con el mapa arriba (donde arranca),
//   low    → abajo del todo: solo se ven la rayita y el encabezado (`peek` px desde abajo).
// El sheet sigue al dedo; el contenido recién se scrollea con el sheet arriba del todo, y si estás
// arriba del contenido y tirás para abajo, baja el sheet. Al soltar va a la posición más cercana, o a la
// siguiente si lo tiraste con fuerza. En la compu, la ruedita lo mueve de a una posición.
export function useDragSheet(
  sheetRef: RefObject<HTMLElement | null>,
  scrollRef: RefObject<HTMLElement | null>,
  middle: number,
  peek: number,
) {
  const [top, setTop] = useState(middle);
  const [animating, setAnimating] = useState(false);
  const [low, setLow] = useState(middle); // se calcula con el alto real de la pantalla
  const topRef = useRef(middle);
  const lowRef = useRef(middle);

  const moveTo = useCallback((value: number, animate: boolean) => {
    topRef.current = value;
    setAnimating(animate);
    setTop(value);
  }, []);

  // Posición "abajo del todo": alto de la pantalla menos lo que se ve (más la barra de inicio del iPhone).
  useEffect(() => {
    const sheet = sheetRef.current;
    const container = sheet?.parentElement;
    if (!sheet || !container) return;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;height:var(--safe-bottom)";
    container.appendChild(probe);
    const measure = () => {
      const value = Math.max(middle, container.clientHeight - peek - probe.offsetHeight);
      lowRef.current = value;
      setLow(value);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      observer.disconnect();
      probe.remove();
    };
  }, [sheetRef, middle, peek]);

  const snaps = useCallback(() => [0, middle, lowRef.current], [middle]);

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
    let wheelLock = 0;

    const nextUp = (from: number) => [...snaps()].reverse().find((s) => s < from - 1) ?? 0;
    const nextDown = (from: number) => snaps().find((s) => s > from + 1) ?? lowRef.current;
    const nearest = (from: number) => snaps().reduce((a, b) => (Math.abs(b - from) < Math.abs(a - from) ? b : a));

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
        moveTo(Math.min(lowRef.current, Math.max(0, startTop + dy)), false);
      }
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const current = topRef.current;
      const target = velocity < -0.3 ? nextUp(current) : velocity > 0.3 ? nextDown(current) : nearest(current);
      moveTo(target, true);
    };

    const onWheel = (e: WheelEvent) => {
      const current = topRef.current;
      const openMore = e.deltaY > 0 && current > 0;
      const closeMore = e.deltaY < 0 && scroller.scrollTop <= 0 && current < lowRef.current;
      if (!openMore && !closeMore) return;
      e.preventDefault();
      if (e.timeStamp < wheelLock) return; // una posición por gesto de ruedita
      wheelLock = e.timeStamp + 450;
      moveTo(openMore ? nextUp(current) : nextDown(current), true);
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
  }, [sheetRef, scrollRef, moveTo, snaps]);

  /** Tocar la rayita: abajo → medio → arriba → medio. */
  const toggle = useCallback(() => {
    const current = topRef.current;
    if (current >= lowRef.current - 1) moveTo(middle, true);
    else if (current > 0) moveTo(0, true);
    else {
      scrollRef.current?.scrollTo({ top: 0 });
      moveTo(middle, true);
    }
  }, [middle, moveTo, scrollRef]);

  return { top, low, animating, toggle };
}
