import { redirect } from "next/navigation";

// As categorias ficam no Menu principal (filtradas por perfil).
export default function PaginaDocumentos() {
  redirect("/menu");
}
