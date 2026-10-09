import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { findCityPhoto } from "@/lib/city-photo";
import { formatRange } from "@/lib/dates";
import { countdown, splitTrips, todayInUruguay, travelStats, tripSubtitle, type TravelStats } from "@/lib/home";
import { myPart, type MyPart } from "@/lib/my-part";
import { createClient } from "@/lib/supabase/server";
import { NewTripButton } from "./new-trip";
import { SignOutButton } from "./sign-out-button";
import { LoadingScreen } from "@/components/loading-screen";

// Pantalla 00 · Inicio (docs/diseño.md): tus estadísticas (decisión 071), tus viajes próximos con foto
// y cuenta regresiva, el botón "Nuevo viaje" y los viajes pasados.
export default function Home() {
  return (
    <main
      className="mx-auto max-w-[1080px] px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 24px)", paddingBottom: "calc(var(--safe-bottom) + 40px)" }}
    >
      <Suspense fallback={<LoadingScreen label="Cargando tus viajes" />}>
        <Trips />
      </Suspense>
    </main>
  );
}

type TripRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  trip_members: { id: string; display_name: string; initials: string; color: string; user_id: string | null }[];
  stops: { city: string; position: number; nights: number; country: string | null; country_code: string | null; photo_url: string | null; stop_members: { member_id: string }[] }[];
};

/** "uy" → 🇺🇾 */
function flag(code: string | null) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

async function Trips() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const email = claims?.claims.email as string | undefined;

  const { data } = await supabase
    .from("trips")
    .select(
      "id, name, start_date, end_date, trip_members (id, display_name, initials, color, user_id), stops (city, position, nights, country, country_code, photo_url, stop_members (member_id))",
    )
    .order("start_date");
  // Cada viaje con tus fechas (decisión 054): si te sumás más tarde o te vas antes, la tarjeta muestra
  // tu parte, y la cuenta regresiva es hasta que llegás vos.
  const trips = ((data ?? []) as TripRow[]).map((t) => {
    const stops = [...t.stops].sort((a, b) => a.position - b.position);
    const myId = t.trip_members.find((m) => m.user_id === userId)?.id ?? null;
    const part: MyPart | null = myPart(
      t.start_date,
      stops.map((s) => ({ ...s, member_ids: s.stop_members.map((m) => m.member_id) })),
      myId,
    );
    return {
      ...t,
      stops,
      part,
      myId,
      trip_start: t.start_date,
      start_date: part?.arrival ?? t.start_date,
      end_date: part?.departure ?? t.end_date,
    };
  });
  const today = todayInUruguay();
  const { upcoming, past } = splitTrips(trips, today);
  const stats = travelStats(
    trips.map((t) => ({ ...t, myMemberId: t.myId, stops: t.stops.map((s) => ({ ...s, member_ids: s.stop_members.map((m) => m.member_id) })) })),
    today,
  );

  // Foto de cada viaje: la de su primera ciudad de verdad (no la escala de salida si es la misma que la vuelta).
  const photos = await Promise.all(
    trips.map(async (t) => {
      // Si te sumás más tarde, la foto es la de tu primera ciudad.
      const stop = t.part ? t.stops[t.part.first] : (t.stops.find((s, i) => i > 0 || t.stops.length === 1) ?? t.stops[0]);
      return [t.id, stop ? (stop.photo_url ?? (await findCityPhoto(stop.city))) : null] as const;
    }),
  );
  const photo = new Map(photos);

  const me = trips.flatMap((t) => t.trip_members).find((m) => m.user_id === userId);
  const name = me?.display_name ?? email?.split("@")[0] ?? "";

  return (
    <>
      <div className="flex items-center gap-4">
        <div
          className="flex size-[76px] shrink-0 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-card"
          style={{ background: me?.color ?? "#2F5D8A" }}
        >
          {me?.initials ?? name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-navy">Hola,</div>
          <h1 className="truncate text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">{name}</h1>
        </div>
        <SignOutButton />
      </div>

      {stats && <StatsCard stats={stats} />}

      <div className="mt-8 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.01em]">Próximos viajes</h2>
        {trips.length > 0 && <NewTripButton />}
      </div>

      {upcoming.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-[15px] text-ink-2">{trips.length ? "No tenés viajes por delante." : "Todavía no tenés viajes. Armá el primero, o pedile a alguien del grupo el link de invitación."}</p>
          <div className="mt-4">
            <NewTripButton big />
          </div>
        </div>
      )}

      {/* Como Airbnb: la foto limpia, sin degradé ni caja, y el texto abajo (decisión 050). */}
      <div className="grid gap-x-5 gap-y-7 md:grid-cols-2">
        {upcoming.map((t) => (
          <Link key={t.id} href={`/viaje/${t.id}`} className="block">
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-surface bg-cover bg-center"
              style={photo.get(t.id) ? { backgroundImage: `url(${photo.get(t.id)})` } : undefined}
            >
              <span className="absolute top-3 left-3 flex h-8 items-center rounded-full bg-white px-3 text-xs font-bold text-ink shadow-[0_2px_8px_rgb(0_0_0/0.12)]">
                {countdown(t.start_date, t.end_date, today)}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{t.name}</div>
                <div className="mt-0.5 text-sm text-ink-2">{formatRange(t.start_date, t.end_date)}</div>
                <div className="text-sm text-ink-2">
                  {t.part
                    ? `${t.part.first > 0 ? `Te sumás en ${t.part.firstCity}` : `Hasta ${t.part.lastCity}`} · ${tripSubtitle(t.part.last - t.part.first + 1, t.start_date, t.end_date)}`
                    : tripSubtitle(t.stops.length, t.start_date, t.end_date)}
                </div>
              </div>
              <div className="flex shrink-0 -space-x-2 pt-0.5">
                {t.trip_members.slice(0, 5).map((m) => (
                  <span key={m.id} className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white" style={{ background: m.color }}>
                    {m.initials}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-[20px] font-extrabold tracking-[-0.01em]">Viajes pasados</h2>
          <div>
            {past.map((t, i) => (
              <Link key={t.id} href={`/viaje/${t.id}`} className={`flex items-center gap-3 py-3 ${i ? "border-t border-divider" : ""}`}>
                <span
                  className="size-14 shrink-0 rounded-2xl bg-surface"
                  style={photo.get(t.id) ? { backgroundImage: `url(${photo.get(t.id)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{t.name}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-2">{tripSubtitle(t.stops.length, t.start_date, t.end_date)}</span>
                  <span className="mt-0.5 block truncate text-sm">{[...new Set(t.stops.map((s) => flag(s.country_code)))].join(" ")}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-3" />
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Países visitados, viajes hechos y noches afuera, con las banderas superpuestas y la lista de países. */
function StatsCard({ stats }: { stats: TravelStats }) {
  const numbers = [
    { value: stats.countries.length, label: stats.countries.length === 1 ? "país visitado" : "países visitados" },
    { value: stats.tripsDone, label: stats.tripsDone === 1 ? "viaje hecho" : "viajes hechos" },
    { value: stats.nightsAway, label: stats.nightsAway === 1 ? "noche afuera" : "noches afuera" },
  ];
  return (
    <section className="mt-6 rounded-card border border-line p-4">
      <div className="grid grid-cols-3 gap-2">
        {numbers.map((n) => (
          <div key={n.label} className="min-w-0">
            <div className="text-[28px] leading-none font-extrabold tracking-[-0.02em]">{n.value}</div>
            <div className="mt-1 text-[13px] leading-[1.25] text-ink-2">{n.label}</div>
          </div>
        ))}
      </div>
      {stats.countries.length > 0 && (
        <div className="mt-4 flex items-center gap-3 border-t border-divider pt-3.5">
          <div className="flex shrink-0 -space-x-2">
            {stats.countries.slice(0, 6).map((c) => (
              <span
                key={c.code}
                className="size-7 rounded-full border-2 border-white bg-surface bg-cover bg-center"
                style={{ backgroundImage: `url("https://flagcdn.com/w80/${c.code}.png")` }}
                title={c.name}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">{stats.countries.map((c) => c.name).join(" · ")}</div>
        </div>
      )}
    </section>
  );
}
