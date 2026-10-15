import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Vamo" };

export default function LoginPage() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5"
      style={{ paddingTop: "calc(var(--safe-top) + 56px)", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
    >
      {/* Logo de la app (el mismo del ícono). */}
      <Image src="/logo.svg" alt="Vamo" width={64} height={64} priority unoptimized className="size-16 rounded-[20px] shadow-button" />
      <h1 className="mt-6 text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em]">Vamo</h1>
      <LoginForm />
    </main>
  );
}
