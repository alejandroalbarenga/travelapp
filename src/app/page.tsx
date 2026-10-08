import Link from "next/link";
import { Suspense } from "react";
import { daysBetween, formatRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { CopyInviteButton } from "./copy-invite-button";

// Inicio provisorio de la Etapa 2: tus viajes y sus integrantes, para probar el login y las
// invitaciones desde dos teléfonos. Lo reemplaza la pantalla de inicio del diseño (Etapa 3).
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
  invite_code: string;
  trip_members: { id: string; display_name: string; initials: string; color: string; user_id: string | null }[];
};

async function Trips() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const email = claims?.claims.email as string | undefined;

  const { data } = await supabase
    .from("trips")
    .select("id, name, start_date, end_date, invite_code, trip_members (id, display_name, initials, color, user_id)")
    .order("start_date");
  const trips = (data ?? []) as TripRow[];

  const me = trips.flatMap((t) => t.trip_members).find((m) => m.user_id === userId);
  const name = me?.display_name ?? email?.split("@")[0] ?? "";

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-navy">Hola,</div>
          <h1 className="mt-0.5 text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">{name}</h1>
          {email && <p className="mt-1 text-sm text-ink-2">{email}</p>}
        </div>
        <form action={signOut}>
          <button type="submit" className="h-11 rounded-full border border-line bg-white px-4 text-[13px] font-bold text-ink-2">
            Salir
          </button>
        </form>
      </div>

      <h2 className="mt-8 mb-3 text-[20px] font-extrabold tracking-[-0.01em]">Tus viajes</h2>

      {trips.length === 0 ? (
        <p className="text-[15px] text-ink-2">
          Todavía no estás en ningún viaje. Pedile a alguien del grupo el link de invitación.
        </p>
      ) : (
        <div className="grid gap-3.5">
          {trips.map((t) => (
            <section key={t.id} className="bg-card-gradient rounded-card-lg border border-navy/[.07] p-[18px] shadow-card">
              <Link href={`/viaje/${t.id}`} className="block text-[22px] leading-[1.1] font-extrabold tracking-[-0.02em]">
                {t.name} ›
              </Link>
              <p className="mt-1 text-[13px] text-ink-2">
                {formatRange(t.start_date, t.end_date)} · {daysBetween(t.start_date, t.end_date)} noches
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {t.trip_members.map((m) => (
                  <span
                    key={m.id}
                    className={`flex h-9 items-center gap-2 rounded-full pr-3 pl-1 text-[13px] font-bold ${m.user_id ? "bg-navy-tint text-navy" : "bg-surface text-ink-2"}`}
                  >
                    <span
                      className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: m.color, opacity: m.user_id ? 1 : 0.55 }}
                    >
                      {m.initials}
                    </span>
                    {m.display_name}
                    {m.user_id === userId && " (vos)"}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-3">Los atenuados todavía no entraron.</p>
              <CopyInviteButton code={t.invite_code} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
