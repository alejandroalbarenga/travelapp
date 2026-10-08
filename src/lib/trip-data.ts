import { withCityPhotos } from "./city-photo";
import type { ChipDisplay } from "./legs";
import { createClient } from "./supabase/server";
import type { Leg, Member, Stay, Stop, Trip } from "./trip-types";

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
    stays: (Omit<Stay, "split"> & { expense: { expense_splits: Stay["split"] } | null })[];
  })[];
  legs: (Omit<Leg, "attachments" | "split"> & {
    leg_attachments: Leg["attachments"];
    expense: { expense_splits: Leg["split"] } | null;
  })[];
};

export type TripPageData = { trip: Trip; chipDisplay: ChipDisplay; myMemberId: string | null };

export async function getTrip(tripId: string): Promise<TripPageData | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("trips")
      .select(
        `id, name, start_date, end_date, invite_code,
         trip_members (id, display_name, initials, color, user_id, role),
         stops (id, position, city, country, country_code, code, tagline, notes, nights, timezone, lat, lng, photo_url,
                stop_members (member_id),
                stays (id, stop_id, name, booked_via, total_price_cents, paid_by_member_id,
                       expense:expenses!stays_expense_id_fkey (expense_splits (member_id, amount_cents)))),
         legs (id, from_stop_id, to_stop_id, mode, departs_at, arrives_at, total_price_cents, paid_by_member_id,
               leg_attachments (id, member_id, kind, file_name),
               expense:expenses!legs_expense_id_fkey (expense_splits (member_id, amount_cents)))`,
      )
      .eq("id", tripId)
      .maybeSingle(),
    supabase.from("profiles").select("chip_display").eq("user_id", userId).maybeSingle(),
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
      member_ids: s.stop_members.map((m) => m.member_id),
    })),
    legs: row.legs.map(({ leg_attachments, expense, ...l }) => ({
      ...l,
      attachments: leg_attachments,
      split: expense?.expense_splits ?? [],
    })),
    stays: row.stops.flatMap((s) => s.stays.map(({ expense, ...st }) => ({ ...st, split: expense?.expense_splits ?? [] }))),
  };

  trip.stops = await withCityPhotos(trip.stops);

  return {
    trip,
    chipDisplay: (profile?.chip_display as ChipDisplay | undefined) ?? "time",
    myMemberId: row.trip_members.find((m) => m.user_id === userId)?.id ?? null,
  };
}
