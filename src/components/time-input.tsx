"use client";

import { useState } from "react";
import { parseTime, typeTime } from "@/lib/time-input";

/**
 * Hora en 24 h (decisión 087), con el teclado numérico: "1110" queda "11:10". Avisa el valor
 * ("HH:MM", o "" si se borró) apenas es una hora completa; al salir del campo, "9" queda "09:00" y
 * lo que no es una hora vuelve a lo que había.
 */
export function TimeInput({
  value,
  onChange,
  label,
  className = "mt-0.5 w-full min-w-0 bg-transparent text-[16px] font-bold outline-none placeholder:text-ink-5",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  // Si el valor cambia desde afuera (ej. al leer la reserva), se muestra ese.
  if (value !== shown) {
    setShown(value);
    setText(value);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      placeholder="--:--"
      value={text}
      onChange={(e) => {
        const next = typeTime(e.target.value);
        setText(next);
        const parsed = /^\d{2}:\d{2}$/.test(next) || next === "" ? parseTime(next) : null;
        if (parsed !== null) {
          setShown(parsed);
          onChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = parseTime(text);
        const final = parsed ?? value;
        setText(final);
        setShown(final);
        if (final !== value) onChange(final);
      }}
      className={className}
    />
  );
}
