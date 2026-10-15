// Horas siempre en 24 h (decisión 087): el campo de hora del teléfono sigue su formato (en un iPhone
// en 12 h pide AM/PM), así que se escribe en un campo de texto con el teclado numérico.

/**
 * Lo que se ve mientras se escribe: "1110" → "11:10", "930" → "09:30" (una hora de 3 a 9 lleva el 0
 * adelante), "9:5" → "09:5". Solo dígitos y los dos puntos, hasta 4 cifras.
 */
export function typeTime(text: string): string {
  if (text.includes(":")) {
    const [h, m = ""] = text.split(":");
    const hour = h.replace(/\D/g, "").slice(0, 2);
    const minutes = m.replace(/\D/g, "").slice(0, 2);
    return `${hour.length === 1 && Number(hour) > 2 ? `0${hour}` : hour}:${minutes}`;
  }
  let digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits && Number(digits[0]) > 2) digits = `0${digits}`.slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

/** "HH:MM" si lo escrito es una hora completa y válida; "" si está vacío; null si falta o no vale. */
export function parseTime(text: string): string | null {
  const t = text.trim();
  if (!t) return "";
  const m = /^(\d{1,2}):?(\d{2})?$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const minutes = m[2] === undefined ? 0 : Number(m[2]);
  if (hour > 23 || minutes > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
