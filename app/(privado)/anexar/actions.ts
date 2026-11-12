"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { ehAdmin, usuarioAtual } from "@/lib/auth";
import { CATEGORIAS } from "@/lib/categorias";
import {
  apagarDocumentoLocal,
  inserirDocumentoLocal,
  listarTodosDocumentosLocais,
  moverDocumentoLocal,
  PASTA_ARQUIVOS,
} from "@/lib/local/banco";
import { modoLocal } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Editor de documentos: só o admin envia, move e remove. Toda ação confere
// o perfil de novo no servidor e devolve a lista atualizada.

const BUCKET = "documentos";

export type DocumentoAdmin = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
};

export type Resultado =
  | { ok: true; documentos: DocumentoAdmin[] }
  | { ok: false; erro: string };

const categoriaValida = (slug: unknown) =>
  CATEGORIAS.some((c) => c.slug === slug);

// Nome de arquivo seguro: sem acentos, espaços ou barras.
function nomeSeguro(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${Date.now()}-${limpo || "arquivo"}`;
}

async function exigirAdmin() {
  if (!ehAdmin(await usuarioAtual())) {
    throw new Error("Apenas o admin pode alterar documentos.");
  }
}

export async function listarParaEditor(): Promise<DocumentoAdmin[]> {
  if (modoLocal) {
    return listarTodosDocumentosLocais().map((d) => ({
      id: String(d.id),
      titulo: d.titulo,
      descricao: d.descricao,
      categoria: d.categoria,
    }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("id, titulo, descricao, categoria")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function executar(acao: () => Promise<void>): Promise<Resultado> {
  try {
    await exigirAdmin();
    await acao();
    return { ok: true, documentos: await listarParaEditor() };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

function lerCampos(titulo: unknown, descricao: unknown, categoria: unknown) {
  const t = String(titulo ?? "").trim();
  if (!t) throw new Error("Informe o título do documento.");
  if (!categoriaValida(categoria)) throw new Error("Escolha uma categoria.");
  const d = String(descricao ?? "").trim();
  return { titulo: t, descricao: d || null, categoria: String(categoria) };
}

/** Modo local: o arquivo vem junto no formulário e é salvo em local/arquivos. */
export async function enviarLocal(form: FormData): Promise<Resultado> {
  return executar(async () => {
    if (!modoLocal) throw new Error("Envio local indisponível.");
    const campos = lerCampos(form.get("titulo"), form.get("descricao"), form.get("categoria"));
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new Error("Escolha um arquivo.");
    }
    const caminho = path.posix.join(campos.categoria, nomeSeguro(arquivo.name));
    const destino = path.join(PASTA_ARQUIVOS, caminho);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, Buffer.from(await arquivo.arrayBuffer()));
    inserirDocumentoLocal({ ...campos, caminho });
  });
}

/** Supabase: devolve um link de envio para o navegador mandar o arquivo direto ao bucket. */
export async function prepararEnvio(
  categoria: string,
  nomeArquivo: string,
): Promise<{ ok: true; caminho: string; token: string } | { ok: false; erro: string }> {
  try {
    await exigirAdmin();
    if (!categoriaValida(categoria)) throw new Error("Escolha uma categoria.");
    const caminho = `${categoria}/${nomeSeguro(nomeArquivo)}`;
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(caminho);
    if (error) throw new Error(error.message);
    return { ok: true, caminho: data.path, token: data.token };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

/** Supabase: grava o documento depois que o arquivo chegou ao bucket. */
export async function registrarEnvio(dados: {
  titulo: string;
  descricao: string;
  categoria: string;
  caminho: string;
}): Promise<Resultado> {
  return executar(async () => {
    const campos = lerCampos(dados.titulo, dados.descricao, dados.categoria);
    const supabase = await createClient();
    const { error } = await supabase
      .from("documentos")
      .insert({ ...campos, caminho: dados.caminho });
    if (error) throw new Error(error.message);
  });
}

export async function moverDocumento(id: string, categoria: string): Promise<Resultado> {
  return executar(async () => {
    if (!categoriaValida(categoria)) throw new Error("Categoria inválida.");
    if (modoLocal) return moverDocumentoLocal(Number(id), categoria);
    const supabase = await createClient();
    const { error } = await supabase
      .from("documentos")
      .update({ categoria })
      .eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export async function removerDocumento(id: string): Promise<Resultado> {
  return executar(async () => {
    if (modoLocal) {
      const caminho = apagarDocumentoLocal(Number(id));
      if (caminho) {
        const arquivo = path.resolve(PASTA_ARQUIVOS, caminho);
        if (arquivo.startsWith(PASTA_ARQUIVOS + path.sep)) {
          await fs.rm(arquivo, { force: true });
        }
      }
      return;
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documentos")
      .delete()
      .eq("id", id)
      .select("caminho")
      .single();
    if (error) throw new Error(error.message);
    await supabase.storage.from(BUCKET).remove([data.caminho]);
  });
}
