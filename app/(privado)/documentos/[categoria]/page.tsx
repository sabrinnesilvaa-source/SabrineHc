import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { perfilDe, usuarioAtual } from "@/lib/auth";
import { connection } from "next/server";
import { Suspense } from "react";
import { Carregando } from "../../carregando";
import { CATEGORIAS, podeVerCategoria, subcategorias } from "@/lib/categorias";
import { listarDocumentos } from "@/lib/documentos";

type Props = { params: Promise<{ categoria: string }> };

export default function PaginaCategoria({ params }: Props) {
  return (
    <Suspense fallback={<Carregando />}>
      <DocumentosDaCategoria params={params} />
    </Suspense>
  );
}

async function DocumentosDaCategoria({ params }: Props) {
  // A lista vem do banco a cada acesso (links assinados usam a hora atual).
  await connection();
  const { categoria: slug } = await params;
  const categoria = CATEGORIAS.find((c) => c.slug === slug);
  if (!categoria) notFound();
  if (!podeVerCategoria(perfilDe(await usuarioAtual()), slug)) redirect("/menu");

  const arquivos = await listarDocumentos(categoria.slug);
  const filhas = subcategorias(categoria.slug).map((c) => ({
    id: c.slug,
    titulo: c.titulo,
    descricao: c.descricao,
    link: `/documentos/${c.slug}`,
    interno: true,
  }));
  const pai = categoria.pai && CATEGORIAS.find((c) => c.slug === categoria.pai);
  const paginas = (categoria.paginas ?? []).map((pagina) => ({
    id: pagina.href,
    titulo: pagina.titulo,
    descricao: pagina.descricao,
    link: pagina.href,
    interno: true,
  }));
  const documentos = arquivos && [
    ...filhas,
    ...paginas,
    ...arquivos.map((doc) => ({ ...doc, interno: false })),
  ];

  return (
    <section>
      <Link
        href="/menu"
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
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {documentos.map((doc) => {
            const { codigo, nome } = separarCodigo(doc.titulo);
            const href = doc.interno ? doc.link : doc.link && `/documentos/ver/${doc.id}`;
            const conteudo = (
              <>
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-center text-xs leading-tight font-bold text-teal-700">
                  {codigo ?? <FileText aria-hidden className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold text-slate-900 uppercase">
                    {nome}
                  </span>
                  {doc.descricao && (
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {doc.descricao}
                    </span>
                  )}
                </span>
                <span className={`shrink-0 text-sm font-semibold ${href ? "text-teal-700" : "text-slate-400"}`}>
                  {href ? "Abrir" : "Indisponível"}
                </span>
              </>
            );
            const classe =
              "flex h-full items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3";
            return (
              <li key={doc.id}>
                {href ? (
                  <Link
                    href={href}
                    className={`${classe} transition hover:border-teal-600 hover:shadow-md`}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className={classe}>{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// "POP 01 – Sepse" vira { codigo: "POP 01", nome: "Sepse" }.
function separarCodigo(titulo: string) {
  const m = titulo.match(/^((?:POP|FX)\s*\d+)\s*[–-]\s*(.+)$/i);
  return m ? { codigo: m[1], nome: m[2] } : { codigo: null, nome: titulo };
}
