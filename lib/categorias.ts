import {
  BookOpen,
  CalendarDays,
  ChartPie,
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
  CATEGORIAS.filter((c) => podeVerCategoria(perfil, c.slug));
