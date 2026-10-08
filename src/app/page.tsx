import { ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { findCityPhoto } from "@/lib/city-photo";
import { formatRange } from "@/lib/dates";
import { countdown, splitTrips, todayInUruguay, tripSubtitle } from "@/lib/home";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { NewTripButton } from "./new-trip";

// Pantalla 00 · Inicio (docs/diseño.md): tus viajes próximos con foto y cuenta regresiva, el botón
// "Nuevo viaje" y los viajes pasados. Las estadísticas (países, noches afuera) quedan para después.
export default function Home() {
  return (
    <main
      className="mx-auto max-w-[1080px] px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 24px)", paddingBottom: "calc(var(--safe-bottom) + 40px)" }}
    >
      <Suspense fallback={<p className="text-[15px] text-ink-2">Cargando tus viajes…</p>}>
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
  stops: { city: string; position: number; country_code: string | null; photo_url: string | null }[];
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
    .select("id, name, start_date, end_date, trip_members (id, display_name, initials, color, user_id), stops (city, position, country_code, photo_url)")
    .order("start_date");
  const trips = ((data ?? []) as TripRow[]).map((t) => ({ ...t, stops: [...t.stops].sort((a, b) => a.position - b.position) }));
  const today = todayInUruguay();
  const { upcoming, past } = splitTrips(trips, today);

  // Foto de cada viaje: la de su primera ciudad de verdad (no la escala de salida si es la misma que la vuelta).
  const photos = await Promise.all(
    trips.map(async (t) => {
      const stop = t.stops.find((s, i) => i > 0 || t.stops.length === 1) ?? t.stops[0];
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
        <form action={signOut}>
          <button type="submit" aria-label="Salir" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink-2">
            <LogOut size={18} />
          </button>
        </form>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.01em]">Próximos viajes</h2>
        {trips.length > 0 && <NewTripButton />}
      </div>

      {upcoming.length === 0 && (
        <div className="rounded-card-lg border border-navy/[.07] bg-white p-5 text-center shadow-card">
          <p className="text-[15px] text-ink-2">{trips.length ? "No tenés viajes por delante." : "Todavía no tenés viajes. Armá el primero, o pedile a alguien del grupo el link de invitación."}</p>
          <div className="mt-4">
            <NewTripButton big />
          </div>
        </div>
      )}

      <div className="grid gap-3.5 md:grid-cols-2">
        {upcoming.map((t) => (
          <Link
            key={t.id}
            href={`/viaje/${t.id}`}
            className="relative block h-[212px] overflow-hidden rounded-card-xl bg-navy shadow-card"
            style={photo.get(t.id) ? { backgroundImage: `url(${photo.get(t.id)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/10 to-black/75" />
            <span className="glass absolute top-3.5 left-3.5 flex h-8 items-center rounded-full px-3 text-xs font-bold text-navy">
              {formatRange(t.start_date, t.end_date)}
            </span>
            <span className="absolute top-3.5 right-3.5 flex h-8 items-center rounded-xl bg-navy/85 px-3 text-xs font-extrabold text-white">
              {countdown(t.start_date, t.end_date, today)}
            </span>
            <div className="absolute inset-x-4 bottom-4 flex items-end gap-3 text-white">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em]">{t.name}</div>
                <div className="mt-1 text-[13px] font-semibold text-white/85">{tripSubtitle(t.stops.length, t.start_date, t.end_date)}</div>
              </div>
              <div className="flex shrink-0 -space-x-2">
                {t.trip_members.slice(0, 5).map((m) => (
                  <span
                    key={m.id}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-white/80 text-[11px] font-bold text-white"
                    style={{ background: m.color }}
                  >
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
          <div className="overflow-hidden rounded-card border border-navy/[.07] bg-white shadow-card">
            {past.map((t, i) => (
              <Link key={t.id} href={`/viaje/${t.id}`} className={`flex items-center gap-3 p-3 ${i ? "border-t border-divider" : ""}`}>
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
