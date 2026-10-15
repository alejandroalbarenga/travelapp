import type { BookingSource } from "./trip-types";

// Completar el alojamiento desde el PDF de la reserva (decisión 057): el nombre, dónde se reservó,
// los horarios de check-in y checkout, y el precio total si está en euros (decisión 064). Se lee en
// el teléfono con pdf.js, sin mandar el archivo a ningún servicio. Son reglas simples para las confirmaciones de Booking, Airbnb y Hostelworld (en
// español o inglés): lo que no se encuentra queda vacío para completar a mano.

/** Una línea del PDF con el tamaño de su letra (el nombre del alojamiento suele ser lo más grande). */
export type PdfLine = { text: string; size: number };

export type BookingInfo = {
  name?: string;
  via?: BookingSource;
  checkIn?: string; // "15:00"
  checkOut?: string; // "11:00"
  priceCents?: number;
};

const TIME = /\b(\d{1,2})(?::|h)(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/gi;
const CHECK_IN = /check[\s-]?in|entrada|llegada|arrival/i;
const CHECK_OUT = /check[\s-]?out|salida|departure/i;

// Líneas que nunca son el nombre: la marca, el título del documento, datos de la reserva.
const NOT_A_NAME =
  /booking|airbnb|hostelworld|confirma|reserva|reservation|itinerar|recibo|receipt|factura|invoice|n[úu]mero|number|pin\b|c[óo]digo|code|check|entrada|salida|llegada|viaje|trip|hola|hello|gracias|thank|precio|price|total|hu[ée]sped|guest|noche|night|[!?¡¿@]/i;

/** "3:00 PM" → "15:00" */
function toTime(h: string, m: string, ampm?: string): string | null {
  let hour = Number(h);
  const minute = Number(m);
  if (minute > 59) return null;
  const suffix = ampm?.toLowerCase().replace(/[.\s]/g, "");
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 24) return null;
  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Los horarios que aparecen en el texto que sigue a la palabra clave (hasta la otra palabra clave). */
export function timesAfter(text: string, keyword: RegExp, stop: RegExp): string[] {
  const start = text.search(keyword);
  if (start < 0) return [];
  const rest = text.slice(start).replace(keyword, "");
  const end = rest.search(stop);
  return timesIn(rest.slice(0, Math.min(end < 0 ? 140 : end, 140)));
}

/** Todos los horarios del texto, en orden: "de 3:00 PM a 11:00" → ["15:00", "11:00"]. */
export function timesIn(text: string): string[] {
  return [...text.matchAll(TIME)].map((m) => toTime(m[1], m[2], m[3])).filter((t): t is string => t !== null);
}

export function parseBooking(lines: PdfLine[]): BookingInfo {
  const text = lines.map((l) => l.text).join("\n");
  const info: BookingInfo = {};

  if (/booking\.com/i.test(text)) info.via = "booking";
  else if (/airbnb/i.test(text)) info.via = "airbnb";
  else if (/hostelworld/i.test(text)) info.via = "hostelworld";

  // Check-in: el primer horario ("de 15:00 a 00:00" → 15:00). Checkout: el último ("hasta las 11:00").
  const ins = timesAfter(text, CHECK_IN, CHECK_OUT);
  const outs = timesAfter(text, CHECK_OUT, CHECK_IN);
  if (ins.length) info.checkIn = ins[0];
  if (outs.length) info.checkOut = outs[outs.length - 1];

  // El precio: la última línea con "total" y un monto en euros (Booking pone primero los parciales).
  const totals = lines.filter((l) => /total/i.test(l.text) && /€|eur\b/i.test(l.text));
  for (const l of totals.reverse()) {
    const cents = euroCents(l.text);
    if (cents) {
      info.priceCents = cents;
      break;
    }
  }

  // El nombre: la línea con la letra más grande que no sea la marca ni un título.
  const candidates = lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text.length >= 3 && l.text.length <= 70 && /[a-zA-ZÀ-ÿ]{2}/.test(l.text) && !NOT_A_NAME.test(l.text) && !/^\d/.test(l.text));
  const biggest = candidates.reduce<PdfLine | null>((best, l) => (!best || l.size > best.size + 0.5 ? l : best), null);
  if (biggest) info.name = biggest.text;

  return info;
}

/** "Precio total € 1.234,56" → 123456. El separador decimal es el último si le siguen dos cifras. */
export function euroCents(text: string): number | null {
  const amounts = [...text.matchAll(/\d[\d.,\s]*\d|\d/g)].map((m) => m[0].replace(/\s/g, ""));
  const raw = amounts[amounts.length - 1];
  if (!raw) return null;
  const decimal = /[.,]\d{2}$/.test(raw);
  const whole = (decimal ? raw.slice(0, -3) : raw).replace(/[.,]/g, "");
  const cents = Number(whole) * 100 + (decimal ? Number(raw.slice(-2)) : 0);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}
