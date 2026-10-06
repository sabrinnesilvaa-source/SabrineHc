import { NAVEGACAO } from "@/lib/navegacao";
import { CartaoLink } from "../cartao";

export default function PaginaMenu() {
  const itens = NAVEGACAO.filter((item) => item.href !== "/menu" && !item.foraDoMenu,
  );

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((item) => (
        <li key={item.href}>
          <CartaoLink {...item} />
        </li>
      ))}
    </ul>
  );
}
