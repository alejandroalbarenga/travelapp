import { describe, expect, it } from "vitest";
import type { PdfLine } from "./booking-pdf";
import { parseTicket } from "./ticket-pdf";

const lines = (rows: string[]): PdfLine[] => rows.map((text) => ({ text, size: 10 }));

describe("parseTicket", () => {
  it("una tarjeta de embarque: ignora la hora de embarque", () => {
    const info = parseTicket(
      lines([
        "Ryanair",
        "Tarjeta de embarque",
        "Vuelo FR 5482 · Valencia (VLC) → Sevilla (SVQ)",
        "Hora de embarque 09:35",
        "Salida 10:15",
        "Llegada 11:20",
        "Asiento 14C",
        "Precio total 48,99 €",
      ]),
    );
    expect(info).toEqual({ mode: "plane", departs: "10:15", arrives: "11:20", priceCents: 4899 });
  });

  it("un billete de Renfe con salida y llegada como tabla", () => {
    const info = parseTicket(
      lines(["Renfe", "Billete de tren AVE", "Origen Destino Salida Llegada", "VALENCIA SEVILLA 09:20 13:15", "Coche 5 Plaza 7A", "Importe 62,40 €"]),
    );
    expect(info).toEqual({ mode: "train", departs: "09:20", arrives: "13:15", priceCents: 6240 });
  });

  it("un pasaje de FlixBus en inglés", () => {
    const info = parseTicket(lines(["FlixBus", "Booking confirmation", "Departure 8:00 AM Málaga bus station", "Arrival 12:10 PM Lisboa Oriente", "Total EUR 19.99"]));
    expect(info).toEqual({ mode: "bus", departs: "08:00", arrives: "12:10", priceCents: 1999 });
  });

  it("sin palabras clave toma los dos primeros horarios", () => {
    expect(parseTicket(lines(["Madrid 14:20", "Alicante 16:10"]))).toEqual({ departs: "14:20", arrives: "16:10" });
  });

  it("lo que no encuentra queda vacío", () => {
    expect(parseTicket(lines(["Gracias por tu compra"]))).toEqual({});
  });
});
