import { Suspense } from "react";
import { formatRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ClaimForm, type InviteMember } from "./claim-form";

type InviteRow = {
  trip_id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  member_id: string;
  display_name: string;
  initials: string;
  color: string;
  claimed: boolean;
};

export default function InvitePage({ params }: PageProps<"/invitacion/[code]">) {
  return (
    <main
      className="mx-auto max-w-[440px] px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 40px)", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
    >
      <Suspense fallback={<p className="text-[15px] text-ink-2">Cargando la invitación…</p>}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/invitacion/[code]">["params"] }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invite", { p_code: code });
  const rows = (data ?? []) as InviteRow[];

  if (rows.length === 0) {
    return (
      <>
        <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">Esta invitación no existe</h1>
        <p className="mt-2 text-[15px] text-ink-2">Pedile a alguien del viaje que te mande el link de nuevo.</p>
      </>
    );
  }

  const trip = rows[0];
  const members: InviteMember[] = rows.map((r) => ({
    id: r.member_id,
    name: r.display_name,
    initials: r.initials,
    color: r.color,
    claimed: r.claimed,
  }));

  return (
    <>
      <div className="text-[13px] font-bold text-navy">Te invitaron a</div>
      <h1 className="mt-0.5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">{trip.trip_name}</h1>
      <p className="mt-1 text-sm text-ink-2">{formatRange(trip.start_date, trip.end_date)}</p>
      <ClaimForm code={code} members={members} />
    </>
  );
}
