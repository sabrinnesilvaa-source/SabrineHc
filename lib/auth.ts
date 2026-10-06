import { cookies } from "next/headers";
import { apagarSessao, criarSessao, usuarioDaSessao } from "./local/banco";
import { modoLocal, supabaseConfigurado } from "./supabase/config";
import { createClient } from "./supabase/server";

// Login, sessão e logout. Usa o Supabase quando ele está configurado e o
// banco local (lib/local/banco.ts) quando não está.

export const COOKIE_SESSAO_LOCAL = "sessao_local";

export type Usuario = { email: string; nome: string };

export async function usuarioAtual(): Promise<Usuario | null> {
  if (modoLocal) {
    const cookieStore = await cookies();
    return usuarioDaSessao(cookieStore.get(COOKIE_SESSAO_LOCAL)?.value);
  }
  if (!supabaseConfigurado) {
    await cookies();
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { email: user.email, nome: user.user_metadata?.nome ?? user.email };
}

/** Devolve true se o e-mail e a senha estiverem corretos. */
export async function iniciarSessao(email: string, senha: string) {
  if (modoLocal) {
    const sessao = criarSessao(email, senha);
    if (!sessao) return false;
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_SESSAO_LOCAL, sessao.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(sessao.expiraEm),
    });
    return true;
  }
  if (!supabaseConfigurado) return false;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  return !error;
}

export async function encerrarSessao() {
  if (modoLocal) {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_SESSAO_LOCAL)?.value;
    if (token) apagarSessao(token);
    cookieStore.delete(COOKIE_SESSAO_LOCAL);
    return;
  }
  if (!supabaseConfigurado) return;

  const supabase = await createClient();
  await supabase.auth.signOut();
}
