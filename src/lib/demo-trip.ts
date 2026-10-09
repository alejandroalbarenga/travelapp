import { zonedToInstant } from "./legs";
import type { Activity, Expense, Leg, LegMode, Stop, Trip } from "./trip-types";

// El viaje de ejemplo de docs/diseño.md, igual que supabase/seed.sql.
// Se usa en las pruebas y en la ruta /demo (solo en desarrollo).

const AL = "m-al";
const RO = "m-ro";
const JO = "m-jo";
const AG = "m-ag";

const STOPS: [string, string, string, string, number, string, number, number, string][] = [
  ["Madrid", "España", "es", "MAD", 0, "Europe/Madrid", 40.4168, -3.7038, "Tapas, terrazas y nadie cena antes de las diez"],
  ["Bruselas", "Bélgica", "be", "BRU", 4, "Europe/Brussels", 50.8503, 4.3517, "Waffles, papas fritas y cómics en las paredes"],
  ["Ámsterdam", "Países Bajos", "nl", "AMS", 3, "Europe/Amsterdam", 52.3676, 4.9041, "Canales, bicis por todos lados y casas torcidas"],
  ["Eindhoven", "Países Bajos", "nl", "EIN", 1, "Europe/Amsterdam", 51.4416, 5.4697, "Diseño, luces y una noche para cortar el viaje"],
  ["Vilna", "Lituania", "lt", "VNO", 3, "Europe/Vilnius", 54.6872, 25.2797, "Cúpulas barrocas y un casco viejo para perderse"],
  ["Riga", "Letonia", "lv", "RIX", 3, "Europe/Riga", 56.9496, 24.1052, "Art nouveau, un mercado gigante y bálsamo negro"],
  ["Oslo", "Noruega", "no", "OSL", 3, "Europe/Oslo", 59.9139, 10.7522, "Fiordo, una ópera para caminar por arriba y todo carísimo"],
  ["Alicante", "España", "es", "ALC", 3, "Europe/Madrid", 38.3452, -0.481, "Playa en noviembre y un castillo arriba del morro"],
  ["Valencia", "España", "es", "VLC", 3, "Europe/Madrid", 39.4699, -0.3763, "Paella de verdad y edificios de ciencia ficción"],
  ["Sevilla", "España", "es", "SVQ", 3, "Europe/Madrid", 37.3891, -5.9845, "Naranjos, patios y flamenco a la noche"],
  ["Málaga", "España", "es", "AGP", 2, "Europe/Madrid", 36.7213, -4.4214, "Sol, Picasso y espetos frente al mar"],
  ["Lisboa", "Portugal", "pt", "LIS", 3, "Europe/Lisbon", 38.7223, -9.1393, "Tranvía 28, pastéis de nata y miradores"],
  ["Madrid", "España", "es", "MAD", 3, "Europe/Madrid", 40.4168, -3.7038, "La última vuelta antes de volver a casa"],
];

// modo, fecha y hora de salida (hora local de origen), duración en minutos
const LEGS: ([LegMode, string, string, number] | null)[] = [
  ["plane", "2026-10-17", "13:40", 129],
  ["train", "2026-10-21", "10:15", 112],
  ["train", "2026-10-24", "11:04", 80],
  ["plane", "2026-10-25", "09:30", 155],
  ["bus", "2026-10-28", "08:00", 250],
  ["plane", "2026-10-31", "14:20", 110],
  ["plane", "2026-11-03", "07:45", 245],
  null,
  ["train", "2026-11-09", "09:20", 235],
  ["car", "2026-11-12", "10:00", 130],
  ["plane", "2026-11-14", "16:30", 85],
  ["plane", "2026-11-17", "12:10", 80],
];

const stops: Stop[] = STOPS.map(([city, country, cc, code, nights, timezone, lat, lng, tagline], i) => ({
  id: `s${i}`,
  position: i,
  city,
  country,
  country_code: cc,
  code,
  tagline,
  notes: null,
  nights,
  timezone,
  lat,
  lng,
  photo_url: null,
  locked: false,
  member_ids: i < 6 ? [AL, RO, JO] : i === 6 ? [AL, RO] : [AL, RO, AG],
}));

const legs: Leg[] = LEGS.flatMap((l, i) => {
  if (!l) return [];
  const [mode, date, time, minutes] = l;
  const departsAt = zonedToInstant(date, time, stops[i].timezone);
  return [
    {
      id: `l${i}`,
      from_stop_id: stops[i].id,
      to_stop_id: stops[i + 1].id,
      mode,
      departs_at: departsAt,
      arrives_at: new Date(new Date(departsAt).getTime() + minutes * 60_000).toISOString(),
      total_price_cents: i === 0 ? 48000 : i === 1 ? 18000 : null,
      paid_by_member_id: i === 1 ? JO : AL,
      split:
        i === 0 || i === 1
          ? [AL, RO, JO].map((member_id) => ({ member_id, amount_cents: i === 0 ? 16000 : 6000 }))
          : [],
      attachments:
        i === 0
          ? [
              { id: "a1", member_id: AL, kind: "pdf", storage_path: "demo/a1.pdf", url: null, file_name: "Pasaje_MAD-BRU_Ale.pdf", size_bytes: 185344 },
              { id: "a2", member_id: RO, kind: "pdf", storage_path: "demo/a2.pdf", url: null, file_name: "Pasaje_MAD-BRU_Rodrigo.pdf", size_bytes: 181248 },
              { id: "a3", member_id: JO, kind: "pdf", storage_path: "demo/a3.pdf", url: null, file_name: "Pasaje_MAD-BRU_Josué.pdf", size_bytes: 179200 },
              { id: "a4", member_id: null, kind: "link", storage_path: null, url: "https://www.iberia.com/", file_name: null, size_bytes: null },
            ]
          : [],
    },
  ];
});

// Gastos del ejemplo (los mismos del seed): todos entre Ale, Rodrigo y Josué.
const split = (total: number) => {
  const base = Math.floor(total / 3);
  return [AL, RO, JO].map((member_id, i) => ({ member_id, amount_cents: base + (i < total - base * 3 ? 1 : 0) }));
};
const expenses: Expense[] = [
  { id: "e1", stop_id: "s0", leg_id: "l0", stay_id: null, description: "Vuelo Madrid → Bruselas", category: "transport", amount_cents: 48000, paid_by_member_id: AL, created_at: "2026-10-01T10:00:00Z", splits: split(48000) },
  { id: "e2", stop_id: "s1", leg_id: null, stay_id: "st1", description: "Hotel cerca de Grand-Place · 4 noches", category: "lodging", amount_cents: 26400, paid_by_member_id: RO, created_at: "2026-10-01T10:01:00Z", splits: split(26400) },
  { id: "e3", stop_id: "s1", leg_id: "l1", stay_id: null, description: "Tren Bruselas → Ámsterdam", category: "transport", amount_cents: 18000, paid_by_member_id: JO, created_at: "2026-10-01T10:02:00Z", splits: split(18000) },
  { id: "e4", stop_id: "s2", leg_id: null, stay_id: "st2", description: "Departamento en De Pijp · 3 noches", category: "lodging", amount_cents: 42000, paid_by_member_id: AL, created_at: "2026-10-01T10:03:00Z", splits: split(42000) },
  { id: "e5", stop_id: "s2", leg_id: null, stay_id: null, description: "Cena en De Pijp", category: "food", amount_cents: 15600, paid_by_member_id: JO, created_at: "2026-10-22T19:40:00Z", splits: split(15600) },
  { id: "e6", stop_id: "s2", leg_id: null, stay_id: null, description: "Museo Van Gogh", category: "activities", amount_cents: 8800, paid_by_member_id: RO, created_at: "2026-10-23T09:15:00Z", splits: split(8800) },
];

// Historial: la carga de cada gasto, más una edición y un gasto borrado.
const NAMES: Record<string, string> = { [AL]: "Ale", [RO]: "Rodrigo", [JO]: "Josué" };
const activity: Activity[] = [
  ...expenses.map((e, i) => ({
    id: `a${i + 1}`,
    actor_member_id: e.paid_by_member_id,
    actor_name: NAMES[e.paid_by_member_id],
    action: "expense_added" as const,
    description: e.description,
    from_name: null,
    to_name: null,
    amount_cents: e.id === "e5" ? 14200 : e.amount_cents,
    previous_amount_cents: null,
    changes: null,
    created_at: e.created_at,
  })),
  { id: "a7", actor_member_id: RO, actor_name: "Rodrigo", action: "expense_added", description: "Entradas Atomium", from_name: null, to_name: null, amount_cents: 5400, previous_amount_cents: null, changes: null, created_at: "2026-10-19T12:10:00Z" },
  { id: "a8", actor_member_id: RO, actor_name: "Rodrigo", action: "expense_deleted", description: "Entradas Atomium", from_name: null, to_name: null, amount_cents: 5400, previous_amount_cents: null, changes: null, created_at: "2026-10-19T12:12:00Z" },
  { id: "a9", actor_member_id: JO, actor_name: "Josué", action: "expense_edited", description: "Cena en De Pijp", from_name: null, to_name: null, amount_cents: 15600, previous_amount_cents: 14200, changes: ["amount"], created_at: "2026-10-22T20:05:00Z" },
] satisfies Activity[];
activity.sort((a, b) => b.created_at.localeCompare(a.created_at));

export const DEMO_MY_MEMBER_ID = AL;

export const DEMO_TRIP: Trip = {
  id: "demo",
  name: "Otoño en Europa",
  start_date: "2026-10-17",
  end_date: "2026-11-20",
  invite_code: "demo",
  members: [
    { id: AL, display_name: "Ale", initials: "Al", color: "#2F5D8A", user_id: "u-al", role: "admin" },
    { id: RO, display_name: "Rodrigo", initials: "Ro", color: "#A4502B", user_id: null, role: "editor" },
    { id: JO, display_name: "Josué", initials: "Jo", color: "#3A6E4F", user_id: null, role: "viewer" },
    { id: AG, display_name: "Agustín", initials: "Ag", color: "#634A83", user_id: null, role: "viewer" },
  ],
  stops,
  legs,
  stays: [
    {
      id: "st1",
      stop_id: "s1",
      name: "Hotel cerca de Grand-Place",
      booked_via: "booking",
      total_price_cents: 26400,
      paid_by_member_id: RO,
      split: [AL, RO, JO].map((member_id) => ({ member_id, amount_cents: 8800 })),
      attachments: [{ id: "sa1", kind: "pdf", storage_path: "demo/sa1.pdf", url: null, file_name: "Reserva_Booking_Bruselas.pdf", size_bytes: 96256 }],
      check_in_time: "15:00",
      check_out_time: "11:00",
    },
    {
      id: "st2",
      stop_id: "s2",
      name: "Departamento en De Pijp",
      booked_via: "airbnb",
      total_price_cents: 42000,
      paid_by_member_id: AL,
      split: [AL, RO, JO].map((member_id) => ({ member_id, amount_cents: 14000 })),
      attachments: [],
      check_in_time: "14:00",
      check_out_time: "10:00",
    },
  ],
  expenses,
  settlements: [],
  activity,
};
