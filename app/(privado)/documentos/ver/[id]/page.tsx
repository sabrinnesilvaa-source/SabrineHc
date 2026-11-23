import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { perfilDe, usuarioAtual } from "@/lib/auth";
import { connection } from "next/server";
import { Suspense } from "react";
import { CATEGORIAS, podeVerCategoria } from "@/lib/categorias";
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
  if (!podeVerCategoria(perfilDe(await usuarioAtual()), documento.categoria)) redirect("/menu");

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

      {/* O PDF é desenhado pelo próprio site: abre na tela, sem baixar.
          Word, Excel e PowerPoint não abrem aqui e são oferecidos para download. */}
      {documento.caminho.toLowerCase().endsWith(".pdf") ? (
        <LeitorPdf src={arquivo} titulo={documento.titulo} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">
            Este arquivo não abre na tela. Baixe para visualizar ou preencher.
          </p>
          <a
            href={arquivo}
            download
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Baixar arquivo
          </a>
        </div>
      )}
    </section>
  );
}
