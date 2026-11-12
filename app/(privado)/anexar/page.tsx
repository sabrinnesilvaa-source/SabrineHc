import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ehAdmin, usuarioAtual } from "@/lib/auth";
import { modoLocal, supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import { listarParaEditor } from "./actions";
import { Editor } from "./editor";

export default function PaginaAnexar() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  // A sessão usa Date.now(): renderiza só na requisição.
  await connection();
  if (!ehAdmin(await usuarioAtual())) redirect("/menu");

  let documentos = null;
  try {
    documentos = await listarParaEditor();
  } catch {
    // mostra o aviso no editor
  }

  return (
    <Editor
      inicial={documentos}
      modoLocal={modoLocal}
      supabase={{ url: supabaseUrl, chave: supabaseKey }}
    />
  );
}
