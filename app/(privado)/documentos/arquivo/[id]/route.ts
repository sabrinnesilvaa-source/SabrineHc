import fs from "node:fs/promises";
import path from "node:path";
import { usuarioAtual } from "@/lib/auth";
import { buscarDocumentoLocal, PASTA_ARQUIVOS } from "@/lib/local/banco";
import { modoLocal } from "@/lib/supabase/config";

// Entrega os arquivos do banco local (local/arquivos) para quem está logado.
// Com o Supabase, os arquivos saem direto do bucket por link assinado.

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!modoLocal || !(await usuarioAtual())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;
  const documento = buscarDocumentoLocal(Number(id));
  if (!documento) return new Response("Não encontrado", { status: 404 });

  const arquivo = path.resolve(PASTA_ARQUIVOS, documento.caminho);
  if (!arquivo.startsWith(PASTA_ARQUIVOS + path.sep)) {
    return new Response("Não encontrado", { status: 404 });
  }

  try {
    const conteudo = await fs.readFile(arquivo);
    const tipo = TIPOS[path.extname(arquivo).toLowerCase()];
    return new Response(conteudo, {
      headers: {
        "Content-Type": tipo ?? "application/octet-stream",
        // Tipos desconhecidos são baixados em vez de abertos no navegador.
        "Content-Disposition": `${tipo ? "inline" : "attachment"}; filename="${encodeURIComponent(path.basename(arquivo))}"`,
      },
    });
  } catch {
    return new Response("Arquivo não encontrado", { status: 404 });
  }
}
