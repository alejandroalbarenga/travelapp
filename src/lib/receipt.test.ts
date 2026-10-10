import { describe, expect, it } from "vitest";
import type { PdfLine } from "./booking-pdf";
import { parseReceipt } from "./receipt";

const lines = (rows: [string, number][]): PdfLine[] => rows.map(([text, size]) => ({ text, size }));

describe("parseReceipt", () => {
  it("un ticket de restaurante: el total, sin subtotal ni IVA", () => {
    const info = parseReceipt(
      lines([
        ["CIF B12345678", 30],
        ["Bar La Esquina", 52],
        ["C/ Feria 23, 41003 Sevilla", 30],
        ["2 Cerveza 5,00", 30],
        ["1 Tortilla 8,50", 30],
        ["Subtotal 12,27", 30],
        ["IVA 10% 1,23", 30],
        ["TOTAL 13,50 €", 40],
        ["Tarjeta 13,50", 30],
      ]),
    );
    expect(info).toEqual({ merchant: "Bar La Esquina", amountCents: 1350, category: "food" });
  });

  it("un súper con miles y punto decimal", () => {
    const info = parseReceipt(lines([["MERCADONA S.A.", 40], ["Fecha 21/10/2026", 30], ["TOTAL (€) 1.024,90", 34]]));
    expect(info).toEqual({ merchant: "MERCADONA S.A.", amountCents: 102490, category: "food" });
  });

  it("sin la palabra total toma el monto más alto", () => {
    expect(parseReceipt(lines([["Museu Nacional", 40], ["Entrada adulto 12.00", 30], ["Audioguía 4.50", 30]]))).toEqual({
      merchant: "Museu Nacional",
      amountCents: 1200,
      category: "activities",
    });
  });

  it("lo que no encuentra queda vacío", () => {
    expect(parseReceipt(lines([["Gracias por su visita", 30]]))).toEqual({});
  });
});
