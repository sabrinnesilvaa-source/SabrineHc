import { FileText, LayoutGrid, Pill, type LucideIcon } from "lucide-react";

export const SITE = {
  sigla: "S",
  nome: "Site Sabrine",
  subtitulo: "Documentos e serviços",
};

export type ItemNavegacao = {
  href: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  naBarraLateral?: boolean; // sem isso, o item aparece só como cartão no menu
  foraDoMenu?: boolean; // só dá o título do cabeçalho da página
};

// Para adicionar uma nova função ao site, crie a página em
// app/(privado)/<nome>/page.tsx e inclua um item nesta lista: ele aparece
// como cartão no menu e dá o título do cabeçalho.
export const NAVEGACAO: ItemNavegacao[] = [
  {
    href: "/menu",
    titulo: "Menu",
    descricao: "Escolha uma opção para começar",
    icone: LayoutGrid,
    naBarraLateral: true,
  },
  {
    href: "/documentos",
    titulo: "Documentos",
    descricao: "Escolha uma categoria para ver os documentos",
    icone: FileText,
  },
  {
    href: "/guia-diluicao",
    titulo: "Guia de Diluição de Medicamentos – Adulto",
    descricao: "HCCLP · Gerência de Enfermagem · Consulta rápida",
    icone: Pill,
    foraDoMenu: true, // aberto pela categoria "Guia de medicamentos"
  },
];
