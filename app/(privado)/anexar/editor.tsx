"use client";

import { createBrowserClient } from "@supabase/ssr";
import { LayoutList, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { CATEGORIAS, nomeCategoria } from "@/lib/categorias";
import {
  enviarLocal,
  moverDocumento,
  prepararEnvio,
  registrarEnvio,
  removerDocumento,
  type DocumentoAdmin,
  type Resultado,
} from "./actions";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";

export function Editor({
  inicial,
  modoLocal,
  supabase,
}: {
  inicial: DocumentoAdmin[] | null;
  modoLocal: boolean;
  supabase: { url: string; chave: string };
}) {
  const [documentos, setDocumentos] = useState(inicial ?? []);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{
    erro: boolean;
    texto: string;
  } | null>(null);
  const [pendente, iniciar] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const loteRef = useRef<HTMLFormElement>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [resumoLote, setResumoLote] = useState<{ erro: boolean; texto: string } | null>(null);

  function aplicar(resultado: Resultado, sucesso: string) {
    if (resultado.ok) {
      setDocumentos(resultado.documentos);
      setMensagem({ erro: false, texto: sucesso });
    } else {
      setMensagem({ erro: true, texto: resultado.erro });
    }
    return resultado.ok;
  }

  function enviar(form: FormData) {
    setMensagem(null);
    iniciar(async () => {
      let resultado: Resultado;
      if (modoLocal) {
        resultado = await enviarLocal(form);
      } else {
        const arquivo = form.get("arquivo");
        const categoria = String(form.get("categoria") ?? "");
        if (!(arquivo instanceof File) || arquivo.size === 0) {
          setMensagem({ erro: true, texto: "Escolha um arquivo." });
          return;
        }
        const link = await prepararEnvio(categoria, arquivo.name);
        if (!link.ok) {
          setMensagem({ erro: true, texto: link.erro });
          return;
        }
        const cliente = createBrowserClient(supabase.url, supabase.chave);
        const { error } = await cliente.storage
          .from("documentos")
          .uploadToSignedUrl(link.caminho, link.token, arquivo);
        if (error) {
          setMensagem({
            erro: true,
            texto: `Falha ao enviar: ${error.message}`,
          });
          return;
        }
        resultado = await registrarEnvio({
          titulo: String(form.get("titulo") ?? ""),
          descricao: String(form.get("descricao") ?? ""),
          categoria,
          caminho: link.caminho,
        });
      }
      if (aplicar(resultado, "Documento enviado.")) formRef.current?.reset();
    });
  }

  // Envio de vários arquivos de uma vez. O título vem do nome do arquivo
  // ("POP 02 - SEPSE.pdf" vira "POP 02 – SEPSE"). Se a categoria já tiver um
  // documento com o mesmo código (POP 02), ele é substituído pelo novo.
  function enviarLote(form: FormData) {
    setMensagem(null);
    setResumoLote(null);
    const categoria = String(form.get("categoria") ?? "");
    const arquivos = form
      .getAll("arquivos")
      .filter((a): a is File => a instanceof File && a.size > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
    if (!categoria || arquivos.length === 0) {
      setResumoLote({ erro: true, texto: "Escolha a categoria e os arquivos." });
      return;
    }
    iniciar(async () => {
      let lista = documentos;
      const falhas: string[] = [];
      let substituidos = 0;
      for (const [i, arquivo] of arquivos.entries()) {
        setProgresso(`Enviando ${i + 1} de ${arquivos.length}: ${arquivo.name}`);
        const titulo = tituloDoArquivo(arquivo.name);
        const codigo = codigoDoTitulo(titulo);
        const antigos = codigo
          ? lista.filter((d) => d.categoria === categoria && codigoDoTitulo(d.titulo) === codigo)
          : [];
        let resultado: Resultado;
        if (modoLocal) {
          const dados = new FormData();
          dados.set("categoria", categoria);
          dados.set("titulo", titulo);
          dados.set("arquivo", arquivo);
          resultado = await enviarLocal(dados);
        } else {
          const link = await prepararEnvio(categoria, arquivo.name);
          if (!link.ok) {
            falhas.push(`${arquivo.name} (${link.erro})`);
            continue;
          }
          const cliente = createBrowserClient(supabase.url, supabase.chave);
          const { error } = await cliente.storage
            .from("documentos")
            .uploadToSignedUrl(link.caminho, link.token, arquivo);
          if (error) {
            falhas.push(`${arquivo.name} (${error.message})`);
            continue;
          }
          resultado = await registrarEnvio({ titulo, descricao: "", categoria, caminho: link.caminho });
        }
        if (!resultado.ok) {
          falhas.push(`${arquivo.name} (${resultado.erro})`);
          continue;
        }
        lista = resultado.documentos;
        for (const antigo of antigos) {
          const r = await removerDocumento(antigo.id);
          if (r.ok) {
            lista = r.documentos;
            substituidos++;
          }
        }
        setDocumentos(lista);
      }
      setProgresso(null);
      const enviados = arquivos.length - falhas.length;
      setResumoLote({
        erro: falhas.length > 0,
        texto:
          `${enviados} de ${arquivos.length} enviados` +
          (substituidos ? `, ${substituidos} versões antigas substituídas` : "") +
          "." +
          (falhas.length ? ` Não enviados: ${falhas.join("; ")}` : ""),
      });
      if (falhas.length === 0) loteRef.current?.reset();
    });
  }

  function mover(doc: DocumentoAdmin, categoria: string) {
    setMensagem(null);
    const destino = CATEGORIAS.find((c) => c.slug === categoria)?.titulo;
    iniciar(async () => {
      aplicar(
        await moverDocumento(doc.id, categoria),
        `"${doc.titulo}" movido para ${destino}.`,
      );
    });
  }

  function remover(doc: DocumentoAdmin) {
    if (!confirm(`Remover "${doc.titulo}"? O arquivo será apagado.`)) return;
    setMensagem(null);
    iniciar(async () => {
      aplicar(await removerDocumento(doc.id), `"${doc.titulo}" removido.`);
    });
  }

  // Páginas do próprio site (ex.: Guia de diluição) entram na contagem e na
  // lista, mas não são arquivos: não dá para mover nem remover por aqui.
  const paginas = CATEGORIAS.flatMap((c) =>
    (c.paginas ?? []).map((p) => ({
      id: `pagina:${p.href}`,
      titulo: p.titulo,
      descricao: p.descricao,
      categoria: c.slug,
      pagina: true,
    })),
  );
  const todos = [
    ...paginas,
    ...documentos.map((d) => ({ ...d, pagina: false })),
  ];
  const contagem = (slug: string) =>
    todos.filter((d) => d.categoria === slug).length;
  const visiveis = filtro ? todos.filter((d) => d.categoria === filtro) : todos;

  return (
    <div className="space-y-6">
      {/* Indicadores por categoria; clicar filtra a lista. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li>
          <CartaoContagem
            titulo="Todos os documentos"
            total={todos.length}
            icone={LayoutList}
            ativo={filtro === null}
            onClick={() => setFiltro(null)}
          />
        </li>
        {CATEGORIAS.map((c) => (
          <li key={c.slug}>
            <CartaoContagem
              titulo={nomeCategoria(c)}
              total={contagem(c.slug)}
              icone={c.icone}
              ativo={filtro === c.slug}
              onClick={() => setFiltro(c.slug)}
            />
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="h-fit space-y-6">
        <form
          ref={formRef}
          action={enviar}
          className="h-fit space-y-3 rounded-lg border border-t-[3px] border-slate-200 border-t-teal-700 bg-white p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Upload aria-hidden className="h-4 w-4 text-teal-700" />
            Novo documento
          </h2>
          <label className="block text-sm text-slate-600">
            Categoria
            <select
              name="categoria"
              required
              defaultValue={filtro ?? ""}
              key={filtro}
              className={`${campo} mt-1`}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {nomeCategoria(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Título
            <input name="titulo" required className={`${campo} mt-1`} />
          </label>
          <label className="block text-sm text-slate-600">
            Descrição (opcional)
            <input name="descricao" className={`${campo} mt-1`} />
          </label>
          <label className="block text-sm text-slate-600">
            Arquivo
            <input
              name="arquivo"
              type="file"
              required
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pendente ? "Salvando…" : "Enviar documento"}
          </button>
          {mensagem && (
            <p
              className={`text-sm ${mensagem.erro ? "text-red-600" : "text-teal-700"}`}
            >
              {mensagem.texto}
            </p>
          )}
        </form>

        <form
          ref={loteRef}
          action={enviarLote}
          className="h-fit space-y-3 rounded-lg border border-t-[3px] border-slate-200 border-t-teal-700 bg-white p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Upload aria-hidden className="h-4 w-4 text-teal-700" />
            Vários documentos
          </h2>
          <p className="text-xs text-slate-500">
            O título vem do nome do arquivo (ex.: &quot;POP 02 - SEPSE.pdf&quot;). Se a
            categoria já tiver o mesmo POP, a versão antiga é substituída.
          </p>
          <label className="block text-sm text-slate-600">
            Categoria
            <select
              name="categoria"
              required
              defaultValue={filtro ?? ""}
              key={filtro}
              className={`${campo} mt-1`}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {nomeCategoria(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Arquivos
            <input
              name="arquivos"
              type="file"
              multiple
              required
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pendente ? "Enviando…" : "Enviar todos"}
          </button>
          {progresso && <p className="text-sm text-slate-600">{progresso}</p>}
          {resumoLote && (
            <p className={`text-sm ${resumoLote.erro ? "text-red-600" : "text-teal-700"}`}>
              {resumoLote.texto}
            </p>
          )}
        </form>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-xs font-semibold tracking-wide text-slate-900 uppercase">
              {filtro
                ? CATEGORIAS.find((c) => c.slug === filtro)?.titulo
                : "Todos os documentos"}
            </h2>
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-700">
              {visiveis.length}
            </span>
          </div>
          {inicial === null && (
            <p className="px-5 py-4 text-sm text-red-600">
              Não foi possível carregar os documentos.
            </p>
          )}
          {visiveis.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nenhum documento aqui ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiveis.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {doc.titulo}
                    </p>
                    {doc.descricao && (
                      <p className="truncate text-sm text-slate-500">
                        {doc.descricao}
                      </p>
                    )}
                  </div>
                  {doc.pagina ? (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Página do site ·{" "}
                      {CATEGORIAS.find((c) => c.slug === doc.categoria)?.titulo}
                    </span>
                  ) : (
                    <>
                      <select
                        aria-label={`Categoria de ${doc.titulo}`}
                        value={doc.categoria}
                        disabled={pendente}
                        onChange={(e) => mover(doc, e.target.value)}
                        className={`${campo.replace("w-full", "w-auto")} shrink-0`}
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {nomeCategoria(c)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => remover(doc)}
                        disabled={pendente}
                        title="Remover documento"
                        aria-label={`Remover ${doc.titulo}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CartaoContagem({
  titulo,
  total,
  icone: Icone,
  ativo,
  onClick,
}: {
  titulo: string;
  total: number;
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex h-full w-full items-center gap-4 rounded-lg border border-t-[3px] bg-white p-4 text-left transition hover:shadow-md ${
        ativo
          ? "border-teal-600 border-t-teal-700 ring-2 ring-teal-600/20"
          : "border-slate-200 border-t-teal-700"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icone aria-hidden className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-semibold text-slate-900">
          {total}
        </span>
        <span className="block truncate text-sm text-slate-500">{titulo}</span>
      </span>
    </button>
  );
}

/** "POP 02 - SEPSE.pdf" vira "POP 02 – SEPSE". */
function tituloDoArquivo(nome: string) {
  return nome
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/^((?:POP|FX)\s*\d+)\s*[-–]\s*/i, "$1 – ")
    .trim();
}

/** "POP 2 – Sepse" e "POP 02 - SEPSE" viram "POP 2". */
function codigoDoTitulo(titulo: string) {
  const m = titulo.match(/^(POP|FX)\s*0*(\d+)\b/i);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null;
}
