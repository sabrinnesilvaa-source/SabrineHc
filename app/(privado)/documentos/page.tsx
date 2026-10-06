import { CATEGORIAS } from "@/lib/categorias";
import { CartaoLink } from "../cartao";

export default function PaginaDocumentos() {
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
    </ul>
  );
}
