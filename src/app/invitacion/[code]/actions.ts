"use server";

import { redirect } from "next/navigation";
import { initialsFor, pickColor } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { error: string } | null;

// Reclamar un integrante que ya estaba en el viaje (decisión 006).
export async function claimMember(code: string, memberId: string): Promise<InviteState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_member", { p_code: code, p_member_id: memberId });
  if (error) return { error: error.message.includes("tomado") ? "Esa persona ya entró desde otro teléfono." : "No pudimos sumarte. Probá de nuevo." };
  redirect("/");
}

// Sumarse como alguien que no estaba en la lista.
export async function joinAsNew(code: string, name: string): Promise<InviteState> {
  const displayName = name.trim();
  if (!displayName) return { error: "Escribí tu nombre." };

  const supabase = await createClient();
  const { data: members } = await supabase.rpc("get_invite", { p_code: code });
  const used = ((members ?? []) as { color: string }[]).map((m) => m.color);

  const { error } = await supabase.rpc("join_trip_as_new", {
    p_code: code,
    p_display_name: displayName,
    p_initials: initialsFor(displayName),
    p_color: pickColor(used),
  });
  if (error) return { error: "No pudimos sumarte. Probá de nuevo." };
  redirect("/");
}
