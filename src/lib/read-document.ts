import type { PdfLine } from "./booking-pdf";

// Leer una reserva o un pasaje en el teléfono, sin mandarlo a ningún servicio: el PDF con pdf.js
// (como el visor) y la imagen con OCR (Tesseract, decisión 067). Devuelve los renglones con su
// tamaño de letra; las reglas de qué es cada cosa están en booking-pdf.ts y ticket-pdf.ts.

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function readDocumentLines(file: File): Promise<PdfLine[]> {
  if (file.type.startsWith("image/")) return readImageLines(file);
  if (isPdf(file)) return readPdfLines(file);
  return [];
}

/** Solo mira las dos primeras páginas: ahí está todo lo que importa. */
async function readPdfLines(file: File): Promise<PdfLine[]> {
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
  return lines.filter((l) => l.text);
}

/** La primera vez baja Tesseract con el español y el inglés (unos megas) y tarda unos segundos. */
async function readImageLines(file: File): Promise<PdfLine[]> {
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
    return lines;
  } finally {
    await worker.terminate();
  }
}
