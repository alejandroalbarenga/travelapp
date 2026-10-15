"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, getNotificationPrefs, saveNotificationPrefs, savePushSubscription, sendMeTestPush, type NotificationPrefs } from "@/app/actions";

// Activar las notificaciones en este teléfono (decisiones 094 y 095) y elegir cuáles: gastos,
// recordatorios del viaje, reservas pendientes y plata. El iPhone solo deja
// pedir permiso cuando la persona toca algo, y solo con la app agregada a la pantalla de inicio.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "loading" | "hidden" | "install" | "blocked" | "off" | "on";

const PREF_ROWS = [
  ["expenses", "Gastos", "Cuando cargan, cambian o borran uno en el que estás"],
  ["travel", "Viaje", "La noche antes de cada tramo, antes de salir, llegadas y checkout"],
  ["bookings", "Reservas", "Lo que falta reservar, a 14, 7 y 2 días"],
  ["money", "Plata", "Los domingos, si debés más de €20"],
] as const;

/** La clave pública en base64url → los bytes que pide pushManager.subscribe. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [testNote, setTestNote] = useState("");

  // Una de prueba (decisión 096): llega en 5 segundos, para salir de la app y verla.
  function test() {
    setTestNote("");
    sendMeTestPush().then((result) => setTestNote(result ? result.error : "Te llega en 5 segundos: salí de la app o bloqueá el teléfono."));
  }

  useEffect(() => {
    if (state === "on" && !prefs) getNotificationPrefs().then(setPrefs, () => {});
  }, [state, prefs]);

  function toggle(key: keyof NotificationPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveNotificationPrefs(next).then((result) => {
      if (result) {
        setPrefs(prefs);
        setError(result.error);
      }
    });
  }

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!PUBLIC_KEY || process.env.NODE_ENV !== "production") return setState("hidden");
      if (!supported) return setState(ios && !standalone ? "install" : "hidden");
      if (Notification.permission === "denied") return setState("blocked");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(subscription ? "on" : "off");
    })().catch(() => setState("hidden"));
  }, []);

  function enable() {
    setError("");
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY!) });
        const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const result = await savePushSubscription(json);
        if (result) {
          await subscription.unsubscribe();
          setError(result.error);
          return;
        }
        setState("on");
      } catch {
        setError("No pudimos activar las notificaciones.");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    });
  }

  if (state === "loading" || state === "hidden") return null;

  const text = {
    install: "Para recibir avisos, agregá la app a la pantalla de inicio (Compartir → Agregar a inicio).",
    blocked: "Las notificaciones están bloqueadas. Activalas en Ajustes → Notificaciones → Vamo.",
    off: "Gastos en los que estás y recordatorios del viaje: cuándo salís, qué falta reservar.",
    on: "Elegí cuáles te llegan.",
  }[state];

  return (
    <div className="mt-6 rounded-[18px] border border-line px-4 py-3">
      <div className="flex items-center gap-3">
        {state === "on" ? <Bell size={20} className="shrink-0" /> : <BellOff size={20} className="shrink-0 text-ink-3" />}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">Notificaciones</div>
          <div className="text-[13px] leading-[1.35] text-ink-2">{text}</div>
          {error && <div className="mt-1 text-[13px] font-bold text-danger">{error}</div>}
        </div>
        {state === "off" && (
          <button type="button" onClick={enable} disabled={pending} className="bg-pink h-10 shrink-0 rounded-full px-4 text-sm font-bold text-white disabled:opacity-60">
            {pending ? "…" : "Activar"}
          </button>
        )}
        {state === "on" && (
          <button type="button" onClick={disable} disabled={pending} className="h-10 shrink-0 rounded-full bg-surface px-4 text-sm font-bold disabled:opacity-60">
            Desactivar
          </button>
        )}
      </div>
      {state === "on" && prefs && (
        <div className="mt-2 border-t border-divider pt-1">
          {PREF_ROWS.map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{label}</span>
                <span className="block text-xs text-ink-2">{hint}</span>
              </span>
              <input type="checkbox" checked={prefs[key]} onChange={() => toggle(key)} className="peer sr-only" />
              <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-pink after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          ))}
          <div className="flex items-center gap-3 border-t border-divider pt-2.5 pb-1">
            <span className="min-w-0 flex-1 text-xs text-ink-2">{testNote || "Mandate una para ver cómo llega."}</span>
            <button type="button" onClick={test} className="h-9 shrink-0 rounded-full bg-surface px-4 text-sm font-bold">
              Probar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
