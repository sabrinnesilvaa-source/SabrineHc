import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { listarDocumentos } from "@/lib/documentos";

type Props = { params: Promise<{ categoria: string }> };

export default function PaginaCategoria({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <DocumentosDaCategoria params={params} />
    </Suspense>
  );
}

async function DocumentosDaCategoria({ params }: Props) {
  const { categoria: slug } = await params;
  const categoria = CATEGORIAS.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const arquivos = await listarDocumentos(categoria.slug);
  const paginas = (categoria.paginas ?? []).map((pagina) => ({
    id: pagina.href,
    titulo: pagina.titulo,
    descricao: pagina.descricao,
    link: pagina.href,
    interno: true,
  }));
  const documentos = arquivos && [
    ...paginas,
    ...arquivos.map((doc) => ({ ...doc, interno: false })),
  ];

  return (
    <section className="max-w-3xl">
      <Link
        href="/documentos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Todas as categorias
      </Link>

      <div className="flex items-center justify-between border-t-[3px] border-teal-700 py-3">
        <h2 className="text-xs font-semibold tracking-wide text-slate-900 uppercase">
          {categoria.titulo}
        </h2>
        {documentos && (
          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700">
            {documentos.length}
          </span>
        )}
      </div>

      {!documentos ? (
        <p className="text-sm text-red-600">
          Não foi possível carregar os documentos. Confira se o arquivo
          supabase/schema.sql foi executado no seu projeto Supabase.
        </p>
      ) : documentos.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Nenhum documento nesta categoria ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documentos.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900">
                  {doc.titulo}
                </h3>
                {doc.descricao && (
                  <p className="text-sm text-slate-500">{doc.descricao}</p>
                )}
              </div>
              {doc.interno && doc.link ? (
                <Link
                  href={doc.link}
                  className="shrink-0 rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                >
                  Abrir
                </Link>
              ) : doc.link ? (
                <a
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                >
                  Abrir
                </a>
              ) : (
                <span className="shrink-0 text-sm text-slate-400">
                  Arquivo não encontrado
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
