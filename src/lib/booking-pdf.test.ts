import { describe, expect, it } from "vitest";
import { euroCents, parseBooking, type PdfLine } from "./booking-pdf";

const lines = (rows: [string, number][]): PdfLine[] => rows.map(([text, size]) => ({ text, size }));

describe("parseBooking", () => {
  it("una confirmación de Booking en español", () => {
    const info = parseBooking(
      lines([
        ["Booking.com", 20],
        ["Confirmación de la reserva", 16],
        ["Hotel Artemide", 22],
        ["Via Nazionale 22, Roma, 00184, Italia", 10],
        ["Número de confirmación: 4567.123.456", 10],
        ["Entrada viernes, 20 de noviembre de 2026 de 15:00 a 00:00", 10],
        ["Salida domingo, 22 de noviembre de 2026 de 07:00 a 11:00", 10],
        ["Precio total € 245", 12],
      ]),
    );
    expect(info).toEqual({ name: "Hotel Artemide", via: "booking", checkIn: "15:00", checkOut: "11:00", priceCents: 24500 });
  });

  it("un itinerario de Airbnb en inglés, con AM y PM", () => {
    const info = parseBooking(
      lines([
        ["airbnb", 18],
        ["Your reservation is confirmed", 24],
        ["Sunny loft near Trastevere", 20],
        ["Check-in Fri, Nov 20 3:00 PM", 11],
        ["Checkout Sun, Nov 22 11:00 AM", 11],
      ]),
    );
    expect(info).toEqual({ name: "Sunny loft near Trastevere", via: "airbnb", checkIn: "15:00", checkOut: "11:00" });
  });

  it("lo que no encuentra queda vacío", () => {
    expect(parseBooking(lines([["Reserva", 20], ["Gracias por elegirnos", 12]]))).toEqual({});
  });
});

describe("euroCents", () => {
  it("montos con y sin centavos, en formato europeo o inglés", () => {
    expect(euroCents("Precio total € 245")).toBe(24500);
    expect(euroCents("Total: 1.234,56 €")).toBe(123456);
    expect(euroCents("Total (EUR) 1,234.56")).toBe(123456);
    expect(euroCents("Total EUR 380")).toBe(38000);
    expect(euroCents("Total")).toBeNull();
  });
});
