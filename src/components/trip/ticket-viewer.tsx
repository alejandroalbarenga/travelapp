"use client";

import { ChevronLeft, ExternalLink, Link2, Share, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/trip-types";

// Pantalla 03 · Ver pasaje (docs/diseño.md): pantalla completa oscura con el PDF a lo ancho,
// los puntos de las páginas y el recordatorio de Wallet. También abre capturas, links y los
// comprobantes del alojamiento. El PDF se dibuja con pdf.js: en el iPhone un PDF embebido a
// veces muestra solo la primera página.

export type ViewerItem = { attachment: Attachment; title: string };

export function TicketViewer({
  title,
  items,
  startIndex = 0,
  getUrl,
  wallet = false,
  airlineUrl = null,
  onClose,
}: {
  title: string;
  items: ViewerItem[];
  startIndex?: number;
  /** URL para abrir el archivo (firmada, o la local en /demo). */
  getUrl: (attachment: Attachment) => Promise<string | null>;
  /** Muestra el recordatorio de Wallet y el link de la aerolínea (pasajes, no comprobantes). */
  wallet?: boolean;
  /** Link de la reserva o la aerolínea, para el botón de la tarjeta de Wallet. */
  airlineUrl?: string | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const item = items[index];
  const [url, setUrl] = useState<{ id: string; value: string | null } | null>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  // Resolver la URL del adjunto elegido.
  useEffect(() => {
    let cancelled = false;
    const a = item.attachment;
    (a.kind === "link" ? Promise.resolve(a.url) : getUrl(a)).then((value) => {
      if (!cancelled) setUrl({ id: a.id, value });
    });
    return () => {
      cancelled = true;
    };
  }, [item, getUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = url?.id === item.attachment.id ? url.value : undefined; // undefined: cargando
  const a = item.attachment;

  async function share() {
    if (!current) return;
    if (a.kind === "link") {
      if (navigator.share) await navigator.share({ title: item.title, url: current }).catch(() => {});
      else window.open(current, "_blank", "noopener");
      return;
    }
    // Compartir el archivo en sí (en el iPhone deja guardarlo en Archivos o mandarlo por WhatsApp).
    try {
      const blob = await (await fetch(current)).blob();
      const file = new File([blob], a.file_name ?? "pasaje", { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.title });
        return;
      }
    } catch {
      // si falla, se abre en otra pestaña
    }
    window.open(current, "_blank", "noopener");
  }

  const subtitle = [a.kind === "link" ? "Link" : a.file_name, a.kind === "pdf" && pages > 1 ? `página ${page + 1} de ${pages}` : ""].filter(Boolean).join(" · ");

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex flex-col bg-viewer text-white">
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
        <button type="button" onClick={onClose} aria-label="Volver" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-viewer-chip">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[15px] font-bold">{title}</div>
          <div className="truncate text-xs text-viewer-ink">{subtitle}</div>
        </div>
        <button type="button" onClick={share} disabled={!current} aria-label="Compartir" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-viewer-chip disabled:opacity-40">
          <Share size={18} />
        </button>
      </div>

      {items.length > 1 && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {items.map((it, k) => (
            <button
              key={it.attachment.id}
              type="button"
              onClick={() => {
                setIndex(k);
                setPage(0);
                setPages(1);
              }}
              aria-pressed={k === index}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold ${k === index ? "bg-white text-viewer" : "bg-viewer-chip text-white"}`}
            >
              {it.title}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {current === undefined ? (
          <Centered>Abriendo…</Centered>
        ) : current === null ? (
          <Centered>No pudimos abrir este archivo.</Centered>
        ) : a.kind === "pdf" ? (
          <PdfPages key={a.id} url={current} onPages={setPages} onPage={setPage} />
        ) : a.kind === "image" ? (
          <div className="flex h-full items-center justify-center overflow-auto px-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada que vence: no pasa por next/image */}
            <img src={current} alt={a.file_name ?? item.title} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-viewer-chip">
              <Link2 size={24} />
            </span>
            <div className="text-sm break-all text-viewer-ink">{current}</div>
            <a href={current} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-viewer">
              Abrir el link <ExternalLink size={16} />
            </a>
          </div>
        )}
      </div>

      {a.kind === "pdf" && pages > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 py-3" aria-hidden>
          {Array.from({ length: pages }, (_, k) => (
            <span key={k} className={`size-1.5 rounded-full ${k === page ? "bg-white" : "bg-viewer-dot"}`} />
          ))}
        </div>
      )}

      {wallet && (
        <div className="mx-4 mt-1 shrink-0 rounded-[22px] bg-viewer-card p-4" style={{ marginBottom: "calc(var(--safe-bottom) + 12px)" }}>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-viewer-chip">
              <Wallet size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold">Abrí tu Wallet si lo guardaste ahí</div>
              <div className="mt-0.5 text-[13px] leading-[1.4] text-viewer-ink">Ahí funciona sin conexión y se actualiza si cambia la puerta.</div>
            </div>
          </div>
          {airlineUrl && (
            <a
              href={airlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-bold text-viewer"
            >
              Abrir en la web de la aerolínea <ExternalLink size={16} />
            </a>
          )}
        </div>
      )}
      {!wallet && <div className="shrink-0" style={{ height: "calc(var(--safe-bottom) + 12px)" }} />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center px-8 text-center text-sm text-viewer-ink">{children}</div>;
}

// Páginas del PDF una al lado de la otra, se pasan deslizando.
function PdfPages({ url, onPages, onPage }: { url: string; onPages: (n: number) => void; onPage: (n: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Cada página se dibuja en un canvas y se pasa a imagen (nítida: con la densidad de la pantalla).
  const [images, setImages] = useState<{ src: string; width: number; height: number }[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url }).promise;
        const width = (scroller.current?.clientWidth ?? window.innerWidth) - 32;
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        const result: { src: string; width: number; height: number }[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (!blob) throw new Error("canvas");
          const src = URL.createObjectURL(blob);
          urls.push(src);
          result.push({ src, width: viewport.width / ratio, height: viewport.height / ratio });
        }
        if (cancelled) return;
        setImages(result);
        onPages(doc.numPages);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [url, onPages]);

  if (failed) return <Centered>No pudimos mostrar el PDF.</Centered>;
  return (
    <div
      ref={scroller}
      onScroll={(e) => onPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
    >
      {images ? (
        images.map((img, k) => (
          <div key={k} className="flex h-full w-full shrink-0 snap-center items-start justify-center overflow-y-auto px-4 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- página del PDF dibujada en el navegador */}
            <img src={img.src} alt={`Página ${k + 1}`} width={img.width} height={img.height} className="rounded-xl bg-white" />
          </div>
        ))
      ) : (
        <div className="w-full shrink-0">
          <Centered>Abriendo…</Centered>
        </div>
      )}
    </div>
  );
}

