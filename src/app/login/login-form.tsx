"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login con código por email (decisión 003): pedís el código, te llega al email y lo escribís acá.

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Pediste demasiados códigos. Esperá unos minutos y probá de nuevo.";
    case "otp_expired":
    case "invalid_credentials":
      return "El código no es correcto o ya venció.";
    case "email_address_invalid":
      return "Ese email no parece válido.";
    default:
      return "Algo salió mal. Probá de nuevo.";
  }
}

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setError("Escribí tu email.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(errorMessage(error.code));
      return;
    }
    setEmail(value);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      setError("El código tiene 6 números.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setBusy(false);
      setError(errorMessage(error.code));
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    // Solo rutas internas, para que nadie arme un link que te mande a otro sitio.
    window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }

  const field =
    "h-[54px] w-full rounded-field border border-line bg-white px-4 text-[17px] font-bold text-ink outline-none focus:border-navy focus:shadow-[0_0_0_4px_rgb(0_0_0/0.06)]";
  const primary = "bg-pink mt-4 h-14 w-full rounded-button text-base font-bold text-white disabled:opacity-50";

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="mt-2">
        <p className="text-[15px] text-ink-2">Entrá con tu email. Te mandamos un código para confirmar que sos vos.</p>
        <label className="mt-6 block">
          <span className="mb-2 block text-[13px] font-bold text-ink-2">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@email.com"
            className={field}
          />
        </label>
        {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Mandando…" : "Mandame el código"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="mt-2">
      <p className="text-[15px] text-ink-2">
        Te mandamos un código a <strong className="text-ink">{email}</strong>. Escribilo acá.
      </p>
      <label className="mt-6 block">
        <span className="mb-2 block text-[13px] font-bold text-ink-2">Código</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className={`${field} text-center text-[24px] tracking-[0.3em]`}
          autoFocus
        />
      </label>
      {error && <p className="mt-3 text-[13px] font-bold text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError("");
        }}
        className="mt-2 h-11 w-full text-[13px] font-bold text-navy"
      >
        Usar otro email
      </button>
    </form>
  );
}
