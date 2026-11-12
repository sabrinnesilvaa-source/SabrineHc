import { redirect } from "next/navigation";
import { Suspense } from "react";
import { carregarAlmoxarifado } from "@/lib/almoxarifado";
import { podeEditar, usuarioAtual } from "@/lib/auth";
import { Almoxarifado } from "./almoxarifado";

// Almoxarifado desativado. Para reativar, mude para true e tire o
// "foraDoMenu" do item em lib/navegacao.ts.
const ATIVO = false;

export default function PaginaAlmoxarifado() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  if (!ATIVO) redirect("/menu");
  const [dados, usuario] = await Promise.all([carregarAlmoxarifado(), usuarioAtual()]);

  if (!dados) {
    return (
      <p className="text-sm text-red-600">
        Não foi possível carregar o almoxarifado. Confira se o arquivo
        supabase/schema.sql (parte do almoxarifado) foi executado no seu
        projeto Supabase.
      </p>
    );
  }
  return <Almoxarifado inicial={dados} podeEditar={podeEditar(usuario)} />;
}
