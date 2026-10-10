import { withCityPhotos } from "./city-photo";
import type { ChipDisplay } from "./legs";
import type { PersonalData } from "./personal";
import { createClient } from "./supabase/server";
import type { Activity, Attachment, Expense, Leg, Member, Settlement, Stay, Stop, Trip } from "./trip-types";

// Lectura de un viaje completo desde Supabase. RLS ya filtra: si no sos miembro, no vuelve nada.

type TripRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  invite_code: string;
  trip_members: Member[];
  stops: (Omit<Stop, "member_ids"> & {
    stop_members: { member_id: string }[];
    stays: (Omit<Stay, "split" | "attachments"> & {
      expense: { expense_splits: Stay["split"] } | null;
      stay_attachments: Attachment[];
    })[];
  })[];
  legs: (Omit<Leg, "attachments" | "split"> & {
    leg_attachments: Leg["attachments"];
    expense: { expense_splits: Leg["split"] } | null;
  })[];
  expenses: (Omit<Expense, "splits"> & { expense_splits: Expense["splits"] })[];
  settlements: Settlement[];
  activity: Activity[];
};

/** `personal` es null si la base todavía no tiene la migración 0010 (gastos personales). */
export type TripPageData = { trip: Trip; chipDisplay: ChipDisplay; myMemberId: string | null; personal: PersonalData | null };

export async function getTrip(tripId: string): Promise<TripPageData | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const [{ data }, { data: profile }, categories, expenses] = await Promise.all([
    supabase
      .from("trips")
      .select(
        `id, name, start_date, end_date, invite_code,
         trip_members (id, display_name, initials, color, user_id, role),
         stops (id, position, city, country, country_code, code, tagline, notes, nights, timezone, lat, lng, photo_url, locked,
                stop_members (member_id),
                stays (id, stop_id, name, booked_via, total_price_cents, paid_by_member_id, check_in_time, check_out_time,
                       expense:expenses!stays_expense_id_fkey (expense_splits (member_id, amount_cents)),
                       stay_attachments (id, kind, storage_path, url, file_name, size_bytes))),
         legs (id, from_stop_id, to_stop_id, mode, departs_at, arrives_at, total_price_cents, paid_by_member_id,
               leg_attachments (id, member_id, kind, storage_path, url, file_name, size_bytes),
               expense:expenses!legs_expense_id_fkey (expense_splits (member_id, amount_cents))),
         expenses!expenses_trip_id_fkey (id, stop_id, leg_id, stay_id, description, category, amount_cents, paid_by_member_id, created_at,
                   expense_splits (member_id, amount_cents)),
         settlements (id, from_member_id, to_member_id, amount_cents, settled_at, note),
         activity (id, actor_member_id, actor_name, action, description, from_name, to_name, amount_cents, previous_amount_cents, changes, created_at)`,
      )
      .eq("id", tripId)
      .order("created_at", { referencedTable: "activity", ascending: false })
      .limit(300, { referencedTable: "activity" })
      .maybeSingle(),
    supabase.from("profiles").select("chip_display").eq("user_id", userId).maybeSingle(),
    // Tus gastos personales (decisión 076): RLS devuelve solo los tuyos.
    supabase.from("personal_categories").select("id, name, budget_cents, position").eq("trip_id", tripId),
    supabase.from("personal_expenses").select("id, category, description, amount_cents, spent_on, created_at").eq("trip_id", tripId),
  ]);
  if (!data) return null;

  const row = data as unknown as TripRow;
  const trip: Trip = {
    id: row.id,
    name: row.name,
    start_date: row.start_date,
    end_date: row.end_date,
    invite_code: row.invite_code,
    members: row.trip_members,
    stops: row.stops.map((s) => ({
      id: s.id,
      position: s.position,
      city: s.city,
      country: s.country,
      country_code: s.country_code,
      code: s.code,
      tagline: s.tagline,
      notes: s.notes,
      nights: s.nights,
      timezone: s.timezone,
      lat: s.lat,
      lng: s.lng,
      photo_url: s.photo_url,
      locked: s.locked,
      member_ids: s.stop_members.map((m) => m.member_id),
    })),
    legs: row.legs.map(({ leg_attachments, expense, ...l }) => ({
      ...l,
      attachments: leg_attachments,
      split: expense?.expense_splits ?? [],
    })),
    expenses: row.expenses.map(({ expense_splits, ...e }) => ({ ...e, splits: expense_splits })),
    settlements: row.settlements,
    activity: row.activity,
    stays: row.stops.flatMap((s) =>
      s.stays.map(({ expense, stay_attachments, ...st }) => ({
        ...st,
        split: expense?.expense_splits ?? [],
        attachments: stay_attachments,
        // La base devuelve "14:00:00".
        check_in_time: st.check_in_time?.slice(0, 5) ?? null,
        check_out_time: st.check_out_time?.slice(0, 5) ?? null,
      })),
    ),
  };

  trip.stops = await withCityPhotos(trip.stops);

  return {
    trip,
    chipDisplay: (profile?.chip_display as ChipDisplay | undefined) ?? "time",
    myMemberId: row.trip_members.find((m) => m.user_id === userId)?.id ?? null,
    personal: categories.error || expenses.error ? null : { categories: categories.data ?? [], expenses: expenses.data ?? [] },
  };
}
