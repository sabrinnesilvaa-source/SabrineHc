import {
  CalendarDays,
  ChartPie,
  ClipboardList,
  Database,
  Pill,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type Categoria = {
  slug: string; // usado no endereço e na coluna "categoria" dos documentos
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  // Páginas do próprio site listadas na categoria, antes dos arquivos.
  paginas?: { href: string; titulo: string; descricao: string }[];
};

// Categorias exibidas em /documentos. Para criar uma nova, inclua um item
// aqui e use o mesmo slug ao cadastrar os documentos.
export const CATEGORIAS: Categoria[] = [
  {
    slug: "protocolos",
    titulo: "Protocolos",
    descricao: "Protocolos assistenciais e institucionais",
    icone: ClipboardList,
  },
  {
    slug: "fluxos",
    titulo: "Fluxos",
    descricao: "Fluxogramas de atendimento e processos",
    icone: Workflow,
  },
  {
    slug: "escala-de-enfermagem",
    titulo: "Escala de enfermagem",
    descricao: "Escalas de trabalho da equipe",
    icone: CalendarDays,
  },
  {
    slug: "guia-de-medicamentos",
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
    titulo: "Indicadores",
    descricao: "Relatórios e indicadores de desempenho",
    icone: ChartPie,
  },
  {
    slug: "base-de-dados-institucional",
    titulo: "Base de Dados Institucional",
    descricao: "Documentos e dados de referência da instituição",
    icone: Database,
  },
];
