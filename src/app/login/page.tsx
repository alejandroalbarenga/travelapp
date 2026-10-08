import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Vamo y vamo" };

export default function LoginPage() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 56px)", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
    >
      <div className="bg-navy-gradient flex size-16 items-center justify-center rounded-[20px] text-white shadow-button">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      </div>
      <h1 className="mt-6 text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">Vamo y vamo</h1>
      <LoginForm />
    </main>
  );
}
