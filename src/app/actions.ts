"use server";

import { redirect } from "next/navigation";
import { validateNewTrip } from "@/lib/home";
import { initialsFor } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Pantalla 07 · Nuevo viaje. create_trip() deja al que lo crea como organizador. Su nombre y color
// salen de otro viaje donde ya esté; si es el primero, del mail.
export async function createTrip(name: string, startDate: string, endDate: string): Promise<{ id: string } | { error: string }> {
  const invalid = validateNewTrip(name, startDate, endDate);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Tu sesión venció. Volvé a entrar." };

  const { data: me } = await supabase
    .from("trip_members")
    .select("display_name, initials, color")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const email = (claims.claims.email as string | undefined) ?? "";
  const fromEmail = email.split("@")[0].replace(/[._-]+/g, " ").replace(/^./, (c) => c.toUpperCase()) || "Yo";
  const displayName = me?.display_name ?? fromEmail;

  const { data, error } = await supabase.rpc("create_trip", {
    p_name: name.trim(),
    p_start_date: startDate,
    p_end_date: endDate,
    p_display_name: displayName,
    p_initials: me?.initials ?? initialsFor(displayName),
    p_color: me?.color ?? "#2F5D8A",
  });
  if (error || !data) return { error: "No pudimos crear el viaje." };
  return { id: data as string };
}

// Borrar un viaje entero (solo el organizador). Primero los archivos del bucket, porque Storage
// no deja borrarlos desde SQL y después ya no serías integrante; después delete_trip()
// (migración 0007) borra todo lo demás.
export async function deleteTrip(tripId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: me } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", claims?.claims.sub ?? "")
    .maybeSingle();
  if (me?.role !== "admin") return { error: "Solo el organizador puede borrar el viaje." };

  const [{ data: legFiles }, { data: stayFiles }] = await Promise.all([
    supabase.from("leg_attachments").select("storage_path, legs!inner(trip_id)").eq("legs.trip_id", tripId),
    supabase.from("stay_attachments").select("storage_path, stays!inner(stops!inner(trip_id))").eq("stays.stops.trip_id", tripId),
  ]);
  const paths = [...(legFiles ?? []), ...(stayFiles ?? [])].map((f) => f.storage_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("attachments").remove(paths);

  const { error } = await supabase.rpc("delete_trip", { p_trip_id: tripId });
  return error ? { error: "No pudimos borrar el viaje." } : null;
}
