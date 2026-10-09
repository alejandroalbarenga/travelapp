"use client";

import { FileText, Image as ImageIcon, Link2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { formatSize, normalizeUrl } from "@/lib/attachments";
import type { Attachment } from "@/lib/trip-types";

// Agregar y listar pasajes o comprobantes: PDF, captura o link (decisión 010). Lo usan el
// detalle del tramo (fondo blanco) y el alojamiento de la ciudad (tarjeta navy).

export type AttachmentInput = { file: File } | { url: string };

export function AddAttachmentButtons({
  onAdd,
  dark = false,
  withLink = true,
}: {
  onAdd: (input: AttachmentInput) => Promise<string | null>;
  dark?: boolean;
  withLink?: boolean;
}) {
  const pdfInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(input: AttachmentInput, after?: () => void) {
    setError("");
    startTransition(async () => {
      const message = await onAdd(input);
      if (message) setError(message);
      else after?.();
    });
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) run({ file });
  }

  function saveLink() {
    const url = normalizeUrl(link);
    if (!url) return setError("Eso no parece un link.");
    run({ url }, () => {
      setLink("");
      setLinkOpen(false);
    });
  }

  const button = dark
    ? "flex h-11 items-center justify-center gap-1.5 rounded-field border-[1.5px] border-dashed border-white/35 text-[13px] font-bold text-white disabled:opacity-50"
    : "flex h-11 items-center justify-center gap-1.5 rounded-field border-[1.5px] border-dashed border-dash text-[13px] font-bold disabled:opacity-50";

  return (
    <div className="mt-2.5">
      <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={pick} />
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={pick} />
      <div className={`grid gap-2 ${withLink ? "grid-cols-3" : "grid-cols-2"}`}>
        <button type="button" disabled={pending} onClick={() => pdfInput.current?.click()} className={button}>
          <FileText size={16} /> PDF
        </button>
        <button type="button" disabled={pending} onClick={() => imageInput.current?.click()} className={button}>
          <ImageIcon size={16} /> Captura
        </button>
        {withLink && (
          <button type="button" disabled={pending} onClick={() => setLinkOpen((o) => !o)} aria-expanded={linkOpen} className={button}>
            <Link2 size={16} /> Link
          </button>
        )}
      </div>
      {linkOpen && (
        <div className="mt-2 flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLink()}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Link de la reserva o la aerolínea"
            aria-label="Link"
            className="h-11 min-w-0 flex-1 rounded-field border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-navy"
          />
          <button type="button" disabled={pending} onClick={saveLink} className="bg-pink h-11 shrink-0 rounded-field px-4 text-sm font-bold text-white disabled:opacity-50">
            Agregar
          </button>
        </div>
      )}
      {pending && <p className={`mt-2 text-[13px] font-bold ${dark ? "text-white/80" : "text-ink-2"}`}>Subiendo…</p>}
      {error && <p className={`mt-2 text-[13px] font-bold ${dark ? "text-orange-light" : "text-danger"}`}>{error}</p>}
    </div>
  );
}

/** Una fila de adjunto: ícono (con el avatar del dueño si tiene), título y archivo. Tocarla lo abre. */
export function AttachmentRow({
  attachment,
  title,
  owner,
  first,
  dark = false,
  onOpen,
  onRemove,
}: {
  attachment: Attachment;
  title: string;
  owner?: { initials: string; color: string };
  first: boolean;
  dark?: boolean;
  onOpen: () => void;
  onRemove?: () => Promise<string | null>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const a = attachment;
  const detail = a.kind === "link" ? (a.url ?? "").replace(/^https?:\/\/(www\.)?/, "") : [a.file_name, formatSize(a.size_bytes)].filter(Boolean).join(" · ");

  function remove() {
    if (!onRemove) return;
    startTransition(async () => {
      const message = await onRemove();
      if (message) setError(message);
    });
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 pr-1.5 pl-2.5 ${first ? "" : dark ? "border-t border-white/[.14]" : "border-t border-divider"}`}>
      {/* div y no button: así se puede abrir aunque el sheet esté en modo lectura (fieldset disabled). */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <span
          className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold tracking-[0.04em] ${dark ? "bg-white/[.12] text-white" : "bg-navy/[.08] text-navy"}`}
        >
          {a.kind === "link" ? "LINK" : a.kind === "image" ? "IMG" : "PDF"}
          {owner && (
            <span
              className="absolute -right-[5px] -bottom-[5px] flex size-[22px] items-center justify-center rounded-full border-2 border-white text-[9px] font-extrabold text-white"
              style={{ background: owner.color }}
            >
              {owner.initials}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className={`mt-0.5 block truncate text-xs ${dark ? "text-white/70" : "text-ink-2"}`}>{error || detail}</span>
        </span>
      </div>
      {onRemove &&
        (confirm ? (
          <span className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setConfirm(false)} className={`h-9 rounded-full px-2.5 text-xs font-bold ${dark ? "text-white/80" : "text-ink-2"}`}>
              No
            </button>
            <button type="button" disabled={pending} onClick={remove} className="h-9 rounded-full bg-delete px-3 text-xs font-bold text-white disabled:opacity-50">
              {pending ? "…" : "Borrar"}
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} aria-label={`Quitar ${title}`} className={`flex size-11 shrink-0 items-center justify-center ${dark ? "text-white/70" : "text-ink-3"}`}>
            <X size={18} />
          </button>
        ))}
    </div>
  );
}
