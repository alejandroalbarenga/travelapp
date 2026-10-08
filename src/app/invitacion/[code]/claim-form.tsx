"use client";

import { useState, useTransition } from "react";
import { claimMember, joinAsNew } from "./actions";

export type InviteMember = { id: string; name: string; initials: string; color: string; claimed: boolean };

// Elegir quién sos entre los integrantes del viaje, o sumarte con tu nombre.
export function ClaimForm({ code, members }: { code: string; members: InviteMember[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = selected === "new" ? await joinAsNew(code, newName) : await claimMember(code, selected!);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="mt-6">
      <div className="text-[13px] font-bold text-ink-2">¿Quién sos?</div>
      <div className="mt-2 overflow-hidden rounded-card border border-navy/[.07] shadow-card">
        {members.map((m, i) => (
          <button
            key={m.id}
            type="button"
            disabled={m.claimed}
            onClick={() => setSelected(m.id)}
            className={`flex w-full items-center gap-3 px-3.5 py-3 text-left disabled:opacity-45 ${i ? "border-t border-divider" : ""} ${selected === m.id ? "bg-navy-tint" : "bg-white"}`}
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: m.color }}
            >
              {m.initials}
            </span>
            <span className="flex-1 text-[15px] font-bold">{m.name}</span>
            {m.claimed && <span className="text-xs font-bold text-ink-2">Ya entró</span>}
            {selected === m.id && <Check />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected("new")}
          className={`flex w-full items-center gap-3 border-t border-divider px-3.5 py-3 text-left ${selected === "new" ? "bg-navy-tint" : "bg-white"}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-dots text-ink-2">
            +
          </span>
          <span className="flex-1 text-[15px] font-bold">No estoy en la lista</span>
          {selected === "new" && <Check />}
        </button>
      </div>

      {selected === "new" && (
        <label className="mt-4 block">
          <span className="mb-2 block text-[13px] font-bold text-ink-2">Tu nombre</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej. Agustín"
            autoFocus
            className="h-[50px] w-full rounded-field border border-line bg-white px-4 text-[15px] font-semibold outline-none focus:border-navy"
          />
        </label>
      )}

      {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}

      <button
        type="button"
        onClick={confirm}
        disabled={!selected || pending}
        className="bg-navy-gradient mt-5 h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-45"
      >
        {pending ? "Entrando…" : "Entrar al viaje"}
      </button>
    </div>
  );
}

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00293D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
