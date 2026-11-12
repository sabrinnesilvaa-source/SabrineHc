import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { buscarDocumento } from "@/lib/documentos";
import { Carregando } from "../../../carregando";
import { LeitorPdf } from "./leitor-pdf";

// Visualizador: mostra o PDF dentro do site, sem precisar baixar.

type Props = {
  params: Promise<{ id: string }>;
};

export default function PaginaVisualizador({ params }: Props) {
  return (
    <Suspense fallback={<Carregando texto="Carregando documento…" />}>
      <Visualizador params={params} />
    </Suspense>
  );
}

async function Visualizador({ params }: Props) {
  await connection(); // sempre consulta o banco na hora do acesso
  const { id } = await params;
  const documento = await buscarDocumento(id);
  if (!documento) notFound();

  const categoria = CATEGORIAS.find((c) => c.slug === documento.categoria);
  const arquivo = `/documentos/arquivo/${encodeURIComponent(id)}`;

  return (
    <section className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <Link
        href={categoria ? `/documentos/${categoria.slug}` : "/menu"}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {categoria?.titulo ?? "Documentos"}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-teal-700 pt-3">
        <h2 className="min-w-0 font-semibold text-slate-900">
          {documento.titulo}
        </h2>
      </div>

      {/* #toolbar=0 esconde a barra do leitor de PDF (botões de baixar e imprimir). */}
      <LeitorPdf src={`${arquivo}#toolbar=0&navpanes=0`} titulo={documento.titulo} />
    </section>
  );
}
