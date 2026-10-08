import type { AttachmentKind, LegAttachment, Member } from "./trip-types";

// Pasajes y comprobantes (decisiones 010, 011 y 023): reglas que no dependen de Supabase.

/** Tope por archivo. Un pasaje o una captura pesan mucho menos. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** PDF o imagen según el tipo del archivo; null si no es ninguno de los dos. */
export function fileKind(file: { type: string; name: string }): Exclude<AttachmentKind, "link"> | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)) return "image";
  return null;
}

/**
 * Ruta en el bucket privado `attachments`. Empieza con el id del viaje porque la política de
 * Storage mira el primer segmento. El nombre original se guarda aparte (file_name): la ruta
 * usa solo un id y la extensión, para no tener problemas con acentos o espacios.
 */
export function storagePath(tripId: string, folder: "legs" | "stays", parentId: string, fileId: string, fileName: string): string {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(fileName)?.[1]?.toLowerCase() ?? "bin";
  return `${tripId}/${folder}/${parentId}/${fileId}.${ext}`;
}

/** "181 KB", "2,4 MB". */
export function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Acepta "iberia.com/mi-reserva" y le agrega https://. Devuelve null si no parece un link. */
export function normalizeUrl(text: string): string | null {
  const t = text.trim();
  if (!t || /\s/.test(t)) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Pasajes de un tramo en el orden de la pantalla: el tuyo, los del grupo y después los demás. */
export function sortTickets<T extends Pick<LegAttachment, "member_id">>(tickets: T[], myMemberId: string | null, members: Member[]): T[] {
  const rank = (t: T) => (t.member_id === myMemberId && myMemberId ? 0 : t.member_id === null ? 1 : 2);
  const order = (t: T) => members.findIndex((m) => m.id === t.member_id);
  return [...tickets].sort((a, b) => rank(a) - rank(b) || order(a) - order(b));
}

/** Título de un pasaje: "Tu pasaje", "Pasaje de Rodrigo" o "Pasaje del grupo". */
export function ticketTitle(memberId: string | null, myMemberId: string | null, members: Member[]): string {
  if (memberId && memberId === myMemberId) return "Tu pasaje";
  const owner = members.find((m) => m.id === memberId);
  return owner ? `Pasaje de ${owner.display_name}` : "Pasaje del grupo";
}
