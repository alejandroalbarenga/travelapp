"use client";

import { LogOut } from "lucide-react";
import { clearPrivateCache } from "@/components/pwa";
import { signOut } from "./actions";

// Salir de la cuenta. Antes borra lo que el service worker guardó del viaje y los pasajes.
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={clearPrivateCache}>
      <button type="submit" aria-label="Salir" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink-2">
        <LogOut size={18} />
      </button>
    </form>
  );
}
