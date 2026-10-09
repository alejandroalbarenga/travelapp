import { parseBooking, type BookingInfo, type PdfLine } from "./booking-pdf";

/**
 * Lee el PDF de la reserva en el navegador (pdf.js, como el visor) y saca lo que pueda del
 * alojamiento. Solo mira las dos primeras páginas: ahí está todo lo que importa.
 */
export async function readBookingPdf(file: File): Promise<BookingInfo> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const lines: PdfLine[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 2); n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Los pedazos de texto a la misma altura forman una línea.
    let current: { y: number; parts: string[]; size: number } | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      const size = Math.hypot(item.transform[2], item.transform[3]);
      if (!current || Math.abs(current.y - y) > 2) {
        if (current) lines.push({ text: current.parts.join(" "), size: current.size });
        current = { y, parts: [], size: 0 };
      }
      if (item.str.trim()) current.parts.push(item.str.trim());
      current.size = Math.max(current.size, size);
    }
    if (current) lines.push({ text: current.parts.join(" "), size: current.size });
  }
  await task.destroy();
  return parseBooking(lines.filter((l) => l.text));
}
