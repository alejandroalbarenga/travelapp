"use client";

import { useState } from "react";

// Copia el link de invitación del viaje. En el iPhone abre la hoja de compartir si está disponible.
export function CopyInviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/invitacion/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Sumate al viaje", url });
        return;
      } catch {
        // Si cancela la hoja de compartir, copiamos igual.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="bg-navy-gradient mt-4 h-12 w-full rounded-button text-[15px] font-bold text-white shadow-button"
    >
      {copied ? "Link copiado" : "Invitar con un link"}
    </button>
  );
}
