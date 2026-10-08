import { fileKind, MAX_FILE_BYTES, storagePath } from "../attachments";
import type { Attachment, LegAttachment } from "../trip-types";
import { createClient } from "./client";

// Pasajes y comprobantes desde el navegador: el archivo va directo del teléfono al bucket privado
// `attachments` (no pasa por el servidor de Next, que tiene tope de tamaño) y después se anota la fila.
// RLS y la política de Storage deciden quién puede (decisión 034: solo los que editan).

export type AttachmentTarget = { kind: "leg"; tripId: string; legId: string; memberId: string | null } | { kind: "stay"; tripId: string; stayId: string };

const COLUMNS = "id, kind, storage_path, url, file_name, size_bytes";

export async function uploadAttachment(
  target: AttachmentTarget,
  file: File,
  uploadedBy: string | null,
): Promise<{ attachment: Attachment | LegAttachment } | { error: string }> {
  const kind = fileKind(file);
  if (!kind) return { error: "Tiene que ser un PDF o una imagen." };
  if (file.size > MAX_FILE_BYTES) return { error: "El archivo pesa más de 20 MB." };

  const supabase = createClient();
  const parentId = target.kind === "leg" ? target.legId : target.stayId;
  const path = storagePath(target.tripId, target.kind === "leg" ? "legs" : "stays", parentId, crypto.randomUUID(), file.name);
  const upload = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type || undefined });
  if (upload.error) return { error: "No pudimos subir el archivo." };

  const row = { kind, storage_path: path, file_name: file.name, size_bytes: file.size, uploaded_by_member_id: uploadedBy };
  const result = await insertRow(target, row);
  if ("error" in result) await supabase.storage.from("attachments").remove([path]);
  return result;
}

export async function addLinkAttachment(target: AttachmentTarget, url: string, uploadedBy: string | null) {
  return insertRow(target, { kind: "link", url, file_name: null, size_bytes: null, uploaded_by_member_id: uploadedBy });
}

async function insertRow(target: AttachmentTarget, row: Record<string, unknown>): Promise<{ attachment: Attachment | LegAttachment } | { error: string }> {
  const supabase = createClient();
  const { data, error } =
    target.kind === "leg"
      ? await supabase
          .from("leg_attachments")
          .insert({ ...row, leg_id: target.legId, member_id: target.memberId })
          .select(`${COLUMNS}, member_id`)
          .single()
      : await supabase.from("stay_attachments").insert({ ...row, stay_id: target.stayId }).select(COLUMNS).single();
  if (error || !data) return { error: "No pudimos guardar el adjunto." };
  return { attachment: data as Attachment | LegAttachment };
}

export async function deleteAttachment(kind: "leg" | "stay", attachment: Attachment): Promise<string | null> {
  const supabase = createClient();
  const table = kind === "leg" ? "leg_attachments" : "stay_attachments";
  const { data, error } = await supabase.from(table).delete().eq("id", attachment.id).select("id");
  if (error || !data?.length) return "No pudimos borrarlo.";
  if (attachment.storage_path) await supabase.storage.from("attachments").remove([attachment.storage_path]);
  return null;
}

/** URL firmada para abrir un archivo del bucket privado. Vence en una hora (decisión 011). */
export async function signedUrl(storagePath: string): Promise<string | null> {
  const { data } = await createClient().storage.from("attachments").createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? null;
}
