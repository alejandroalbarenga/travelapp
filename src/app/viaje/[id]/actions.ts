"use server";

import { searchPlaces, type Place } from "@/lib/places";
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

// Buscar una ciudad (Nominatim). Corre en el servidor para mandar el User-Agent que pide OpenStreetMap.
export async function findPlaces(query: string): Promise<Place[]> {
  return searchPlaces(query);
}

// Agregar una ciudad después de otra (supabase/migrations/0005_add_stop.sql). Devuelve el id nuevo.
export async function addStop(tripId: string, afterStopId: string | null, place: Place): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_stop", {
    p_trip_id: tripId,
    p_after_stop_id: afterStopId,
    p_city: place.name,
    p_country: place.country,
    p_country_code: place.countryCode,
    p_code: place.code,
    p_lat: place.lat,
    p_lng: place.lng,
    p_timezone: place.timezone,
    p_nights: 2,
  });
  if (error || !data) return { error: error?.message.includes("permiso") ? "No tenés permiso para editar este viaje." : "No pudimos agregar la ciudad." };
  return { id: data as string };
}

// Cambiar la ciudad de una parada (renombrar): actualiza el lugar y se vuelve a buscar la foto.
export async function changeStopPlace(stopId: string, place: Place): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stops")
    .update({
      city: place.name,
      country: place.country,
      country_code: place.countryCode,
      code: place.code,
      lat: place.lat,
      lng: place.lng,
      timezone: place.timezone,
      photo_url: null,
    })
    .eq("id", stopId)
    .select("id");
  if (error || !data?.length) return { error: "No pudimos cambiar la ciudad." };
  return null;
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
