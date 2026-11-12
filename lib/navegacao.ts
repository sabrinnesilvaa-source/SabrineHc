import {
  FileText,
  LayoutGrid,
  Paperclip,
  Pill,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

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
  apenasAdmin?: boolean; // só aparece para o perfil admin
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
    href: "/anexar",
    titulo: "Anexar documentos",
    descricao: "Envie, mova e remova documentos das categorias",
    icone: Paperclip,
    naBarraLateral: true,
    foraDoMenu: true,
    apenasAdmin: true,
  },
  {
    href: "/documentos",
    titulo: "Documentos",
    descricao: "Escolha uma categoria para ver os documentos",
    icone: FileText,
  },
  {
    href: "/almoxarifado",
    titulo: "Almoxarifado",
    descricao: "Entradas, saídas, saldo e inventário de materiais",
    icone: Warehouse,
    foraDoMenu: true, // desativado: a página redireciona para o menu
  },
  {
    href: "/guia-diluicao",
    titulo: "Guia de Diluição de Medicamentos – Adulto",
    descricao: "HCCLP · Gerência de Enfermagem · Consulta rápida",
    icone: Pill,
    foraDoMenu: true, // aberto pela categoria "Guia de medicamentos"
  },
];
