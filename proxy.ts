import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO_LOCAL } from "@/lib/auth";
import { usuarioDaSessao } from "@/lib/local/banco";
import {
  modoLocal,
  supabaseConfigurado,
  supabaseKey,
  supabaseUrl,
} from "@/lib/supabase/config";

// Renova a sessão a cada requisição e bloqueia as páginas privadas para
// quem não está logado. A tela de login fica em "/".
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let logado = false;

  if (modoLocal) {
    logado = Boolean(
      usuarioDaSessao(request.cookies.get(COOKIE_SESSAO_LOCAL)?.value),
    );
  } else if (supabaseConfigurado) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    logado = Boolean(data?.claims);
  }

  const naTelaDeLogin = request.nextUrl.pathname === "/";

  if (!logado && !naTelaDeLogin) {
    return redirecionar(request, response, "/");
  }
  if (logado && naTelaDeLogin) {
    return redirecionar(request, response, "/menu");
  }
  return response;
}

function redirecionar(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // Mantém os cookies de sessão renovados no redirecionamento.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
