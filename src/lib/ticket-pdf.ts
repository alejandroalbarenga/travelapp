import { euroCents, timesAfter, timesIn, type PdfLine } from "./booking-pdf";
import type { LegMode } from "./trip-types";

// Completar el tramo desde el pasaje (decisión 069): el medio de transporte, la hora de salida y de
// llegada y el precio en euros. Se lee en el teléfono (PDF con pdf.js, imagen con OCR), con reglas
// simples para pasajes de avión, tren y bus en español o inglés: lo que no se encuentra queda vacío.

export type TicketInfo = {
  mode?: LegMode;
  departs?: string; // "10:15"
  arrives?: string; // "12:30"
  priceCents?: number;
};

// Palabras de cada medio; gana el que más aparece.
const MODE_WORDS: [LegMode, RegExp][] = [
  ["plane", /tarjeta de embarque|boarding pass|\bvuelo\b|\bflight\b|aeropuerto|airport|aerol[íi]nea|airline|ryanair|vueling|iberia|easyjet|air europa|tap air|lufthansa|wizz|volotea|transavia|\bgate\b|terminal \d|asiento \d+[a-f]\b|seat \d+[a-f]\b/gi],
  ["train", /renfe|\btrenes?\b|\btrains?\b|trenitalia|italo\b|sncf|\bave\b|avlo|alvia|iryo|ouigo|eurostar|comboios|deutsche bahn|\bcoche \d+|vag[óo]n|carriage|\bcoach \d+\b.*\bseat|estaci[óo]n|station/gi],
  ["bus", /autob[úu]s|\bbus\b|flixbus|\balsa\b|blablacar bus|\bomnibus\b|rede expressos|estaci[óo]n de autobuses|bus station/gi],
];

const DEPART = /salida|departure|departs?\b|\bsale\b|partida/i;
const ARRIVE = /llegada|arrival|arrives?\b|\bllega\b/i;
// Horarios que no son ni la salida ni la llegada.
const NOT_TRIP_TIME = /embarque|boarding|puerta|\bgate\b|cierre|closes|check-?in|facturaci[óo]n/i;
const TIME = /\b\d{1,2}(?::|h)\d{2}\b/;
const PRICE = /total|precio|importe|price|amount|tarifa|fare|pagado|paid/i;

export function parseTicket(lines: PdfLine[]): TicketInfo {
  const info: TicketInfo = {};
  const text = lines.map((l) => l.text).join("\n");

  let best = 0;
  for (const [mode, words] of MODE_WORDS) {
    const count = text.match(words)?.length ?? 0;
    if (count > best) {
      best = count;
      info.mode = mode;
    }
  }

  const rows = lines.map((l) => l.text).filter((t) => !NOT_TRIP_TIME.test(t));
  // Como tabla: "Salida  Llegada" y en el renglón de abajo "10:15  12:07".
  const header = rows.findIndex((t) => DEPART.test(t) && ARRIVE.test(t) && !TIME.test(t));
  const below = header >= 0 ? rows.slice(header + 1).find((t) => TIME.test(t)) : undefined;
  const table = below ? timesIn(below) : [];
  if (table.length >= 2) {
    info.departs = table[0];
    info.arrives = table[1];
  } else {
    const body = rows.join("\n");
    const deps = timesAfter(body, DEPART, ARRIVE);
    const arrs = timesAfter(body, ARRIVE, DEPART);
    const all = timesIn(body);
    info.departs = deps[0] ?? all[0];
    info.arrives = arrs[0] ?? all.find((t) => t !== info.departs);
    if (!info.departs) delete info.departs;
    if (!info.arrives) delete info.arrives;
  }

  // El precio: primero las líneas con "total", después las que dicen precio, importe, etc.
  const priced = lines.filter((l) => PRICE.test(l.text) && /€|eur\b/i.test(l.text));
  for (const l of [...priced.filter((l) => /total/i.test(l.text)).reverse(), ...priced]) {
    const cents = euroCents(l.text);
    if (cents) {
      info.priceCents = cents;
      break;
    }
  }

  return info;
}
