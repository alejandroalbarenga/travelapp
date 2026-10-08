import { describe, expect, it } from "vitest";
import { fileKind, formatSize, normalizeUrl, sortTickets, storagePath, ticketTitle } from "./attachments";
import { DEMO_MY_MEMBER_ID, DEMO_TRIP } from "./demo-trip";

const members = DEMO_TRIP.members;

describe("fileKind", () => {
  it("PDF e imágenes, también por la extensión", () => {
    expect(fileKind({ type: "application/pdf", name: "x" })).toBe("pdf");
    expect(fileKind({ type: "", name: "Pasaje.PDF" })).toBe("pdf");
    expect(fileKind({ type: "image/jpeg", name: "IMG_1.jpg" })).toBe("image");
    expect(fileKind({ type: "", name: "IMG_1.HEIC" })).toBe("image");
    expect(fileKind({ type: "application/zip", name: "a.zip" })).toBeNull();
  });
});

describe("storagePath", () => {
  it("empieza con el viaje y usa un id con la extensión", () => {
    expect(storagePath("t1", "legs", "l1", "f1", "Pasaje MAD-BRU Josué.PDF")).toBe("t1/legs/l1/f1.pdf");
    expect(storagePath("t1", "stays", "s1", "f2", "captura")).toBe("t1/stays/s1/f2.bin");
  });
});

describe("formatSize", () => {
  it("KB y MB", () => {
    expect(formatSize(185344)).toBe("181 KB");
    expect(formatSize(2.4 * 1024 * 1024)).toBe("2,4 MB");
    expect(formatSize(null)).toBe("");
  });
});

describe("normalizeUrl", () => {
  it("agrega https y descarta lo que no es un link", () => {
    expect(normalizeUrl("iberia.com/reserva")).toBe("https://iberia.com/reserva");
    expect(normalizeUrl(" https://www.ryanair.com ")).toBe("https://www.ryanair.com/");
    expect(normalizeUrl("hola que tal")).toBeNull();
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("pasajes de un tramo", () => {
  const tickets = DEMO_TRIP.legs[0].attachments;

  it("el tuyo primero, después el del grupo y los demás", () => {
    const asJosue = sortTickets(tickets, "m-jo", members).map((t) => t.id);
    expect(asJosue).toEqual(["a3", "a4", "a1", "a2"]);
    expect(sortTickets(tickets, null, members)[0].id).toBe("a4");
  });

  it("títulos", () => {
    expect(ticketTitle("m-al", DEMO_MY_MEMBER_ID, members)).toBe("Tu pasaje");
    expect(ticketTitle("m-ro", DEMO_MY_MEMBER_ID, members)).toBe("Pasaje de Rodrigo");
    expect(ticketTitle(null, DEMO_MY_MEMBER_ID, members)).toBe("Pasaje del grupo");
  });
});
