import { Suspense } from "react";
import { carregarAlmoxarifado } from "@/lib/almoxarifado";
import { Almoxarifado } from "./almoxarifado";

export default function PaginaAlmoxarifado() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const dados = await carregarAlmoxarifado();

  if (!dados) {
    return (
      <p className="text-sm text-red-600">
        Não foi possível carregar o almoxarifado. Confira se o arquivo
        supabase/schema.sql (parte do almoxarifado) foi executado no seu
        projeto Supabase.
      </p>
    );
  }
  return <Almoxarifado inicial={dados} />;
}
