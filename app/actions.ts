"use server";

import { redirect } from "next/navigation";
import { encerrarSessao, iniciarSessao } from "@/lib/auth";
import { modoLocal, supabaseConfigurado } from "@/lib/supabase/config";

// O e-mail volta junto com o erro para não ser apagado do formulário.
export type EstadoLogin = { erro: string; email?: string };

export async function entrar(
  _estado: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe o usuário e a senha." };
  }
  if (!modoLocal && !supabaseConfigurado) {
    return { erro: "O Supabase ainda não foi configurado neste site.", email };
  }
  if (!(await iniciarSessao(email, senha))) {
    return { erro: "Usuário ou senha incorretos.", email };
  }
  redirect("/menu");
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}
