"use server";

import { createClient } from "@/lib/supabase/server";

// Cambiar las noches de una parada. RLS controla que la parada sea de un viaje tuyo.
export async function saveNights(stopId: string, nights: number) {
  if (!Number.isInteger(nights) || nights < 0 || nights > 60) return;
  const supabase = await createClient();
  await supabase.from("stops").update({ nights }).eq("id", stopId);
}
