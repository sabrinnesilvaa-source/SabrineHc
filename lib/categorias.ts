import {
  BookOpen,
  CalendarDays,
  ChartPie,
  ArrowLeftRight,
  ClipboardList,
  Database,
  Pill,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Perfil } from "./auth";

export type Categoria = {
  slug: string; // usado no endereço e na coluna "categoria" dos documentos
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  // Páginas do próprio site listadas na categoria, antes dos arquivos.
  paginas?: { href: string; titulo: string; descricao: string }[];
  // Perfis (além de admin e supervisão, que veem tudo) que enxergam a categoria.
  perfis: Perfil[];
  // Slug da categoria-mãe: subcategorias aparecem dentro dela, não no menu.
  pai?: string;
};

// Categorias exibidas em /documentos. Para criar uma nova, inclua um item
// aqui e use o mesmo slug ao cadastrar os documentos.
export const CATEGORIAS: Categoria[] = [
  {
    slug: "protocolos",
    perfis: ["medicos", "enfermagem"],
    titulo: "Protocolos",
    descricao: "Protocolos assistenciais e institucionais",
    icone: ClipboardList,
  },
  {
    slug: "fluxos",
    perfis: ["medicos", "enfermagem"],
    titulo: "Fluxos",
    descricao: "Fluxogramas de atendimento e processos",
    icone: Workflow,
  },
  {
    slug: "manuais",
    perfis: ["medicos", "enfermagem"],
    titulo: "Manuais",
    descricao: "Manuais institucionais e de setores",
    icone: BookOpen,
  },
  {
    slug: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Transição",
    descricao: "Documentos de transição de cuidado",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-demonstrativo-de-pagamento",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Demonstrativo de pagamento",
    descricao: "Transição · Demonstrativo de pagamento",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-dimensionamento-de-pessoas",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Dimensionamento de pessoas",
    descricao: "Transição · Dimensionamento de pessoas",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-enfermagem",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Enfermagem",
    descricao: "Transição · Enfermagem",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-hotelaria",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Hotelaria",
    descricao: "Transição · Hotelaria",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-inventario",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Patrimônio e inventário físico",
    descricao: "Transição · Patrimônio e inventário físico",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-passagem-de-plantao",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Passagem de plantão",
    descricao: "Transição · Passagem de plantão",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-estoque",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Estoque",
    descricao: "Transição · Estoque",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-engenharia-clinica",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "Engenharia clínica",
    descricao: "Transição · Engenharia clínica",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-ti",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "TI",
    descricao: "Transição · TI",
    icone: ArrowLeftRight,
  },
  {
    slug: "transicao-sadt",
    pai: "transicao",
    perfis: ["medicos", "enfermagem"],
    titulo: "SADT",
    descricao: "Transição · SADT",
    icone: ArrowLeftRight,
  },
  {
    slug: "escala-de-enfermagem",
    perfis: ["enfermagem"],
    titulo: "Escala de enfermagem",
    descricao: "Escalas de trabalho da equipe",
    icone: CalendarDays,
  },
  {
    slug: "guia-de-medicamentos",
    perfis: ["medicos"],
    titulo: "Guia de medicamentos",
    descricao: "Diluições, doses e orientações de uso",
    icone: Pill,
    paginas: [
      {
        href: "/guia-diluicao",
        titulo: "Guia de Diluição de Medicamentos – Adulto",
        descricao: "HCCLP · Gerência de Enfermagem · Consulta rápida",
      },
    ],
  },
  {
    slug: "indicadores",
    perfis: [],
    titulo: "Indicadores",
    descricao: "Relatórios e indicadores de desempenho",
    icone: ChartPie,
  },
  {
    slug: "base-de-dados-institucional",
    perfis: [],
    titulo: "Base de Dados Institucional",
    descricao: "Documentos e dados de referência da instituição",
    icone: Database,
  },
];

const VEEM_TUDO: Perfil[] = ["admin", "supervisao"];

export function podeVerCategoria(perfil: Perfil, slug: string | null | undefined) {
  if (VEEM_TUDO.includes(perfil)) return true;
  const categoria = CATEGORIAS.find((c) => c.slug === slug);
  return Boolean(categoria?.perfis.includes(perfil));
}

/** Categorias que o perfil pode ver, na ordem de exibição. */
export const categoriasDoPerfil = (perfil: Perfil) =>
  CATEGORIAS.filter((c) => !c.pai && podeVerCategoria(perfil, c.slug));

/** Subcategorias de uma categoria, em ordem alfabética. */
export const subcategorias = (slug: string) =>
  CATEGORIAS.filter((c) => c.pai === slug).sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "pt-BR"),
  );

/** Nome com a categoria-mãe, ex.: "Transição › SADT". */
export function nomeCategoria(c: Categoria) {
  const pai = c.pai && CATEGORIAS.find((p) => p.slug === c.pai);
  return pai ? `${pai.titulo} › ${c.titulo}` : c.titulo;
}
