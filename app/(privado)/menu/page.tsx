import { connection } from "next/server";
import { Suspense } from "react";
import { perfilDe, usuarioAtual } from "@/lib/auth";
import { categoriasDoPerfil } from "@/lib/categorias";
import { NAVEGACAO } from "@/lib/navegacao";
import { CartaoLink } from "../cartao";
import { Carregando } from "../carregando";

// Página principal: as categorias de documentos que o perfil pode ver já
// aparecem aqui, sem passar por "Documentos", seguidas das outras funções.
export default function PaginaMenu() {
  return (
    <Suspense fallback={<Carregando />}>
      <Cartoes />
    </Suspense>
  );
}

async function Cartoes() {
  await connection(); // depende de quem está logado
  const perfil = perfilDe(await usuarioAtual());
  const itens = NAVEGACAO.filter(
    (item) => item.href !== "/menu" && item.href !== "/documentos" && !item.foraDoMenu,
  );

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categoriasDoPerfil(perfil).map((categoria) => (
        <li key={categoria.slug}>
          <CartaoLink
            href={`/documentos/${categoria.slug}`}
            titulo={categoria.titulo}
            descricao={categoria.descricao}
            icone={categoria.icone}
          />
        </li>
      ))}
      {itens.map((item) => (
        <li key={item.href}>
          <CartaoLink {...item} />
        </li>
      ))}
    </ul>
  );
}
