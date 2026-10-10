import type { PdfLine } from "./booking-pdf";
import type { ExpenseCategory } from "./trip-types";

// Completar un gasto desde la foto del ticket (decisión 074): cuánto salió, dónde (el nombre del
// comercio) y una categoría probable. Se lee en el teléfono con OCR, sin mandar la foto a ningún
// servicio. Reglas simples para tickets en español, inglés y los idiomas del viaje; lo que no se
// encuentra queda para completar a mano.

export type ReceiptInfo = { merchant?: string; amountCents?: number; category?: ExpenseCategory };

const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})*|\d+)[.,](\d{2})(?!\d)/g;
const TOTAL = /total|importe|a pagar|to pay|amount due|summe|totale|totaal|montant|zu zahlen|betalen|bedrag|tarjeta|card|efectivo|cash/i;
const NOT_TOTAL = /sub-?total|base|iva|vat|tva|mwst|btw|iban|cambio|change|propina|tip\b|descuento|discount/i;
const NOT_A_MERCHANT =
  /ticket|factura|invoice|receipt|recibo|cif|nif|\bvat\b|tel[ée.:]|fecha|date|hora|www|http|@|calle|c\/|avda|avenida|street|\bst\b|\d{5}|^\d|cajer|caja|mesa|table|bienvenid|welcome|gracias|thank/i;

const CATEGORY_WORDS: [ExpenseCategory, RegExp][] = [
  ["food", /restaurante?|caf[eé]|bar\b|cervecer|pizzer|trattoria|bistro|brasserie|bakery|panader|burger|kebab|sushi|tapas|mercadona|carrefour|lidl|aldi|\bdia\b|spar|albert heijn|jumbo|rema|kiwi|coop|supermerc|supermarket|men[uú]|cerveza|beer|coffee/i],
  ["transport", /taxi|uber|bolt|cabify|metro|bus\b|tranv[ií]a|tram|renfe|parking|gasolin|fuel|peaje|toll/i],
  ["activities", /museo|museum|entrada|admission|ticket de entrada|tour|excursi|teatro|theatre|concierto|concert|parque|park|zoo|palacio|palace/i],
  ["lodging", /hotel|hostel|apartament|airbnb|booking/i],
];

function cents(whole: string, decimals: string): number {
  return Number(whole.replace(/[.\s]/g, "")) * 100 + Number(decimals);
}

function amountsIn(text: string): number[] {
  return [...text.matchAll(AMOUNT)].map((m) => cents(m[1], m[2])).filter((c) => c > 0);
}

export function parseReceipt(lines: PdfLine[]): ReceiptInfo {
  const info: ReceiptInfo = {};
  const rows = lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() })).filter((l) => l.text);

  // El total: el monto más alto de los renglones que dicen "total" (sin subtotales ni impuestos);
  // si no hay, el monto más alto del ticket.
  const totals = rows.filter((l) => TOTAL.test(l.text) && !NOT_TOTAL.test(l.text)).flatMap((l) => amountsIn(l.text));
  const all = rows.flatMap((l) => amountsIn(l.text));
  const amount = Math.max(0, ...(totals.length ? totals : all));
  if (amount) info.amountCents = amount;

  // El comercio: el renglón más grande entre los primeros, que no sea un dato del ticket.
  const head = rows.slice(0, 6).filter((l) => l.text.length >= 3 && l.text.length <= 40 && /[a-zA-ZÀ-ÿ]{3}/.test(l.text) && !NOT_A_MERCHANT.test(l.text));
  const merchant = head.reduce<(typeof head)[number] | null>((best, l) => (!best || l.size > best.size + 0.5 ? l : best), null);
  if (merchant) info.merchant = merchant.text.replace(/[*#|]+/g, "").trim();

  const text = rows.map((l) => l.text).join("\n");
  info.category = CATEGORY_WORDS.find(([, words]) => words.test(text))?.[0];
  if (!info.category) delete info.category;

  return info;
}
