import webpush from "web-push";
import { expenseMessage, type ExpenseChange, type ExpenseForPush } from "./expense-message";
import { createClient } from "./supabase/server";

// Notificaciones de gastos (decisión 065, migración 0010): cuando alguien carga, cambia o borra un
// gasto, les llega una notificación a los que están en el gasto (los que lo dividen y quien pagó),
// salvo a quien lo hizo. Con Web Push: en el iPhone, solo con la app agregada a la pantalla de inicio.
// Las claves (VAPID) van en las variables de entorno; sin ellas no se manda nada.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (PUBLIC_KEY && PRIVATE_KEY) webpush.setVapidDetails("https://travelapp-two-cyan.vercel.app", PUBLIC_KEY, PRIVATE_KEY);

/** Avisa a los que están en el gasto. Nunca falla: si algo sale mal, el gasto ya está guardado. */
export async function notifyExpense(change: ExpenseChange, expense: ExpenseForPush): Promise<void> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return;
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims.sub;
    const { data: me } = await supabase.from("trip_members").select("display_name").eq("trip_id", expense.tripId).eq("user_id", userId).maybeSingle();
    const actor = me?.display_name ?? "Alguien";
    const involved = [...new Set([expense.paidByMemberId, ...expense.splits.map((s) => s.member_id)])];
    const { data: targets } = await supabase.rpc("push_targets", { p_trip_id: expense.tripId, p_member_ids: involved });
    await Promise.all(
      ((targets ?? []) as { member_id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (t) => {
        const message = expenseMessage(change, expense, actor, t.member_id);
        try {
          await webpush.sendNotification(
            { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
            JSON.stringify({ ...message, url: `/viaje/${expense.tripId}`, tag: `gasto-${expense.tripId}` }),
            { TTL: 60 * 60 * 24 },
          );
        } catch (error) {
          // El teléfono dio de baja la suscripción: se borra para no insistir.
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await supabase.rpc("forget_push_subscription", { p_trip_id: expense.tripId, p_endpoint: t.endpoint });
        }
      }),
    );
  } catch (error) {
    console.error("No se pudieron mandar las notificaciones del gasto", error);
  }
}
