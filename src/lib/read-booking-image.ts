import { parseBooking, type BookingInfo, type PdfLine } from "./booking-pdf";

/**
 * Lee la captura o foto de la reserva en el teléfono con Tesseract (OCR) y saca lo que pueda del
 * alojamiento con las mismas reglas que el PDF (decisión 067). No manda la imagen a ningún
 * servicio: lo único que baja de internet, la primera vez, es Tesseract con el español y el inglés.
 */
export async function readBookingImage(file: File): Promise<BookingInfo> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["spa", "eng"]);
  try {
    const { data } = await worker.recognize(file, {}, { blocks: true });
    const lines: PdfLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          // Lo que leyó con poca seguridad suele ser un ícono o una foto, no texto.
          if (line.confidence < 50) continue;
          const text = line.text.replace(/\s+/g, " ").trim();
          // El alto del renglón hace de tamaño de letra (el nombre del alojamiento suele ser lo más grande).
          const size = line.rowAttributes?.rowHeight || line.bbox.y1 - line.bbox.y0;
          if (text) lines.push({ text, size });
        }
      }
    }
    return parseBooking(lines);
  } finally {
    await worker.terminate();
  }
}
