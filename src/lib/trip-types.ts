// Forma de los datos de un viaje tal como salen de la base (ver supabase/migrations).

export type LegMode = "car" | "train" | "plane" | "bus" | "other";
export type BookingSource = "booking" | "airbnb" | "direct" | "other";

export type Member = {
  id: string;
  display_name: string;
  initials: string;
  color: string;
  user_id: string | null;
};

export type Stop = {
  id: string;
  position: number;
  city: string;
  country: string | null;
  country_code: string | null;
  code: string | null;
  tagline: string | null;
  notes: string | null;
  nights: number;
  timezone: string;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  member_ids: string[];
};

export type LegAttachment = {
  id: string;
  member_id: string | null;
  kind: "pdf" | "image" | "link";
  file_name: string | null;
};

export type Leg = {
  id: string;
  from_stop_id: string;
  to_stop_id: string | null;
  mode: LegMode;
  departs_at: string | null;
  arrives_at: string | null;
  total_price_cents: number | null;
  paid_by_member_id: string | null;
  attachments: LegAttachment[];
  /** División del gasto del tramo; vacía si no tiene precio. */
  split: { member_id: string; amount_cents: number }[];
};

export type Stay = {
  id: string;
  stop_id: string;
  name: string | null;
  booked_via: BookingSource | null;
  total_price_cents: number | null;
  paid_by_member_id: string | null;
  /** División del gasto del alojamiento; vacía si no tiene precio. */
  split: { member_id: string; amount_cents: number }[];
};

export type Trip = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  invite_code: string;
  members: Member[];
  stops: Stop[];
  legs: Leg[];
  stays: Stay[];
};
