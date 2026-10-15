import webpush from "web-push";
import { expenseMessage, type ExpenseChange, type ExpenseForPush } from "./expense-message";
import { createClient } from "./supabase/server";

// Notificaciones por Web Push: las de gastos (decisión 094, migración 0013) y los recordatorios
// (decisión 095, migración 0014). En el iPhone solo llegan con la app agregada a la pantalla de
// inicio. Las claves (VAPID) van en las variables de entorno; sin ellas no se manda nada.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (PUBLIC_KEY && PRIVATE_KEY) webpush.setVapidDetails("https://travelapp-two-cyan.vercel.app", PUBLIC_KEY, PRIVATE_KEY);

export const pushReady = !!(PUBLIC_KEY && PRIVATE_KEY);

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Manda una notificación. Devuelve "gone" si el teléfono dio de baja la suscripción. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(message), {
      TTL: 60 * 60 * 24,
    });
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}

/** Avisa a los que están en el gasto. Nunca falla: si algo sale mal, el gasto ya está guardado. */
export async function notifyExpense(change: ExpenseChange, expense: ExpenseForPush): Promise<void> {
  if (!pushReady) return;
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims.sub;
    const { data: me } = await supabase.from("trip_members").select("display_name").eq("trip_id", expense.tripId).eq("user_id", userId).maybeSingle();
    const actor = me?.display_name ?? "Alguien";
    const involved = [...new Set([expense.paidByMemberId, ...expense.splits.map((s) => s.member_id)])];
    const { data: targets } = await supabase.rpc("push_targets", { p_trip_id: expense.tripId, p_member_ids: involved });
    await Promise.all(
      ((targets ?? []) as (PushTarget & { member_id: string })[]).map(async (t) => {
        const result = await sendPush(t, { ...expenseMessage(change, expense, actor, t.member_id), url: `/viaje/${expense.tripId}`, tag: `gasto-${expense.tripId}` });
        // El teléfono dio de baja la suscripción: se borra para no insistir.
        if (result === "gone") await supabase.rpc("forget_push_subscription", { p_trip_id: expense.tripId, p_endpoint: t.endpoint });
      }),
    );
  } catch (error) {
    console.error("No se pudieron mandar las notificaciones del gasto", error);
  }
}
