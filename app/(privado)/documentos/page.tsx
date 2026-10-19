import { Warehouse } from "lucide-react";
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
      <li>
        <CartaoLink
          href="/almoxarifado"
          titulo="Almoxarifado"
          descricao="Entradas, saídas, saldo e inventário de materiais"
          icone={Warehouse}
        />
      </li>
    </ul>
  );
}
