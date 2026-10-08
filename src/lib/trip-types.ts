// Forma de los datos de un viaje tal como salen de la base (ver supabase/migrations).

export type LegMode = "car" | "train" | "plane" | "bus" | "other";
export type BookingSource = "booking" | "airbnb" | "direct" | "other";

export type MemberRole = "admin" | "editor" | "viewer";

export type Member = {
  id: string;
  display_name: string;
  initials: string;
  color: string;
  user_id: string | null;
  /** Permisos (decisión 034): organizador, puede editar o solo ver. */
  role: MemberRole;
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

export type ExpenseCategory = "transport" | "lodging" | "food" | "activities" | "other";

export type Expense = {
  id: string;
  stop_id: string | null;
  leg_id: string | null;
  stay_id: string | null;
  description: string;
  category: ExpenseCategory;
  amount_cents: number;
  paid_by_member_id: string;
  created_at: string;
  splits: { member_id: string; amount_cents: number }[];
};

export type Settlement = {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount_cents: number;
  settled_at: string;
  /** Nota de una transferencia cargada a mano ("Bizum", "efectivo"). */
  note: string | null;
};

export type ActivityAction = "expense_added" | "expense_edited" | "expense_deleted" | "settled" | "settle_undone";

/** Un movimiento del historial de gastos (migración 0006). Nadie lo edita ni lo borra. */
export type Activity = {
  id: string;
  actor_member_id: string | null;
  actor_name: string | null;
  action: ActivityAction;
  description: string | null;
  from_name: string | null;
  to_name: string | null;
  amount_cents: number | null;
  previous_amount_cents: number | null;
  /** Qué cambió en una edición: amount, description, payer, split, city, category. */
  changes: string[] | null;
  created_at: string;
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
  expenses: Expense[];
  settlements: Settlement[];
  /** Historial de movimientos, del más nuevo al más viejo. */
  activity: Activity[];
};
