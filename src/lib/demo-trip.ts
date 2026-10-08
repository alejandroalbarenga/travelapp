import { zonedToInstant } from "./legs";
import type { Leg, LegMode, Stop, Trip } from "./trip-types";

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
              { id: "a1", member_id: AL, kind: "pdf", file_name: "Pasaje_MAD-BRU_Ale.pdf" },
              { id: "a2", member_id: RO, kind: "pdf", file_name: "Pasaje_MAD-BRU_Rodrigo.pdf" },
              { id: "a3", member_id: JO, kind: "pdf", file_name: "Pasaje_MAD-BRU_Josué.pdf" },
            ]
          : [],
    },
  ];
});

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
    },
    {
      id: "st2",
      stop_id: "s2",
      name: "Departamento en De Pijp",
      booked_via: "airbnb",
      total_price_cents: 42000,
      paid_by_member_id: AL,
      split: [AL, RO, JO].map((member_id) => ({ member_id, amount_cents: 14000 })),
    },
  ],
};
