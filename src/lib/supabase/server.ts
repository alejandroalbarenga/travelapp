import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Se crea uno por request; nunca se comparte.
export async function createClient() {
  // Todo lo que usa Supabase depende de la sesión: se arma en cada pedido, nunca de antemano.
  // (Supabase usa la hora actual para validar la sesión, y Next 16 no deja hacerlo al prerenderizar.)
  await connection();
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies; la sesión la refresca src/proxy.ts.
        }
      },
    },
  });
}
