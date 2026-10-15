import { createClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { dueReminders, tripReminders, type ReminderGroup } from "@/lib/reminders";
import { readTrip } from "@/lib/trip-data";

// El revisor de recordatorios (decisión 095, migración 0014). Supabase lo llama cada 15 minutos con
// la clave REMINDERS_SECRET. Mira los viajes en curso y próximos, arma sus recordatorios y manda por
// Web Push los que ya llegaron a su hora; cada uno se anota en reminder_log para no repetirlo.
// Lee todos los viajes con la secret key de Supabase (SUPABASE_SECRET_KEY), solo acá en el servidor.

export async function POST(request: Request) {
  const secret = process.env.REMINDERS_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No", { status: 401 });
  if (!pushReady || !process.env.SUPABASE_SECRET_KEY) return Response.json({ sent: 0, reason: "faltan claves" });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Viajes que ya arrancaron o arrancan en las próximas dos semanas, hasta una semana después del fin.
  const { data: trips } = await admin.from("trips").select("id").lte("start_date", addDays(today, 15)).gte("end_date", addDays(today, -8));
  let sent = 0;

  for (const { id } of trips ?? []) {
    const trip = await readTrip(admin, id);
    if (!trip) continue;
    const all = tripReminders(trip);
    const candidates = dueReminders(all, now, new Set());
    if (!candidates.length) continue;

    // Se anotan primero: si dos revisores corren a la vez, solo uno se queda con cada recordatorio.
    const { data: claimed } = await admin
      .from("reminder_log")
      .upsert(candidates.map((r) => ({ key: `${trip.id}:${r.key}` })), { onConflict: "key", ignoreDuplicates: true })
      .select("key");
    const mine = new Set((claimed ?? []).map((c) => c.key as string));
    const due = candidates.filter((r) => mine.has(`${trip.id}:${r.key}`));
    if (!due.length) continue;

    // De integrante a sus teléfonos, respetando qué quiere recibir cada uno.
    const userIds = [...new Set(trip.members.map((m) => m.user_id).filter((u): u is string => !!u))];
    const [{ data: subs }, { data: prefs }] = await Promise.all([
      admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", userIds),
      admin.from("notification_prefs").select("user_id, travel, bookings, money").in("user_id", userIds),
    ]);
    const wants = (userId: string, group: ReminderGroup) => {
      const p = prefs?.find((x) => x.user_id === userId);
      return p ? p[group] !== false : true;
    };

    for (const reminder of due) {
      for (const memberId of reminder.memberIds) {
        const userId = trip.members.find((m) => m.id === memberId)?.user_id;
        if (!userId || !wants(userId, reminder.group)) continue;
        for (const sub of (subs ?? []).filter((s) => s.user_id === userId) as (PushTarget & { user_id: string })[]) {
          const result = await sendPush(sub, { title: reminder.title, body: reminder.body, url: `/viaje/${trip.id}`, tag: reminder.key });
          if (result === "sent") sent++;
          if (result === "gone") await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return Response.json({ sent });
}
