import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Corre antes de cada página: refresca la sesión de Supabase (escribe las cookies nuevas)
// y manda al login a quien no la tiene. Los permisos de verdad los controla la base (RLS).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;
  const { pathname, search } = request.nextUrl;

  // /demo solo existe en desarrollo y no usa la base.
  const isDemo = process.env.NODE_ENV === "development" && pathname === "/demo";

  // En desarrollo, sin sesión, la app abre directo en el viaje de ejemplo (para no pasar por el login
  // cada vez). /login sigue andando para probarlo. En producción no cambia nada.
  if (process.env.NODE_ENV === "development" && !loggedIn && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/demo";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!loggedIn && pathname !== "/login" && !isDemo) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (loggedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Todo menos archivos estáticos, íconos, el manifest y el service worker (los tiene que poder leer
  // el iPhone sin sesión; el service worker no se puede registrar detrás de una redirección).
  matcher: ["/((?!_next/static|_next/image|manifest.webmanifest|sw\\.js|icon|apple-icon|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)"],
};
