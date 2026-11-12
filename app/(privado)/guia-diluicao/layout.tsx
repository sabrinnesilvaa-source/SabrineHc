import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { perfilDe, usuarioAtual } from "@/lib/auth";
import { podeVerCategoria } from "@/lib/categorias";
import { Carregando } from "../carregando";

// O guia faz parte da categoria "Guia de medicamentos": só quem vê a
// categoria abre a página.
export default function LayoutGuia({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Carregando />}>
      <Permissao>{children}</Permissao>
    </Suspense>
  );
}

async function Permissao({ children }: { children: React.ReactNode }) {
  await connection(); // depende de quem está logado
  const perfil = perfilDe(await usuarioAtual());
  if (!podeVerCategoria(perfil, "guia-de-medicamentos")) redirect("/menu");
  return children;
}
