"use server";

import { searchPlaces, type Place } from "@/lib/places";
import { initialsFor, pickColor } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";
import type { BookingSource, Member } from "@/lib/trip-types";

// Si la base rechazó por una ciudad bloqueada (migración 0008), su mensaje ya está en castellano.
function lockedError(error: { message: string } | null): string | null {
  return error && error.message.includes("bloqueada") ? error.message : null;
}

// Cambiar las noches de una parada. También corre los horarios de los tramos siguientes.
// RLS controla que la parada sea de un viaje tuyo.
export async function saveNights(stopId: string, nights: number): Promise<{ error: string } | null> {
  if (!Number.isInteger(nights) || nights < 0 || nights > 60) return { error: "Cantidad de noches inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_stop_nights", { p_stop_id: stopId, p_nights: nights });
  return error ? { error: lockedError(error) ?? "No pudimos cambiar las noches." } : null;
}

// Bloquear o desbloquear una ciudad (decisión 042). RLS: solo los que pueden editar.
export async function setStopLocked(stopId: string, locked: boolean): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stops").update({ locked }).eq("id", stopId).select("id");
  return error || !data?.length ? { error: locked ? "No pudimos bloquear la ciudad." : "No pudimos desbloquearla." } : null;
}

export type SaveStopInput = {
  stopId: string;
  memberIds: string[];
  notes: string;
  stayName: string;
  bookedVia: BookingSource | null;
  stayPriceCents: number | null;
  stayPaidByMemberId: string | null;
  stayDescription: string;
  staySplits: { member_id: string; amount_cents: number }[];
  /** "HH:MM" o null (decisión 051). */
  checkIn: string | null;
  checkOut: string | null;
};

// Guarda quién está, las notas y el alojamiento con su gasto (supabase/migrations/0003_stops.sql).
// Devuelve el id del alojamiento, para subirle la reserva si se eligió antes de guardarlo.
export async function saveStop(input: SaveStopInput): Promise<{ error: string } | { stayId: string | null }> {
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
  if (!error) {
    // Las horas de check-in y checkout van aparte (migración 0009), si quedó un alojamiento.
    if (!input.stayName.trim() && !input.bookedVia) return { stayId: null };
    const { data: stay, error: timesError } = await supabase
      .from("stays")
      .update({ check_in_time: input.checkIn, check_out_time: input.checkOut })
      .eq("stop_id", input.stopId)
      .select("id")
      .maybeSingle();
    return timesError ? { error: lockedError(timesError) ?? "No pudimos guardar las horas del alojamiento." } : { stayId: stay?.id ?? null };
  }
  if (error.message.includes("no suma")) return { error: "La división del alojamiento no suma el total." };
  if (error.message.includes("al menos")) return { error: "Tiene que quedar al menos una persona." };
  return { error: lockedError(error) ?? "No pudimos guardar los cambios." };
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
  if (error || !data) return { error: lockedError(error) ?? (error?.message.includes("permiso") ? "No tenés permiso para editar este viaje." : "No pudimos agregar la ciudad.") };
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
  if (error || !data?.length) return { error: lockedError(error) ?? "No pudimos cambiar la ciudad." };
  return null;
}

// El organizador suma a alguien que todavía no entró (decisión 044): queda "todavía no entró",
// arranca como Solo ver y en todas las ciudades no bloqueadas. Al entrar con el link, lo reclama.
export async function addMember(tripId: string, name: string): Promise<{ member: Member } | { error: string }> {
  const displayName = name.trim();
  if (!displayName) return { error: "Escribí el nombre." };
  const supabase = await createClient();
  const [{ data: members }, { data: stops }] = await Promise.all([
    supabase.from("trip_members").select("color, display_name").eq("trip_id", tripId),
    supabase.from("stops").select("id").eq("trip_id", tripId).eq("locked", false),
  ]);
  if (members?.some((m) => m.display_name.toLocaleLowerCase("es") === displayName.toLocaleLowerCase("es"))) {
    return { error: `Ya hay alguien que se llama ${displayName}.` };
  }
  const { data, error } = await supabase
    .from("trip_members")
    .insert({
      trip_id: tripId,
      display_name: displayName,
      initials: initialsFor(displayName),
      color: pickColor((members ?? []).map((m) => m.color)),
      role: "viewer",
    })
    .select("id, display_name, initials, color, user_id, role")
    .single();
  if (error || !data) return { error: "Solo el organizador puede sumar integrantes." };
  if (stops?.length) await supabase.from("stop_members").insert(stops.map((s) => ({ stop_id: s.id, member_id: data.id })));
  return { member: data as Member };
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
  return error ? { error: lockedError(error) ?? "No pudimos borrar la ciudad." } : null;
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

export type SaveExpenseInput = {
  id: string | null;
  tripId: string;
  stopId: string | null;
  description: string;
  category: "transport" | "lodging" | "food" | "activities" | "other";
  amountCents: number;
  paidByMemberId: string;
  splits: { member_id: string; amount_cents: number }[];
};

// Gasto suelto (los de tramos y alojamientos se guardan desde su pantalla). save_expense escribe
// el gasto y su división juntos; la base rechaza una división que no sume el total.
export async function saveExpense(input: SaveExpenseInput): Promise<{ id: string } | { error: string }> {
  if (input.amountCents <= 0) return { error: "Ingresá un monto." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_expense", {
    p_expense_id: input.id,
    p_trip_id: input.tripId,
    p_stop_id: input.stopId,
    p_leg_id: null,
    p_stay_id: null,
    p_description: input.description.trim() || "Gasto",
    p_category: input.category,
    p_amount_cents: input.amountCents,
    p_paid_by_member_id: input.paidByMemberId,
    p_splits: input.splits,
  });
  if (error || !data) {
    if (error?.message.includes("no suma")) return { error: "La división no suma el total." };
    return { error: "No pudimos guardar el gasto." };
  }
  return { id: data as string };
}

export async function deleteExpense(expenseId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").delete().eq("id", expenseId).select("id");
  return error || !data?.length ? { error: "No pudimos borrar el gasto." } : null;
}

// Un pago entre integrantes: "Marcar como saldado" o una transferencia cargada a mano. "Deshacer" lo borra.
export async function settleDebt(
  tripId: string,
  fromMemberId: string,
  toMemberId: string,
  amountCents: number,
  note: string | null = null,
): Promise<{ id: string } | { error: string }> {
  if (amountCents <= 0) return { error: "Ingresá un monto." };
  if (fromMemberId === toMemberId) return { error: "Elegí a otra persona." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settlements")
    .insert({ trip_id: tripId, from_member_id: fromMemberId, to_member_id: toMemberId, amount_cents: amountCents, note: note?.trim() || null })
    .select("id")
    .single();
  if (error || !data) return { error: "No pudimos guardar el pago." };
  return { id: data.id as string };
}

export async function undoSettlement(settlementId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settlements").delete().eq("id", settlementId).select("id");
  return error || !data?.length ? { error: "No pudimos deshacerlo." } : null;
}
