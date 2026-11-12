import fs from "node:fs/promises";
import path from "node:path";
import { usuarioAtual } from "@/lib/auth";
import { buscarDocumentoLocal, PASTA_ARQUIVOS } from "@/lib/local/banco";
import { modoLocal } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Entrega os arquivos para quem está logado: do banco local (local/arquivos)
// ou do bucket do Supabase. PDFs abrem no visualizador do site.

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function lerArquivo(id: string) {
  if (modoLocal) {
    const documento = buscarDocumentoLocal(Number(id));
    if (!documento) return null;
    const arquivo = path.resolve(PASTA_ARQUIVOS, documento.caminho);
    if (!arquivo.startsWith(PASTA_ARQUIVOS + path.sep)) return null;
    try {
      return { conteudo: await fs.readFile(arquivo), caminho: arquivo };
    } catch {
      return null;
    }
  }

  const supabase = await createClient();
  const { data: documento } = await supabase
    .from("documentos")
    .select("caminho")
    .eq("id", id)
    .maybeSingle();
  if (!documento) return null;
  const { data, error } = await supabase.storage
    .from("documentos")
    .download(documento.caminho);
  if (error) return null;
  return { conteudo: await data.arrayBuffer(), caminho: documento.caminho };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await usuarioAtual())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;
  const arquivo = await lerArquivo(id);
  if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });

  const tipo = TIPOS[path.extname(arquivo.caminho).toLowerCase()];
  // Tipos desconhecidos são baixados em vez de abertos no navegador.
  const disposicao = tipo ? "inline" : "attachment";
  return new Response(arquivo.conteudo, {
    headers: {
      "Content-Type": tipo ?? "application/octet-stream",
      "Content-Disposition": `${disposicao}; filename*=UTF-8''${encodeURIComponent(path.basename(arquivo.caminho))}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
