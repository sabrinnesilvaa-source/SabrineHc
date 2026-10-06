import { listarDocumentosLocais } from "./local/banco";
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
