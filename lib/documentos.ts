import {
  buscarDocumentoLocal,
  contarDocumentoLocal,
  listarDocumentosLocais,
} from "./local/banco";
import { CATEGORIAS, podeVerCategoria } from "./categorias";
import type { Perfil } from "./auth";
import { modoLocal } from "./supabase/config";
import { createClient } from "./supabase/server";

const BUCKET = "documentos";
const VALIDADE_DO_LINK = 60 * 60; // 1 hora, em segundos

export type Documento = {
  id: string;
  titulo: string;
  descricao: string | null;
  link: string | null; // null quando o arquivo não foi encontrado
};

/** Título e categoria de um documento, para o visualizador. */
export async function buscarDocumento(
  id: string,
): Promise<{ titulo: string; categoria: string | null } | null> {
  if (modoLocal) {
    const doc = buscarDocumentoLocal(Number(id));
    return doc ? { titulo: doc.titulo, categoria: null } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos")
    .select("titulo, categoria")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Quantidade de itens por categoria principal, para os cartões do menu.
 * Soma as subcategorias que o perfil pode ver e as páginas do próprio site.
 * Categoria cuja consulta falhou fica de fora, para não mostrar um total errado.
 */
export async function contarPorCategoria(
  perfil: Perfil,
): Promise<Record<string, number>> {
  const visiveis = CATEGORIAS.filter((c) => podeVerCategoria(perfil, c.slug));
  const supabase = modoLocal ? null : await createClient();

  const totais = new Map(
    await Promise.all(
      visiveis.map(async (c): Promise<[string, number | null]> => {
        if (!supabase) return [c.slug, contarDocumentoLocal(c.slug)];
        const { count, error } = await supabase
          .from("documentos")
          .select("id", { count: "exact", head: true })
          .eq("categoria", c.slug);
        return [c.slug, error ? null : (count ?? 0)];
      }),
    ),
  );

  const resultado: Record<string, number> = {};
  for (const c of visiveis.filter((v) => !v.pai)) {
    const grupo = visiveis.filter((v) => v.slug === c.slug || v.pai === c.slug);
    const valores = grupo.map((v) => totais.get(v.slug));
    if (valores.some((v) => v == null)) continue;
    resultado[c.slug] =
      valores.reduce<number>((soma, v) => soma + (v ?? 0), 0) +
      grupo.reduce((soma, v) => soma + (v.paginas?.length ?? 0), 0);
  }
  return resultado;
}

/** Lista os documentos de uma categoria; devolve null se não foi possível consultar. */
export async function listarDocumentos(
  categoria: string,
): Promise<Documento[] | null> {
  if (modoLocal) {
    return listarDocumentosLocais(categoria).map((doc) => ({
      id: String(doc.id),
      titulo: doc.titulo,
      descricao: doc.descricao,
      link: `/documentos/arquivo/${doc.id}`,
    }));
  }

  const supabase = await createClient();
  const { data: documentos, error } = await supabase
    .from("documentos")
    .select("id, titulo, descricao, caminho, criado_em")
    .eq("categoria", categoria)
    .order("criado_em", { ascending: false });
  if (error) return null;

  // O bucket é privado: cada arquivo recebe um link temporário assinado.
  const caminhos = documentos.map((doc) => doc.caminho);
  const { data: links } = caminhos.length
    ? await supabase.storage
        .from(BUCKET)
        .createSignedUrls(caminhos, VALIDADE_DO_LINK)
    : { data: [] };
  const linkPorCaminho = new Map(
    (links ?? []).map((link) => [link.path, link.signedUrl]),
  );

  return documentos.map((doc) => ({
    id: doc.id,
    titulo: doc.titulo,
    descricao: doc.descricao,
    link: linkPorCaminho.get(doc.caminho) ?? null,
  }));
}
