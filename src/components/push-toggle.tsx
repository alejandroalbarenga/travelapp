"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/actions";

// Activar las notificaciones de gastos en este teléfono (decisión 094). El iPhone solo deja
// pedir permiso cuando la persona toca algo, y solo con la app agregada a la pantalla de inicio.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "loading" | "hidden" | "install" | "blocked" | "off" | "on";

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
    install: "Para recibir avisos de gastos, agregá la app a la pantalla de inicio (Compartir → Agregar a inicio).",
    blocked: "Las notificaciones están bloqueadas. Activalas en Ajustes → Notificaciones → Vamo.",
    off: "Avisame cuando carguen un gasto en el que estoy.",
    on: "Te avisamos cuando carguen, cambien o borren un gasto en el que estás.",
  }[state];

  return (
    <div className="mt-6 flex items-center gap-3 rounded-[18px] border border-line px-4 py-3">
      {state === "on" ? <Bell size={20} className="shrink-0" /> : <BellOff size={20} className="shrink-0 text-ink-3" />}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">Notificaciones de gastos</div>
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
  );
}
