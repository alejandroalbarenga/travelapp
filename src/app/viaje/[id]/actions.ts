"use server";

import { createClient } from "@/lib/supabase/server";

// Cambiar las noches de una parada. También corre los horarios de los tramos siguientes.
// RLS controla que la parada sea de un viaje tuyo.
export async function saveNights(stopId: string, nights: number) {
  if (!Number.isInteger(nights) || nights < 0 || nights > 60) return;
  const supabase = await createClient();
  await supabase.rpc("set_stop_nights", { p_stop_id: stopId, p_nights: nights });
}

export type SaveStopInput = {
  stopId: string;
  memberIds: string[];
  notes: string;
  stayName: string;
  bookedVia: "booking" | "airbnb" | "direct" | "other" | null;
  stayPriceCents: number | null;
  stayPaidByMemberId: string | null;
  stayDescription: string;
  staySplits: { member_id: string; amount_cents: number }[];
};

// Guarda quién está, las notas y el alojamiento con su gasto (supabase/migrations/0003_stops.sql).
export async function saveStop(input: SaveStopInput): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_stop", {
    p_stop_id: input.stopId,
    p_member_ids: input.memberIds,
    p_notes: input.notes,
    p_stay_name: input.stayName,
    p_booked_via: input.bookedVia,
    p_stay_price_cents: input.stayPriceCents,
    p_stay_paid_by_member_id: input.stayPaidByMemberId,
    p_stay_description: input.stayDescription,
    p_stay_splits: input.staySplits,
  });
  if (!error) return null;
  if (error.message.includes("no suma")) return { error: "La división del alojamiento no suma el total." };
  if (error.message.includes("al menos")) return { error: "Tiene que quedar al menos una persona." };
  return { error: "No pudimos guardar los cambios." };
}

// Cambia el permiso de un integrante (decisión 034). Solo lo puede hacer el organizador: lo controla RLS.
export async function setMemberRole(memberId: string, role: "editor" | "viewer"): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trip_members").update({ role }).eq("id", memberId).select("id");
  if (error || !data?.length) return { error: "No pudimos cambiar el permiso." };
  return null;
}

// Borra una ciudad. La base borra también su tramo, el tramo que llegaba a ella y sus gastos asociados.
export async function deleteStop(stopId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("stops").delete().eq("id", stopId);
  return error ? { error: "No pudimos borrar la ciudad." } : null;
}

export type SaveLegInput = {
  tripId: string;
  fromStopId: string;
  toStopId: string | null;
  mode: "car" | "train" | "plane" | "bus" | "other";
  departsAt: string | null;
  arrivesAt: string | null;
  totalPriceCents: number | null;
  paidByMemberId: string | null;
  description: string;
  splits: { member_id: string; amount_cents: number }[];
};

// Guarda el tramo y crea, actualiza o borra su gasto (supabase/migrations/0002_legs.sql).
export async function saveLeg(input: SaveLegInput): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_leg", {
    p_trip_id: input.tripId,
    p_from_stop_id: input.fromStopId,
    p_to_stop_id: input.toStopId,
    p_mode: input.mode,
    p_departs_at: input.departsAt,
    p_arrives_at: input.arrivesAt,
    p_total_price_cents: input.totalPriceCents,
    p_paid_by_member_id: input.paidByMemberId,
    p_description: input.description,
    p_splits: input.splits,
  });
  if (error) return { error: error.message.includes("no suma") ? "La división no suma el total." : "No pudimos guardar el tramo." };
  return null;
}
