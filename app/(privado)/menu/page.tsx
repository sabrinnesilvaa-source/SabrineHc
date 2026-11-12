import { CATEGORIAS } from "@/lib/categorias";
import { NAVEGACAO } from "@/lib/navegacao";
import { CartaoLink } from "../cartao";

// Página principal: as categorias de documentos já aparecem aqui, sem
// passar por "Documentos", seguidas das outras funções do site.
export default function PaginaMenu() {
  const itens = NAVEGACAO.filter(
    (item) => item.href !== "/menu" && item.href !== "/documentos" && !item.foraDoMenu,
  );

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIAS.map((categoria) => (
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
