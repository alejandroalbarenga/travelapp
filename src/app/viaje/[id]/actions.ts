"use server";

import { createClient } from "@/lib/supabase/server";

// Cambiar las noches de una parada. También corre los horarios de los tramos siguientes.
// RLS controla que la parada sea de un viaje tuyo.
export async function saveNights(stopId: string, nights: number) {
  if (!Number.isInteger(nights) || nights < 0 || nights > 60) return;
  const supabase = await createClient();
  await supabase.rpc("set_stop_nights", { p_stop_id: stopId, p_nights: nights });
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
